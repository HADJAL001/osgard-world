# OSGARD WORLD — аудит игровой платформы и план коммерциализации

Дата аудита: 13 октября 2026 года. Источник: текущий репозиторий \`HADJAL001/osgard-world\`, ветка \`master\`, код игр, сборки и публикации.

## 1. Реальная архитектура

| Область | Обнаружено | Практическое следствие |
|---|---|---|
| Портал | Vite 6, React 19, TypeScript; статика из \`public/\` копируется в production build | Игровую витрину можно отдавать статикой, не добавляя ещё один SPA |
| NULL//SHIFT | Godot-проект \`godot/null-shift/\`; CI устанавливает официальный Godot 4.7.2, проверяет проект и экспортирует Web-сборку в \`public/games/null-shift-godot/\`; рядом сохранён прежний WebGL-режим | Для production не нужен установленный движок: Godot ставит GitHub Actions во время сборки |
| SWARM | Самостоятельная браузерная игра в \`public/games/swarm/\`; deployment-документация описывает отдельный API комнат/матчей | Успешная загрузка HTML не гарантирует, что сетевой API работает |
| INHERIT | Самостоятельная HTML-игра, сохраняющая состояние в localStorage | Сохранение локальное, не межустройственное |
| REMIX | Страница матч-консоли и Unity/WebGL-ресурсы в \`public/games/remix/player/\`; API проксируется через \`/api/remix\` | Онлайн-матч зависит от backend REMIX |
| Империя времени | React/TypeScript-прототип \`src/TimePrototype.tsx\` на \`/games/time\` | Нужно честно показывать его как прототип, а не законченную большую стратегию |
| Игрок и события | Схема событий есть в \`src/core/manifest.ts\`; авторизованный клиент использует \`/api/v1/player/events\` | Не подтверждён анонимный публичный агрегирующий endpoint; в каталоге аналитика опциональна |
| Монетизация | В исследованном frontend нет подтверждённой рекламной сети или production checkout | Нельзя имитировать показы, клики, покупки или доход |

## 2. Что добавлено

- Статическая витрина \`/games/\` с оригинальной векторной графикой, геометрической эмблемой, SEO metadata и ItemList JSON-LD. Нет внешних шрифтовых CDN и стороннего аналитического скрипта.
- Пять реальных точек входа: \`/games/time\`, \`/games/swarm/\`, \`/games/null-shift-godot/\`, \`/games/inherit/\`, \`/games/remix/\`.
- Поиск, фильтры жанров, избранное и история последних запусков. Избранное и полка сохраняются в локальном браузере.
- Игровое окно с кнопками закрытия, полноэкранного режима и шаринга. Обычные ссылки на игры остаются в HTML как резервный маршрут, если JavaScript отключён.
- Десять проектов владельца показаны как собственные продукты OSGARD с UTM-параметрами. UTM помогает различить источник, но сама метка не подтверждает конверсию.
- Форма заявки формирует текст и открывает WhatsApp; введённые поля не передаются серверу каталога, пользователь отправляет сообщение вручную.
- Аналитика выключена по умолчанию. События `game_opened`, `share_created`, `game_session_started` и `game_session_completed` отправляются на существующий API только после явного согласия и при наличии токена входа. Каталог различает открытие карточки и подтверждённый старт: Godot после запуска движка, SWARM после начала игры, REMIX после создания матча, «Империя времени» после готовности сессии; INHERIT — после первого действия. Длительность считается по времени активной вкладки. Анонимная аналитика не включена.
- Созданы начальные страницы \`/privacy/\` и \`/terms/\`; добавляется smoke-тест каталога и проверка production routes.
- Старая витрина \`/entertainment\` остаётся доступной для совместимости, но главная навигация ведёт на \`/games/\`.

## 3. Что пока не следует считать реализованным

1. **Реклама:** нет подключённой и одобренной рекламной сети, publisher account, маркировки провайдера и серверной проверки reward callbacks.
2. **Платежи:** нет production checkout, проверки webhook-подписей, возвратов и серверной модели entitlements. Платный доступ нельзя выдавать по флагу в браузере.
3. **Публичная аналитика:** для гостей нужен отдельный endpoint с rate limiting, ограничением хранения, защитой от подделки и privacy review.
4. **Админ-панель:** нет подтверждённой CMS для управления каталогом и рекламными местами.
5. **Внешние сайты:** в этом окружении не удалось подтвердить доступность десяти внешних доменов из списка владельца из-за ограничений сетевого доступа. Ссылки внесены как предоставленные владельцем; они не обозначены как прошедшие независимую live-проверку.
6. **Игровое QA:** headless smoke и HTTP route matrix не заменяют ручную проверку сенсорного управления, fullscreen, реальной сетевой комнаты и игровых сессий на физических устройствах.
7. **Правовые тексты:** новые страницы — стартовый контент. Перед коммерческим запуском следует определить юридического оператора, юрисдикцию, конкретные сроки хранения и провести правовую проверку.

## 4. Финансовая модель — иллюстрации, не прогноз

Подтверждённой рекламной или платёжной выручки в исследованном frontend не найдено. Все параметры ниже — сценарные допущения, не рыночные данные и не гарантированный доход. Валюта: EUR в месяц.

Формулы:

- Запуски игр = визиты × доля посетителей, начавших игру.
- Реклама = визиты × доля запуска × сессии на запустившего × ad opportunities на сессию × fill rate × eCPM / 1000.
- Подписка = визиты × конверсия в подписку × цена.
- Покупки = визиты × конверсия в покупку × средний чек.
- Вклад заказной разработки = число лидов × конверсия лида в оплаченный проект × вклад одного проекта после прямых затрат.
- Условный операционный результат = реклама + подписка + покупки + вклад разработки − прямые операционные расходы.

| Допущение | Осторожный | Базовый | Оптимистичный |
|---|---:|---:|---:|
| Визиты в месяц | 10 000 | 50 000 | 200 000 |
| Доля запуска игры | 30% | 40% | 50% |
| Сессии на запустившего | 2 | 3 | 4 |
| Рекламные возможности на сессию | 1.5 | 1.5 | 1.5 |
| Fill rate | 20% | 50% | 80% |
| eCPM | €0.70 | €2.50 | €5.00 |
| Подписка: конверсия × цена | 0.05% × €3.99 | 0.30% × €4.99 | 0.50% × €5.99 |
| Покупка: конверсия × чек | 0.10% × €2.99 | 0.10% × €4.99 | 0.20% × €6.99 |
| Лиды разработки | 0.10% визитов | 0.25% визитов | 0.50% визитов |
| Лид → оплаченный проект | 5% | 10% | 15% |
| Вклад одного проекта после прямых затрат | €250 | €350 | €500 |
| Операционные расходы | €100 | €300 | €1 000 |

| Компонент | Осторожный | Базовый | Оптимистичный |
|---|---:|---:|---:|
| Реклама | €1.26 | €112.50 | €2 400.00 |
| Подписка | €19.95 | €748.50 | €5 990.00 |
| Покупки | €29.90 | €249.50 | €2 796.00 |
| Вклад разработки | €125.00 | €4 375.00 | €75 000.00 |
| Операционные расходы | −€100.00 | −€300.00 | −€1 000.00 |
| **Условный операционный результат** | **€76.11** | **€5 185.50** | **€85 186.00** |

Модель не учитывает налоги/VAT, платёжные комиссии, возвраты, стоимость привлечения, зарплаты команды и постоянные продуктовые расходы. Оптимистичный результат особенно чувствителен к конверсии заявок в заказную разработку. Не использовать цифры как обещание дохода или основу необратимых расходов до получения фактических данных.

## 5. Следующий порядок работ

1. Проверить каждую игру вручную на desktop/mobile: управление, сохранения, fullscreen, API online/offline и производительность.
2. Для аналитики гостей спроектировать отдельный endpoint, ограничения частоты и хранения; затем собирать агрегированные сессии.
3. Начать коммерческие тесты с явно маркированного спонсорства вне игрового поля после подтверждения аудитории и рекламодателя.
4. Только после сигнала готовности платить подключить одного провайдера, серверные webhook/entitlements и процесс возврата.
5. Через несколько недель реальных сессий заменить сценарные параметры фактическими данными об удержании, eCPM, расходах и лидах.

## 6. Фирменная система

- Обсидиановый фон \`#080a0b\`, графит \`#101315\`, лаймовый акцент \`#d3ff69\`, металлический текст \`#d2c9b4\`.
- Системный sans для интерфейса, serif для редакционных заголовков, моноширинные подписи для технических статусов.
- Оригинальная геометрическая эмблема и SVG favicon находятся в \`public/games/favicon.svg\`.
- Каталог: \`/games/\`; условия и конфиденциальность: \`/terms/\` и \`/privacy/\`.


## 7. Дополнение аудита — жизненный цикл игровых запусков

- Каталог различает открытие карточки и подтверждённый старт. Godot использует same-origin postMessage после успешного запуска WebAssembly; SWARM сообщает о переходе в игровое состояние; REMIX — после успешного создания серверного матча; «Империя времени» — после готовности сессии; INHERIT — после первого осмысленного действия.
- Если клиент не подтвердил загрузку за 35 секунд, интерфейс показывает ошибку и кнопку повтора. Для запуска Godot действует отдельный тайм-аут 60 секунд после начала загрузки. Ошибка запуска не считается успешной сессией.
- `game_session_completed` в каталоге означает завершение сессии каталога (например, закрытие игрового окна), а не гарантированную победу. Событие содержит длительность и причину завершения и отправляется только при согласии и действующем токене. «Империя времени» остаётся источником собственного серверного жизненного цикла, чтобы не дублировать события.
- Исправлен мобильный селектор полноэкранного диалога, который раньше не применялся к фактическому элементу `#player-dialog`.
- Smoke-тесты и production route matrix защищают handshake, тайм-аут, кнопку повтора, диагностику длительности и проверку источника/домена сообщений.

