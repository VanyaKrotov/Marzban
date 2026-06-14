import dayjs from "dayjs";
import Duration from "dayjs/plugin/duration";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import RelativeTime from "dayjs/plugin/relativeTime";
import Timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "locales/i18n";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "utils/query-client";

import App from "./App";
import { GlobalErrorBoundary } from "./components/ErrorFallback";
import { Toaster } from "./components/ui/sonner";

import "./tailwind.css";

dayjs.extend(Timezone);
dayjs.extend(LocalizedFormat);
dayjs.extend(utc);
dayjs.extend(RelativeTime);
dayjs.extend(Duration);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-center" closeButton duration={3000} />
    </QueryClientProvider>
  </GlobalErrorBoundary>,
);
