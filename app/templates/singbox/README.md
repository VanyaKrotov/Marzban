# sing-box subscription templates

sing-box templates let MarzbanNext generate a complete client configuration with
custom routing, DNS and transport settings.

## Supported transports

| Transport | Support |
| --- | --- |
| WebSocket | Yes |
| gRPC | Yes |
| HTTP | Yes |
| HTTP/2 | Partial, represented through HTTP |
| KCP | No |
| TCP | No |
| HTTPUpgrade | Yes |
| SplitHTTP | No |

## Configuration

Set the common template directory:

```env
CUSTOM_TEMPLATES_DIRECTORY="/var/lib/marzban/templates/"
```

Create the sing-box directory:

```bash
mkdir -p /var/lib/marzban/templates/singbox
```

Place the JSON files there and configure paths relative to the common directory:

```env
SINGBOX_SUBSCRIPTION_TEMPLATE="singbox/default.json"
SINGBOX_SETTINGS_TEMPLATE="singbox/settings.json"
```

Restart MarzbanNext after changing environment variables:

```bash
marzban restart
```

Example gRPC settings:

```json
{
  "grpcSettings": {
    "idle_timeout": "15s",
    "ping_timeout": "15s",
    "permit_without_stream": false
  }
}
```

Reference: [sing-box configuration](https://sing-box.sagernet.org/configuration/)
