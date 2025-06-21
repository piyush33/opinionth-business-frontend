"use client"

import { useState } from "react"
import { X } from "lucide-react"
import axios from "axios"

interface SignUpModalProps {
    closeModal: () => void
}

export default function SignUpModal({ closeModal }: SignUpModalProps) {
    const [name, setName] = useState("")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    const handleSignUp = async () => {
        if (!name || !username || !email || !password) {
            setError("Please fill in all fields")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const response = await axios.post("https://d3kv9nj5wp3sq6.cloudfront.net/auth/signup", {
                name,
                username,
                email,
                password,
            })

            console.log("Signup successful", response.data)
            await createUser()
            setSuccess(true)

            // Close modal after 2 seconds
            setTimeout(() => {
                closeModal()
            }, 2000)
        } catch (error: any) {
            console.error("Signup error:", error.response ? error.response.data : error.message)
            setError(error.response?.data?.message || "Signup failed. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const createUser = async () => {
        try {
            const response = await axios.post(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers`, {
                name,
                username,
            })
            console.log("Profile user created:", response.data)
        } catch (error) {
            console.error("Error creating profile user:", error)
        }
    }

    const handleKeyPress = (e: any) => {
        if (e.key === "Enter") {
            handleSignUp()
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
                    <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isLoading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

                    {success && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                            Account created successfully! You can now log in.
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading || success}
                        />

                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading || success}
                        />

                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading || success}
                        />

                        <input
                            type="password"
                            placeholder="New password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading || success}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                    <button
                        onClick={handleSignUp}
                        disabled={isLoading || success}
                        className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Creating Account..." : success ? "Account Created!" : "Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    )
}
