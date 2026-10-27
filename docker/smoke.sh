#!/usr/bin/env bash
# Проверка Docker-версии: собрать, поднять и убедиться, что сайт и функция
# заявок работают. Запускается в CI (.github/workflows/docker.yml), можно и
# руками на сервере после обновления.
#
#   docker/smoke.sh          собрать, поднять, проверить
#   docker/smoke.sh check    только проверить уже запущенное
#
# Bitrix24 не трогаем: проверяются ответы функции до отправки в CRM.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE=http://127.0.0.1:${APP_PORT:-3108}
ORIGIN=https://fibonacci-olympiads.kz
FAIL=0

if [ "${1:-}" != check ]; then
  # Пустой docker.env — только для проверки: без вебхука заявки в Bitrix24 не уходят.
  [ -f docker.env ] || cp docker.env.example docker.env
  docker compose up -d --build
fi

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/robots.txt" && break
  sleep 2
done

ok() { echo "  ✓ $*"; }
bad() { echo "  ✗ $*"; FAIL=1; }
expect() { # expect <код> <путь> [curl-аргументы…]
  local want=$1 path=$2; shift 2
  local got; got=$(curl -s -o /dev/null -w '%{http_code}' "$@" "$BASE$path")
  [ "$got" = "$want" ] && ok "$path → $got" || bad "$path → $got (ожидалось $want)"
}

echo "fibonacci: $BASE"
for p in / /oferta /polozhenie /robots.txt /sitemap.xml /llms.txt /.well-known/security.txt /assets/app.js; do expect 200 "$p"; done
expect 308 /oferta.html
expect 308 /polozhenie/
# Код функций и служебные файлы по URL недоступны.
for p in /api/lead.js /docker/serve.mjs /vercel.json /README.md /utm-links.csv; do expect 404 "$p"; done
[ -n "$(curl -sI "$BASE/" | grep -i '^content-security-policy:')" ] && ok "заголовки из vercel.json" || bad "нет CSP из vercel.json"
grep -qi 'immutable' <<<"$(curl -sI "$BASE/assets/app.js?v=1")" && ok "версионированные скрипты кэшируются навсегда" || bad "нет долгого кэша для ?v="
# Видео отдаётся кусками (Range) — без этого Safari его не проигрывает.
VIDEO=$(ls assets/video/*.mp4 2>/dev/null | head -1 || true)
[ -z "$VIDEO" ] || expect 206 "/$VIDEO" -H 'Range: bytes=0-99'

# Функция заявок: чужой сайт, ловушка для ботов, неверный телефон.
expect 403 /api/lead -X POST -H 'Origin: https://example.com' -H 'Content-Type: application/json' --data '{}'
expect 200 /api/lead -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data '{"website":"bot"}'
expect 400 /api/lead -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data '{"name":"Тест","phone":"123"}'
expect 405 /api/lead

if [ "$FAIL" -ne 0 ]; then
  docker compose ps -a
  docker compose logs --tail 80
  exit 1
fi
echo "fibonacci: всё работает"
