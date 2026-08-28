import { ViewTransition } from "react";

export function PageMotion({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out">
      {children}
    </ViewTransition>
  );
}
