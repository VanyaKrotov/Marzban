import { useState } from "react";
import { useTranslation } from "react-i18next";

import { OutboundDialog } from "./outbounds/OutboundDialog";
import {
  type OutboundConfig,
  type OutboundPayload,
  useCreateOutboundMutation,
  useDeleteOutboundMutation,
  useOutboundConfigsQuery,
  useUpdateOutboundMutation,
} from "../lib/outbounds-query";
import type { NodeType } from "types/Node";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

import { ManagedConfigsCard } from "./ManagedConfigsCard";
import {
  isEnabledOnNode,
  isVisibleOnNode,
  readonlyFirst,
  updateNodeAssignment,
} from "../lib/node-assignment";

export function NodeOutboundsCard({
  node,
}: {
  node: NodeType & { id: number };
}) {
  const { t } = useTranslation();
  const query = useOutboundConfigsQuery();
  const create = useCreateOutboundMutation();
  const update = useUpdateOutboundMutation();
  const remove = useDeleteOutboundMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OutboundConfig | null>(null);
  const items = readonlyFirst((query.data ?? []).filter((item) =>
    isVisibleOnNode(item, node.id),
  ))
    .map((item) => ({
      ...item,
      enabled: isEnabledOnNode(item, node.id),
    }));
  const pending = create.isPending || update.isPending || remove.isPending;

  const save = (payload: OutboundPayload) => {
    const options = {
      onSuccess: () => {
        generateSuccessMessage(t("outboundsPage.saved"));
        setOpen(false);
      },
      onError: (error: Error) => generateErrorMessage(error),
    };

    if (editing) {
      update.mutate(
        {
          tag: editing.tag,
          payload: {
            enabled: payload.enabled,
            node_ids: payload.node_ids,
            ...(!editing.readonly && { content: payload.content }),
          },
        },
        options,
      );
    } else {
      create.mutate(payload, options);
    }
  };

  return (
    <ManagedConfigsCard
      title={t("outboundsPage.title")}
      description={t("nodeProfile.outboundsDescription")}
      items={items}
      loading={query.isLoading}
      fetching={query.isFetching}
      error={query.isError}
      pending={pending}
      emptyText={t("nodeProfile.noOutbounds")}
      errorText={t("outboundsPage.loadErrorTitle")}
      refreshLabel={t("outboundsPage.refresh")}
      deleteTitle={t("outboundsPage.deleteTitle")}
      deleteDescription={(item) =>
        t("outboundsPage.deleteDescription", { tag: item.tag })
      }
      onCreate={() => {
        setEditing(null);
        setOpen(true);
      }}
      onRefresh={() => void query.refetch()}
      onEdit={(item) => {
        setEditing(item);
        setOpen(true);
      }}
      onToggle={(item, enabled) =>
        update.mutate(
          {
            tag: item.tag,
            payload: item.readonly
              ? {
                  node_ids: updateNodeAssignment(
                    item.node_ids,
                    node.id,
                    enabled,
                  ),
                }
              : { enabled },
          },
          { onError: (error) => generateErrorMessage(error) },
        )
      }
      onDelete={(item) =>
        remove.mutate(item.tag, {
          onSuccess: () =>
            generateSuccessMessage(t("outboundsPage.deleted")),
          onError: (error) => generateErrorMessage(error),
        })
      }
      dialogs={
        <OutboundDialog
          key={`${editing?.tag ?? "create"}-${open}`}
          outbound={editing}
          nodeId={node.id}
          open={open}
          pending={create.isPending || update.isPending}
          onOpenChange={setOpen}
          onSubmit={save}
        />
      }
    />
  );
}
