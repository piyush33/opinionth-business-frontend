"use client"

import { useState, useEffect } from "react"
import { X, Settings, User, Shield, Palette, LogOut, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface SettingsPopupProps {
    isOpen: boolean
    onClose: () => void
}

export default function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
    const [user, setUser] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        const userData = localStorage.getItem("user")
        if (userData) {
            setUser(JSON.parse(userData))
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/")
        onClose()
    }

    const settingsOptions = [
        {
            category: "Account",
            items: [
                { icon: User, label: "Your accounts", href: "/accounts" },
                { icon: User, label: "Add account", href: "/add-account" },
                { icon: Settings, label: "Convert to business", href: "/business" },
            ],
        },
        {
            category: "Settings",
            items: [
                { icon: Settings, label: "Settings", href: "/settings" },
                { icon: Palette, label: "Home feed tuner", href: "/feed-tuner" },
                { icon: Shield, label: "Privacy rights", href: "/privacy" },
            ],
        },
        {
            category: "Support",
            items: [
                { icon: Settings, label: "Help Centre", href: "/help" },
                { icon: Shield, label: "Reports and Violations", href: "/reports" },
                { icon: Settings, label: "Terms of Service", href: "/terms" },
                { icon: Shield, label: "Privacy Policy", href: "/privacy-policy" },
            ],
        },
    ]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="absolute right-4 top-20 w-80 max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                    <div className="flex items-center space-x-2">
                        <Settings className="w-5 h-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">Currently in</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* User Info */}
                {user && (
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex items-center space-x-3">
                            {user.image ? <Image
                                src={user.image || "/placeholder.svg?height=56&width=56"}
                                alt={user.name}
                                width={56}
                                height={56}
                                className="rounded-full ring-3 ring-white shadow-md"
                            /> : <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                <span className="text-white font-bold text-2xl">
                                    {user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>}
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                <p className="text-xs text-gray-500">@{user.username}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Options */}
                <div className="flex-1 overflow-y-auto p-2">
                    {settingsOptions.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-4">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
                                {section.category}
                            </h4>
                            <div className="space-y-1">
                                {section.items.map((option, index) => (
                                    <button
                                        key={index}
                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                                        onClick={() => {
                                            console.log(`Navigate to ${option.href}`)
                                            onClose()
                                        }}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <option.icon className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{option.label}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Additional Options */}
                    <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">More</h4>
                        <div className="space-y-1">
                            <button className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors group">
                                <div className="flex items-center space-x-3">
                                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Install Chrome app</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            </button>
                            <button className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors group">
                                <div className="flex items-center space-x-3">
                                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Be a beta tester</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
