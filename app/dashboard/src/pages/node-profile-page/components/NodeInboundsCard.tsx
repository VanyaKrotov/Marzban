import { useState } from "react";
import { useTranslation } from "react-i18next";

import { InboundDialog } from "./inbounds/InboundDialog";
import {
  type InboundConfig,
  type InboundPayload,
  useCreateInboundMutation,
  useDeleteInboundMutation,
  useInboundConfigsQuery,
  useUpdateInboundMutation,
} from "../lib/inbounds-query";
import type { NodeType } from "types/Node";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";

import { ManagedConfigsCard } from "./ManagedConfigsCard";

export function NodeInboundsCard({
  node,
}: {
  node: NodeType & { id: number };
}) {
  const { t } = useTranslation();
  const query = useInboundConfigsQuery();
  const create = useCreateInboundMutation();
  const update = useUpdateInboundMutation();
  const remove = useDeleteInboundMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InboundConfig | null>(null);
  const items = (query.data ?? []).filter((item) =>
    item.node_ids.includes(node.id),
  );
  const pending = create.isPending || update.isPending || remove.isPending;

  const save = (payload: InboundPayload) => {
    const options = {
      onSuccess: () => {
        generateSuccessMessage(t("inboundsPage.saved"));
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
      title={t("inboundsPage.title")}
      description={t("nodeProfile.inboundsDescription")}
      items={items}
      loading={query.isLoading}
      fetching={query.isFetching}
      error={query.isError}
      pending={pending}
      emptyText={t("nodeProfile.noInbounds")}
      errorText={t("inboundsPage.loadErrorTitle")}
      refreshLabel={t("inboundsPage.refresh")}
      deleteTitle={t("inboundsPage.deleteTitle")}
      deleteDescription={(item) =>
        t("inboundsPage.deleteDescription", { tag: item.tag })
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
          { tag: item.tag, payload: { enabled } },
          { onError: (error) => generateErrorMessage(error) },
        )
      }
      onDelete={(item) =>
        remove.mutate(item.tag, {
          onSuccess: () =>
            generateSuccessMessage(t("inboundsPage.deleted")),
          onError: (error) => generateErrorMessage(error),
        })
      }
      dialogs={
        <InboundDialog
          key={`${editing?.tag ?? "create"}-${open}`}
          inbound={editing}
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
