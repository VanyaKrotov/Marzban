<p align="center">
  <a href="https://github.com/VanyaKrotov/MarzbanNextNext">
    <img src="https://raw.githubusercontent.com/VanyaKrotov/MarzbanNext/master/app/dashboard/src/assets/logo.svg" width="140" alt="لوگوی MarzbanNext">
  </a>
</p>

<h1 align="center">MarzbanNext</h1>

<p align="center">
  پنل توزیع‌شده مدیریت Xray، کاربران، اشتراک‌ها و پیکربندی نودها
</p>

<p align="center">
  <a href="https://github.com/VanyaKrotov/MarzbanNext/actions"><img src="https://img.shields.io/github/actions/workflow/status/VanyaKrotov/MarzbanNext/build.yml?style=flat-square" alt="وضعیت ساخت"></a>
  <a href="https://github.com/VanyaKrotov/MarzbanNext/releases"><img src="https://img.shields.io/github/v/release/VanyaKrotov/MarzbanNext?style=flat-square" alt="آخرین نسخه"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/VanyaKrotov/MarzbanNext?style=flat-square" alt="مجوز"></a>
  <a href="https://github.com/VanyaKrotov/MarzbanNext/stargazers"><img src="https://img.shields.io/github/stars/VanyaKrotov/MarzbanNext?style=flat-square" alt="ستاره‌ها"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> /
  <a href="./README-ru.md">Русский</a> /
  <a href="./README-fa.md">فارسی</a> /
  <a href="./README-zh-cn.md">简体中文</a>
</p>

