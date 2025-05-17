import type { ReactNode } from "react";

export function PageBody({ children, width = 1180 }: { children: ReactNode; width?: number }) {
  return <div className="mx-auto px-8 py-[30px] pb-[60px]" style={{ maxWidth: width }}>{children}</div>;
}