## 7. Контроль производительности опубликованной витрины

Добавлен отдельный workflow `.github/workflows/games-lighthouse.yml`. Он запускается после успешной публикации frontend и измеряет именно `https://osgard.world/games/` на мобильном профиле и desktop, сохраняя исходные Lighthouse JSON-отчёты на 14 дней. Он не подменяет smoke-тесты статических файлов и не влияет на то, была ли уже выполнена публикация: это послепубликационный монитор качества.

Стабильные guardrails:
- Mobile: Performance ≥ 85, Accessibility/Best Practices/SEO ≥ 90, Total Blocking Time ≤ 500 ms, LCP ≤ 4.0 s.
- Desktop: Performance ≥ 90, Accessibility/Best Practices/SEO ≥ 90, Total Blocking Time ≤ 300 ms, LCP ≤ 3.0 s.

Это нижние эксплуатационные границы, а не цель дизайна. Они намеренно не требуют ровно 100/100 на каждом прогоне, потому что Lighthouse зависит от сети, CPU и состояния кэша. Полные оценки и фактические метрики выводятся в логах и остаются в artifact; падение ниже guardrail всё равно завершает audit с ошибкой. Пороговые значения следует пересматривать после накопления стабильных измерений реального каталога.

Отдельный текущий аудит SkillCred не переносится на Games Hub: в последнем измеренном запуске SkillCred получил Mobile Performance 99/100, TBT 60 ms и LCP 2.1 s; desktop — 100/100. Это данные только для `/skillcred/`, а не результат измерения `/games/`.


