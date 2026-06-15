<p align="center">
  <a href="https://github.com/VanyaKrotov/Marzban">
    <img src="https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/app/dashboard/src/assets/logo.svg" width="140" alt="Логотип MarzbanNext">
  </a>
</p>

<h1 align="center">MarzbanNext</h1>

<p align="center">
  Распределённая панель управления Xray, пользователями, подписками и конфигурацией узлов.
</p>

<p align="center">
  <a href="https://github.com/VanyaKrotov/Marzban/actions"><img src="https://img.shields.io/github/actions/workflow/status/VanyaKrotov/Marzban/build.yml?style=flat-square" alt="Статус сборки"></a>
  <a href="https://github.com/VanyaKrotov/Marzban/releases"><img src="https://img.shields.io/github/v/release/VanyaKrotov/Marzban?style=flat-square" alt="Последний релиз"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/VanyaKrotov/Marzban?style=flat-square" alt="Лицензия"></a>
  <a href="https://github.com/VanyaKrotov/Marzban/stargazers"><img src="https://img.shields.io/github/stars/VanyaKrotov/Marzban?style=flat-square" alt="Звёзды"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> /
  <a href="./README-ru.md">Русский</a> /
  <a href="./README-fa.md">فارسی</a> /
  <a href="./README-zh-cn.md">简体中文</a>
</p>

