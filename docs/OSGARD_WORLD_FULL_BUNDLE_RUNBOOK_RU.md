# OSGARD WORLD GAMING — сборка, запуск и публикация
Дата: 16 октября 2026 года

## Что выдаёт release workflow

Artifact OSGARD-WORLD-GAMING-FULL-<commit> содержит четыре файла:
1. OSGARD-WORLD-GAMING-1.0.0-<sha>-SOURCE.zip — весь отслеживаемый исходный репозиторий на конкретном commit.
2. OSGARD-WORLD-GAMING-1.0.0-<sha>-SITE.zip — статический frontend после Vite build.
3. bundle-manifest.json — версия, commit, количество файлов, контрольные суммы и пройденные quality gates.
4. SHA256SUMS.txt — контрольные суммы двух ZIP.

Версия из имени берётся из package.json; короткий SHA входит в имена, чтобы не перепутать сборки.

## Как собрать вручную в клоне

Команды в порядке выполнения:
1. npm ci
2. node scripts/osgard-full-release-preflight.mjs
3. npm run build
4. npm run qa:games-portal
5. npm run qa:ecosystem
6. npm run qa:privacy-consent
7. npm run qa:games-model
8. Установить OSGARD_BUNDLE_OUT на папку назначения и выполнить node scripts/osgard-full-release-bundle.mjs.

Требования для упаковки: Node.js 22, Git, zip и unzip. На Windows проще скачать artifact из GitHub Actions или запускать сборку через WSL/Git Bash с этими командами.

## Как опубликовать frontend

1. Скачай ZIP с пометкой SITE, проверь SHA256SUMS.txt и распакуй в staging, не поверх production.
2. Убедись, что хостинг отдаёт маршруты Vite/страницы игр, а static assets не блокируются CSP.
3. Настрой на сервере только необходимые переменные окружения отдельно от архива. Не клади .env, токены администратора, Stripe secret или webhook secret в ZIP и frontend.
4. Прогони route matrix против staging/production и проверь реальные маршруты игрового каталога, fallback каталог, PWA, privacy/terms и consent.
5. Активируй checkout только после проверки webhook signature, payment lifecycle и server-side entitlement checks. Ads включай только после одобрения рекламной сети и проверки consent/маркировки.
6. Сохрани предыдущий рабочий artifact для rollback; при неуспешном route/health gate возвращай предыдущую версию.

## Ограничения

ZIP не означает автоматический deploy. Для production публикации нужны права на hosting/domain, проверенные переменные окружения, CI green и согласование оператора. Платёжные и рекламные интеграции здесь не изображаются как активные без соответствующих реальных подтверждений.
