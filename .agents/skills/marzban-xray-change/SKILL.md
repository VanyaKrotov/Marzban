---
name: marzban-xray-change
description: Modify MarzbanNext's Xray integration across config parsing, generated runtime config, process lifecycle, node synchronization, subscriptions, account models, and gRPC wrappers. Use for protocols, transports, inbound settings, Xray users, core or node operations, stats, protobuf APIs, or client share-link behavior.
---

# MarzbanNext Xray Change

## Trace both control planes

Inspect the relevant path before editing:

- `app/xray/config.py`: parse base JSON, resolve managed inbounds, inject API/stats policy, and include active DB users.
- `app/xray/core.py`: local Xray subprocess lifecycle and logs.
- `app/xray/node.py`: remote node lifecycle.
- `app/xray/operations.py`: synchronize users and nodes at runtime.
- `app/models/proxy.py`: supported protocols and account settings.
- `app/subscription/`: generate share links and client configs.
- `xray_api/`: handwritten gRPC wrapper.
- `xray_api/proto/`: generated protobuf modules.

Check both startup config generation and live runtime operations. A feature that works only after restart or only for newly modified users is incomplete.

## Preserve Xray invariants

- Keep user email identifiers as `<db-id>.<username>`.
- Apply changes to the main core and every connected, started node.
- Preserve excluded inbound behavior.
- Preserve flow restrictions by transport, TLS mode, and HTTP headers in both `include_db_users()` and live add/update operations.
- Treat `active` and `on_hold` users as runtime-enabled; limited, expired, and disabled users must be removed.
- Avoid changing process-global state or worker assumptions.
- Keep operations idempotent where current wrappers tolerate missing or existing users.
- Use `TYPE_CHECKING` and local imports to avoid the repository's known circular-import risks.

## Add protocol or transport support end to end

1. Parse and normalize the Xray config in `XRayConfig._resolve_inbounds`.
2. Update proxy/account models and validation.
3. Update runtime add/update behavior.
4. Update share links and each affected subscription format.
5. Update dashboard protocol/transport types and host UI when exposed.
6. Add or regenerate protobuf only from matching upstream `.proto` sources.

Never hand-edit `xray_api/proto/*_pb2.py` or `*_pb2_grpc.py`. Use `xray_api/proto/compile.py` with the expected Xray proto source tree.

## Handle side effects carefully

- Prefer targeted gRPC add/remove/update operations for individual users.
- Regenerate config and restart main core plus connected nodes for global config changes.
- Keep node status updates and connection error handling intact.
- Invalidate caches such as `get_tls()` only when the underlying data can change during the process lifetime.

## Verify

- Parse representative configs for every affected transport and security mode.
- Compare generated runtime JSON before and after the change.
- Check startup population and live add/update/remove produce equivalent accounts.
- Validate main-core and node loops without requiring a production node.
- Test affected share links and Clash, Sing-box, and V2Ray templates.
- If the Xray executable or proto sources are unavailable, run pure config tests and state the remaining integration risk.
