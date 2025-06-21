"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface MasonryGridProps {
    children: React.ReactNode
}

export default function MasonryGrid({ children }: MasonryGridProps) {
    const [columns, setColumns] = useState(4)

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth
            if (width < 640) setColumns(2)
            else if (width < 768) setColumns(2)
            else if (width < 1024) setColumns(3)
            else setColumns(4)
        }

        updateColumns()
        window.addEventListener("resize", updateColumns)
        return () => window.removeEventListener("resize", updateColumns)
    }, [])

    const childrenArray = Array.isArray(children) ? children : [children]
    const columnArrays = Array.from({ length: columns }, () => [] as React.ReactNode[])

    childrenArray.forEach((child, index) => {
        const columnIndex = index % columns
        columnArrays[columnIndex].push(child)
    })

    return (
        <div className="flex gap-2 items-start">
            {columnArrays.map((column, columnIndex) => (
                <div key={columnIndex} className="flex-1 space-y-2 min-w-0">
                    {column}
                </div>
            ))}
        </div>
    )
}
