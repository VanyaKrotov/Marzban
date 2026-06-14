import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { useSidebar } from "../ui/sidebar";

interface Props extends ComponentPropsWithoutRef<"div"> {
  sticky?: boolean;
  actions?: ReactNode;
}

const Header = forwardRef<HTMLDivElement, Props>(
  ({ className, sticky = true, children, actions, ...props }, ref) => {
    const { toggleSidebar, isMobile } = useSidebar();

    return (
      <div
        className={cn(
          "mb-3 flex min-h-16 items-center gap-x-1.5 py-3 md:rounded-b-2xl md:pt-4 [&_h2]:text-lg",
          {
            ["sticky top-0 z-20 -mx-3 bg-background px-3 md:-mx-4 md:px-4"]:
              sticky,
          },
          className,
        )}
        {...props}
        ref={ref}
      >
        {isMobile && (
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSidebar}
            className="mr-1"
          >
            <Menu className="size-5" />
          </Button>
        )}
        {children}
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
    );
  },
);

export default Header;
