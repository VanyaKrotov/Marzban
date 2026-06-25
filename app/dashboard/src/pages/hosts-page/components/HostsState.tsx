import { Link2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type HostsStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function HostsState({ title, description, action }: HostsStateProps) {
  return (
    <Empty className="min-h-96 rounded-xl">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Link2 />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
