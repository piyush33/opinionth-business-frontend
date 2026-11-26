"use client"

import { useEffect, useRef } from "react"

interface PopupMenuProps {
    position: { x: number; y: number }
    onClose: () => void
    onDelete: () => void
    canDelete: boolean
}

export function PopupMenu({ position, onClose, onDelete, canDelete }: PopupMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("keydown", handleEscape)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("keydown", handleEscape)
        }
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50">
            <div
                ref={menuRef}
                className="mk-hard-sm absolute min-w-[160px] overflow-hidden rounded-[5px] bg-white py-1"
                style={{
                    left: Math.min(position.x, window.innerWidth - 180),
                    top: Math.min(position.y, window.innerHeight - 200),
                }}
            >
                <div>
                    <button
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--mk-ink)] transition-colors hover:bg-[var(--mk-indigo-soft)]"
                        onClick={() => {
                            // Handle share
                            onClose()
                        }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                            />
                        </svg>
                        <span>Share</span>
                    </button>

                    <button
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--mk-ink)] transition-colors hover:bg-[var(--mk-indigo-soft)]"
                        onClick={() => {
                            // Handle report
                            onClose()
                        }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                            />
                        </svg>
                        <span>Report</span>
                    </button>

                    {canDelete && (
                        <>
                            <div className="my-1 border-t border-[var(--mk-rule)]"></div>
                            <button
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold tracking-tight text-[var(--mk-ink)] transition-colors hover:bg-[var(--mk-amber-soft)]"
                                onClick={onDelete}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                                <span>Delete</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
