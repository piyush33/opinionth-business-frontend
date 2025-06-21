"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Bell, MessageCircle, User, ChevronDown } from "lucide-react"

interface NavbarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    onNotificationsClick: () => void
    onInboxClick: () => void
    onSettingsClick: () => void
}

export default function Navbar({
    searchTerm,
    onSearchChange,
    onNotificationsClick,
    onInboxClick,
    onSettingsClick,
}: NavbarProps) {
    const [activeTab, setActiveTab] = useState("home")

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href="/home" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">O</span>
                            </div>
                            <span className="font-bold text-xl text-gray-900 hidden sm:block">Opinio^nth</span>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-1">
                        {[
                            { name: "Home", href: "/home", key: "home" },
                            { name: "Explore", href: "/explore", key: "explore" },
                            { name: "Create", href: "/create", key: "create" },
                        ].map((item) => (
                            <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => setActiveTab(item.key)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === item.key
                                    ? "bg-gray-900 text-white shadow-lg"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onNotificationsClick}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                        </button>

                        <button
                            onClick={onInboxClick}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
                        </button>

                        <Link
                            href="/profile"
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
                        >
                            <User className="w-5 h-5" />
                        </Link>

                        <button
                            onClick={onSettingsClick}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
