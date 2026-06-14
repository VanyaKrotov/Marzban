import { RouterProvider } from "react-router-dom";
import { useLayoutEffect } from "react";

import { router } from "./pages/Router";
import { TooltipProvider } from "./components/ui/tooltip";
import { useIsDark } from "./lib/theme";
import { updateThemeColor } from "./utils/themeColor";

function App() {
  const isDark = useIsDark();

  useLayoutEffect(() => {
    updateThemeColor(isDark);
  }, [isDark]);

  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}

export default App;
