#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image="$(jq -r '.service.image' "$repo_root/template-spec.json")"
expected_digest="$(jq -r '.service.expectedIndexDigest' "$repo_root/template-spec.json")"
actual_digest="$(docker buildx imagetools inspect "$image" --format '{{json .Manifest}}' | jq -r '.digest')"

if [[ "$actual_digest" != "$expected_digest" ]]; then
  echo "Image digest mismatch for $image" >&2
  echo "Expected: $expected_digest" >&2
  echo "Actual:   $actual_digest" >&2
  exit 1
fi

probe_dir="$(mktemp -d /tmp/clipcascade-railway-template.XXXXXX)"
container_name="clipcascade-template-probe-$$"
probe_port="$(node -e "const net=require('net');const s=net.createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})")"
database_password="$(openssl rand -hex 16) $(openssl rand -hex 16)"
rotated_password="CC-test-$(openssl rand -hex 12)"
base_url="http://127.0.0.1:$probe_port"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  rm -rf "$probe_dir"
}
trap cleanup EXIT

start_container() {
  docker run --detach --rm \
    --name "$container_name" \
    --publish "127.0.0.1:$probe_port:8080" \
    --volume "$probe_dir:/database" \
    --env PORT=8080 \
    --env CC_PORT=8080 \
    --env CC_P2P_ENABLED=false \
    --env CC_SIGNUP_ENABLED=false \
    --env "CC_ALLOWED_ORIGINS=$base_url" \
    --env CC_MAX_MESSAGE_SIZE_IN_MiB=5 \
    --env "CC_SERVER_DB_PASSWORD=$database_password" \
    "$image" >/dev/null

  for _ in {1..90}; do
    if curl --fail --silent "$base_url/health" >/dev/null; then
      return
    fi
    sleep 1
  done

  docker logs "$container_name" >&2
  echo "ClipCascade did not become healthy" >&2
  exit 1
}

start_container
CLIPCASCADE_BASE_URL="$base_url" \
CLIPCASCADE_PASSWORD=admin123 \
CLIPCASCADE_NEW_PASSWORD="$rotated_password" \
npx playwright test

docker rm -f "$container_name" >/dev/null
start_container
CLIPCASCADE_BASE_URL="$base_url" \
CLIPCASCADE_PASSWORD="$rotated_password" \
CLIPCASCADE_SKIP_ROTATION=true \
npx playwright test

echo "ClipCascade image, protocol, and volume persistence checks passed."

