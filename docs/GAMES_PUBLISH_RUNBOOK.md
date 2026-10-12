# OSGARD WORLD Games — запуск и публикация
Дата: 13 октября 2026 года

## Локальный запуск
1. Клонировать репозиторий и перейти на ветку feat/osgard-games-platform-premium.
2. Установить зависимости по существующему lock-файлу.
3. Запустить npm run qa:games-platform.
4. Запустить npm run check и npm run build.
5. Запустить npm run preflight:frontend и npm run qa:production-routes с настроенным OSGARD_BASE_URL на staging.
6. Для дополнительной проверки запустить npm run qa:null-shift и npm run qa:time-ui.

## Ключевые маршруты
- /games — React-каталог OSGARD.
- /game/:slug — индивидуальная страница игры с описанием, управлением и запуском.
- /games/time — отдельная точка входа игры Time.
- /games/swarm/index.html, /games/null-shift/index.html, /games/inherit/index.html и /games/remix/index.html — самостоятельные браузерные сборки.
- /entertainment, /entertainment/ и /entertainment/index.html — legacy URL; должны перенаправлять на /games.
- /games/null-shift-godot/ — legacy-адрес. Пока отдельный Godot Web export не опубликован, адрес указывает на существующую браузерную сборку; production-проверка не требует отсутствующих .wasm/.pck файлов.
- /privacy и /terms — правовая информация каталога.

## Production checklist
1. Дождаться успешного CI pull request.
2. На staging проверить /games, все пять detail routes, iframe и отдельные ссылки, share/favorites/recent, keyboard focus, согласие на аналитику и черновик email.
3. Проверить ширины 320/375/768/1280px, reduced-motion, ошибку отсутствующих игровых ресурсов и layout shift.
4. Проверить Content-Type статических ресурсов, canonical/SEO metadata, sitemap, старые URL и production route matrix.
5. Проверить реальные игровые сессии внутри iframe: загрузка HTML не доказывает, что Unity/WebGL или игровой цикл запущены.
6. Merge/deploy выполнять только через существующий контролируемый путь с credentials. Текущая работа не меняет production без подтверждённого deploy.

## Интеграции, которые требуют отдельного включения
- Рекламная сеть и publisher IDs.
- Rewarded-video callback, серверная проверка одноразовой награды и антифрод.
- Checkout/payment webhook, возвраты и server-side entitlements.
- OSGARD PREMIUM и подписочные права.
- Admin dashboard с RBAC/audit log.
- Серверная аналитика/dashboard, retention и paid acquisition.
- CRM/API заявок (сейчас форма готовит email, а не записывает lead на сервер).

Не помещать приватные ключи в React-код, public/ или игровые ассеты. Не выполнять live deploy без review и staging smoke.
