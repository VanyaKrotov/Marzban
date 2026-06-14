# Marzban

Marzban is an Xray management panel. This fork focuses on a distributed setup:
the panel manages users and configuration, while Xray runs on connected
[Marzban-node](https://github.com/VanyaKrotov/Marzban-node) servers.

[Русский](README-ru.md) | [فارسی](README-fa.md) | [简体中文](README-zh-cn.md)

## What is included in this fork

- User management, subscriptions, traffic limits, expiration, usage and bulk reset.
- Remote node management without starting Xray on the master panel.
- Multiple TLS certificates per node, issued on the node and stored by the panel.
- Managed hosts, inbounds, outbounds and routing rules with per-node assignments.
- Selective node restart: configuration changes restart only affected connected nodes.
- Full Xray JSON editor with Monaco validation, completion and system-aware theme.
- Runtime logs for a selected node.
- Traffic and user statistics with date ranges stored in the URL query string.
- API documentation at `/docs`.
- Release images delivered as GitHub Release files instead of a container registry.

Objects imported from `XRAY_JSON` are marked as read-only. Their JSON content
cannot be edited and they cannot be deleted, but metadata, enabled state and
node assignments remain editable.

## Dashboard

The dashboard provides these main pages:

| Path | Purpose |
| --- | --- |
| `/` | Users, filters, subscriptions and traffic actions |
| `/nodes` | Nodes, connection settings and certificates |
| `/hosts` | Subscription hosts and drag-and-drop ordering |
| `/inbounds` | Managed Xray inbounds |
| `/outbounds` | Managed Xray outbounds |
| `/routing` | Ordered routing rules |
| `/config` | Complete Xray JSON configuration |
| `/logs` | Runtime logs for a selected node |
| `/stats` | Node traffic and user statistics |
| `/docs` | OpenAPI documentation |

## Production installation

Requirements:

- A Linux server with root access.
- `curl`.
- `amd64` or `arm64`.
- Docker with Docker Compose v2. Legacy `docker-compose` v1 is not supported.

Install with SQLite:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install
```

Install with MySQL or MariaDB:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mariadb
```

Install a specific release:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --version v0.9.7
```

The installer downloads the matching architecture archive from GitHub Releases,
loads it into the local Docker daemon as `marzban-local`, writes the Compose
configuration and starts the services. No GitHub Container Registry login is
required.

Create a sudo administrator:

```bash
marzban cli admin create --sudo
```

Useful commands:

```bash
marzban status
marzban logs
marzban update
marzban restart
marzban edit-env
marzban backup
marzban help
```

The standard installation stores application files in `/opt/marzban` and
persistent data in `/var/lib/marzban`. Back up the data directory and database
before updating or migrating.

## Install a node

First open the **Connect node** dialog on `/nodes` and copy or download the
panel certificate. Then run on the node server:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban-node.sh)" @ install
```

The installer asks for the panel certificate and node ports. Defaults are:

- service port: `62050`;
- Xray API port: `62051`;
- certificate path: `/var/lib/marzban-node/cert.pem`.

The node image is downloaded from
[`VanyaKrotov/Marzban-node` releases](https://github.com/VanyaKrotov/Marzban-node/releases).
For example, tag `v0.6.1` provides `marzban-node-v0.6.1.oci.tar.gz`.

```bash
marzban-node status
marzban-node logs
marzban-node update
marzban-node core-update
```

After installation, add the node in the panel using its address and the selected
ports. Assign inbounds, outbounds and routing rules explicitly; newly created
nodes and inbounds start without automatic assignments.

## Update and migration

The release workflow runs only for tags matching `v*.*.*`. It builds native
`amd64` and `arm64` images and attaches these files to the GitHub Release:

- `marzban-linux-amd64.tar.gz`
- `marzban-linux-arm64.tar.gz`

`marzban update` downloads the latest release asset and restarts the Compose
services. Alembic migrations run automatically when the application container
starts.

For moving an existing upstream installation with its data, follow
[MIGRATE_FROM_ORIGINAL_MARZBAN.md](MIGRATE_FROM_ORIGINAL_MARZBAN.md). Do not
replace the script and run `update` before making a verified database and data
backup.

## Local development

### Backend

Python 3.12 is recommended.

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

PowerShell on Windows:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe main.py
```

Create an administrator from source:

```powershell
.\.venv\Scripts\python.exe marzban-cli.py admin create --sudo
```

Native Windows is suitable for panel and dashboard development. Production
deployment and remote Xray nodes should use Linux.

### Dashboard

Node.js `20.19.0` or newer is required.

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

Set `VITE_BASE_API=http://127.0.0.1:8000/api/` when the Vite server talks
directly to a local backend. See [app/dashboard/README.md](app/dashboard/README.md)
for architecture and contribution rules.

## Configuration

Copy `.env.example` to `.env` for source development. Important settings include:

- `UVICORN_HOST`, `UVICORN_PORT`, `UVICORN_SSL_CERTFILE`, `UVICORN_SSL_KEYFILE`;
- `DATABASE_URL`;
- `XRAY_JSON`;
- `XRAY_SUBSCRIPTION_URL_PREFIX`;
- `CUSTOM_TEMPLATES_DIRECTORY`;
- `DOCS`.

The complete list and defaults are documented inline in [.env.example](.env.example).
Custom subscription templates are documented in:

- [V2Ray](app/templates/v2ray/README.md)
- [Clash/Mihomo](app/templates/clash/README.md)
- [sing-box](app/templates/singbox/README.md)

## API and CLI

Interactive OpenAPI documentation is available at `/docs` when `DOCS=True`.
Most management endpoints require a sudo administrator. The current API covers
users, nodes and certificates, hosts, managed inbounds/outbounds, routing rules,
Xray configuration, logs and statistics.

See [cli/README.md](cli/README.md) for source, container and Windows CLI usage.

## License and upstream

This repository is based on [Gozargah/Marzban](https://github.com/Gozargah/Marzban).
See [LICENSE](LICENSE) for license terms.
