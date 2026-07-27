import * as React from "react";

import { cn } from "@/lib/utils";

function ButtonGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="button-group"
      className={cn(
        "inline-flex w-fit items-center [&>[data-slot=button]:not(:first-child)]:-ms-px [&>[data-slot=button]:not(:first-child)]:rounded-s-none [&>[data-slot=button]:not(:last-child)]:rounded-e-none",
        className,
      )}
      {...props}
    />
  );
}

export { ButtonGroup };
