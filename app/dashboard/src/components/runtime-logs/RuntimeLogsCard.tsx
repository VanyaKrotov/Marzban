import {
  CirclePause,
  CirclePlay,
  Eraser,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useWebSocket, { ReadyState } from "react-use-websocket";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getNodeLogsWebSocketUrl } from "./websocket";

const MAX_LOG_LINES = 500;

const statusVariant = (readyState: ReadyState) => {
  if (readyState === ReadyState.OPEN) return "default";
  if (readyState === ReadyState.CONNECTING) return "secondary";
  return "destructive";
};

export function RuntimeLogsCard({ nodeId }: { nodeId: number }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [socketGeneration, setSocketGeneration] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const pausedRef = useRef(false);
  const bufferedWhilePaused = useRef<string[]>([]);
  const socketUrl = useMemo(() => {
    const url = getNodeLogsWebSocketUrl(nodeId);
    if (!url) return null;

    const websocketUrl = new URL(url);
    websocketUrl.searchParams.set("generation", String(socketGeneration));
    return websocketUrl.toString();
  }, [nodeId, socketGeneration]);

  const appendLogs = useCallback((message: string) => {
    const lines = message
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
    if (!lines.length) return;

    setLogs((current) => [...current, ...lines].slice(-MAX_LOG_LINES));
  }, []);

  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 20,
    reconnectInterval: 1500,
  });

  useEffect(() => {
    if (!lastMessage?.data) return;
    const message = String(lastMessage.data);

    if (pausedRef.current) {
      bufferedWhilePaused.current = [
        ...bufferedWhilePaused.current,
        message,
      ].slice(-MAX_LOG_LINES);
      return;
    }

    appendLogs(message);
  }, [appendLogs, lastMessage]);

  useEffect(() => {
    setLogs([]);
    bufferedWhilePaused.current = [];
    shouldFollowRef.current = true;
  }, [nodeId]);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused && bufferedWhilePaused.current.length) {
      appendLogs(bufferedWhilePaused.current.join("\n"));
      bufferedWhilePaused.current = [];
    }
  }, [appendLogs, paused]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && shouldFollowRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    bufferedWhilePaused.current = [];
  };

  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    shouldFollowRef.current =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 24;
  };

  const statusKey = {
    [ReadyState.CONNECTING]: "logsPage.status.connecting",
    [ReadyState.OPEN]: "logsPage.status.connected",
    [ReadyState.CLOSING]: "logsPage.status.closed",
    [ReadyState.CLOSED]: "logsPage.status.closed",
    [ReadyState.UNINSTANTIATED]: "logsPage.status.closed",
  }[readyState];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("logsPage.title")}</CardTitle>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
            <Eraser />
            <span className="hidden sm:inline">{t("logsPage.clear")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? <CirclePlay /> : <CirclePause />}
            <span className="hidden sm:inline">
              {t(paused ? "logsPage.resume" : "logsPage.pause")}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSocketGeneration((current) => current + 1)}
          >
            <RefreshCw />
            <span className="hidden sm:inline">
              {t("logsPage.reconnect")}
            </span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {paused && (
            <Badge variant="outline">{t("logsPage.status.paused")}</Badge>
          )}
          <Badge variant={statusVariant(readyState)}>{t(statusKey)}</Badge>
          <span className="text-xs text-muted-foreground">
            {t("logsPage.lineCount", { count: logs.length })}
          </span>
        </div>

        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="h-112 overflow-auto rounded-xl border bg-muted/20 p-4 font-mono text-xs leading-5 text-foreground"
        >
          {logs.length ? (
            logs.map((line, index) => (
              <div
                key={`${index}-${line.slice(0, 24)}`}
                className="whitespace-pre-wrap break-all"
              >
                <span className="mr-3 inline-block w-9 select-none text-right text-muted-foreground">
                  {index + 1}
                </span>
                {line}
              </div>
            ))
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <ScrollText className="size-8" />
              <div>
                <p className="font-sans text-sm font-medium">
                  {t("logsPage.emptyTitle")}
                </p>
                <p className="font-sans text-xs">
                  {t("logsPage.emptyDescription")}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
