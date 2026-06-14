import { useMutation, useQueryClient } from "@tanstack/react-query";

import { StatisticsQueryKey } from "@/pages/users-page/components/Statistics";
import { USERS_QUERY_KEY } from "@/components/users-table/lib/hooks";
import { api } from "service/http";
import type { User, UserCreate } from "types/User";

function useInvalidateUserData() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: StatisticsQueryKey }),
    ]);
}

export function useSaveUserMutation(isEditing: boolean) {
  const invalidate = useInvalidateUserData();

  return useMutation({
    mutationFn: (body: UserCreate) =>
      isEditing
        ? api.put<void>(`/user/${body.username}`, body)
        : api.post<void>("/user", body),
    onSuccess: invalidate,
  });
}

export function useDeleteUserMutation() {
  const invalidate = useInvalidateUserData();

  return useMutation({
    mutationFn: (user: User) => api.delete<void>(`/user/${user.username}`),
    onSuccess: invalidate,
  });
}

export function useResetUserUsageMutation() {
  const invalidate = useInvalidateUserData();

  return useMutation({
    mutationFn: (user: User) =>
      api.post<void>(`/user/${user.username}/reset`),
    onSuccess: invalidate,
  });
}

export function useRevokeSubscriptionMutation() {
  const invalidate = useInvalidateUserData();

  return useMutation({
    mutationFn: (user: User) =>
      api.post<User>(`/user/${user.username}/revoke_sub`),
    onSuccess: invalidate,
  });
}
