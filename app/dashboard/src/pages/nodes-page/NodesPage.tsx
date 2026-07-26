import { Plus, RefreshCw, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Page from "@/components/page";
import { Badge } from "@/components/ui/badge";
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

import { NodeDialog } from "./components/NodeDialog";
import { NodeStatusBadge } from "./components/NodeStatusBadge";

import { useNodesPageQuery } from "./lib/query";

export function NodesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[720px] table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[25%]" />
              <col className="w-[30%]" />
              <col className="w-[18%]" />
              <col className="w-[17%]" />
            </colgroup>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>{t("nodes.nodeName")}</TableHead>
                <TableHead>{t("nodes.nodeAddress")}</TableHead>
                <TableHead>{t("nodesPage.coreVersion")}</TableHead>
                <TableHead>{t("nodesPage.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) =>
                node.id ? (
                  <TableRow
                    key={node.id}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => navigate(`/nodes/${node.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/nodes/${node.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-mono text-xs tabular-nums">
                      {node.id}
                    </TableCell>
                    <TableCell className="truncate font-medium">
                      {node.name}
                    </TableCell>
                    <TableCell className="truncate font-mono text-xs">
                      {node.address}:{node.port}
                    </TableCell>
                    <TableCell>
                      {node.xray_version ? (
                        <Badge variant="outline">v{node.xray_version}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <NodeStatusBadge status={node.status} />
                    </TableCell>
                  </TableRow>
                ) : null,
              )}
            </TableBody>
          </Table>
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

function NodesTableSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[720px] table-fixed">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[25%]" />
          <col className="w-[30%]" />
          <col className="w-[18%]" />
          <col className="w-[17%]" />
        </colgroup>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead>ID</TableHead>
            <TableHead>{t("nodes.nodeName")}</TableHead>
            <TableHead>{t("nodes.nodeAddress")}</TableHead>
            <TableHead>{t("nodesPage.coreVersion")}</TableHead>
            <TableHead>{t("nodesPage.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-36" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-44" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
