import { Plus, RefreshCw, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Page from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NodeType } from "types/Node";

import { NodeDialog } from "./components/NodeDialog";
import { NodeStatusBadge } from "./components/NodeStatusBadge";
import { useNodesPageQuery } from "./lib/query";

export function NodesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: nodes = [], isLoading, isFetching, isError, refetch } =
    useNodesPageQuery();
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setDialogOpen(true);
  };

  const openProfile = (node: NodeType) => {
    if (node.id) navigate(`/nodes/${node.id}`);
  };

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
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus />
              {t("create")}
            </Button>
          </div>
        }
      >
        <div>
          <h1 className="font-semibold">{t("nodesPage.title")}</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {t("nodesPage.description")}
          </p>
        </div>
      </Page.Header>

      {isLoading ? (
        <NodesTableSkeleton />
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
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("nodes.nodeName")}</TableHead>
                  <TableHead>{t("usersTable.status")}</TableHead>
                  <TableHead>{t("nodes.nodeAddress")}</TableHead>
                  <TableHead>{t("nodesPage.coreVersion")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow
                    key={node.id ?? node.name}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => openProfile(node)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openProfile(node);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell>
                      <NodeStatusBadge status={node.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {node.address}:{node.port}
                    </TableCell>
                    <TableCell>
                      {node.xray_version ? (
                        <span className="font-mono text-xs">
                          Xray {node.xray_version}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {nodes.map((node) => (
              <article
                key={node.id ?? node.name}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-xl border bg-card p-4 text-start shadow-xs"
                onClick={() => openProfile(node)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openProfile(node);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{node.name}</span>
                  <NodeStatusBadge status={node.status} />
                </div>
                <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                  <span>
                    {node.address}:{node.port}
                  </span>
                  <span>
                    {node.xray_version
                      ? `Xray ${node.xray_version}`
                      : t("nodesPage.versionUnknown")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
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
            <Button type="button" onClick={openCreate}>
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

function NodesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-12 w-full" key={index} />
        ))}
      </div>
    </div>
  );
}
