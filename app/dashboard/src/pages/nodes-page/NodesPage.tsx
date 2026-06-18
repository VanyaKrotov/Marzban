import { ChevronRight, Plus, RefreshCw, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import Page from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { NodeDialog } from "./components/NodeDialog";
import { NodeStatusBadge } from "./components/NodeStatusBadge";

import { useNodesPageQuery } from "./lib/query";

export function NodesPage() {
  const { t } = useTranslation();
  const {
    data: nodes = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useNodesPageQuery();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Page>
      <Page.Header
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2 sm:px-3"
              disabled={isFetching}
              onClick={() => void refetch()}
              aria-label={t("nodesPage.refresh").toString()}
            >
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              <span className="hidden sm:inline">{t("nodesPage.refresh")}</span>
            </Button>
            <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus />
              {t("create")}
            </Button>
          </div>
        }
      >
        <h1 className="font-semibold">{t("nodesPage.title")}</h1>
      </Page.Header>

      {isLoading ? (
        <NodesGridSkeleton />
      ) : isError ? (
        <Empty className="min-h-96 rounded-xl">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="bg-destructive/10 text-destructive"
            >
              <Server />
            </EmptyMedia>
            <EmptyTitle>{t("nodesPage.loadErrorTitle")}</EmptyTitle>
            <EmptyDescription>
              {t("nodesPage.loadErrorDescription")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
            >
              <RefreshCw />
              {t("nodesPage.refresh")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : nodes.length ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4">
          {nodes.map((node) =>
            node.id ? (
              <Link
                key={node.id}
                to={`/nodes/${node.id}`}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="h-full transition-colors group-hover:bg-muted/30">
                  <CardHeader className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Server className="size-5" />
                    </div>
                    <CardTitle className="truncate">{node.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <NodeCardValue
                        label={t("nodes.nodeAddress")}
                        value={`${node.address}:${node.port}`}
                        mono
                      />
                      <NodeCardValue
                        label={t("nodesPage.coreVersion")}
                        value={
                          node.xray_version
                            ? `Xray ${node.xray_version}`
                            : t("nodesPage.versionUnknown")
                        }
                      />
                    </div>
                    <div className="flex justify-between gap-x-6 pt-3 text-muted-foreground">
                      <NodeStatusBadge status={node.status} />{" "}
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : null,
          )}
        </div>
      ) : (
        <Empty className="min-h-96 rounded-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Server />
            </EmptyMedia>
            <EmptyTitle>{t("nodesPage.emptyTitle")}</EmptyTitle>
            <EmptyDescription>
              {t("nodesPage.emptyDescription")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus />
              {t("create")}
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <NodeDialog
        key={`create-${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Page>
  );
}

function NodeCardValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={mono ? "truncate font-mono text-xs" : "truncate font-medium"}
      >
        {value}
      </p>
    </div>
  );
}

function NodesGridSkeleton() {
  return (
    <div className="grid gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton className="h-52 rounded-xl" key={index} />
      ))}
    </div>
  );
}
