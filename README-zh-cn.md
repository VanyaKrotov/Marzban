<p align="center">
  <a href="https://github.com/VanyaKrotov/Marzban">
    <img src="https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/app/dashboard/src/assets/logo.svg" width="140" alt="Marzban 标志">
  </a>
</p>

<h1 align="center">Marzban</h1>

<p align="center">
  用于管理 Xray、用户、订阅与节点配置的分布式控制面板
</p>

<p align="center">
  <a href="https://github.com/VanyaKrotov/Marzban/actions"><img src="https://img.shields.io/github/actions/workflow/status/VanyaKrotov/Marzban/build.yml?style=flat-square" alt="构建状态"></a>
  <a href="https://github.com/VanyaKrotov/Marzban/releases"><img src="https://img.shields.io/github/v/release/VanyaKrotov/Marzban?style=flat-square" alt="最新版本"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/VanyaKrotov/Marzban?style=flat-square" alt="许可证"></a>
  <a href="https://github.com/VanyaKrotov/Marzban/stargazers"><img src="https://img.shields.io/github/stars/VanyaKrotov/Marzban?style=flat-square" alt="Stars"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> /
  <a href="./README-ru.md">Русский</a> /
  <a href="./README-fa.md">فارسی</a> /
  <a href="./README-zh-cn.md">简体中文</a>
</p>