## 7. Дополнительная проверка экосистемы — 13 октября 2026 года

После добавления игрового каталога проведён повторный source-level аудит связанных страниц:

- В корневой витрине заменены неподтверждённые числовые обещания о защите, времени подачи, экономии времени и точности на описания категорий/назначения продукта.
- Витрина «Миры» использует предоставленный владельцем домен разработки `osgardbewworld.com`, нейтральные ярлыки модулей и не использует старый адрес `osgardnewworld.com`.
- Основная витрина и страница «Разработка» перечисляют заданные владельцем проекты. Это подтверждает присутствие ссылок в исходном коде, а не доступность внешних сайтов.
- Страница «Миры» исправлена с устаревшего пути `/games/time-empire/` на текущую точку входа `/games/time`.
- Прямые действия контакта (email и WhatsApp) доступны в нижнем колонтитуле и в разделе разработки.
- Добавлен `scripts/ecosystem-integrity-smoke.mjs` с проверкой доменов, критичных маршрутов, контактов, согласия/авторизации для аналитики, проверки origin/source событий из iframe и списка запрещённых неподтверждённых рекламных формулировок.
- Новый smoke test подключён к frontend validation и deploy workflow. Это source/CI-проверка; внешние домены по-прежнему не считаются проверенными по доступности или безопасности без отдельной live-проверки.