> این پروژه یک فورک توزیع‌شده از
> [Gozargah/Marzban](https://github.com/Gozargah/Marzban) است. پنل اصلی داده و
> پیکربندی را مدیریت می‌کند و Xray روی سرورهای
> [Marzban-node](https://github.com/VanyaKrotov/Marzban-node) اجرا می‌شود.

## فهرست مطالب

- [معرفی](#معرفی)
- [معماری](#معماری)
- [قابلیت‌ها](#قابلیت‌ها)
- [صفحات داشبورد](#صفحات-داشبورد)
- [نصب در محیط عملیاتی](#نصب-در-محیط-عملیاتی)
- [نصب نود](#نصب-نود)
- [پیکربندی](#پیکربندی)
- [به‌روزرسانی، پشتیبان‌گیری و مهاجرت](#بهروزرسانی-پشتیبانگیری-و-مهاجرت)
- [API و CLI](#api-و-cli)
- [توسعه محلی](#توسعه-محلی)
- [ساختار پروژه](#ساختار-پروژه)
- [حمایت مالی](#donations)
- [مجوز](#مجوز)

## معرفی

MarzbanNext یک پنل وب برای مدیریت کاربران Xray، لینک‌های اشتراک، محدودیت ترافیک
و زیرساخت پراکسی توزیع‌شده است. این پروژه شامل REST API مبتنی بر FastAPI،
داشبورد React، ابزار مدیریتی CLI و ارتباط با نودهای راه‌دور است.

در این فورک، کنترل و انتقال ترافیک از یکدیگر جدا شده‌اند:

- **پنل اصلی** کاربران، پیکربندی، تخصیص‌ها، آمار و گواهی‌ها را نگهداری می‌کند؛
- **نودهای راه‌دور** Xray را اجرا کرده و فقط پیکربندی تخصیص‌یافته را دریافت می‌کنند؛
- تغییرات فقط نودهای متصل و تحت تأثیر را راه‌اندازی مجدد می‌کنند؛
- Xray روی پنل اصلی اجرا نمی‌شود.

این معماری برای زیرساخت چندکشوری، جداسازی پنل از ترافیک کاربران و اعمال
پیکربندی متفاوت روی هر نود مناسب است.

## معماری

```text
 مدیران ─────► پنل اصلی (FastAPI + Dashboard + DB)
                         │ TLS Node API
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Xray Node A  Xray Node B  Xray Node C
```

نودها با گواهی پنل متصل می‌شوند. تخصیص‌ها صریح هستند؛ نود، inbound، outbound
یا routing rule جدید به‌صورت خودکار به یکدیگر متصل نمی‌شوند.

اشیای واردشده از `XRAY_JSON` فقط‌خواندنی هستند. محتوای JSON آن‌ها قابل ویرایش
یا حذف نیست، اما وضعیت فعال بودن، اطلاعات پایه و تخصیص نود قابل تغییر است.

## قابلیت‌ها

### کاربران و اشتراک‌ها

- پروتکل‌های VMess، VLESS، Trojan و Shadowsocks.
- چند پروتکل و چند inbound برای هر کاربر.
- محدودیت ترافیک، تاریخ انقضا و بازنشانی دوره‌ای.
- لغو اشتراک و بازنشانی ترافیک.
- قالب‌های V2Ray، Clash/Mihomo و sing-box.
- لینک اتصال، QR code، جستجو و فیلترهای ذخیره‌شده در URL.

### مدیریت نود

- اتصال و مدیریت چند نود راه‌دور.
- مشاهده وضعیت، آدرس، نسخه Xray و خطاهای اتصال.
- اتصال مجدد و مشاهده زنده لاگ‌ها.
- تخصیص inbounds، outbounds و routing rules به نودهای مشخص.
- راه‌اندازی مجدد فقط نودهای تحت تأثیر.
- آمار ترافیک نودها بر اساس بازه زمانی.

### گواهی‌ها

- صدور و تمدید گواهی با ACME روی نود.
- ذخیره چند گواهی برای هر نود در پنل.
- بازگرداندن گواهی صادرشده از نود به پنل اصلی.
- تخصیص گواهی‌های نود به TLS inboundها.
- تمدید و حذف از طریق داشبورد.

### پیکربندی Xray

- CRUD برای inbound، outbound و routing rule.
- فعال یا غیرفعال کردن بدون حذف.
- مرتب‌سازی hostها و routing ruleها با drag-and-drop.
- ویرایش کامل JSON پایه Xray.
- Monaco Editor با اعتبارسنجی، تکمیل خودکار و تم روشن/تیره.
- schemaهای کامل پروتکل‌ها، transportها، `streamSettings` و routing.
- مدیریت hostهای اشتراک و متغیرهای پویا.

### عملیات

- پشتیبانی از SQLite، MySQL و MariaDB.
- migrationهای Alembic.
- REST API، Swagger UI، CLI و Telegram.
- imageهای `amd64` و `arm64` در GitHub Releases.
- نصب بدون ورود به Container Registry.

## صفحات داشبورد

| مسیر | توضیح |
| --- | --- |
| `/` | کاربران، فیلترها، اشتراک و عملیات ترافیک |
| `/stats` | آمار کاربران و ترافیک نودها |
| `/nodes` | اتصال نود، وضعیت و گواهی‌ها |
| `/hosts` | hostهای اشتراک و ترتیب نمایش |
| `/inbounds` | inboundها و تخصیص نود |
| `/outbounds` | outboundها و تخصیص نود |
| `/routing` | routing ruleهای مرتب‌شده |
| `/config` | پیکربندی کامل JSON هسته Xray |
| `/logs` | لاگ زنده نود انتخاب‌شده |
| `/docs` | مستندات تعاملی OpenAPI |

داشبورد با React، TypeScript، Tailwind CSS، shadcn، TanStack Query،
react-hook-form و Monaco Editor ساخته شده است.

## نصب در محیط عملیاتی

نیازمندی‌ها: سرور Linux با دسترسی root، ابزار `curl`، معماری `amd64` یا
`arm64` و Docker Compose v2. نسخه قدیمی `docker-compose` v1 پشتیبانی نمی‌شود.

### SQLite

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/MarzbanNext/master/scripts/marzban.sh)" @ install
```

### MySQL یا MariaDB

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/MarzbanNext/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/MarzbanNext/master/scripts/marzban.sh)" @ install --database mariadb
```

### نصب نسخه مشخص

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/MarzbanNext/master/scripts/marzban.sh)" @ install --version v0.10.1
```

اسکریپت فایل مناسب معماری را از GitHub Releases دریافت کرده، با `docker load`
بارگذاری می‌کند و سرویس‌های Compose را اجرا می‌کند.

| مسیر | کاربرد |
| --- | --- |
| `/opt/marzban` | Compose، فایل `.env` و اطلاعات نصب |
| `/var/lib/marzban` | داده‌های پایدار |
| `/usr/local/bin/marzban` | اسکریپت مدیریت |

```bash
marzban cli admin create --sudo
marzban status
marzban logs
marzban restart
marzban update
marzban edit-env
marzban backup
```

برای دسترسی محلی بدون HTTPS مستقیم:

```bash
ssh -L 8000:localhost:8000 user@server
```

سپس `http://127.0.0.1:8000/dashboard/` را باز کنید.

## نصب نود

1. در صفحه `/nodes` پنجره اتصال نود را باز کنید.
2. گواهی پنل را کپی یا دانلود کنید.
3. روی سرور Linux نود اجرا کنید:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/MarzbanNext/master/scripts/marzban-node.sh)" @ install
```

image از
[Releases پروژه Marzban-node](https://github.com/VanyaKrotov/Marzban-node/releases)
دانلود و به‌صورت محلی بارگذاری می‌شود.

- پورت سرویس نود: `62050`
- پورت Xray API: `62051`
- مسیر گواهی: `/var/lib/marzban-node/cert.pem`

```bash
marzban-node status
marzban-node logs
marzban-node restart
marzban-node update
marzban-node core-update
```

پس از نصب، نود را در پنل بسازید و inbounds، outbounds، routing rules و
گواهی‌های موردنیاز را به‌صورت صریح تخصیص دهید.

## پیکربندی

نصب از سورس از `.env` استفاده می‌کند و نصب اسکریپتی آن را در
`/opt/marzban/.env` نگه می‌دارد. فهرست کامل در [.env.example](.env.example) است.

| متغیر | کاربرد |
| --- | --- |
| `UVICORN_HOST`, `UVICORN_PORT` | آدرس و پورت پنل |
| `UVICORN_SSL_CERTFILE`, `UVICORN_SSL_KEYFILE` | HTTPS مستقیم |
| `SQLALCHEMY_DATABASE_URL` | اتصال پایگاه داده |
| `XRAY_JSON` | پیکربندی پایه Xray |
| `XRAY_SUBSCRIPTION_URL_PREFIX` | پیشوند عمومی اشتراک |
| `CUSTOM_TEMPLATES_DIRECTORY` | قالب‌های سفارشی |
| `TELEGRAM_API_TOKEN`, `TELEGRAM_ADMIN_ID` | Telegram |
| `WEBHOOK_ADDRESS`, `WEBHOOK_SECRET` | اعلان webhook |
| `DOCS` | فعال‌سازی `/docs` و `/redoc` |
| `DEBUG` | حالت توسعه |

مستندات قالب‌ها: [V2Ray](app/templates/v2ray/README.md)،
[Clash/Mihomo](app/templates/clash/README.md) و
[sing-box](app/templates/singbox/README.md).

## به‌روزرسانی، پشتیبان‌گیری و مهاجرت

workflow انتشار فقط برای tagهای `v*.*.*` اجرا می‌شود و migrationهای Alembic
هنگام شروع برنامه اعمال می‌شوند.

```bash
marzban backup
cp -a /opt/marzban /root/marzban-opt-backup
cp -a /var/lib/marzban /root/marzban-data-backup
marzban update
marzban status
marzban logs
```

برای انتقال داده از Marzban اصلی، راهنمای
[MIGRATE_FROM_ORIGINAL_MARZBAN.md](MIGRATE_FROM_ORIGINAL_MARZBAN.md) را دنبال
کنید و پیش از تغییر اسکریپت، نسخه پشتیبان معتبر تهیه کنید.

## API و CLI

با `DOCS=True`، Swagger UI در `/docs` و ReDoc در `/redoc` فعال می‌شوند.

```bash
marzban cli [OPTIONS] COMMAND [ARGS]...
```

مرجع کامل CLI در [cli/README.md](cli/README.md) قرار دارد.

## توسعه محلی

Python 3.12 و Node.js نسخه `20.19.0` یا جدیدتر توصیه می‌شوند.

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

Windows PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe main.py
```

Dashboard:

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

توضیحات بیشتر در [app/dashboard/README.md](app/dashboard/README.md) و
[CONTRIBUTING.md](CONTRIBUTING.md) موجود است.

## ساختار پروژه

```text
app/dashboard/    داشبورد React
app/db/           مدل‌ها، CRUD و migrationها
app/routers/      endpointهای FastAPI
app/xray/         پیکربندی و همگام‌سازی نود
app/templates/    قالب‌های اشتراک
cli/              ابزار مدیریتی Typer
scripts/          نصب‌کننده پنل و نود
xray_api/         bindingهای gRPC
```

<a id="donations"></a>
## حمایت مالی

کمک‌های مالی باعث انتشار به‌روزرسانی‌های مفید، قابلیت‌های جدید، بهبود
پایداری و ابزارهای بهتر برای جامعه می‌شوند.

| دارایی | شبکه | آدرس |
| --- | --- | --- |
| TON / USDT | TON | `UQBrg7pSip791hOHIajYi-dx__fJcMuyO5DsVat2gme0YveJ` |
| USDT | Solana | `8o68cBrxcrvGZiCQBvZy7chsYATEWkucoSbqCiEnvqZQ` |
| BTC | Bitcoin | `bc1q8xvclm7c87jvuuz4ffzzt3mvpzsr4yjtnh3dvx` |

از حمایت شما از پروژه سپاسگزاریم!

## مجوز

این فورک بر پایه [Gozargah/Marzban](https://github.com/Gozargah/Marzban) است
و تحت شرایط [LICENSE](LICENSE) منتشر می‌شود. پیش از ارسال pull request،
[CONTRIBUTING.md](CONTRIBUTING.md) را مطالعه کنید.
