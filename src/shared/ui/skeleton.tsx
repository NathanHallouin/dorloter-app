import { cn } from "@shared/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-sable-200/60", className)}
      {...props}
    />
  );
}
