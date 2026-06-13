#!/usr/bin/env bash
# Create + upload + set the LINE default rich menu that opens the LIFF app.
# Regenerate the image first with: python3 scripts/gen-richmenu.py
#
# Requires the Messaging API channel credentials (env), NOT committed:
#   LINE_MSG_CHANNEL_ID, LINE_MSG_CHANNEL_SECRET
# Image path defaults to assets/richmenu.png.
set -euo pipefail

: "${LINE_MSG_CHANNEL_ID:?set LINE_MSG_CHANNEL_ID}"
: "${LINE_MSG_CHANNEL_SECRET:?set LINE_MSG_CHANNEL_SECRET}"
IMG="${1:-assets/richmenu.png}"
LIFF_URL="${LIFF_URL:-https://liff.line.me/2010379064-JKfMEJI2}"

TOK=$(curl -s -X POST https://api.line.me/v2/oauth/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${LINE_MSG_CHANNEL_ID}" \
  -d "client_secret=${LINE_MSG_CHANNEL_SECRET}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

RID=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d "{\"size\":{\"width\":2500,\"height\":843},\"selected\":true,\"name\":\"Kitchen Buddy main\",\"chatBarText\":\"เปิดแอป\",\"areas\":[{\"bounds\":{\"x\":0,\"y\":0,\"width\":2500,\"height\":843},\"action\":{\"type\":\"uri\",\"uri\":\"${LIFF_URL}\"}}]}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['richMenuId'])")
echo "created $RID"

curl -s -o /dev/null -w "upload %{http_code}\n" \
  -X POST "https://api-data.line.me/v2/bot/richmenu/${RID}/content" \
  -H "Authorization: Bearer $TOK" -H "Content-Type: image/png" --data-binary "@${IMG}"

curl -s -o /dev/null -w "set-default %{http_code}\n" \
  -X POST "https://api.line.me/v2/bot/user/all/richmenu/${RID}" \
  -H "Authorization: Bearer $TOK" -H "Content-Length: 0"

echo "done: $RID is now the default rich menu"
