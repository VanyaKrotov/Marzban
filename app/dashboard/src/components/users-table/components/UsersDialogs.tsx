import { SubscriptionQrDialog } from "./SubscriptionQrDialog";
import { UserEditDialog } from "./user-edit-dialog";
import type { User } from "types/User";

type UsersDialogsProps = {
  editingUser: User | null;
  creatingUser: boolean;
  qrUser: User | null;
  onEditingUserChange: (user: User | null) => void;
  onCreatingUserChange: (open: boolean) => void;
  onQrUserChange: (user: User | null) => void;
};

export function UsersDialogs({
  editingUser,
  creatingUser,
  qrUser,
  onEditingUserChange,
  onCreatingUserChange,
  onQrUserChange,
}: UsersDialogsProps) {
  return (
    <>
      <UserEditDialog
        editingUser={editingUser}
        creatingUser={creatingUser}
        onEditingUserChange={onEditingUserChange}
        onCreatingUserChange={onCreatingUserChange}
      />
      <SubscriptionQrDialog
        links={qrUser?.links ?? []}
        subscribeUrl={qrUser?.subscription_url ?? ""}
        open={Boolean(qrUser)}
        onOpenChange={(open) => !open && onQrUserChange(null)}
      />
    </>
  );
}
