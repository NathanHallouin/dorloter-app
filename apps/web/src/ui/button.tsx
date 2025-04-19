import type { CSSProperties, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/* ------------------------------ Btn --------------------------------------- */
const btnVariants = cva(
  "inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap rounded-[6px] border font-semibold cursor-pointer transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-px disabled:opacity-55 disabled:cursor-not-allowed disabled:translate-y-0",
  {
    variants: {
      variant: {
        primary: "bg-coral-600 text-sable-50 border-coral-700 shadow-[0_1px_0_var(--coral-800)]",
        soft: "bg-coral-50 text-coral-700 border-coral-300",
        outline: "bg-transparent text-foreground border-foreground",
        ghost: "bg-transparent text-muted-foreground border-transparent",
        white: "bg-sable-50 text-coral-700 border-sable-50 shadow-[0_6px_18px_rgba(20,16,8,.18)]",
      },
      size: { sm: "h-9 px-3.5 text-[13.5px]", md: "h-11 px-[18px] text-[14.5px]", lg: "h-[52px] px-[26px] text-[15.5px]" },
      full: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Btn({
  children, variant, size, icon, iconRight, onClick, full, type = "button", disabled, className, style,
}: {
  children?: ReactNode; icon?: string; iconRight?: string; onClick?: () => void;
  type?: "button" | "submit"; disabled?: boolean; className?: string; style?: CSSProperties;
} & VariantProps<typeof btnVariants>) {
  const is = size === "lg" ? 18 : 16;
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={style} className={cn(btnVariants({ variant, size, full }), className)}>
      {icon && <Icon name={icon} size={is} />}
      {children}
      {iconRight && <Icon name={iconRight} size={is} />}
    </button>
  );
}
