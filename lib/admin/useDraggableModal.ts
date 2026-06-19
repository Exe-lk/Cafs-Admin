"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function useDraggableModal(enabled: boolean, resetKey?: unknown) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current = null;
  }, [enabled, resetKey]);

  function onDragPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!enabled) return;
    if ((e.target as HTMLElement).closest("button")) return;
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDragOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    });
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragStateRef.current = null;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return {
    wrapperClassName: enabled ? "pointer-events-none" : undefined,
    dialogClassName: enabled ? "pointer-events-auto" : undefined,
    dialogTransform: enabled ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
    headerClassName: cx(enabled && "cursor-grab", isDragging && "cursor-grabbing select-none"),
    headerPointerHandlers: enabled
      ? {
          onPointerDown: onDragPointerDown,
          onPointerMove: onDragPointerMove,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        }
      : undefined,
  };
}