Открытые ограничения: серверная аналитика для анонимных посетителей, рекламная сеть/rewarded video, безопасный checkout и административная CMS по-прежнему не подключены. Их нельзя считать реализованными только из-за наличия блоков витрины.


## 7. Operator console and API routing — follow-up iteration

The feature branch `fix/osgard-api-proxy-and-admin-analytics-checks` adds a missing Nginx route for the documented internal `osgard-game-api` service and a non-indexed `/games/admin/` LiveOps page.

- Nginx routes `/api/v1/*` to `osgard-game-api:4317` before the SPA fallback. Requests are limited per client IP (15 requests/second with a burst of 30; HTTP 429 on excess), bodies are capped at 256 KiB and upstream connect/read/write times are bounded.
- The API response is explicitly non-cacheable. Nginx never injects a bearer or moderation token; existing API-side authentication/authorization remains the decision point.
- The LiveOps page accepts the existing `MODERATION_ADMIN_TOKEN` through an operator-controlled password field. It sends that token only as `X-Moderation-Token`, keeps it in JavaScript memory for that tab, and does not write it to localStorage/sessionStorage.
- It reads the documented protected endpoints for aggregate summary, cohorts, snapshots and anonymized JSONL export. The page states that it does **not** measure anonymous site visits, ad impressions/eCPM, contact leads, purchases or revenue. No metrics are fabricated.
- CI/source checks now require the proxy route and protective limits, check the admin page's no-index/token-storage contract, and extend the post-deploy route matrix to require JSON 401/403 responses from protected endpoints when no credentials are sent. This detects an API silently falling through to the SPA and returning HTML with HTTP 200.

**Release condition:** the Nginx route is source-validated in CI; the authenticated production endpoint still needs to be exercised against the real API deployment after publication, including a negative test with no token and a successful request with the correct operator token. The operator must separately provision a strong `MODERATION_ADMIN_TOKEN` in server environment configuration. The value must never be committed or embedded in this page.


## 8. Sponsor inventory editing — local export, not a server CMS

The page `/games/admin/partners/` is a no-index content tool for the existing versioned partner inventory JSON. It edits only the local in-memory copy of `public/games/partners/inventory.json`, validates IDs/lengths/schema, and downloads a reviewed `inventory.json) for a regular code review and deployment.

The export path forces `active: false), `sponsorLabelRequired: true), `commercialStatus: inquiry_only), EUR currency, and permitted status values. A placement cannot be activated by changing the browser payload. No data is written back to the server, no partner is shown as an active advertiser, and no analytics/ad callbacks are generated by this tool. A true server-backed CMS needs authenticated write endpoints, audit logs, CSRF protection and explicit operator roles.


## Дополнение — индивидуальные игровые страницы и сценарная экономика (13 октября 2026)

