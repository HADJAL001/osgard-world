# OSGARD WORLD Games — запуск и публикация
Дата: 13 октября 2026 года

## Локальный запуск
1. Клонировать репозиторий и перейти на ветку `feat/osgard-games-hub-clean`.
2. Установить зависимости по существующему lock-файлу.
3. Запустить `npm run qa:games-portal` — проверка статической игровой витрины и lifecycle-контроллера.
4. Запустить `npm run qa:games-platform` — проверка связки каталога, пяти страниц игры, маршрутов, правовой информации и устаревших ссылок.
5. Запустить `npm run check` и `npm run build`.
6. Запустить `npm run preflight:frontend` и `npm run qa:production-routes` с настроенным `OSGARD_BASE_URL` на staging.
7. Дополнительные игровые проверки: `npm run qa:null-shift` и `npm run qa:time-ui`.

## Маршруты и архитектура
- `/games/` — текущая статическая игровая витрина `public/games/index.html`. Не монтировать второй React-каталог по тому же адресу: Nginx сначала отдаёт существующие статические файлы.
- `/game/time`, `/game/swarm`, `/game/null-shift`, `/game/inherit`, `/game/remix` — индивидуальные React-страницы из `src/GamesHub.tsx`, включая описание, управление, запуск, fullscreen и отдельную ссылку.
- `/games/time` — интерактивная React-игра «Империя времени».
- `/games/swarm/index.html`, `/games/null-shift/index.html`, `/games/inherit/index.html` и `/games/remix/index.html` — самостоятельные браузерные сборки.
- `/entertainment`, `/entertainment/` и `/entertainment/index.html` — старые адреса, перенаправляемые на `/games/`.
- `/games/null-shift-godot/` и связанные старые URL — перенаправляемые адреса. Отдельный Godot Web export по этому публичному пути не подтверждён; основная точка запуска — имеющаяся браузерная сборка.
- `/privacy/` и `/terms/` — статические черновики правовых документов.

## Перед публикацией
1. Убедиться, что GitHub Actions для pull request завершились успешно на актуальном commit SHA.
2. На staging проверить `/games/`, все пять detail-страниц, iframe и standalone-ссылки, поиск/фильтры, избранное/историю, fullscreen, share и состояния ошибки.
3. Проверить ширины 320, 375, 768 и 1280 px, клавиатурный фокус и `prefers-reduced-motion`.
4. Проверить `Content-Type` статики, canonical/SEO metadata, sitemap, favicon и переходы со старых URL.
5. Проверить реальные игровые сессии на desktop и mobile. Событие `iframe load` означает только загрузку HTML, а не готовность движка или завершение игрового раунда.
6. Выполнять merge/deploy через существующий контролируемый release-процесс, используя deployment credentials. Эта работа не обновляет production сама по себе.

## Не включено в текущую версию
- Рекламная сеть и publisher IDs.
- Rewarded-video callback, server-side выдача одноразовой награды и защита от replay.
- Checkout, webhook оплаты, возвраты и серверные права доступа.
- Подписка OSGARD PREMIUM.
- Защищённая админ-панель.
- Сводная аналитика на сервере и dashboard удержания/выручки.
- Серверная форма заявок/CRM: текущая форма готовит текст для WhatsApp/email, а не сохраняет лид на сервере.

Не помещать секреты в React-код, `public/` или игровые ассеты. Не объявлять коммерческую/правовую готовность до проверки рекламных правил, оператора данных, платежей и правовых документов.
