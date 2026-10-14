# OSGARD PLAY — 30 improvements for the next release

Дата: 14 октября 2026 г.  
Ветка: `feat/osgard-play-pwa-release-hardening-20261014-v2`  
Base: `HADJAL001/osgard-world:master`  
Scope: installation/offline resilience, shareable catalogue state, analytics boundaries, repeat-visit UX and release QA.

## Аудит до изменений

В существующем репозитории уже есть React/Vite/TypeScript для главного портала и отдельная статическая витрина OSGARD PLAY; 11 игровых точек входа; поиск и жанровые фильтры; избранное и локальная полка; окно запуска игры; ежедневные испытания; рекомендации после сессии; каталог десяти продуктов экосистемы; согласованная аналитика; сценарная финансовая модель; LiveOps, редактор спонсорских кампаний и Commerce API. Эти подсистемы сохранены, а не заменены новым шаблоном.

Production-подключение Commerce API и платёжные флаги остаются отдельным инфраструктурным шагом: публичный `commerce-config.json` нельзя считать активным, если его URL пуст, а наличие Stripe-кода не означает, что live-платежи включены. Доступ к текущему опубликованному сайту из среды этого аудита вернул cache/access errors, поэтому deploy-состояние не заявляется подтверждённым.

## 30 изменений этой итерации

### Установка и возвращаемость
1. Добавлен отдельный Web App Manifest для OSGARD PLAY со своим scope `/games/`.
2. Добавлено короткое имя приложения для домашнего экрана.
3. Добавлена самостоятельная геометрическая SVG-иконка OSGARD PLAY в фирменных обсидианово-золотых цветах.
4. Добавлены ярлык и направление экрана, не навязывающие портретную ориентацию.
5. Добавлены три shortcuts к реальным игровым маршрутам.
6. Добавлены метаданные для установленного режима на устройствах Apple.
7. Добавлено предложение установить каталог без обязательной установки браузера или отдельного игрового клиента.
8. Добавлен вызов нативного `beforeinstallprompt`, только когда его поддерживает браузер.
9. Добавлен fallback с точной инструкцией для Safari на iPhone/iPad.
10. Добавлен fallback с инструкцией через меню браузера для остальных платформ.
11. Состояние установленного приложения определяется через `display-mode: standalone` и событие `appinstalled`.
12. Добавлено уважительное скрытие install-предложения с локальным предпочтением пользователя.

### Автономность и безопасность кэша
13. Добавлен Service Worker со scope только `/games/`, не захватывающий остальной OSGARD WORLD.
14. Добавлен ограниченный список публичных shell-ресурсов для offline cache.
15. Навигация остаётся network-first, чтобы новые сборки игры не подменялись устаревшим кэшем.
16. Добавлена локальная offline-страница с понятным действием возврата.
17. Версия кэша разделена по префиксу, старые версии удаляются при активации новой.
18. Кэшируются только same-origin GET-запросы из разрешённого списка.
19. В обход кэша выведены Commerce API и общие API-маршруты.
20. В обход кэша выведены LiveOps, campaign admin, commerce admin, success-checkout и публичная конфигурация API.
21. API/административные данные не записываются в offline cache; формы оплаты не подменяются сохранёнными ответами.
22. Все внешние сайты и внешние ресурсы остаются вне перехвата Service Worker.

### Каталог и обмен подборками
23. Поисковая строка получает shareable-параметр `q`.
24. Выбранный жанр получает shareable-параметр `genre`.
25. Избранное может быть частью ссылки через `favorites=1`.
26. Состояние адресной строки синхронизируется через `history.replaceState` без перезагрузки или спама в истории.
27. Сброс фильтров приводит URL к состоянию экрана.
28. Добавлена команда поделиться текущей подборкой через системное меню или копирование ссылки.
29. Ссылка на подборку содержит только состояние каталога и не копирует входящие referral/UTM параметры.
30. Добавлены статические проверки manifest, Service Worker security boundaries, consent-gated install events и PR CI workflow.

## Что измеряется и что не имитируется

Четыре новых события установочного пути (`pwa_install_prompt_shown`, `pwa_install_accepted`, `pwa_install_dismissed`, `pwa_standalone_opened`) используют существующую явную настройку согласия и существующую очередь аналитики. Без согласия новые события не отправляются. Количество установок и дохода не выдумывается; событие принятия browser prompt не гарантирует, что приложение осталось установленным на устройстве.

## Файлы изменения

- `public/games/app.webmanifest`
- `public/games/osgard-play-icon.svg`
- `public/games/offline.html`
- `public/games/osgard-play-sw.js`
- `public/games/pwa-install.css`
- `public/games/pwa-install.js`
- `public/games/catalog-state.js`
- `public/games/index.html`
- `public/games/consented-analytics.js`
- `services/osgard-commerce-api/src/core.mjs`
- `services/osgard-commerce-api/test/core.test.mjs`
- `scripts/osgard-play-pwa-smoke.mjs`
- `scripts/games-portal-smoke.mjs`
- `package.json`
- `.github/workflows/osgard-play-qa.yml`
- `.github/workflows/deploy-frontend.yml`

## Как проверить

- `npm run qa:pwa` — manifest, install flow, offline cache policy, shareable state and consent contract.
- `npm run qa:games-portal` — existing full gaming hub regression suite.
- `npm run qa:campaign-manager` — sponsored-inventory privacy/API contracts.
- `npm run check` and `npm run build` — TypeScript and production assets.
- `npm run qa:release` — broader release readiness report where the configured environment supports it.

Браузерное поведение install prompt и реальная автономная загрузка окончательно подтверждаются на HTTPS после публикации. Статические тесты не заменяют проверку на реальных Android, iOS и desktop-браузерах.