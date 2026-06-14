<p align="center">
  <a href="https://github.com/VanyaKrotov/Marzban">
    <img src="https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/app/dashboard/src/assets/logo.svg" width="140" alt="Marzban logo">
  </a>
</p>

<h1 align="center">Marzban</h1>

<p align="center">
  Distributed Xray management panel for users, nodes, subscriptions and runtime configuration.
</p>

<p align="center">
  <a href="https://github.com/VanyaKrotov/Marzban/actions"><img src="https://img.shields.io/github/actions/workflow/status/VanyaKrotov/Marzban/build.yml?style=flat-square" alt="Build status"></a>
  <a href="https://github.com/VanyaKrotov/Marzban/releases"><img src="https://img.shields.io/github/v/release/VanyaKrotov/Marzban?style=flat-square" alt="Latest release"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/VanyaKrotov/Marzban?style=flat-square" alt="License"></a>
  <a href="https://github.com/VanyaKrotov/Marzban/stargazers"><img src="https://img.shields.io/github/stars/VanyaKrotov/Marzban?style=flat-square" alt="Stars"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> /
  <a href="./README-ru.md">Русский</a> /
  <a href="./README-fa.md">فارسی</a> /
  <a href="./README-zh-cn.md">简体中文</a>
</p>

> This is a distributed fork of [Gozargah/Marzban](https://github.com/Gozargah/Marzban).
> The master panel manages data and configuration, while Xray runs on connected
> [Marzban-node](https://github.com/VanyaKrotov/Marzban-node) servers.

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Dashboard](#dashboard)
- [Production installation](#production-installation)
- [Installing nodes](#installing-nodes)
- [Configuration model](#configuration-model)
- [Updates, backup and migration](#updates-backup-and-migration)
- [API and CLI](#api-and-cli)
- [Local development](#local-development)
- [Project structure](#project-structure)
- [Donations](#donations)
- [License](#license)

## Overview

Marzban is a web-based control plane for managing Xray users, subscriptions,
traffic limits and distributed proxy infrastructure. It provides a FastAPI REST
backend, a React dashboard, an administrative CLI and integration with remote
Xray nodes.

This fork separates the control plane from the data plane:

- the **master panel** stores users, configuration, assignments, statistics and certificates;
- **remote nodes** run Xray and receive only the configuration assigned to them;
- configuration changes restart only affected connected nodes;
- the Xray core is not started on the master panel.

This design is useful when infrastructure spans multiple countries or providers,
when the panel must be isolated from proxy traffic, or when different nodes need
different inbounds, outbounds and routing policies.

## Architecture

```text
                         ┌──────────────────────────┐
 Administrators ───────► │      Master panel        │
                         │ FastAPI + Dashboard + DB │
                         └────────────┬─────────────┘
                                      │ TLS node API
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
          ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
          │ Xray node A │      │ Xray node B │      │ Xray node C │
          │ inbounds    │      │ inbounds    │      │ inbounds    │
          │ outbounds   │      │ outbounds   │      │ outbounds   │
          │ routing     │      │ routing     │      │ routing     │
          └─────────────┘      └─────────────┘      └─────────────┘
```

Nodes are connected using the panel certificate. Assignments are explicit:
new nodes, inbounds, outbounds and routing rules are not attached to each other
automatically.

Objects imported from `XRAY_JSON` are marked as read-only. Their JSON content
cannot be changed and they cannot be deleted, but their enabled state, metadata
and node assignments remain editable.

## Features

### Users and subscriptions

- VMess, VLESS, Trojan and Shadowsocks accounts.
- Multiple protocols and inbounds per user.
- Traffic, expiration and periodic reset limits.
- Active, disabled, limited, expired and on-hold states.
- Subscription revocation and traffic reset actions.
- V2Ray, Clash/Mihomo and sing-box subscription templates.
- Share links and QR codes.
- Search, filtering, URL-persisted filters and bulk traffic reset.

### Distributed node management

- Connect and manage multiple remote Xray nodes.
- View connection status, address and Xray version.
- Reconnect nodes and inspect runtime errors.
- Stream runtime logs for a selected node.
- Assign configuration entities to specific nodes.
- Restart only nodes affected by a configuration change.
- Node traffic collection and period-based statistics.

### Certificates

- Issue and renew certificates through ACME on a node.
- Store multiple certificates for each node in the panel.
- Return issued certificates from the node to the master panel.
- Assign available node certificates to TLS inbounds.
- Delete and renew certificates from the dashboard.

### Xray configuration

- CRUD for managed inbounds, outbounds and routing rules.
- Enable or disable entities without deleting them.
- Drag-and-drop ordering for routing rules and subscription hosts.
- Per-node assignments for inbounds, outbounds and routing rules.
- Full Xray configuration editor.
- Monaco JSON editor with validation, completion and light/dark theme.
- Detailed schemas for protocols, transports, `streamSettings`, routing and outbounds.
- Managed host editor with dynamic subscription variables.

### Operations

- SQLite, MySQL and MariaDB support.
- Alembic database migrations.
- REST API and Swagger UI.
- Administrative CLI and Telegram integration inherited from Marzban.
- Release images for `amd64` and `arm64`.
- Docker images distributed as GitHub Release assets without registry login.

## Dashboard

| Path | Description |
| --- | --- |
| `/` | Users, filters, subscriptions and traffic actions |
| `/stats` | User and node traffic statistics with date ranges |
| `/nodes` | Node connection settings, status and certificates |
| `/hosts` | Subscription hosts and drag-and-drop ordering |
| `/inbounds` | Managed Xray inbounds and node assignments |
| `/outbounds` | Managed Xray outbounds and node assignments |
| `/routing` | Ordered routing rules and node assignments |
| `/config` | Complete base Xray JSON configuration |
| `/logs` | Runtime logs from a selected connected node |
| `/docs` | Interactive OpenAPI documentation when enabled |

The dashboard uses React, TypeScript, Tailwind CSS, shadcn, TanStack Query,
react-hook-form and Monaco Editor.

## Production installation

### Requirements

- Linux server with root access.
- `curl`.
- `amd64` or `arm64` architecture.
- Docker with Docker Compose v2.

Legacy `docker-compose` v1 is not supported.

### Install with SQLite

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install
```

### Install with MySQL or MariaDB

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mariadb
```

### Install a specific version

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --version v0.10.1
```

The installer downloads `marzban-linux-amd64.tar.gz` or
`marzban-linux-arm64.tar.gz` from GitHub Releases, loads the image into the
local Docker daemon and starts the Compose services. GitHub Container Registry
authentication is not required.

Default locations:

| Path | Purpose |
| --- | --- |
| `/opt/marzban` | Compose file, environment and installation metadata |
| `/var/lib/marzban` | Persistent application data |
| `/usr/local/bin/marzban` | Management script |

Create a sudo administrator:

```bash
marzban cli admin create --sudo
```

Useful commands:

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

Without configured Uvicorn SSL files, expose the panel through a TLS reverse
proxy or access it locally using SSH port forwarding:

```bash
ssh -L 8000:localhost:8000 user@server
```

Then open `http://127.0.0.1:8000/dashboard/`.

## Installing nodes

1. Open `/nodes` and click **Connect node**.
2. Copy or download the panel certificate.
3. Run the node installer on the remote Linux server:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban-node.sh)" @ install
```

The node image is downloaded from
[VanyaKrotov/Marzban-node releases](https://github.com/VanyaKrotov/Marzban-node/releases)
and loaded locally with `docker load`.

Default values:

- node service port: `62050`;
- Xray API port: `62051`;
- panel certificate path: `/var/lib/marzban-node/cert.pem`.

Node commands:

```bash
marzban-node status
marzban-node logs
marzban-node restart
marzban-node update
marzban-node core-update
```

After installation, create the node in the panel and explicitly assign the
required inbounds, outbounds, routing rules and certificates.

## Configuration model

Source installations use `.env`; script installations store it at
`/opt/marzban/.env`. See [.env.example](.env.example) for the complete list.

Important variables:

| Variable | Purpose |
| --- | --- |
| `UVICORN_HOST`, `UVICORN_PORT` | Panel bind address and port |
| `UVICORN_SSL_CERTFILE`, `UVICORN_SSL_KEYFILE` | Direct HTTPS configuration |
| `DASHBOARD_PATH` | Dashboard URL prefix |
| `SQLALCHEMY_DATABASE_URL` | SQLite, MySQL or MariaDB connection |
| `XRAY_JSON` | Base Xray JSON configuration |
| `XRAY_SUBSCRIPTION_URL_PREFIX` | Public subscription URL prefix |
| `CUSTOM_TEMPLATES_DIRECTORY` | Custom subscription templates |
| `TELEGRAM_API_TOKEN`, `TELEGRAM_ADMIN_ID` | Telegram integration |
| `WEBHOOK_ADDRESS`, `WEBHOOK_SECRET` | Webhook notifications |
| `DOCS` | Enable `/docs` and `/redoc` |
| `DEBUG` | Development mode |

Template documentation:

- [V2Ray](app/templates/v2ray/README.md)
- [Clash/Mihomo](app/templates/clash/README.md)
- [sing-box](app/templates/singbox/README.md)

## Updates, backup and migration

Release workflows run only for tags matching `v*.*.*`. Application startup
applies Alembic migrations automatically.

Before every update:

```bash
marzban backup
cp -a /opt/marzban /root/marzban-opt-backup
cp -a /var/lib/marzban /root/marzban-data-backup
```

Update to the latest release:

```bash
marzban update
```

After updating, verify:

```bash
marzban status
marzban logs
```

For migration from the original Marzban with existing data, follow
[MIGRATE_FROM_ORIGINAL_MARZBAN.md](MIGRATE_FROM_ORIGINAL_MARZBAN.md).
Do not replace the management script and run an update before creating and
verifying a database and data backup.

## API and CLI

Set `DOCS=True` to expose Swagger UI at `/docs` and ReDoc at `/redoc`.
The REST API covers users, nodes, certificates, hosts, inbounds, outbounds,
routing rules, Xray configuration, logs and statistics.

CLI syntax:

```bash
marzban cli [OPTIONS] COMMAND [ARGS]...
```

See [cli/README.md](cli/README.md) for the complete CLI reference.

## Local development

Python 3.12 and Node.js `20.19.0` or newer are recommended.

### Backend on Linux

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

### Backend on Windows

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe main.py
```

Native Windows is supported for panel and dashboard development. Production
deployments and Xray nodes should use Linux.

### Dashboard

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

For a separate Vite frontend and local backend:

```env
VITE_BASE_API=http://127.0.0.1:8000/api/
```

See [app/dashboard/README.md](app/dashboard/README.md) and
[CONTRIBUTING.md](CONTRIBUTING.md) for frontend conventions.

## Project structure

```text
app/
  dashboard/       React dashboard
  db/              SQLAlchemy models, CRUD and Alembic migrations
  models/          API request and response models
  routers/         FastAPI endpoints
  subscription/    Subscription generation
  templates/       V2Ray, Clash and sing-box templates
  xray/            Configuration and node synchronization
cli/               Typer administrative CLI
scripts/           Panel and node installers
xray_api/          Generated Xray gRPC bindings
```

<a id="donations"></a>
## Donations

Donations help fund useful updates, new features, stability improvements and
better tools for the community.

| Asset | Network | Address |
| --- | --- | --- |
| TON / USDT | TON | `UQBrg7pSip791hOHIajYi-dx__fJcMuyO5DsVat2gme0YveJ` |
| USDT | Solana | `8o68cBrxcrvGZiCQBvZy7chsYATEWkucoSbqCiEnvqZQ` |
| BTC | Bitcoin | `bc1q8xvclm7c87jvuuz4ffzzt3mvpzsr4yjtnh3dvx` |

Thank you for supporting the project!

## License

This fork is based on [Gozargah/Marzban](https://github.com/Gozargah/Marzban)
and is distributed under the terms in [LICENSE](LICENSE).

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before
opening a pull request.
