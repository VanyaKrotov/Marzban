# V2Ray subscription templates

V2Ray templates let Marzban generate a complete client configuration instead of
using only built-in defaults. They can customize routing, DNS and transport
settings that are not exposed by the dashboard.

## Supported transports

| Transport | Support |
| --- | --- |
| WebSocket | Yes |
| gRPC | Yes |
| HTTP | Yes |
| HTTP/2 | Yes |
| KCP | Yes |
| TCP | Yes |
| HTTPUpgrade | Yes |
| SplitHTTP | Yes |

## Configuration

Set the common template directory:

```env
CUSTOM_TEMPLATES_DIRECTORY="/var/lib/marzban/templates/"
```

Create the V2Ray directory:

```bash
mkdir -p /var/lib/marzban/templates/v2ray
```

Place the files there and configure paths relative to
`CUSTOM_TEMPLATES_DIRECTORY`:

```env
V2RAY_SUBSCRIPTION_TEMPLATE="v2ray/default.json"
V2RAY_SETTINGS_TEMPLATE="v2ray/settings.json"
```

Restart Marzban after changing environment variables:

```bash
marzban restart
```

Editing an already configured template file does not normally require changing
the environment again.

Example transport settings:

```json
{
  "grpcSettings": {
    "idle_timeout": 60,
    "health_check_timeout": 20,
    "permit_without_stream": false,
    "initial_windows_size": 0
  }
}
```

References:

- [Xray configuration](https://xtls.github.io/en/config/)
- [XTLS Xray examples](https://github.com/XTLS/Xray-examples)
