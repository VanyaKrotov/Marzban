import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const Page = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"main">>(
  ({ className, ...props }, ref) => (
    <main
      className={cn("flex flex-col h-full", className)}
      {...props}
      ref={ref}
    />
  ),
);

export default Page;
