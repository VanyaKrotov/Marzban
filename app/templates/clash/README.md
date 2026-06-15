# Clash/Mihomo subscription templates

Clash templates let MarzbanNext produce a complete YAML configuration with custom
proxy groups, routing rules, DNS and transport options.

## Supported transports

| Transport | Support |
| --- | --- |
| WebSocket | Yes |
| gRPC | Yes |
| HTTP | Yes |
| HTTP/2 | Yes |
| KCP | No |
| TCP | Yes |
| HTTPUpgrade | Partial, represented through WebSocket options |
| SplitHTTP | No |

## Configuration

Set the common template directory:

```env
CUSTOM_TEMPLATES_DIRECTORY="/var/lib/marzban/templates/"
```

Create the Clash directory:

```bash
mkdir -p /var/lib/marzban/templates/clash
```

Place the YAML files there and configure paths relative to the common directory:

```env
CLASH_SUBSCRIPTION_TEMPLATE="clash/default.yml"
CLASH_SETTINGS_TEMPLATE="clash/settings.yml"
```

Restart MarzbanNext after changing environment variables:

```bash
marzban restart
```

Example HTTP transport options:

```yaml
http-opts:
  - ip-version: dual
    method: GET
    headers:
      Connection:
        - keep-alive
```

Reference: [Mihomo documentation](https://wiki.metacubex.one/en/)
