"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Animates list items from their old position to their new one when the
 * order changes, so a re-sorted race stays followable instead of jumping.
 * Positions are re-measured on every render (relative to the list, which must
 * be `position: relative`) but only animated when `orderKey` changes, so
 * scrolling or content above the list moving never triggers it.
 * Skipped entirely when the viewer prefers reduced motion.
 */
export function useFlip<Key extends string>(orderKey: string) {
  const elements = useRef(new Map<Key, HTMLElement>());
  const positions = useRef(new Map<Key, number>());
  const lastOrder = useRef(orderKey);

  useLayoutEffect(() => {
    const reordered = lastOrder.current !== orderKey;
    lastOrder.current = orderKey;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<Key, number>();

    elements.current.forEach((element, key) => {
      const top = element.offsetTop;
      next.set(key, top);
      const previous = positions.current.get(key);
      if (reordered && !reduce && previous !== undefined && previous !== top) {
        element.animate([{ transform: `translateY(${previous - top}px)` }, { transform: "translateY(0)" }], {
          duration: 320,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
      }
    });
    positions.current = next;
  });

  return (key: Key) => (element: HTMLElement | null) => {
    if (element) elements.current.set(key, element);
    else elements.current.delete(key);
  };
}
