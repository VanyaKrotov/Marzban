import { createHashRouter, Navigate, useRouteError } from "react-router-dom";
import { AxiosError } from "axios";

import { ErrorFallback } from "@/components/ErrorFallback";
import HostsPage from "@/pages/hosts-page";
import ConfigPage from "@/pages/config-page";
import LogsPage from "@/pages/logs-page";
import NodesPage from "@/pages/nodes-page";
import NodeProfilePage from "@/pages/node-profile-page";
import StatsPage from "@/pages/stats-page";
import UsersPage from "@/pages/users-page";
import LoginPage from "@/pages/login-page";

import { queryClient } from "@/utils/query-client";
import { accountQuery } from "@/hooks/use-admin";

import Layout from "./Layout";

function RouteErrorBoundary() {
  const error = useRouteError();

  if (error instanceof AxiosError && error.response?.status === 401) {
    return <Navigate to="/login" />;
  }

  return <ErrorFallback error={error} />;
}

export const router = createHashRouter([
  {
    id: "layout",
    path: "/",
    element: <Layout />,
    ErrorBoundary: RouteErrorBoundary,
    loader: () => queryClient.ensureQueryData(accountQuery),
    children: [
      {
        index: true,
        element: <UsersPage />,
      },
      {
        path: "nodes",
        element: <NodesPage />,
      },
      {
        path: "nodes/:id",
        element: <NodeProfilePage />,
      },
      {
        path: "hosts",
        element: <HostsPage />,
      },
      {
        path: "stats",
        element: <StatsPage />,
      },
      {
        path: "config",
        element: <ConfigPage />,
      },
      {
        path: "logs",
        element: <LogsPage />,
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