> 本项目是 [Gozargah/Marzban](https://github.com/Gozargah/Marzban) 的分布式
> 分支。主面板负责数据与配置管理，Xray 运行在已连接的
> [Marzban-node](https://github.com/VanyaKrotov/Marzban-node) 服务器上。

## 目录

- [项目概述](#项目概述)
- [系统架构](#系统架构)
- [主要功能](#主要功能)
- [面板页面](#面板页面)
- [生产环境安装](#生产环境安装)
- [安装节点](#安装节点)
- [配置](#配置)
- [更新备份与迁移](#更新备份与迁移)
- [API 与 CLI](#api-与-cli)
- [本地开发](#本地开发)
- [项目结构](#项目结构)
- [捐赠](#donations)
- [许可证](#许可证)

## 项目概述

Marzban 是一个用于管理 Xray 用户、订阅、流量限制和分布式代理基础设施
的 Web 控制面板。项目包含 FastAPI REST 后端、React Dashboard、管理 CLI
以及远程 Xray 节点集成。

本分支将控制面与数据面分离：

- **主面板**保存用户、配置、节点分配、统计信息和证书；
- **远程节点**运行 Xray，并仅接收分配给自己的配置；
- 配置变更只会重启受影响且已连接的节点；
- 主面板不会启动 Xray 核心。

该架构适用于跨地区或跨服务商部署、隔离管理面板与用户流量，以及为不同
节点应用独立的 inbound、outbound 和 routing 策略。

## 系统架构

```text
 管理员 ─────► 主面板（FastAPI + Dashboard + Database）
                         │ TLS Node API
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Xray 节点 A  Xray 节点 B  Xray 节点 C
```

节点通过面板证书连接。所有分配都是显式的：新建节点、inbound、outbound
和 routing rule 不会自动互相绑定。

从 `XRAY_JSON` 导入的对象为只读对象，其 JSON 内容不可修改或删除，但启用
状态、元数据与节点分配仍可编辑。

## 主要功能

### 用户与订阅

- 支持 VMess、VLESS、Trojan 和 Shadowsocks。
- 单个用户可使用多个协议和 inbound。
- 流量、到期时间与周期重置限制。
- 撤销订阅与重置流量。
- V2Ray、Clash/Mihomo 与 sing-box 订阅模板。
- 分享链接、二维码、搜索和保存在 URL 中的筛选条件。

### 分布式节点

- 连接和管理多个远程 Xray 节点。
- 查看连接状态、地址、Xray 版本和错误。
- 节点重新连接与实时日志。
- 将 inbound、outbound 和 routing rule 分配到指定节点。
- 仅重启受配置变更影响的节点。
- 按日期区间查看节点流量统计。

### 证书管理

- 在节点上通过 ACME 签发或续期证书。
- 每个节点保存多个证书。
- 将节点签发的证书返回并保存在主面板。
- 将证书分配给 TLS inbound。
- 在 Dashboard 中续期或删除证书。

### Xray 配置

- 管理 inbound、outbound 和 routing rule 的 CRUD。
- 无需删除即可启用或禁用实体。
- 拖拽调整订阅 host 和 routing rule 顺序。
- 完整的 Xray 基础 JSON 编辑器。
- Monaco Editor 校验、自动补全和明暗主题。
- 协议、传输层、`streamSettings`、routing 与 outbound 的详细 schema。
- 支持动态变量的订阅 host 编辑器。

### 运维能力

- SQLite、MySQL 和 MariaDB。
- Alembic 数据库迁移。
- REST API、Swagger UI、CLI 与 Telegram 集成。
- `amd64` 和 `arm64` Release 镜像。
- 无需登录 Container Registry，直接从 GitHub Releases 安装。

## 面板页面

| 路径 | 用途 |
| --- | --- |
| `/` | 用户、筛选、订阅和流量操作 |
| `/stats` | 用户与节点流量统计 |
| `/nodes` | 节点连接、状态与证书 |
| `/hosts` | 订阅 host 与显示顺序 |
| `/inbounds` | Xray inbound 与节点分配 |
| `/outbounds` | Xray outbound 与节点分配 |
| `/routing` | 有序 routing rule |
| `/config` | 完整 Xray 基础 JSON 配置 |
| `/logs` | 所选节点的实时日志 |
| `/docs` | OpenAPI 交互文档 |

Dashboard 使用 React、TypeScript、Tailwind CSS、shadcn、TanStack Query、
react-hook-form 和 Monaco Editor。

## 生产环境安装

要求：具有 root 权限的 Linux、`curl`、`amd64` 或 `arm64`，以及 Docker
Compose v2。不支持旧版 `docker-compose` v1。

### SQLite

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install
```

### MySQL 或 MariaDB

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mariadb
```

### 安装指定版本

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --version v0.10.1
```

安装脚本从 GitHub Releases 下载当前架构对应的镜像压缩包，通过
`docker load` 本地加载并启动 Compose 服务，不需要登录 GHCR。

| 路径 | 用途 |
| --- | --- |
| `/opt/marzban` | Compose、`.env` 与安装信息 |
| `/var/lib/marzban` | 持久化数据 |
| `/usr/local/bin/marzban` | 管理脚本 |

```bash
marzban cli admin create --sudo
marzban status
marzban logs
marzban restart
marzban update
marzban edit-env
marzban backup
```

未直接配置 HTTPS 时可使用 SSH 端口转发：

```bash
ssh -L 8000:localhost:8000 user@server
```

然后访问 `http://127.0.0.1:8000/dashboard/`。

## 安装节点

1. 打开 `/nodes` 页面中的连接节点对话框。
2. 复制或下载面板证书。
3. 在远程 Linux 节点服务器运行：

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban-node.sh)" @ install
```

镜像来自
[VanyaKrotov/Marzban-node Releases](https://github.com/VanyaKrotov/Marzban-node/releases)，
并通过 `docker load` 本地加载。

- 节点服务端口：`62050`
- Xray API 端口：`62051`
- 面板证书路径：`/var/lib/marzban-node/cert.pem`

```bash
marzban-node status
marzban-node logs
marzban-node restart
marzban-node update
marzban-node core-update
```

安装后在面板中创建节点，并显式分配所需的 inbound、outbound、routing rule
与证书。

## 配置

源码运行使用 `.env`，脚本安装将其保存在 `/opt/marzban/.env`。完整配置请
查看 [.env.example](.env.example)。

| 变量 | 用途 |
| --- | --- |
| `UVICORN_HOST`, `UVICORN_PORT` | 面板监听地址和端口 |
| `UVICORN_SSL_CERTFILE`, `UVICORN_SSL_KEYFILE` | 直接 HTTPS |
| `SQLALCHEMY_DATABASE_URL` | 数据库连接 |
| `XRAY_JSON` | Xray 基础配置 |
| `XRAY_SUBSCRIPTION_URL_PREFIX` | 公开订阅地址前缀 |
| `CUSTOM_TEMPLATES_DIRECTORY` | 自定义模板目录 |
| `TELEGRAM_API_TOKEN`, `TELEGRAM_ADMIN_ID` | Telegram 集成 |
| `WEBHOOK_ADDRESS`, `WEBHOOK_SECRET` | Webhook 通知 |
| `DOCS` | 启用 `/docs` 与 `/redoc` |
| `DEBUG` | 开发模式 |

模板文档：[V2Ray](app/templates/v2ray/README.md)、
[Clash/Mihomo](app/templates/clash/README.md)、
[sing-box](app/templates/singbox/README.md)。

## 更新备份与迁移

Release workflow 仅在推送 `v*.*.*` 标签时运行，应用启动时会自动执行
Alembic 迁移。

```bash
marzban backup
cp -a /opt/marzban /root/marzban-opt-backup
cp -a /var/lib/marzban /root/marzban-data-backup
marzban update
marzban status
marzban logs
```

从原始 Marzban 迁移现有数据时，请遵循
[MIGRATE_FROM_ORIGINAL_MARZBAN.md](MIGRATE_FROM_ORIGINAL_MARZBAN.md)，
并在替换脚本或更新之前验证数据库和数据备份。

## API 与 CLI

设置 `DOCS=True` 后，Swagger UI 位于 `/docs`，ReDoc 位于 `/redoc`。

```bash
marzban cli [OPTIONS] COMMAND [ARGS]...
```

完整 CLI 文档见 [cli/README.md](cli/README.md)。

## 本地开发

推荐 Python 3.12 与 Node.js `20.19.0` 或更高版本。

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

Windows PowerShell：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe main.py
```

Dashboard：

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

更多说明见 [app/dashboard/README.md](app/dashboard/README.md) 与
[CONTRIBUTING.md](CONTRIBUTING.md)。

## 项目结构

```text
app/dashboard/    React Dashboard
app/db/           数据模型、CRUD 与 Alembic
app/routers/      FastAPI endpoints
app/xray/         Xray 配置与节点同步
app/templates/    订阅模板
cli/              Typer 管理 CLI
scripts/          面板与节点安装脚本
xray_api/         Xray gRPC bindings
```

<a id="donations"></a>
## 捐赠

捐赠将帮助项目持续发布实用更新、增加新功能、提高稳定性并改进社区工具。

| 资产 | 网络 | 地址 |
| --- | --- | --- |
| TON / USDT | TON | `UQBrg7pSip791hOHIajYi-dx__fJcMuyO5DsVat2gme0YveJ` |
| USDT | Solana | `8o68cBrxcrvGZiCQBvZy7chsYATEWkucoSbqCiEnvqZQ` |
| BTC | Bitcoin | `bc1q8xvclm7c87jvuuz4ffzzt3mvpzsr4yjtnh3dvx` |

感谢您对本项目的支持！

## 许可证

本分支基于 [Gozargah/Marzban](https://github.com/Gozargah/Marzban)，并按
[LICENSE](LICENSE) 中的条款发布。提交 pull request 前请阅读
[CONTRIBUTING.md](CONTRIBUTING.md)。
