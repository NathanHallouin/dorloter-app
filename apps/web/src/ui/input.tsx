import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { inputBase } from "./input-base";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, className)} />;
}
