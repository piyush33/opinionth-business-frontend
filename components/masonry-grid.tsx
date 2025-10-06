"use client";
import { useEffect, useState } from "react";

export default function MasonryGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setColumns(2);
      else if (w < 768) setColumns(2);
      else if (w < 1024) setColumns(3);
      else setColumns(4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const arr = Array.isArray(children) ? children : [children];
  const cols = Array.from({ length: columns }, () => [] as React.ReactNode[]);
  arr.forEach((child, i) => cols[i % columns].push(child));

  return (
    <div className="flex w-full max-w-full box-border items-start gap-2 overflow-visible">
      {cols.map((col, i) => (
        <div key={i} className="flex-1 min-w-0">
          <div className="space-y-4">{col}</div>
        </div>
      ))}
    </div>
  );
}