- Добавлены React-маршруты `/game/:slug` для пяти игр. Страница показывает описание, жанр, управление, особенности, поддержку устройств, локальное избранное, sharing/fullscreen, встроенный запуск с ограниченным ожиданием готовности и ссылку для самостоятельного запуска при ошибке. Для неизвестного slug предусмотрено состояние 404.
- В каталоге у каждой карточки появилась отдельная ссылка «Подробнее»; она не перехватывает действие «Играть». Canonical, Open Graph и JSON-LD формируются для детальных URL; все игровые страницы включены в sitemap.
- Добавлен локальный калькулятор `/games/monetization/`: три сценария с редактируемыми допущениями, явные формулы, оценка рекламных показов, условных покупок, заявок/разработки, комиссий и расходов, экспорт JSON. Поля обрабатываются в браузере и не отправляются на сервер.
- Модель явно маркирует значения как допущения. Она не считывает фактическую аналитику сайта и не подтверждает реальные доходы; рекламная сеть, checkout и платные права доступа остаются не подключены.
- Smoke-тесты и production-route проверки покрывают новые страницы и сценарную модель. CI запускает эти проверки перед сборкой и публикацией.

- Детальные страницы покрывают все девять текущих игр: пять исходных, SIGNAL RUN, CIVIC CASCADE, PATINA Atelier и CASCADE LAB. CASCADE LAB — локальная физическая головоломка; её физика остаётся игровой моделью, а не проверенным инженерным симулятором. Показатели игр не выдаются за реальные лабораторные измерения.


## Дополнение — локальный режим INHERIT и завершение игровых сессий

- В публичной INHERIT-сборке адрес общего мира задаётся через `meta[name="osgard-inherit-api-base"]` и пуст по умолчанию. Без совместимого API игра сохраняет изменения локально и не отправляет запросы на localhost.
- Dev-only запрос аналитики к `127.0.0.1:4175` удалён. Это не означает, что общий мир INHERIT уже подключён к production: для него нужен совместимый API-адаптер и проверка контракта.
- Рекомендации в игровом окне отображаются только после same-origin сообщения `completed` от активного iframe. Закрытие окна и ошибка загрузки не приравниваются к завершению.
- Сигналы завершения добавлены в Godot-клиент NULL//SHIFT, его резервную WebGL-версию, SWARM, серверный результат REMIX, терминальное состояние «Империи времени» и передачу поколения INHERIT; остальные игры используют собственные lifecycle-сигналы.
- Добавлены поведенческий smoke-тест рекомендаций и проверка доставки двух новых self-hosted ресурсов в production route matrix.


## NULL//SHIFT — daily challenges, sharing and cosmetic economy

A new Godot-native growth slice is implemented and covered by the headless runtime test:

- The daily challenge identifier encodes the UTC date and its deterministic contract. The game validates the code before applying the contract, then includes it in a shareable URL to the Godot route.
- A successful current-day challenge completion grants 400 local career credits once for that UTC date. Old links remain playable without the current-day reward. Pressing Share itself grants nothing.
- The result card reports mission output and exposes the Web Share API plus clipboard/prompt fallback.
- The local Style Vault sells two suit looks for earned credits: Amber 450 and Violet 750. They only alter the operator material and do not affect health, weapon damage, pulse, dash or enemy behavior.
- The prototype does not pretend to have payments, purchase verification, referral conversion accounting or global leaderboards. Those need an authoritative service and actual provider integration before cash sales.

### Commercial sequence

1. Measure first-run start, successful extraction, D1/D7 retention, challenge completion and share-link opens; only aggregate analytics with the appropriate consent.
2. Add server-verified invite rewards after a referred player completes a real mission, not after a click.
3. Test a one-time cosmetic supporter pack only after checkout, signed webhooks, entitlement persistence and refunds are operational.
4. Measure net revenue after fees/refunds and acquisition cost. A million-dollar outcome is a goal, not a forecast or promise.


