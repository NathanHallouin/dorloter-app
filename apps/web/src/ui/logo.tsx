import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/* ------------------------------ Logo -------------------------------------- */
export function Logo({ size = "md", light }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const is = size === "lg" ? 26 : size === "sm" ? 17 : 20;
  const fs = size === "lg" ? "text-[27px]" : size === "sm" ? "text-[17px]" : "text-[20px]";
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span className={cn("inline-flex", light ? "text-white" : "text-coral-500")}>
        <Icon name="paw" size={is} stroke={2.2} />
      </span>
      <span className={cn("brandword font-bold tracking-[-0.02em]", fs, light ? "text-white" : "text-foreground")}>dorloter</span>
    </span>
  );
}
