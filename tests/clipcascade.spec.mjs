import { test, expect } from '@playwright/test';
import WebSocket from 'ws';

const username = process.env.CLIPCASCADE_USERNAME || 'admin';
const currentPassword = process.env.CLIPCASCADE_PASSWORD || 'admin123';
const newPassword = process.env.CLIPCASCADE_NEW_PASSWORD;
const skipRotation = process.env.CLIPCASCADE_SKIP_ROTATION === 'true';

function cookieHeader(cookies) {
  return cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
}

async function login(page, password) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  await expect(page.locator('#user-name')).toContainText(username);
}

async function assertLoginRejected(page, password) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/login\?error/);
  await expect(page.getByText('Bad credentials')).toBeVisible();
}

function waitForFrame(ws, command, timeout = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for STOMP ${command}`)), timeout);
    const onMessage = (data) => {
      const frames = data.toString().split('\0').filter(Boolean);
      for (const frame of frames) {
        const normalized = frame.replace(/^\n+/, '');
        if (normalized.startsWith(`${command}\n`)) {
          clearTimeout(timer);
          ws.off('message', onMessage);
          resolve(normalized);
          return;
        }
      }
    };
    ws.on('message', onMessage);
  });
}

async function connectStomp(baseURL, cookies, origin) {
  const wsURL = new URL('/clipsocket', baseURL);
  wsURL.protocol = wsURL.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(wsURL, ['v12.stomp'], {
    headers: { Cookie: cookieHeader(cookies), Origin: origin },
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  const connected = waitForFrame(ws, 'CONNECTED');
  ws.send('CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\0');
  await connected;
  return ws;
}

async function expectOriginRejected(baseURL, cookies) {
  const wsURL = new URL('/clipsocket', baseURL);
  wsURL.protocol = wsURL.protocol === 'https:' ? 'wss:' : 'ws:';

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsURL, ['v12.stomp'], {
      headers: {
        Cookie: cookieHeader(cookies),
        Origin: 'https://rejected-origin.invalid',
      },
    });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('Timed out waiting for rejected WebSocket origin'));
    }, 10_000);
    ws.once('unexpected-response', (_request, response) => {
      clearTimeout(timer);
      if (response.statusCode === 403) resolve();
      else reject(new Error(`Expected 403 for rejected origin, got ${response.statusCode}`));
    });
    ws.once('open', () => {
      clearTimeout(timer);
      ws.terminate();
      reject(new Error('Rejected WebSocket origin was accepted'));
    });
    ws.once('error', () => {});
  });
}

function sendStompJSON(ws, destination, body) {
  const json = JSON.stringify(body);
  const length = Buffer.byteLength(json, 'utf8');
  ws.send(`SEND\ndestination:${destination}\ncontent-type:application/json\ncontent-length:${length}\n\n${json}\0`);
}

function messageBody(frame) {
  const separator = frame.indexOf('\n\n');
  if (separator === -1) throw new Error('Invalid STOMP MESSAGE frame');
  return JSON.parse(frame.slice(separator + 2));
}

test('template runtime contract', async ({ browser, baseURL, request }) => {
  expect(baseURL).toBeTruthy();
  const origin = new URL(baseURL).origin;

  const health = await request.get('/health');
  expect(health.status()).toBe(200);
  expect((await health.text()).trim()).toBe('OK');

  const loginPage = await request.get('/login');
  expect(loginPage.status()).toBe(200);
  expect(await loginPage.text()).not.toContain('Create an account');

  const firstContext = await browser.newContext({ baseURL });
  const firstPage = await firstContext.newPage();
  await login(firstPage, currentPassword);

  const mode = await firstContext.request.get('/server-mode');
  expect(await mode.json()).toEqual({ mode: 'P2S' });
  const size = await firstContext.request.get('/max-size');
  expect((await size.json()).maxsize).toBe(5 * 1024 * 1024);

  let activePassword = currentPassword;
  if (!skipRotation) {
    expect(newPassword, 'CLIPCASCADE_NEW_PASSWORD is required when rotating credentials').toBeTruthy();
    let dialogCount = 0;
    firstPage.on('dialog', async (dialog) => {
      dialogCount += 1;
      if (dialog.type() === 'prompt') await dialog.accept(newPassword);
      else await dialog.accept();
    });
    await firstPage.getByText('Change Password').click();
    await expect.poll(() => dialogCount).toBeGreaterThanOrEqual(2);
    activePassword = newPassword;

    const rejectedContext = await browser.newContext({ baseURL });
    await assertLoginRejected(await rejectedContext.newPage(), currentPassword);
    await rejectedContext.close();
  }

  const secondContext = await browser.newContext({ baseURL });
  const secondPage = await secondContext.newPage();
  await login(secondPage, activePassword);

  const firstCookies = await firstContext.cookies();
  const secondCookies = await secondContext.cookies();
  await expectOriginRejected(baseURL, firstCookies);

  const sender = await connectStomp(baseURL, firstCookies, origin);
  const receiver = await connectStomp(baseURL, secondCookies, origin);
  receiver.send('SUBSCRIBE\nid:clipcascade-test\ndestination:/user/queue/cliptext\nack:auto\n\n\0');

  const payloads = [
    { type: 'text', payload: 'Railway ✓', metadata: null },
    { type: 'image', payload: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', metadata: null },
    { type: 'files', payload: JSON.stringify({ 'probe.txt': 'cHJvYmU=' }), metadata: null },
  ];

  for (const payload of payloads) {
    const received = waitForFrame(receiver, 'MESSAGE');
    sendStompJSON(sender, '/app/cliptext', payload);
    expect(messageBody(await received)).toEqual(payload);
  }

  sender.close();
  receiver.close();
  await firstContext.close();
  await secondContext.close();
});
