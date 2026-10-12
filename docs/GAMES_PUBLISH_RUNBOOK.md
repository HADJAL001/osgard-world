# OSGARD WORLD Games — запуск и публикация

Дата: 13 октября 2026 года.

## Проверки перед слиянием

Из корня репозитория:

```bash
npm ci
npm run check
npm run build
npm run qa:games-portal
npm run qa:null-shift
npm run qa:null-shift-godot
npm run qa:time-ui
npm run preflight:frontend
```

Для production-маршрутов используйте тестовый/staging адрес, а не предполагайте, что production уже изменён:

```bash
OSGARD_BASE_URL=https://staging.example.com npm run qa:production-routes
```

В Windows PowerShell переменная задаётся через `$env:OSGARD_BASE_URL='https://staging.example.com'`.

## Канонические маршруты

- `/games/` — единая игровая витрина.
- `/game/null-shift`, `/game/time`, `/game/swarm`, `/game/inherit`, `/game/remix` — индивидуальные страницы игр.
- `/games/time` — точка входа «Империи времени».
- `/games/null-shift/`, `/games/swarm/`, `/games/inherit/`, `/games/remix/` — браузерные игровые сборки.
- `/privacy/` и `/terms/` — документы для каталога.
- `/entertainment`, `/entertainment/` и `/entertainment/index.html` — прежние адреса каталога, переходящие на `/games/`.
- `/games/null-shift-godot/` и его `index.html` — прежний адрес не опубликованного Godot Web export; перенаправляется на браузерную сборку.

## Публикация

1. Проверить diff и убедиться, что не затронуты не относящиеся к этому изменению функции.
2. Дождаться успешного GitHub Actions для актуального commit.
3. Выполнить staging smoke на компьютере и телефоне: поиск, фильтры, избранное, запуск, закрытие диалога, полноэкранный режим, отдельная ссылка и страницы `/game/:slug`.
4. Проверить, что все три старых маршрута возвращают перенаправление, а все игровые файлы имеют правильный MIME type.
5. Проверить реальные сообщения старта/завершения внутри iframe. Само событие `load` не является доказательством начала игры.
6. Слить PR и развернуть только существующим контролируемым способом. После публикации повторить `qa:production-routes` на реальном домене и сохранить JSON-отчёт.
7. При проблеме откатить deploy штатным механизмом; не добавлять production-секреты в исходный код или игровые файлы.

## Не активированные интеграции

Рекламная сеть, rewarded video, биллинг/checkout, подписочные права, серверный приём заявок и административная панель требуют отдельных backend-настроек и проверок. Форма заявки сейчас создаёт черновик письма; она не означает, что заявка уже сохранена на сервере.
