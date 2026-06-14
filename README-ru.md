# Marzban

Marzban — панель управления Xray. Этот форк ориентирован на распределённую
архитектуру: master-панель управляет пользователями и конфигурацией, а Xray
запускается на подключённых серверах
[Marzban-node](https://github.com/VanyaKrotov/Marzban-node).

[English](README.md) | [فارسی](README-fa.md) | [简体中文](README-zh-cn.md)

## Возможности форка

- Управление пользователями, подписками, лимитами, сроками и трафиком.
- Управление удалёнными нодами без запуска Xray на master-панели.
- Несколько TLS-сертификатов на одну ноду: выпуск на ноде, хранение в панели и
  назначение конкретным TLS-инбаундам.
- Управляемые хосты, инбаунды, аутбаунды и правила маршрутизации с привязкой к нодам.
- Перезапуск только тех подключённых нод, которых коснулось изменение конфигурации.
- Полный редактор Xray JSON на Monaco с валидацией, автодополнением и сменой темы.
- Runtime-логи выбранной ноды.
- Статистика трафика и пользователей с фильтрами периода в query-параметрах URL.
- OpenAPI по адресу `/docs`.
- Доставка Docker-образов файлами GitHub Release без Container Registry.

Объекты, загруженные из `XRAY_JSON`, имеют защищённый JSON-контент и не могут
быть удалены. При этом их название, состояние и назначения на ноды можно менять.

## Разделы панели

| Путь | Назначение |
| --- | --- |
| `/` | Пользователи, фильтры, подписки и операции с трафиком |
| `/nodes` | Ноды, параметры подключения и сертификаты |
| `/hosts` | Хосты подписки и изменение порядка перетаскиванием |
| `/inbounds` | Управляемые Xray-инбаунды |
| `/outbounds` | Управляемые Xray-аутбаунды |
| `/routing` | Упорядоченные правила маршрутизации |
| `/config` | Полная JSON-конфигурация Xray |
| `/logs` | Runtime-логи выбранной ноды |
| `/stats` | Статистика трафика и пользователей |
| `/docs` | Документация API |

## Установка на сервер

Требования:

- Linux-сервер с root-доступом;
- `curl`;
- архитектура `amd64` или `arm64`;
- Docker и Docker Compose v2. Старый `docker-compose` v1 не поддерживается.

SQLite:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install
```

MySQL или MariaDB:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mariadb
```

Конкретная версия:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --version v0.9.7
```

Скрипт скачивает архив образа нужной архитектуры из GitHub Releases, локально
загружает его в Docker как `marzban-local`, создаёт Compose-конфигурацию и
запускает сервисы. Авторизация в GitHub Container Registry не требуется.

Создание sudo-администратора:

```bash
marzban cli admin create --sudo
```

Основные команды:

```bash
marzban status
marzban logs
marzban update
marzban restart
marzban edit-env
marzban backup
marzban help
```

По умолчанию файлы приложения лежат в `/opt/marzban`, постоянные данные — в
`/var/lib/marzban`. Перед обновлением и миграцией сохраняйте базу данных и весь
каталог данных.

## Установка ноды

Сначала откройте диалог **Подключить ноду** на странице `/nodes` и скопируйте
или скачайте сертификат панели. Затем выполните на сервере ноды:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban-node.sh)" @ install
```

Установщик запросит сертификат и порты. Значения по умолчанию:

- сервис ноды: `62050`;
- Xray API: `62051`;
- сертификат: `/var/lib/marzban-node/cert.pem`.

Образ загружается из релизов
[`VanyaKrotov/Marzban-node`](https://github.com/VanyaKrotov/Marzban-node/releases).
Например, для тега `v0.6.1` используется файл
`marzban-node-v0.6.1.oci.tar.gz`.

```bash
marzban-node status
marzban-node logs
marzban-node update
marzban-node core-update
```

После установки добавьте ноду в панели по её адресу и выбранным портам.
Инбаунды, аутбаунды и правила назначаются явно: новая нода и новый инбаунд
изначально не получают автоматических привязок.

## Обновление и перенос данных

Релизная сборка запускается только при публикации тега `v*.*.*`. GitHub Actions
собирает образы `amd64` и `arm64` и прикладывает к релизу:

- `marzban-linux-amd64.tar.gz`;
- `marzban-linux-arm64.tar.gz`.

Команда `marzban update` скачивает последний релизный архив и перезапускает
Compose-сервисы. Alembic-миграции выполняются автоматически при старте контейнера.

Безопасный перенос данных с оригинального Marzban описан в
[MIGRATE_FROM_ORIGINAL_MARZBAN.md](MIGRATE_FROM_ORIGINAL_MARZBAN.md). Не
подменяйте скрипт и не запускайте `update` до создания и проверки резервной копии.

## Локальная разработка

Рекомендуется Python 3.12.

Linux:

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

Windows PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe main.py
```

Создание администратора из исходников:

```powershell
.\.venv\Scripts\python.exe marzban-cli.py admin create --sudo
```

Нативный Windows подходит для разработки панели и dashboard. Для production и
серверов нод используйте Linux.

Dashboard требует Node.js `20.19.0` или новее:

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

Для прямого подключения Vite к локальному backend укажите:

```env
VITE_BASE_API=http://127.0.0.1:8000/api/
```

Подробности находятся в [app/dashboard/README.md](app/dashboard/README.md).

## Конфигурация, API и шаблоны

Полный список переменных находится в [.env.example](.env.example). Основные:
`DATABASE_URL`, `XRAY_JSON`, `XRAY_SUBSCRIPTION_URL_PREFIX`,
`CUSTOM_TEMPLATES_DIRECTORY`, параметры Uvicorn и `DOCS`.

Документация шаблонов:

- [V2Ray](app/templates/v2ray/README.md)
- [Clash/Mihomo](app/templates/clash/README.md)
- [sing-box](app/templates/singbox/README.md)

При `DOCS=True` интерактивная документация API доступна на `/docs`.
Использование CLI на Linux, в контейнере и на Windows описано в
[cli/README.md](cli/README.md).

## Лицензия и исходный проект

Форк основан на [Gozargah/Marzban](https://github.com/Gozargah/Marzban).
Условия лицензии находятся в [LICENSE](LICENSE).
