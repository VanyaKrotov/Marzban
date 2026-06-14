# Marzban

Marzban یک پنل مدیریت Xray است. این فورک برای معماری توزیع‌شده طراحی شده است:
پنل اصلی کاربران و پیکربندی را مدیریت می‌کند و Xray روی سرورهای
[Marzban-node](https://github.com/VanyaKrotov/Marzban-node) اجرا می‌شود.

[English](README.md) | [Русский](README-ru.md) | [简体中文](README-zh-cn.md)

## امکانات این فورک

- مدیریت کاربران، اشتراک‌ها، محدودیت و آمار ترافیک.
- مدیریت نودهای راه‌دور بدون اجرای Xray روی پنل اصلی.
- چند گواهی TLS برای هر نود و اتصال هر گواهی به inboundهای TLS.
- مدیریت host، inbound، outbound و routing rule برای نودهای مشخص.
- راه‌اندازی مجدد فقط نودهایی که از تغییر پیکربندی تأثیر گرفته‌اند.
- ویرایشگر کامل JSON برای Xray با Monaco، اعتبارسنجی و تکمیل خودکار.
- نمایش زنده لاگ نود و صفحه آمار ترافیک و کاربران.
- مستندات OpenAPI در مسیر `/docs`.
- دریافت imageهای Docker از فایل‌های GitHub Release، بدون Container Registry.

محتوای JSON آیتم‌هایی که از `XRAY_JSON` وارد شده‌اند قابل ویرایش یا حذف نیست،
اما وضعیت، مشخصات و نودهای متصل به آن‌ها قابل تغییر است.

## نصب پنل

نیازمندی‌ها: سرور Linux با دسترسی root، معماری `amd64` یا `arm64`، `curl`،
Docker و Docker Compose v2. نسخه قدیمی `docker-compose` پشتیبانی نمی‌شود.

نصب با SQLite:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install
```

نصب با MySQL یا MariaDB:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mysql
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban.sh)" @ install --database mariadb
```

ساخت مدیر sudo:

```bash
marzban cli admin create --sudo
```

دستورات مهم:

```bash
marzban status
marzban logs
marzban update
marzban restart
marzban edit-env
marzban backup
```

داده‌های پایدار به‌صورت پیش‌فرض در `/var/lib/marzban` ذخیره می‌شوند. قبل از
به‌روزرسانی یا مهاجرت، از دیتابیس و این پوشه نسخه پشتیبان تهیه کنید.

## نصب نود

ابتدا در صفحه `/nodes` گواهی پنل را از پنجره اتصال نود دریافت کنید. سپس روی
سرور نود اجرا کنید:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/VanyaKrotov/Marzban/master/scripts/marzban-node.sh)" @ install
```

پورت‌های پیش‌فرض سرویس و Xray API به‌ترتیب `62050` و `62051` هستند. image نود
از releaseهای مخزن `VanyaKrotov/Marzban-node` دانلود و با `docker load` به‌صورت
محلی بارگذاری می‌شود.

## صفحات پنل

مسیرهای اصلی عبارت‌اند از: `/` کاربران، `/nodes` نودها، `/hosts` هاست‌ها،
`/inbounds`، `/outbounds`، `/routing`، `/config`، `/logs` و `/stats`.

## توسعه

Backend با Python 3.12:

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m alembic upgrade head
./.venv/bin/python main.py
```

Dashboard به Node.js `20.19.0` یا جدیدتر نیاز دارد:

```bash
cd app/dashboard
cp example.env .env
npm ci
npm run dev
```

برای backend محلی مقدار زیر را در `.env` قرار دهید:

```env
VITE_BASE_API=http://127.0.0.1:8000/api/
```

راهنمای dashboard در [app/dashboard/README.md](app/dashboard/README.md)، راهنمای
CLI در [cli/README.md](cli/README.md) و راهنمای انتقال داده در
[MIGRATE_FROM_ORIGINAL_MARZBAN.md](MIGRATE_FROM_ORIGINAL_MARZBAN.md) قرار دارد.

## انتشار و مجوز

workflow انتشار فقط برای tagهای `v*.*.*` اجرا می‌شود و فایل‌های
`marzban-linux-amd64.tar.gz` و `marzban-linux-arm64.tar.gz` را به GitHub Release
اضافه می‌کند. این فورک بر پایه
[Gozargah/Marzban](https://github.com/Gozargah/Marzban) است؛ شرایط مجوز در
[LICENSE](LICENSE) آمده است.
