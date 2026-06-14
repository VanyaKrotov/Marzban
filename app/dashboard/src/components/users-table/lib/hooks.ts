import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { api } from "service/http";
import { User } from "types/User";
import { getUsersPerPageLimitSize } from "utils/userPreferenceStorage";
import type { UsersFilter } from "./types";

export const USERS_QUERY_KEY = ["users"] as const;

export type UsersResponse = {
  users: User[];
  total: number;
};

const statuses = [
  "active",
  "disabled",
  "limited",
  "expired",
  "on_hold",
] as const;
const defaultSort = "-created_at";

const parsePositiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readFilters = (searchParams: URLSearchParams): UsersFilter => {
  const status = searchParams.get("status");

  return {
    search: searchParams.get("search") || undefined,
    status: statuses.includes(status as (typeof statuses)[number])
      ? (status as UsersFilter["status"])
      : undefined,
    sort: searchParams.get("sort") || defaultSort,
    limit: parsePositiveInteger(searchParams.get("limit"), 10),
    offset: parsePositiveInteger(searchParams.get("offset"), 0),
  };
};

const fetchUsers = (filters: UsersFilter) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

  return api.get<UsersResponse>("/users", { params });
};

export const useUsersTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: [...USERS_QUERY_KEY, filters],
    queryFn: () => fetchUsers(filters),
    placeholderData: (previousData) => previousData,
  });

  const updateFilters = useCallback(
    (nextFilters: Partial<UsersFilter>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          const merged = { ...filters, ...nextFilters };

          for (const key of [
            "search",
            "status",
            "sort",
            "limit",
            "offset",
          ] as const) {
            const value = merged[key];
            const isDefault =
              (key === "sort" && value === defaultSort) ||
              (key === "offset" && Number(value) === 0);

            if (value === undefined || value === "" || isDefault) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }

          return next;
        },
        { replace: true },
      );
    },
    [filters, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams();
        const limit = current.get("limit");
        if (limit) next.set("limit", limit);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return {
    filters,
    users: query.data?.users ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    updateFilters,
    resetFilters,
  };
};
