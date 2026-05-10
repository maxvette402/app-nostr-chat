#!/usr/bin/env bash
set -euo pipefail

BUNDLE="nostr-chat-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "Packing $BUNDLE ..."

tar -czf "$BUNDLE" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.turbo' \
  --exclude='*.tar.gz' \
  .

echo ""
echo "Created: $BUNDLE ($(du -sh "$BUNDLE" | cut -f1))"
echo ""
echo "Transfer to the other Mac:"
echo "  AirDrop, or:"
echo "  rsync -av $BUNDLE user@othermac:~/"
echo ""
echo "On the other Mac:"
echo "  tar -xzf $BUNDLE -C app-nostr-chat --strip-components=0"
echo "  cd app-nostr-chat"
echo "  bun install"
echo "  cp .env.example .env   # then edit .env as needed"
echo "  docker compose up --build"
