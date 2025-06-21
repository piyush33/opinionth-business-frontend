"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { MoreHorizontal, Repeat2 } from "lucide-react"

interface CardProps {
    user: string
    title: string
    description: string
    text?: string | null
    image?: string | null
    picture?: string
    selected?: boolean
    reposted?: boolean
    onClick: () => void
}

export default function Card({
    user,
    title,
    description,
    text,
    image,
    picture,
    selected = false,
    reposted = false,
    onClick,
}: CardProps) {
    const [isHovered, setIsHovered] = useState(false)

    const handleMoreClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        console.log("More options clicked")
    }

    return (
        <div
            className="relative group cursor-pointer mb-2"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Fourth layer (deepest shadow) */}
            <div
                className={`absolute inset-0 bg-white rounded-2xl border border-gray-400/60 shadow-sm transition-all duration-500 ease-out ${isHovered ? "translate-x-1 translate-y-[5px] opacity-100" : "translate-x-0 translate-y-0 opacity-0"
                    }`}
                style={{ zIndex: 1 }}
            ></div>

            {/* Third layer */}
            <div
                className={`absolute inset-0 bg-white rounded-2xl border border-gray-400/60 shadow-md transition-all duration-400 ease-out ${isHovered ? "translate-x-0.5 translate-y-[1px] opacity-100" : "translate-x-0 translate-y-0 opacity-0"
                    }`}
                style={{ zIndex: 2 }}
            ></div>

            {/* Second layer */}
            <div
                className={`absolute inset-0 bg-white rounded-2xl border border-gray-400/60 shadow-lg transition-all duration-300 ease-out ${isHovered ? "translate-x-0 translate-y-[-3px] opacity-105" : "translate-x-0 translate-y-0 opacity-0"
                    }`}
                style={{ zIndex: 3 }}
            ></div>

            {/* Main card */}
            <div
                className={`relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-1 ${selected ? "ring-2 ring-purple-500 shadow-xl shadow-purple-100/50" : ""
                    } ${isHovered ? "shadow-2xl border-gray-300 -translate-y-1" : ""}`}
                style={{ zIndex: 10 }}
            >
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200/50 to-blue-200/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Card Header */}
                <div className="relative flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center space-x-3">
                        {picture ? <div className="relative">
                            <Image
                                src={picture || "/placeholder.svg?height=32&width=32"}
                                alt={`${user}'s profile`}
                                width={32}
                                height={32}
                                className="rounded-full ring-2 ring-gray-100"
                            />
                        </div> : <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">
                                {user.charAt(0).toUpperCase()}
                            </span>
                        </div>}
                        <div className="flex flex-col md:flex-row items-center space-x-2">
                            <span className="font-semibold text-gray-900 text-sm">{user}</span>
                            <div className="flex items-center space-x-1 ">
                                {reposted && (
                                    <>
                                        <Repeat2 className="w-3 h-3 text-green-600" />
                                        <span className="text-xs text-green-600 font-medium">reposted</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleMoreClick}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>

                {/* Card Body */}
                <div className="relative px-4 pb-2">
                    {text && <p className="text-gray-800 text-sm leading-relaxed mb-3">{text}</p>}
                    {image && (
                        <div className="relative rounded-xl overflow-hidden mb-3">
                            <Image
                                src={image || "/placeholder.svg"}
                                alt="Post image"
                                width={400}
                                height={300}
                                className="w-full h-auto object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    )}
                </div>

                {/* Card Footer */}
                <div className="relative p-4 pt-2">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
                </div>
            </div>
        </div>
    )
}
