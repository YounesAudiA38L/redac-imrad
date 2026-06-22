#!/bin/zsh

cd "/Users/e/Documents/Logiciel Redak-Imrad" || exit 1

PORT=4173
URL="http://127.0.0.1:${PORT}/index.html"

if ! /usr/sbin/lsof -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  /usr/bin/python3 -m http.server ${PORT} >/tmp/redac-imrad-server.log 2>&1 &
  sleep 1
fi

/usr/bin/open "${URL}"

