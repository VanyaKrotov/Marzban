import { api } from "@/service/http";
import { Admin } from "@/types/admin";

import { queryOptions, useQuery } from "@tanstack/react-query";

export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: ({ signal }) => api.get<Admin>("/admin", { signal }),
});

export function useAdmin() {
  const { data, isFetched, isFetching, isPending, error, refetch } =
    useQuery(accountQuery);

  return {
    admin: data,
    isFetched,
    isFetching,
    isPending,
    error,
    refetch,
  };
}
