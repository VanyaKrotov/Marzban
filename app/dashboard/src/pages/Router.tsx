import { createHashRouter, Navigate, useRouteError } from "react-router-dom";
import { AxiosError } from "axios";

import { ErrorFallback } from "@/components/ErrorFallback";
import HostsPage from "@/pages/hosts-page";
import InboundsPage from "@/pages/inbounds-page";
import ConfigPage from "@/pages/config-page";
import LogsPage from "@/pages/logs-page";
import NodesPage from "@/pages/nodes-page";
import OutboundsPage from "@/pages/outbounds-page";
import RoutingPage from "@/pages/routing-page";
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
        path: "hosts",
        element: <HostsPage />,
      },
      {
        path: "stats",
        element: <StatsPage />,
      },
      {
        path: "inbounds",
        element: <InboundsPage />,
      },
      {
        path: "outbounds",
        element: <OutboundsPage />,
      },
      {
        path: "routing",
        element: <RoutingPage />,
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
]);
