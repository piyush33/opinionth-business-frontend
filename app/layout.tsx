import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://collabrr.io"),
  title: "Collabrr",
  description:
    "Collabrr is where distributed teams think through complex decisions together, asynchronously, with the reasoning kept.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${inter.variable}`}>
        <GoogleOAuthProvider clientId="1095864296367-ivrslv4mrt072bgprr1994dj278cas3q.apps.googleusercontent.com">
          <Providers>{children}</Providers>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
