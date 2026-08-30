"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

type InputTabFlowProps = {
  children: ReactNode;
};

function focusableFields(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    "input:not([disabled]):not([tabindex='-1']), select:not([disabled]):not([tabindex='-1']), textarea:not([disabled]):not([tabindex='-1'])",
  );
  return Array.from(nodes).filter(
    (node) => node.offsetParent !== null || node.getClientRects().length > 0,
  );
}

export default function InputTabFlow({ children }: InputTabFlowProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    const first = focusableFields(root)[0];
    if (first && document.activeElement === document.body) {
      first.focus();
    }
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    const target = event.target as HTMLElement | null;
    if (!target || !rootRef.current) return;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;

    const fields = focusableFields(rootRef.current);
    const index = fields.indexOf(target);
    if (index < 0) return;

    event.preventDefault();
    const next = fields[index + 1];
    if (next) {
      next.focus();
      if (next instanceof HTMLInputElement) {
        next.select();
      }
      return;
    }

    target.blur();
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className="flex w-full min-w-0 flex-1 flex-col"
    >
      {children}
    </div>
  );
}
