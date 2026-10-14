# AFTERIMAGE//RUN — growth & monetization plan

## Product pitch
A compact sci-fi precision runner in OSGARD PLAY: the same UTC daily seed for everyone, a personal best/ghost, a challenge URL carrying the seed and score, share-result image, and a cosmetic SIGNAL SHARD that can be claimed once per UTC day only after the player explicitly confirms they published a share; opening a composer or copying a link does not award it. The game explicitly tells the player that the actual public post is not verified.

## Viral loop to measure
1. A player starts from the OSGARD games catalog or Entertainment.
2. The daily seed and score make a compact challenge ("beat this route / beat this score").
3. Native share or Telegram, VK, X, WhatsApp and copy-link buttons create a route-specific challenge URL.
4. The recipient lands on the same date/seed, plays their run and can share their result.
5. A non-transferable, cosmetic shard provides a small in-game acknowledgement. It does not alter speed, score, or paid rights.

The share incentive requires explicit player confirmation after a share flow; the application cannot independently verify that a public post appeared. Client-only localStorage is easy to reset and is not anti-fraud. Before offering tradable/paid value or a referral payout, implement server-side invite attribution, idempotent referral records, account/abuse controls, and require a qualified referred player's first completed session. The local shard is cosmetic-only.

## Owned-service intermission
On closing an embedded game session, show one optional luxury cross-promotion panel containing the ten OSGARD-owned products. The player chooses a specific card then explicitly opens that destination, or dismisses the intermission. Each link carries:
- \`utm_source=osgard_games\`
- \`utm_medium=intermission\`
- \`utm_campaign=ecosystem_cross_promo\`
- \`utm_content=<service-id>\`

The panel is not a third-party advertising network, not a paid impression, and must be identified as owned-project cross-promotion. Events are sent only when the platform's existing consent flag is affirmative and a valid authenticated token is present. No personal data is added to UTM parameters.

## Monetization ladder
1. **Now — owned-service referrals and qualified development inquiries.** Track actual outbound clicks, brief form drafts and submitted/qualified leads separately. A click is not revenue; a mail draft is not a submitted lead. Follow attribution in a CRM and measure closed contracts/contribution margin.
2. **After a user cohort is observed — clearly labeled partner placements.** Sell a defined campaign, date window, context, geography, frequency cap and report. Separate advertiser creatives from owned-project cards. Do not log fake impressions/clicks.
3. **After an ad provider approves the property — optional rewarded video on selected browser games.** Prompt only at a safe break, offer a defined non-cash/non-transferable game reward and an equally functional "No thanks" path. Grant the reward only after the provider's signed/server-side completion callback is validated and deduplicated.
4. **After repeat-use evidence — premium content/one-time unlocks.** Sell additional tracks, game modes, aesthetics or a supporter pack. Store rights/receipts server-side; don't let a client flag confer paid access.
5. **Only after multiple games and recurring value exist — OSGARD PREMIUM.** Test clear alternatives such as ad-free browser catalogue, premium missions or a cross-game bundle. Prices in test pages are hypotheses, not "market prices". Avoid subscriptions until churn, content cadence, refunds and cancellation are understood.

### Platform constraints
- Cross-promoting the owner's own sites is the current model; it is not counted as revenue until a real conversion is attributed.
- For Google-served rewarded ads, the user must clearly opt in; skipped ads must not block normal use and the promised reward must be delivered. For any rewarded integration, use server-side verification and deduplicate the callback transaction. Official policy/docs: https://support.google.com/admob/answer/7313578 and https://support.google.com/admob/answer/9603226
- Do not ship a paid-ad or rewarded-ad business model inside a Steam build. Steam's rules disallow paid advertising in games, including advertising-based access and rewards for ad engagement; cross-promotion is a different supported category. See https://partner.steamgames.com/doc/marketing/advertising

## $1,000,000 arithmetic — not a forecast
No user count, eCPM, store conversion or service-close rate has been proven for this project yet. The following equations explain the scale required; they are not expected results:

- Ads: at an *assumed* net eCPM of $2.50, $1m / $2.50 × 1,000 = 400,000,000 billable impressions before fixed costs, taxes, refunds and overhead.
- Direct product sales: at $10 net contribution per purchase, 100,000 completed purchases yield $1m contribution before fixed costs.
- Development services: at $4,000 contribution margin per closed project, 250 projects yield $1m contribution before general overhead and taxes. Leads needed depend on the observed close rate.
- A mixed model should add only measured net contributions; do not sum page views, outbound clicks and drafted emails as if they were money.

## Measurement plan
Track, respecting existing consent/auth rules:
- catalog visit -> game open -> successful engine handshake -> completed session;
- session duration, crash/load failures and day-1/day-7 return cohorts;
- share intent by method, challenge landing, challenge-start and referred-session completion;
- intermission shown, chosen service, CTA click, destination UTM, qualified lead, closed contract and contribution margin;
- later: ad request/fill/viewable completion, verified rewarded callback, purchases, refunds and entitlements.

Minimum useful release experiment:
- Recruit 20–30 external playtesters, including users who have not watched the developer play.
- Compare the same build with/without the post-run share prompt; evaluate completion, replay and share-initiation rates, not just button clicks.
- Check whether users understand the daily seed and challenge without a verbal explanation.
- Audit whether the intermission is dismissible, one click from choice to destination, mobile-readable and never rendered over a live run.
- Keep the promotion-frequency choice test separate from game-balance testing.

## Release boundaries
The first release uses local personal-best data and a locally stored cosmetic shard. It has no public leaderboard, cross-device save, ad SDK, payment processor or server-backed referral reward. The intermission is owned-service cross-promotion, not third-party ads. Activate server-backed monetization only after accounts, provider approval, webhook/signature validation, consent and refund handling exist.

## AFTERIMAGE//RUN v1.5.0 — пакет из 30 улучшений (14 октября 2026)

Это технический релиз-кандидат. Изменения сгруппированы по эффекту для игрока, честности рекордов и поддержки игры; они не являются обещанием коммерческого результата.

### 30 улучшений

1. Ежедневная дата seed проверяется как настоящая календарная дата UTC, а не только по формату строки.
2. Целевой счёт из ссылки проходит проверку безопасного целого и ограничение диапазона.
3. Победа над вызовом засчитывается только при результате **строго выше** указанной цели.
4. Вызов формируется через канонический маршрут приглашения OSGARD.
5. Реферальный код проверяется и при необходимости создаётся безопасный локальный fallback.
6. UTM-метки и код приглашения сохраняются в допустимой цепочке переходов.
7. Случайность трассы отделена от визуальной случайности, поэтому частицы и дрожание камеры не переставляют препятствия.
8. Повтор использует тот же seed и сбрасывает оба генератора случайных чисел.
9. Устранён дублирующийся reset(), который раньше мог переопределять часть состояния.
10. PNG-карточка результата содержит короткий маршрут, дневной seed и корректный целевой счёт.
11. Добавлены отдельные способы распространения: системный Share, Telegram, VK, X, WhatsApp, Facebook и копирование ссылки.
12. Косметическая награда появляется только после отдельного подтверждения пользователя; открытие окна публикации само по себе её не выдаёт.
13. SIGNAL SHARD ограничена одной локальной наградой на текущую UTC-дату, с обработкой ошибок localStorage.
14. Подтверждённая косметика включает золотой световой след и сохраняется локально.
15. Игровая анимация использует единственный управляемый requestAnimationFrame scheduler.
16. Простой фоновый рендер ограничен примерно 24 кадрами в секунду.
17. Таймеры и кадры отменяются при сбросе, сворачивании вкладки и уходе со страницы.
18. Забег автоматически ставится на паузу при скрытии вкладки.
19. Поддерживается prefers-reduced-motion.
20. Холст перерисовывается на HiDPI-буфере с ограничением коэффициента масштаба до 2.5.
21. После изменения размеров окна холст пересчитывает backing resolution и масштаб координат.
22. Игровые события отправляются с соблюдением существующего согласия и авторизации; встроенная игра не дублирует события start/completed, которые регистрирует родительский интерфейс.
23. На экране есть отдельная кнопка прыжка для сенсорных устройств.
24. Добавлено короткое окно jump-buffer, чтобы не терять ввод рядом с моментом приземления.
25. Синтезированные звуковые эффекты выключены по умолчанию и управляются настройкой; внешние аудиофайлы не требуются.
26. Тактильный отклик — отдельная добровольная настройка и используется только при наличии navigator.vibrate.
27. Режим Focus увеличивает расстояния между препятствиями и снижает скорость, но явно помечает попытку как тренировочную и не перезаписывает рейтинговый рекорд.
28. Индикатор цели показывает прогресс сбора шести осколков и сообщает о достижении 3/6 и 6/6.
29. Добавлены высококонтрастная палитра, полноэкранный режим и дополнительные горячие клавиши (P, R, Escape).
30. Экспортируется локальный диагностический JSON с seed, счётом, дистанцией, длительностью, осколками, пиками комбо, рывками, режимом, целевым счётом и фактом сохранения рекорда. Имя, email, токен или user-agent в отчёт не включаются.

### Как монетизация соединена с игрой

- **Сейчас:** существующий OSGARD SELECT остаётся единственной межигровой витриной собственных сервисов. Пользователь выбирает проект или пропускает экран. Переходы размечаются UTM, но считаются доходом только после фактически атрибутированной продажи или закрытого контракта.
- **Не включено:** внешняя рекламная сеть, платные покупки, подписка и выплата за репост. В v1.5.0 SIGNAL SHARD — локальная косметика, не денежная ценность.
- **Следующий коммерческий эксперимент:** сравнить долю завершённых забегов и повторных попыток с обычным экраном результата против экрана с вызовом другу. Отдельно измерять открытие social composer, переход реферала, его старт и завершённый забег; эти этапы не считать взаимозаменяемыми.
- **Миллион долларов:** это цель, а не прогноз. Вести отдельно реальные рекламные выплаты, завершённые покупки, атрибутированные квалифицированные заявки и маржу закрытых проектов. Просмотры, клики и нажатия «поделиться» не прибавлять к выручке.
