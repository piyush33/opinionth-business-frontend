"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";

/**
 * A lightweight, professional pan+zoom image viewer.
 * - Fits image (contain) by default
 * - Wheel zoom to cursor, double-click to zoom
 * - Drag to pan
 * - Toolbar: -, +, Fit, 100%, Fullscreen, Open
 */
export default function ZoomPanImage({
  src,
  alt,
  className,
  minScale = 0.5,
  maxScale = 8,
  doubleClickStep = 1.5,
}: {
  src: string;
  alt: string;
  className?: string;
  minScale?: number;
  maxScale?: number;
  doubleClickStep?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // transform state
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0); // translateX
  const [ty, setTy] = useState(0); // translateY
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const [isFs, setIsFs] = useState(false);

  // apply transform efficiently
  const raf = useRef<number | null>(null);
  const applyTransform = useCallback((nx: number, ny: number, ns: number) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const run = () => {
      img.style.transform = `translate(${nx}px, ${ny}px) scale(${ns})`;
      img.style.transformOrigin = "0 0";
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(run);
  }, []);

  useLayoutEffect(() => {
    applyTransform(tx, ty, scale);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tx, ty, scale, applyTransform]);

  // fit image (reset)
  const fit = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // clamp
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  // Zoom to a specific container point (cx, cy)
  const zoomAboutPoint = useCallback(
    (factor: number, cx: number, cy: number) => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return;

      const rect = container.getBoundingClientRect();
      const x = cx - rect.left;
      const y = cy - rect.top;

      const newScale = clamp(scale * factor, minScale, maxScale);
      if (newScale === scale) return;

      // Keep the (x, y) under the cursor stable:
      const dx = (x - tx) / scale;
      const dy = (y - ty) / scale;
      const ntx = x - dx * newScale;
      const nty = y - dy * newScale;

      setScale(newScale);
      setTx(ntx);
      setTy(nty);
    },
    [scale, tx, ty, minScale, maxScale]
  );

  // Wheel zoom
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAboutPoint(factor, e.clientX, e.clientY);
    },
    [zoomAboutPoint]
  );

  // Double click zoom
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const targetScale =
        scale < 1.01 ? 1 * doubleClickStep : scale * doubleClickStep;
      const factor = targetScale / scale;
      zoomAboutPoint(factor, e.clientX, e.clientY);
    },
    [scale, doubleClickStep, zoomAboutPoint]
  );

  // Drag to pan
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
      setIsPanning(true);
    },
    [tx, ty]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTx(panStart.current.tx + dx);
    setTy(panStart.current.ty + dy);
  }, []);

  const endPan = useCallback((e?: React.PointerEvent) => {
    if (e) (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    panStart.current = null;
    setIsPanning(false);
  }, []);

  // Toolbar handlers
  const zoomIn = () =>
    zoomAboutPoint(
      1.1,
      (containerRef.current?.getBoundingClientRect().left ?? 0) +
        (containerRef.current?.clientWidth ?? 0) / 2,
      (containerRef.current?.getBoundingClientRect().top ?? 0) +
        (containerRef.current?.clientHeight ?? 0) / 2
    );
  const zoomOut = () =>
    zoomAboutPoint(
      1 / 1.1,
      (containerRef.current?.getBoundingClientRect().left ?? 0) +
        (containerRef.current?.clientWidth ?? 0) / 2,
      (containerRef.current?.getBoundingClientRect().top ?? 0) +
        (containerRef.current?.clientHeight ?? 0) / 2
    );
  const oneToOne = () => setScale(1);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setIsFs(true);
    } else {
      await document.exitFullscreen?.();
      setIsFs(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full h-full overflow-hidden rounded-xl bg-gray-100",
        "select-none",
        className
      )}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
    >
      {/* The actual image we transform */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className={clsx(
          "absolute inset-0 w-full h-full object-contain",
          isPanning ? "cursor-grabbing" : "cursor-grab",
          "will-change-transform"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      />

      {/* Toolbar */}
      <div className="absolute bottom-3 right-3 z-20">
        <div className="flex items-center gap-1 rounded-xl bg-white/90 backdrop-blur px-1.5 py-1 border border-gray-200 shadow">
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>
          <div className="px-2 text-xs font-medium text-gray-700 tabular-nums">
            {(scale * 100).toFixed(0)}%
          </div>
          <button
            onClick={fit}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Fit to view"
          >
            <RotateCcw className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={oneToOne}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Actual size (100%)"
          >
            1:1
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-gray-100"
            title={isFs ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFs ? (
              <Minimize2 className="w-4 h-4 text-gray-700" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-700" />
            )}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Open original"
          >
            <ExternalLink className="w-4 h-4 text-gray-700" />
          </a>
        </div>
      </div>
    </div>
  );
}