## Каталог 10/10 — завершена детальная страница AFTERIMAGE//RUN

- Добавлена запись паспорта игры с фактическим daily seed, препятствиями, SIGNAL SHARDS, PHASE DASH и локальным ghost-маршрутом.
- Управление сверено с кодом Canvas: Space / Arrow Up / касание — прыжок, Shift или сенсорная кнопка — dash, Escape — пауза.
- Сохранение указано как локальное; облачная синхронизация и глобальный серверный рейтинг не обещаются.
- Карточка использует отдельный URL «Подробнее» `/game/afterimage-run`, запуск остаётся на `/games/afterimage-run/`.
- Расширены `qa:games-detail`, production route matrix и sitemap; iframe readiness распознаёт реальный title AFTERIMAGE//RUN.

## Follow-up — read-only Games operations diagnostics (13 October 2026)

- Added /games/operations/, a no-index, read-only operations page with a premium OSGARD interface. It runs 19 same-origin route contracts: the catalogue, ten distinct game entries plus the separate NULL//SHIFT WebGL fallback, the scenario economy page, partner editor, LiveOps page, privacy/terms, public commerce configuration, and the unauthenticated analytics boundary.
- Every route probe is a bounded GET with credentials omitted, cache disabled, an eight-second abort timeout and checks for HTTP status, content type and a route-specific marker. This catches common SPA-fallback false positives; it still does not prove runtime playability or correct touch input.
- The protected analytics probe sends no token and must return JSON HTTP 401/403. An HTML 200 fallback is treated as a failure. No write requests, analytics events, browser storage or third-party assets are used.
- The operator can download or copy a local JSON report with check timestamp, HTTP status, latency and explanatory status. No report is uploaded by the page.
- A blank `apiBaseUrl` in `commerce-config.json` now triggers a restricted same-origin `/commerce-api/healthz` probe with credentials omitted. Browser clients use the private first-party path only if the response identifies `service: "osgard-commerce-api"` and `databaseReady: true`; otherwise they remain in fail-closed mode and lead forms retain the disclosed WhatsApp fallback. A successful health probe only establishes API/database readiness — it does **not** confirm checkout, Stripe webhook setup, paid premium or external ad-network approval. The Operations and protected Commerce panels display the distinction.
- Added scripts/games-operations-smoke.mjs, npm run qa:games-operations, a pre-deploy check, and /games/operations/ to the production route matrix. A pull-request CI workflow also type-checks and runs the Games smoke suite before merge.
- This improves release observability, not the currently documented commercial limitations: ad network approval, production checkout/payment webhooks, a server-backed CMS and manual physical-device gameplay verification remain separate release tasks.

### Production verification follow-up — 13 October 2026

- The first post-deploy matrix executed 150 route/device checks; six failed. Investigation separated two causes: the new Operations route returned HTTP 200 but had no explicit shell contract in the matrix, and the consented analytics asset was minified by esbuild while the matrix required source-format spaces and an exact optional-chain expression.
- The Operations route now has an explicit contract: page title, run control, route target declaration, report schema and same-origin credential policy must be present.
- Production consent analytics validation now checks stable public markers that survive minification (queue/consent keys, allowed event names, API endpoint and exported surface). The detailed unit smoke continues to test the original queue limits and acknowledgement/retry/consent behavior.
- The route-matrix smoke suite asserts that the production checker recognizes Operations explicitly and does not regress to minifier-fragile formatting assertions.
- The server activation step completed, but that release's production route verification failed on the six checks above. The follow-up CI and deployment must pass the full desktop/mobile matrix before this release can be treated as verified. This correction is a release-pipeline repair, not a claim that all production checks have already passed.


## OSGARD SELECT — intermission, owned-service promotion and referral reward (13 October 2026)

The current Games hub includes a first-party “between worlds” promotion surface. This is a promotion for services owned by OSGARD, not an external advertising network integration.

