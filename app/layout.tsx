import type React from "react";
import type { Metadata } from "next";
import { Inter, Silkscreen } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-inter" });
// Pixel face for 16px section labels (the bitmap theme), app-wide.
const pixel = Silkscreen({ subsets: ["latin"], weight: ["400"], variable: "--font-pixel" });

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
      <body className={`mk ${inter.className} ${inter.variable} ${pixel.variable}`}>
        <GoogleOAuthProvider clientId="1095864296367-ivrslv4mrt072bgprr1994dj278cas3q.apps.googleusercontent.com">
          <Providers>{children}</Providers>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
