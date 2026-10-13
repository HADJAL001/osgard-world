# AFTERIMAGE//RUN — growth & monetization plan

## Product pitch
A compact sci-fi precision runner in OSGARD PLAY: a UTC daily seed, local personal best/ghost, a challenge URL carrying the seed and target score, result-card export, and a cosmetic SIGNAL SHARD. The game only offers the reward after the player opens a share destination/native share sheet and separately confirms that they posted. The platform cannot verify the public post; clipboard copy alone does not earn the reward.

## Viral loop to measure
1. A player starts from the OSGARD games catalog or Entertainment.
2. The daily seed and score make a compact challenge ("beat this route / beat this score").
3. Native share or Telegram, VK, X, WhatsApp and copy-link buttons create a route-specific challenge URL.
4. The recipient lands on the same date/seed, plays their run and can share their result.
5. After opening a share destination, the player must explicitly press “I published” to claim a non-transferable cosmetic shard. Copying the link by itself never grants the reward. It does not alter speed, score or paid rights.

The share reward is a self-confirmed, cosmetic acknowledgement—not proof that a post was published. Client-only localStorage is easy to reset and is not anti-fraud, so the local SIGNAL SHARD must have no monetary, transferable or referral-credit value. Before offering paid/transferable value, implement server-side invite attribution, idempotent referral records, account/abuse controls and require a qualified referred player's first completed session.

## Gameplay integrity hardening
- Gameplay obstacle generation and cosmetic randomness use separate seeded generators, so particles, background stars and camera shake do not consume the daily obstacle sequence.
- Restart resets both streams. The challenge is considered beaten only when the score is strictly higher than the target score, not equal.
- The exported PNG uses URL parameters for the daily seed and target score, so a result card points to a valid challenge URL rather than a malformed query string.
- Completion analytics use the platform's core `game_session_started` and `game_session_completed` names, with `fromChallenge`, `targetScore`, `challengeBeaten`, and `dashesUsed` in the payload. Social channels, link-copy events and result-card exports use the existing event vocabulary; no new ad impressions or fake referral wins are generated.

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
The first release uses local personal-best data and a locally stored cosmetic shard that requires a player confirmation after a share flow; copying a link alone does not grant it. It has no public leaderboard, cross-device save, ad SDK, payment processor or server-backed referral reward. The intermission is owned-service cross-promotion, not third-party ads. Activate server-backed monetization only after accounts, provider approval, webhook/signature validation, consent and refund handling exist.
## Rich invite preview и измеримая вирусная воронка

Ссылка после забега ведёт на отдельную страницу приглашения AFTERIMAGE//RUN, для которой сборка генерирует Open Graph/Twitter PNG 1200×630. Это нужно, чтобы соцсеть показывала карточку игры, а не голый URL или случайный кадр. CTA приглашения открывает игру напрямую с теми же daily seed и target score.

Челлендж валидируется в двух местах: ссылка-превью проверяет режим daily, календарную дату и ограниченный целый score; сама игра повторно проверяет входящий UTC seed. Если данные повреждены, челлендж не используется. Валидный referral code и стандартные UTM-параметры сохраняются при переходе. Аналитика отправляет только разрешённые event-поля, а OSGARD consent/auth механика остаётся источником правды.

### Воронка, которую нужно считать раздельно

1. `game_session_started` → сколько людей реально начали забег.
2. `game_session_completed` → сколько завершили и их длительность/счёт.
3. `challenge_created` / `share_dialog_opened` / `share_link_copied` → отдельно намерение поделиться и копирование.
4. `referral_link_opened` → сколько приглашённых открыли share landing с валидным referral-кодом и требуемым согласием.
5. Подтверждённый старт приглашённого → завершённая сессия → повторное посещение.
6. Для cross-promo: показ OSGARD SELECT → выбранный проект → CTA click с UTM → заявка/квалифицированный лид → реальный контракт и маржа.

Переход по ссылке — не новый пользователь; клик по сервису — не лид; форма, созданная локально, — не отправленная заявка; share intent — не подтверждённый публичный пост. Не суммировать эти события с доходом.

### Практический пилот

- Собрать первую когорту из 100 реальных посетителей, либо вести измерение 14 дней, если трафик пока мал. Это ориентир для первичной диагностики, не статистическое доказательство успеха.
- Сравнить долю начавших забег, завершение, добровольную повторную попытку, открытие share-sheet и валидный вход приглашённого. Отдельно измерить мобильные и десктопные сессии.
- Проверить два варианта заголовка приглашения и карточки результата; менять по одному элементу за тест, чтобы было понятно, что повлияло на переходы.
- Повышать частоту cross-promo только для хорошо работающих контекстов. Сохранять ручной выбор проекта и лёгкий пропуск; не превращать межигровую паузу в обязательный рекламный барьер.
- До появления подтверждённого спроса основной коммерческий приоритет — квалифицированные обращения на собственные сервисы и разработку. Стороннюю рекламу и rewarded video подключать после одобрения рекламной сетью, явного согласия пользователя и серверной проверки завершённого просмотра.

Публичный пост соцсети не проверяется браузером. SIGNAL SHARD остаётся локальной косметической наградой без денежной или реферальной стоимости. Любая премия за квалифицированного приглашённого должна быть серверной, идемпотентной и защищённой от самоприглашений/накрутки.

## Схема событий коммерческой воронки AFTERIMAGE

События разделены между CORE-аналитикой игрока и commerce-аналитикой. Не переименовывать их в один общий «share» — иначе будут смешаны намерение поделиться, подготовка ссылки и подтверждение награды.

| Действие | Commerce event | source | Что оно подтверждает |
|---|---|---|---|
| Создана валидная challenge-ссылка | invite_link_prepared | game-invite:afterimage-run:<invite-code> | Ссылка подготовлена, не обязательно скопирована или опубликована |
| Открыто системное меню или сетевой share-композер | social_share_intent | osgard-social-share:<network>:afterimage-run | Игрок инициировал действие публикации |
| Игрок отдельно подтвердил получение косметической награды | social_reward_claimed | osgard-social-reward:<network>:afterimage-run | Самоподтверждение игрока; это не проверка общедоступного поста |
| Приглашённый открыл корректную invite landing | referral_link_opened | referral-link:<invite-code> | Открыта landing-страница; ещё не доказан старт или завершение игры |
| Забег начат / завершён | game_session_started / game_session_completed | referral:<invite-code>:afterimage-run при валидном referral-контексте | Фактический старт / завершение сессии, если событие принято системой |

Все commerce-события отправляются только при явном osgard.games.analytics-consent.v1=yes, через существующую очередь OSGARD, которая ограничивает названия событий тем же allow-list, что и сервер. У очереди есть ограниченное локальное хранение и повторная отправка; отзыв согласия удаляет ожидающие события.

invite_link_prepared входит в браузерный и серверный allow-list одновременно. Smoke-тест сравнивает оба списка, чтобы подготовленный invite не исчезал из воронки из-за дрейфа контракта.

Для разбивки social share по сети используются только allow-listed источники telegram, whatsapp, vk, x и facebook. Native share sheet учитывается как намерение без ложной классификации под конкретную сеть. Copy-link учитывается отдельно и сам по себе не даёт SIGNAL SHARD.

Важно: social_reward_claimed — добровольное клиентское подтверждение для локальной косметики. Оно никогда не должно давать денежную ценность, премиум-права или server-side referral payout. Для любой коммерческой награды нужен отдельный server-verified поток с идемпотентностью и антифрод-проверкой.
