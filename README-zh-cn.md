# Marzban

Marzban 是一个 Xray 管理面板。本分支采用分布式架构：主面板负责用户和配置，
Xray 运行在已连接的
[Marzban-node](https://github.com/VanyaKrotov/Marzban-node) 服务器上。

[English](README.md) | [Русский](README-ru.md) | [فارسی](README-fa.md)

## 本分支功能

- 用户、订阅、流量限制、到期时间和用量管理。
- 主面板不运行 Xray，仅管理远程节点。
- 每个节点可保存多个 TLS 证书，并分配给指定的 TLS inbound。
- Host、inbound、outbound 和 routing rule 可按节点分配。
- 配置变化时只重启受影响且已连接的节点。
- 基于 Monaco 的 Xray JSON 编辑器，支持校验、自动补全和主题切换。
- 节点实时日志以及流量、用户统计页面。
- `/docs` OpenAPI 文档。
- Docker 镜像以 GitHub Release 文件发布，不依赖容器镜像仓库。

从 `XRAY_JSON` 导入的对象不能修改 JSON 内容，也不能删除；但仍可修改
启用状态、基本信息和节点分配。

## 安装面板

要求：具有 root 权限的 Linux、`amd64` 或 `arm64`、`curl`、Docker 和
Docker Compose v2。不支持旧版 `docker-compose` v1。

使用 SQLite：

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install
```

使用 MySQL 或 MariaDB：

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mariadb
```

创建 sudo 管理员：

```bash
marzban cli admin create --sudo
```

常用命令：

```bash
marzban status
marzban logs
marzban update
marzban restart
marzban edit-env
marzban backup
```

持久化数据默认位于 `/var/lib/marzban`。更新或迁移前必须备份数据库和数据目录。

## 安装节点

先在 `/nodes` 页面的“连接节点”对话框中复制或下载面板证书，然后在节点服务器执行：

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban-node.sh)" @ install
```

默认服务端口为 `62050`，Xray API 端口为 `62051`。节点镜像从
`VanyaKrotov/Marzban-node` Releases 下载并通过 `docker load` 本地加载。

## 面板页面

主要路由包括：`/` 用户、`/nodes` 节点、`/hosts` Host、`/inbounds`、
`/outbounds`、`/routing`、`/config`、`/logs` 和 `/stats`。

## 本地开发

Backend 推荐 Python 3.12：

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

Dashboard 需要 Node.js `20.19.0` 或更高版本：

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

连接本地 backend 时，在 `.env` 中设置：

```env
VITE_BASE_API=http://127.0.0.1:8000/api/
```

更多内容请参阅 [Dashboard README](app/dashboard/README.md)、
[CLI README](cli/README.md) 和
[迁移指南](MIGRATE_FROM_ORIGINAL_MARZBAN.md)。

## 发布与许可

发布 workflow 只在推送 `v*.*.*` tag 时运行，并生成
`marzban-linux-amd64.tar.gz` 和 `marzban-linux-arm64.tar.gz` Release 文件。
本项目基于 [Gozargah/Marzban](https://github.com/Gozargah/Marzban)，许可条款见
[LICENSE](LICENSE)。
