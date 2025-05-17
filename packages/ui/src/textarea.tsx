import type { TextareaHTMLAttributes } from "react";
import { cn } from "./cn";
import { inputBase } from "./input-base";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "h-auto min-h-[104px] resize-y py-3 leading-normal", className)} />;
}
