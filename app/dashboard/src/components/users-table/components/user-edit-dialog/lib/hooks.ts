import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import type { InboundsMap } from "types/Inbound";
import type { User } from "types/User";

import {
  formatUserFormValues,
  getDefaultUserFormValues,
  UserFormValues,
  userFormSchema,
} from "./form";

export function useUserEditForm(
  editingUser: User | null | undefined,
  availableInbounds: InboundsMap,
) {
  const form = useForm<UserFormValues>({
    defaultValues: getDefaultUserFormValues(availableInbounds),
    resolver: zodResolver(userFormSchema),
  });

  useEffect(() => {
    form.reset(
      editingUser
        ? formatUserFormValues(editingUser)
        : getDefaultUserFormValues(availableInbounds),
    );
  }, [availableInbounds, editingUser, form]);

  return form;
}

export function useUserUsage(editingUser: User | null | undefined) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!editingUser) setVisible(false);
  }, [editingUser]);

  const reset = () => {
    setVisible(false);
  };

  return {
    reset,
    setVisible,
    visible,
  };
}
