import {
  ArrowLeft,
  LoaderCircle,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import Page from "@/components/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RuntimeLogsCard } from "@/components/runtime-logs/RuntimeLogsCard";
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
  useDeleteNodeMutation,
  useNodeQuery,
  useRestartNodeMutation,
} from "@/pages/nodes-page/lib/query";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

import { NodeCertificatesCard } from "./components/certificates/NodeCertificatesCard";
import { NodeGeoResourcesCard } from "./components/geo-resources/NodeGeoResourcesCard";
import { NodeInboundsCard } from "./components/NodeInboundsCard";
import { NodeOutboundsCard } from "./components/NodeOutboundsCard";
import { NodeOverviewCard } from "./components/NodeOverviewCard";
import { NodeRoutingCard } from "./components/NodeRoutingCard";

export function NodeProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const nodeId = Number(params.id);
  const query = useNodeQuery(nodeId, Number.isInteger(nodeId) && nodeId > 0);
  const remove = useDeleteNodeMutation();
  const restart = useRestartNodeMutation();
  const node = query.data;

  if (query.isLoading) {
    return (
      <Page className="gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </Page>
    );
  }

  if (!node || !node.id || query.isError) {
    return (
      <Page>
        <Empty className="min-h-96 rounded-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Server />
            </EmptyMedia>
            <EmptyTitle>{t("nodeProfile.notFound")}</EmptyTitle>
            <EmptyDescription>
              {t("nodeProfile.notFoundDescription")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link to="/nodes">
                <ArrowLeft />
                {t("nodeProfile.back")}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Page>
    );
  }

  const profileNode = { ...node, id: node.id };

  return (
    <Page className="gap-4 pb-6">
      <Page.Header className="mb-0">
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{node.name}</h1>
        </div>
        <div className="ml-auto flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant={node.restart_required ? "default" : "outline"}
                size="sm"
              >
                <RefreshCw />
                <span className="hidden sm:inline">
                  {node.restart_required
                    ? t("nodeProfile.applyChanges")
                    : t("nodeProfile.restart")}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <RefreshCw />
                </AlertDialogMedia>
                <AlertDialogTitle>
                  {t("nodeProfile.restartTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("nodeProfile.restartDescription", { name: node.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={restart.isPending}>
                  {t("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={restart.isPending}
                  onClick={() =>
                    restart.mutate(node.id!, {
                      onSuccess: () =>
                        generateSuccessMessage(t("nodeProfile.restartSuccess")),
                      onError: (error) => generateErrorMessage(error),
                    })
                  }
                >
                  {restart.isPending && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {t("nodeProfile.restart")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="sm">
                <Trash2 />
                <span className="hidden sm:inline">
                  {t("nodesPage.deleteNode")}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive">
                  <Trash2 />
                </AlertDialogMedia>
                <AlertDialogTitle>{t("deleteNode.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans
                    i18nKey="deleteNode.prompt"
                    values={{ name: node.name }}
                    components={{ b: <strong /> }}
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={remove.isPending}>
                  {t("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(node.id!, {
                      onSuccess: () => {
                        generateSuccessMessage(
                          t("deleteNode.deleteSuccess", { name: node.name }),
                        );
                        navigate("/nodes", { replace: true });
                      },
                      onError: (error) => generateErrorMessage(error),
                    })
                  }
                >
                  {remove.isPending && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Page.Header>

      <NodeOverviewCard node={profileNode} />
      <div className="grid gap-4 2xl:grid-cols-2">
        <NodeInboundsCard node={profileNode} />
        <NodeGeoResourcesCard nodeId={profileNode.id} />
        <NodeRoutingCard node={profileNode} />
        <NodeOutboundsCard node={profileNode} />
        <NodeCertificatesCard nodeId={profileNode.id} nodeName={node.name} />
      </div>
      <RuntimeLogsCard nodeId={profileNode.id} />
    </Page>
  );
}
