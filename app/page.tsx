"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import SignUpModal from "@/components/signup-modal";

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!usernameOrEmail || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "https://d3kv9nj5wp3sq6.cloudfront.net/auth/login",
        {
          usernameOrEmail,
          password,
        }
      );

      const access_token = response.data.access_token;
      localStorage.setItem("token", access_token);

      const user = response.data.user;
      const profileuser = await axios.get(
        `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${user.username}`
      );

      // Store user data in localStorage for now (you can implement proper state management later)
      localStorage.setItem("user", JSON.stringify(profileuser.data));

      if (response.data.access_token) {
        router.push("/explore");
      }
    } catch (error: any) {
      console.error(
        "Login error:",
        error.response ? error.response.data : error.message
      );
      setError("Invalid username/email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");

    try {
      const token = credentialResponse.credential;
      const response = await axios.post(
        "https://d3kv9nj5wp3sq6.cloudfront.net/auth/google",
        { token }
      );

      const access_token = response.data.access_token;
      localStorage.setItem("token", access_token);

      const profileuser = await axios.get(
        `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${response.data.user.username}`
      );

      localStorage.setItem("user", JSON.stringify(profileuser.data));
      router.push("/explore");
    } catch (error: any) {
      console.error(
        "Google Login error:",
        error.response ? error.response.data : error.message
      );
      setError("Google login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  // useEffect(() => {
  //   const adjustIframeWidth = () => {
  //     const iframe = document.querySelector(".google-login-button iframe")
  //     if (iframe) {
  //       iframe.style.width = "100%"
  //     }
  //   }

  //   adjustIframeWidth()
  //   window.addEventListener("resize", adjustIframeWidth)

  //   return () => {
  //     window.removeEventListener("resize", adjustIframeWidth)
  //   }
  // }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      {/* Left Section - Brand */}
      <div className="text-center mb-8 lg:mb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-purple-600 mb-4">
          Opinio^nth
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-gray-900 max-w-2xl mx-auto leading-relaxed">
          helps you brainstrom
          <br />
          collaborate and share perspectives
          <br />
          on events and objects asynchronously
        </p>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Username or Email address"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-purple-600 text-white text-lg font-medium rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Log in"}
            </button>
          </div>

          <div className="text-center mt-3">
            <a
              href="#"
              className="text-sm text-blue-600 hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Forgotten password?
            </a>
          </div>

          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Login Button */}
          <div className="google-login-button w-full flex justify-center mb-5">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => {
                console.log("Google Login Failed");
                setError("Google login failed. Please try again.");
              }}
            />
          </div>

          <div className="border-t border-gray-300 mb-5"></div>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isLoading}
            className="w-full py-3 bg-green-600 text-white text-base font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create new account
          </button>
        </div>
      </div>

      {/* Signup Modal */}
      {isModalOpen && <SignUpModal closeModal={() => setIsModalOpen(false)} />}
    </div>
  );
}
