import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { inputBase } from "./input-base";

export function Select({ options, className, ...props }: { options: (string | { value: string; label: string })[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(inputBase, "cursor-pointer appearance-none pr-9", className)}
      style={{
        backgroundImage: "linear-gradient(45deg, transparent 50%, var(--muted-fg) 50%), linear-gradient(135deg, var(--muted-fg) 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 18px) center, calc(100% - 13px) center",
        backgroundSize: "5px 5px, 5px 5px",
        backgroundRepeat: "no-repeat",
        ...props.style,
      }}
    >
      {options.map((o) => {
        const value = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  );
}
