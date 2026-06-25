import { Skeleton } from "@/components/ui/skeleton";

export function HostsSkeleton() {
  return (
    <div className="space-y-3 rounded-xl p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