- **Cadence:** first-time preferences default to `frequency: 'each'` and all currently available OSGARD services selected. The user may change to every third completed round, turn the collection off, choose individual services, or save one preferred spotlight. Preferences are stored locally under `osgard.games.postgame-service-preferences.v1`; the selected spotlight can be saved under `osgard.games.preferred-service.v1`.
- **Choices:** OSGARD BEW WORLD, O2 SYSTEM, SENJORIO, SUPERDAY, MARCOSA, MYOSA, GOLD GLAMOUR, GARD VPN, OSGARD OS and OSGARD VANGUARD STUDIO. Descriptions and placements use the first-party catalogue entries; no third-party advertiser is fabricated.
- **Presentation:** one context-selected spotlight, quick-pick controls, a categorized service directory, per-service preferences, “another project” and skip controls. Links are voluntary, are explicitly disclosed as OSGARD advertising, open in a separate tab and carry `utm_source=osgard_games`, `utm_medium=post_game`, campaign and service/game attribution. The intermission is shown after a real recognized gameplay session-end event, not simply after the iframe's HTML `load` event.
- **Referral action:** the post-game reward area provides native share plus Telegram, WhatsApp, VK, X and Facebook share links. Copying alone never grants the reward. Following a share action, the user must explicitly self-confirm an actual post. Social networks do not send OSGARD a trusted publication-verification signal in this implementation, so the event is marked as player-confirmed rather than verified by the platform.
- **Reward limits:** `+50 SHARDS` is a browser/device-local reward, limited to once per UTC day for the local wallet. It has no cash value and is not a payment or a transferable entitlement. The wallet is shared with SIGNAL RUN, where 100 SHARDS can unlock the cosmetic GOLD SIGNAL palette; this changes presentation only and grants no gameplay advantage.
- **Analytics:** the intermission event types are on the existing consent allow-list. Owned-promotion impressions require consent, at least 50% visibility for one second, a visible foreground tab and an available tracking queue. No third-party ad SDK or fictional ad impressions are used. The public `public/games/commerce-config.json` currently has an empty `apiBaseUrl`; therefore server-side commerce/analytics delivery remains unconfigured until the deployed same-origin Commerce API is health-checked and explicitly enabled. Do not set that URL just because the Nginx proxy configuration exists.
- **Test coverage:** `npm run qa:games-portal`, `npm run qa:osgard-select` and `npm run qa:consented-analytics-queue` enforce the service destinations, shared preference keys, default cadence, self-confirmation, local daily cap, analytics allow-list and no-copy-reward rule.

The important commercial boundary remains: owned-service cross-promotion is implemented; an external ad network, independently verified social post, and server-authoritative/cross-device SHARDS wallet are not claimed as live features.


## 10. Пакет из 30 улучшений — игровые страницы и учёт сессий

Реализация вынесена в [GAME_DETAIL_30_IMPROVEMENTS.md](./GAME_DETAIL_30_IMPROVEMENTS.md). Пакет добавляет проверку lifecycle-сообщений игрового iframe, таймер без учёта пауз и фоновой вкладки, восстановление после ошибки, клавиатурный фокус, корректное состояние fullscreen, сохранение языка и межвкладочную синхронизацию пользовательских настроек. Runtime-smoke содержит 37 детерминированных сценариев и включён в frontend CI, deploy smoke и release-readiness. Изменения находятся в отдельной ветке; факт публикации подтвердится только реальным результатом deploy workflow.

## Publication readiness review — 14 October 2026

This addendum is based on a source-level audit of `HADJAL001/osgard-world` on the `master` branch and the release workflows present in the repository. It is not, by itself, proof that the newest release is currently serving production traffic.

### Checklist

