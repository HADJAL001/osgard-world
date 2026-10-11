# SkillCred landing — разработка и публикация

Страница: https://osgard.world/skillcred/  
Исходный код: https://github.com/HADJAL001/osgard-world/tree/master/public/skillcred  
API: существующий сервис `https://skillcred-pilot-api.onrender.com`, доступный из браузера через same-origin маршрут `/skillcred-api`.

## Что находится в репозитории

- `public/skillcred/index.html` — вся семантическая разметка страницы и критический CSS первого экрана.
- `public/skillcred/styles.css` — адаптивная сетка, карточки, типографика, состояния, доступность и анимации.
- `public/skillcred/app.js` — меню, появление секций, tilt, аккордеон, вкладки кода и API-демо.
- `nginx.conf` — раздача файлов, защитные заголовки и прокси `/skillcred-api/*` на существующий API.
- `.github/workflows/deploy-frontend.yml` — сборка, минификация и подмножество локального Inter, упаковка сжатых файлов, безопасная активация с rollback и production-проверки.
- `scripts/skillcred-page-smoke.mjs`, `scripts/production-route-matrix.mjs`, `scripts/skillcred-proxy-smoke.mjs` — проверка разметки, маршрутов и настоящего цикла выпуска/проверки/отзыва.
- `.github/workflows/skillcred-lighthouse.yml` — Lighthouse на опубликованном мобильном и настольном вариантах; сырые отчёты хранятся как артефакты CI.

## Локальная проверка

Для локального просмотра используй Vite; прокси в `vite.config.ts` направляет `/skillcred-api` на текущий API, не добавляя токен издателя в браузер. Открой `http://localhost:4188/skillcred/`. Перед выкладкой проверь сборку и smoke-тест:

```sh
npm ci
npm run check
npm run build
npm run qa:skillcred
```

В продакшен-сборке пайплайн минифицирует CSS/JS, уменьшает файл Inter до используемых символов и создаёт .gz версии. Nginx выдаёт их по обычным URL `/skillcred/styles.css` и `/skillcred/app.js` с корректными MIME-типами и `Content-Encoding: gzip`; локальный просмотр при этом продолжает использовать обычные файлы.

## Публикация

Коммит и push в `master` запускают существующий workflow OSGARD. Он проверяет контрольную сумму архива, тестирует конфигурацию Nginx, активирует релиз, выполняет production route matrix и реальный сценарий `issue → verify ACTIVE → revoke → verify REVOKED`. Если обязательная проверка страницы или API не проходит, скрипт откатывает сайт и конфигурацию на предыдущую версию.

## Переменные окружения и секреты

- Лендингу не нужны секреты и не требуется новый API-ключ.
- `DEMO_ISSUER_TOKEN` — серверный секрет существующего API. Остаётся в настройках серверного сервиса; не добавляй его в HTML, JavaScript, `.env` с публичной сборкой или логи.
- Публичное демо должно использовать отдельного демо-издателя и синтетические данные. Не отправляй в демо настоящие удостоверения или персональные данные.
- Для удалённой публикации используются уже настроенные GitHub Secrets `OSGARD_DEPLOY_HOST`, `OSGARD_DEPLOY_USER` и `OSGARD_DEPLOY_KEY`; значения не хранятся в репозитории.

## Заменённые и удалённые файлы

Обновлены: `public/skillcred/index.html`, `public/skillcred/styles.css`, `public/skillcred/app.js`, `nginx.conf`, `vite.config.ts`, workflow деплоя, скрипты проверки и workflow Lighthouse. Для самого лендинга старые файлы не удалялись: существующие API-маршруты, бизнес-логика и отдельный API-сервис сохранены.
