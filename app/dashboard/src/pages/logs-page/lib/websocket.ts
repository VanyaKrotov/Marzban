import { getAuthToken } from "utils/authStorage";

export type LogSource = "master" | `node:${number}`;

export function getLogsWebSocketUrl(source: LogSource): string | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const baseApi = new URL(
      import.meta.env.VITE_BASE_API || "/api/",
      window.location.origin,
    );
    const basePath = baseApi.pathname.endsWith("/")
      ? baseApi.pathname
      : `${baseApi.pathname}/`;
    const logPath =
      source === "master"
        ? "core/logs"
        : `node/${source.replace("node:", "")}/logs`;
    const url = new URL(`${basePath}${logPath}`, baseApi.origin);

    url.protocol = baseApi.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("interval", "0.5");
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return null;
  }
}