- [x] Repository access confirmed; default branch is `master`, and the linked account has push/admin permissions.
- [x] Existing production deployment workflow is present: `.github/workflows/deploy-frontend.yml`. It serializes deploys, runs build/QA and release-archive checks, then uses protected GitHub Actions secrets for remote activation.
- [x] Existing post-deploy readiness workflow is present: `.github/workflows/release-readiness.yml`. It can run a production route matrix after a successful deploy.
- [x] The public game portal declares 11 games, with catalog search/filtering, recent sessions/favorites, individual game routes, share assets, mobile/PWA support and SEO metadata in source.
- [x] Owned-project cross-promotion and attribution are implemented in source; destination links are owner-listed and clearly treated as owned services.
- [x] Optional analytics is consent-gated in source. Source contracts distinguish card-open, successful game start and session-end events rather than treating an iframe load as a successful session.
- [x] Scheduled external-project homepage checks and conservative paid-promotion gates exist. A successful HTTP response never automatically approves a destination for paid campaigns.
- [ ] Production release is not marked verified by this addendum; the corresponding deployment and post-deploy route-check workflow must complete successfully.
- [ ] Live ad-network revenue is not enabled/verified. A publisher account, provider approval, consent review and real ad-slot validation remain external requirements.
- [ ] Live checkout, server-authoritative purchases and subscription entitlements are not enabled/verified. A payment provider, secret configuration, signed webhooks, refunds and entitlement lifecycle tests remain required.
- [ ] External-project pages still require manual review of product function, domain control, privacy/terms and key user flows before paid promotion.
- [ ] Privacy/terms pages are initial product copy, not a claim of legal compliance; identify the operator/jurisdiction, retention rules and obtain legal review before commercial scale.

### Release decision

**Source architecture: READY FOR CI REVIEW. Production: UNVERIFIED UNTIL WORKFLOW EVIDENCE IS GREEN. Paid ads and live payments: NOT READY.**

The approved publication sequence is: run the pull-request quality gates and external homepage audit; merge only after the relevant CI checks are successful; let the existing master-branch deployment workflow build and activate the release; then use the post-deploy readiness report/route matrix to mark production verified. Do not bypass the release gate or place provider secrets in client-side code.

### One high-potential product experiment

Prioritize a **cross-game “OSGARD Relay”** over building more portal UI: one daily challenge chain that starts in one title and sends a player to a second title only after a real gameplay milestone, with a shareable invite code and a small cosmetic-only local reward. Instrument the funnel as `relay_seen → game_1_started → milestone_reached → game_2_started → invite_accepted → D7_return`. Keep it opt-in, no pay-to-win, no forced ad, and label local rewards as local until a server-authoritative wallet exists. A first controlled experiment should compare this chain with the current single-game end screen and decide from completed second-game sessions and seven-day return—not click count alone.


## OSGARD Relay — двухигровой эксперимент (16 октября 2026)

- В каталог добавляется добровольный маршрут через две совместимые игры. Игрок сам выбирает первую игру; продолжение становится доступно лишь после сигнала `completed` от активного same-origin iframe и только если подтверждена реальная игровая сессия.
- Вторая игра выбирается из заранее определённых совместимых пар. Случайное открытие другой игры, закрытие сессии и перезагрузка активного этапа не дают награду и помечают/сбрасывают маршрут как прерванный.
- После двух подтверждённых завершений появляется косметический знак Relay Trail. Он записывается только в локальное хранилище этого браузера; это не серверный предмет, не платёжное средство и не переносимый баланс.
- Код приглашения содержит только случайный короткий код и пару игр, не имя отправителя. Интерфейс не утверждает, что системный Share доставил ссылку; пригласивший/получатель должны совершить явные действия.
- События Relay добавлены в клиентский allow-list consent-gated analytics и серверный allow-list. Без действующего согласия Relay не отправляет аналитику; сам модуль не делает прямых сетевых вызовов.
- Smoke-тест покрывает переходы состояния, неправильные пары, отказ от завершения до реального старта, прерывание маршрута, схему приглашения и локальный характер награды. Это продуктовый эксперимент, а не подтверждение удержания или коммерческого успеха.
