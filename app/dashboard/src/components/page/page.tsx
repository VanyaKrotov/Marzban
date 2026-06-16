import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const Page = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"main">>(
  ({ className, ...props }, ref) => (
    <main
      className={cn("flex h-full min-w-0 flex-col", className)}
      {...props}
      ref={ref}
    />
  ),
);

export default Page;