> Это распределённый форк [Gozargah/Marzban](https://github.com/Gozargah/Marzban).
> Master-панель управляет данными и конфигурацией, а Xray запускается на
> подключённых серверах [Marzban-node](https://github.com/VanyaKrotov/Marzban-node).

## Оглавление

- [Обзор](#обзор)
- [Архитектура](#архитектура)
- [Возможности](#возможности)
- [Разделы панели](#разделы-панели)
- [Установка на сервер](#установка-на-сервер)
- [Установка нод](#установка-нод)
- [Конфигурация](#конфигурация)
- [Обновление, резервные копии и миграция](#обновление-резервные-копии-и-миграция)
- [API и CLI](#api-и-cli)
- [Локальная разработка](#локальная-разработка)
- [Структура проекта](#структура-проекта)
- [Пожертвования](#donations)
- [Лицензия](#лицензия)

## Обзор

MarzbanNext — веб-панель для управления пользователями Xray, подписками, лимитами
трафика и распределённой прокси-инфраструктурой. Проект включает REST API на
FastAPI, React-dashboard, административный CLI и интеграцию с удалёнными узлами.

В этом форке управляющий и транспортный уровни разделены:

- **master-панель** хранит пользователей, конфигурацию, назначения, статистику и сертификаты;
- **удалённые ноды** запускают Xray и получают только назначенную им конфигурацию;
- изменение конфигурации перезапускает только затронутые подключённые ноды;
- на master-панели ядро Xray не запускается.

Такая архитектура подходит для инфраструктуры в нескольких странах или
провайдерах, изоляции панели от пользовательского трафика и независимой
конфигурации разных узлов.

## Архитектура

```text
                         ┌──────────────────────────┐
 Администраторы ───────► │      Master-панель       │
                         │ FastAPI + Dashboard + DB │
                         └────────────┬─────────────┘
                                      │ TLS API нод
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
          ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
          │ Xray-нода A │      │ Xray-нода B │      │ Xray-нода C │
          │ inbounds    │      │ inbounds    │      │ inbounds    │
          │ outbounds   │      │ outbounds   │      │ outbounds   │
          │ routing     │      │ routing     │      │ routing     │
          └─────────────┘      └─────────────┘      └─────────────┘
```

Ноды подключаются с помощью сертификата панели. Все назначения явные: новые
ноды, инбаунды, аутбаунды и правила маршрутизации автоматически друг к другу
не прикрепляются.

Объекты, импортированные из `XRAY_JSON`, помечаются как read-only. Их JSON
нельзя редактировать или удалить, но состояние, метаданные и назначения на ноды
остаются доступными для изменения.

## Возможности

### Пользователи и подписки

- VMess, VLESS, Trojan и Shadowsocks.
- Несколько протоколов и инбаундов у одного пользователя.
- Лимиты трафика, срок действия и периодический сброс.
- Состояния active, disabled, limited, expired и on-hold.
- Отзыв подписки и сброс трафика.
- Шаблоны подписок V2Ray, Clash/Mihomo и sing-box.
- Ссылки подключения и QR-коды.
- Поиск, фильтры, хранение фильтров в URL и массовый сброс трафика.

### Управление нодами

- Подключение нескольких удалённых Xray-нод.
- Статус соединения, адрес и версия Xray.
- Переподключение и просмотр ошибок узла.
- Runtime-логи выбранной ноды.
- Назначение конфигурации конкретным нодам.
- Перезапуск только затронутых конфигурацией узлов.
- Сбор трафика нод и статистика по выбранным периодам.

### Сертификаты

- Выпуск и перевыпуск сертификатов через ACME на ноде.
- Несколько сертификатов на одном узле.
- Передача выпущенных сертификатов обратно в master-панель.
- Назначение сертификатов TLS-инбаундам.
- Удаление и обновление сертификатов из dashboard.

### Конфигурация Xray

- CRUD для инбаундов, аутбаундов и правил маршрутизации.
- Включение и отключение сущностей без удаления.
- Сортировка хостов и routing rules перетаскиванием.
- Привязка inbounds, outbounds и routing rules к нодам.
- Полный редактор базовой конфигурации Xray.
- Monaco Editor с валидацией, автодополнением и светлой/тёмной темой.
- Подробные схемы протоколов, транспортов, `streamSettings`, routing и outbounds.
- Редактор хостов подписки с динамическими переменными.

### Эксплуатация

- SQLite, MySQL и MariaDB.
- Миграции Alembic.
- REST API и Swagger UI.
- CLI и Telegram-интеграция оригинального Marzban.
- Релизные образы для `amd64` и `arm64`.
- Установка образов из GitHub Releases без входа в Container Registry.

## Разделы панели

| Путь | Назначение |
| --- | --- |
| `/` | Пользователи, фильтры, подписки и операции с трафиком |
| `/stats` | Статистика пользователей и трафика нод |
| `/nodes` | Подключение нод, состояние и сертификаты |
| `/hosts` | Хосты подписки и изменение порядка |
| `/inbounds` | Инбаунды Xray и назначения на ноды |
| `/outbounds` | Аутбаунды Xray и назначения на ноды |
| `/routing` | Упорядоченные правила маршрутизации |
| `/config` | Полная базовая JSON-конфигурация Xray |
| `/logs` | Runtime-логи выбранной подключённой ноды |
| `/docs` | Интерактивная документация OpenAPI |

Frontend построен на React, TypeScript, Tailwind CSS, shadcn, TanStack Query,
react-hook-form и Monaco Editor.

## Установка на сервер

### Требования

- Linux-сервер с root-доступом;
- `curl`;
- архитектура `amd64` или `arm64`;
- Docker и Docker Compose v2.

Устаревший `docker-compose` v1 не поддерживается.

### SQLite

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install
```

### MySQL или MariaDB

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mariadb
```

### Конкретная версия

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --version v0.10.1
```

Установщик скачивает `marzban-linux-amd64.tar.gz` или
`marzban-linux-arm64.tar.gz` из GitHub Releases, загружает образ в локальный
Docker и запускает Compose-сервисы. Авторизация в GHCR не требуется.

| Путь | Назначение |
| --- | --- |
| `/opt/marzban` | Compose-файл, `.env` и метаданные установки |
| `/var/lib/marzban` | Постоянные данные |
| `/usr/local/bin/marzban` | Управляющий скрипт |

Создание sudo-администратора:

```bash
marzban cli admin create --sudo
```

Основные команды:

```bash
marzban status
marzban logs
marzban restart
marzban update
marzban edit-env
marzban edit-compose
marzban backup
marzban cli --help
```

Если SSL-файлы Uvicorn не настроены, используйте TLS reverse proxy или SSH:

```bash
ssh -L 8000:localhost:8000 user@server
```

После этого откройте `http://127.0.0.1:8000/dashboard/`.

## Установка нод

1. Откройте `/nodes` и нажмите **Подключить ноду**.
2. Скопируйте или скачайте сертификат панели.
3. На удалённом Linux-сервере выполните:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban-node.sh)" @ install
```

Образ скачивается из
[релизов VanyaKrotov/Marzban-node](https://github.com/VanyaKrotov/Marzban-node/releases)
и локально загружается через `docker load`.

Значения по умолчанию:

- сервис ноды: `62050`;
- Xray API: `62051`;
- сертификат панели: `/var/lib/marzban-node/cert.pem`.

```bash
marzban-node status
marzban-node logs
marzban-node restart
marzban-node update
marzban-node core-update
```

После установки создайте ноду в панели и явно назначьте нужные инбаунды,
аутбаунды, правила маршрутизации и сертификаты.

## Конфигурация

При запуске из исходников используется `.env`; скрипт установки хранит его в
`/opt/marzban/.env`. Полный список находится в [.env.example](.env.example).

| Переменная | Назначение |
| --- | --- |
| `UVICORN_HOST`, `UVICORN_PORT` | Адрес и порт панели |
| `UVICORN_SSL_CERTFILE`, `UVICORN_SSL_KEYFILE` | Прямой HTTPS |
| `DASHBOARD_PATH` | URL-префикс dashboard |
| `SQLALCHEMY_DATABASE_URL` | Подключение SQLite, MySQL или MariaDB |
| `XRAY_JSON` | Базовая JSON-конфигурация Xray |
| `XRAY_SUBSCRIPTION_URL_PREFIX` | Публичный префикс подписок |
| `CUSTOM_TEMPLATES_DIRECTORY` | Пользовательские шаблоны |
| `TELEGRAM_API_TOKEN`, `TELEGRAM_ADMIN_ID` | Telegram-интеграция |
| `WEBHOOK_ADDRESS`, `WEBHOOK_SECRET` | Webhook-уведомления |
| `DOCS` | Включение `/docs` и `/redoc` |
| `DEBUG` | Режим разработки |

Документация шаблонов:

- [V2Ray](app/templates/v2ray/README.md)
- [Clash/Mihomo](app/templates/clash/README.md)
- [sing-box](app/templates/singbox/README.md)

## Обновление, резервные копии и миграция

Release workflow запускается только для тегов `v*.*.*`. При старте приложения
миграции Alembic применяются автоматически.

Перед обновлением:

```bash
marzban backup
cp -a /opt/marzban /root/marzban-opt-backup
cp -a /var/lib/marzban /root/marzban-data-backup
```

Обновление и проверка:

```bash
marzban update
marzban status
marzban logs
```

Для переноса существующей установки оригинального Marzban используйте
[MIGRATE_FROM_ORIGINAL_MARZBAN.md](MIGRATE_FROM_ORIGINAL_MARZBAN.md).
Не заменяйте скрипт и не запускайте update до создания и проверки резервной
копии базы и каталога данных.

## API и CLI

Установите `DOCS=True`, чтобы открыть Swagger UI на `/docs` и ReDoc на `/redoc`.
API покрывает пользователей, ноды, сертификаты, хосты, inbounds, outbounds,
routing rules, конфигурацию Xray, логи и статистику.

```bash
marzban cli [OPTIONS] COMMAND [ARGS]...
```

Полная справка находится в [cli/README.md](cli/README.md).

## Локальная разработка

Рекомендуются Python 3.12 и Node.js `20.19.0` или новее.

### Backend на Linux

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

### Backend на Windows

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe main.py
```

Нативный Windows подходит для разработки панели и dashboard. Production и
Xray-ноды рекомендуется запускать на Linux.

### Dashboard

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

```env
VITE_BASE_API=http://127.0.0.1:8000/api/
```

См. [app/dashboard/README.md](app/dashboard/README.md) и
[CONTRIBUTING.md](CONTRIBUTING.md).

## Структура проекта

```text
app/
  dashboard/       React-dashboard
  db/              SQLAlchemy, CRUD и Alembic
  models/          Модели запросов и ответов API
  routers/         FastAPI endpoints
  subscription/    Генерация подписок
  templates/       Шаблоны V2Ray, Clash и sing-box
  xray/            Конфигурация и синхронизация нод
cli/               Административный CLI на Typer
scripts/           Установщики панели и ноды
xray_api/          Сгенерированные Xray gRPC bindings
```

<a id="donations"></a>
## Пожертвования

Пожертвования помогают выпускать полезные обновления, добавлять новые функции,
повышать стабильность и улучшать инструменты для сообщества.

| Актив | Сеть | Адрес |
| --- | --- | --- |
| TON / USDT | TON | `UQBrg7pSip791hOHIajYi-dx__fJcMuyO5DsVat2gme0YveJ` |
| USDT | Solana | `8o68cBrxcrvGZiCQBvZy7chsYATEWkucoSbqCiEnvqZQ` |
| BTC | Bitcoin | `bc1q8xvclm7c87jvuuz4ffzzt3mvpzsr4yjtnh3dvx` |

Спасибо за поддержку проекта!

## Лицензия

Форк основан на [Gozargah/Marzban](https://github.com/Gozargah/Marzban) и
распространяется на условиях [LICENSE](LICENSE).

Перед отправкой pull request ознакомьтесь с [CONTRIBUTING.md](CONTRIBUTING.md).
