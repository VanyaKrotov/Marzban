# Marzban CLI

The CLI manages administrators, users and generated subscription data without
starting the regular web application or the master Xray process.

## Invocation

Installed Docker deployment:

```bash
marzban cli --help
marzban cli admin create --sudo
```

From repository source on Linux:

```bash
./.venv/bin/python marzban-cli.py --help
./.venv/bin/python marzban-cli.py admin create --sudo
```

From PowerShell on Windows:

```powershell
.\.venv\Scripts\python.exe marzban-cli.py --help
.\.venv\Scripts\python.exe marzban-cli.py admin create --sudo
```

The `readline` module is optional, so native Windows does not require
`pyreadline`. Run commands from the repository root so imports and `.env`
configuration resolve correctly.

## Command groups

```text
admin         Manage panel administrators
user          Manage panel users
subscription  Print subscription URLs or generated configurations
completion    Generate shell completion
```

Use `--help` at any level for the authoritative option list:

```bash
marzban cli admin --help
marzban cli admin create --help
marzban cli user --help
marzban cli subscription get-config --help
```

## Administrators

Create a sudo administrator interactively:

```bash
marzban cli admin create --sudo
```

Create one non-interactively:

```bash
MARZBAN_ADMIN_PASSWORD='strong-password' \
  marzban cli admin create --username admin --sudo
```

Other commands:

```bash
marzban cli admin list
marzban cli admin update --username admin
marzban cli admin delete --username admin
marzban cli admin import-from-env
```

`admin import-from-env` reads `SUDO_USERNAME` and `SUDO_PASSWORD`, creates or
updates the sudo administrator and assigns ownerless users to it. Remove those
credentials from the environment after a successful import.

## Users

The `user` group supports listing, creating, updating and deleting users, plus
traffic reset, subscription revoke, activation and ownership operations. Check
the current options before automation:

```bash
marzban cli user --help
marzban cli user create --help
```

## Subscriptions

Print a user's subscription URL:

```bash
marzban cli subscription get-link --username USERNAME
```

`XRAY_SUBSCRIPTION_URL_PREFIX` must be configured for a correct public URL.

Generate V2Ray or Clash configuration:

```bash
marzban cli subscription get-config \
  --username USERNAME \
  --format v2ray \
  --output-file subscription.json

marzban cli subscription get-config \
  --username USERNAME \
  --format clash \
  --output-file subscription.yml
```

Add `--base64` when the consumer expects Base64 output.

## Database and migrations

The CLI uses the same `DATABASE_URL` and models as the application. Apply
migrations before using a newly updated CLI:

```bash
python -m alembic upgrade head
```

See [../app/db/migrations/README](../app/db/migrations/README) for Linux,
Windows and container migration notes.
