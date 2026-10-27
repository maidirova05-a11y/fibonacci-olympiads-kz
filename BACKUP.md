# Запасной запуск — fibonacci-olympiads.kz

**Базы у сайта нет**: заявки с формы сразу уходят в Bitrix24 (`api/lead.js`), поэтому
резервные копии данных не нужны. Код лежит в GitHub, а единственный секрет —
`BITRIX_WEBHOOK_URL` (и необязательные `BITRIX_*`). Его нужно хранить в менеджере паролей.

- **На каждый пуш и раз в неделю** CI собирает Docker-образ, поднимает сайт и проверяет
  страницы, заголовки и функцию заявок (`.github/workflows/docker.yml`).
- **Если Vercel недоступен**, или сайт переезжает на сервер компании, он запускается
  на любом сервере с Docker одной командой.

## Запуск на своём сервере

Все сайты компании живут на сервере api.azgroup.kz. Как он устроен и как
обновлять сайты — `docs/SERVER.md` в репозитории az-group-projects. Вручную:

```bash
git clone https://github.com/maidirova05-a11y/fibonacci-olympiads-kz.git && cd fibonacci-olympiads-kz
cp docker.env.example docker.env && nano docker.env   # BITRIX_WEBHOOK_URL из менеджера паролей
docker compose up -d --build
docker/smoke.sh check                                 # проверить, что всё работает
```

Сайт слушает только `127.0.0.1:3108`. Наружу с HTTPS его отдаёт Caddy:

```caddy
fibonacci-olympiads.kz {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3108
}
www.fibonacci-olympiads.kz {
    redir https://fibonacci-olympiads.kz{uri} 308
}
```

Затем в DNS домена направьте A-записи `@` и `www` на IP сервера. Проверьте отправкой
настоящей заявки: она должна появиться в Bitrix24.

## Из чего это состоит

| Файл | Что делает |
|---|---|
| `Dockerfile`, `compose.yaml` | сайт для запуска где угодно |
| `docker/serve.mjs` | сервер вместо Vercel: статика с чистыми адресами, `api/lead.js`, заголовки из `vercel.json` |
| `docker/smoke.sh` | проверка поднятого сайта: страницы, заголовки, функция заявок |
| `.github/workflows/docker.yml` | сборка и проверка на каждый пуш и раз в неделю |
