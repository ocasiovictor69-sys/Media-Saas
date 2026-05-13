import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Flow-Media - Media Pipeline | TomorrowNow AI",
  description: "Flow-Media: AI-driven media visibility and automated content pipelines. HeyGen-powered video production and Remotion Core.",
  keywords: ["media", "video production", "content pipeline", "AI media", "automated distribution"],
  authors: [{ name: "TomorrowNow AI" }],
  openGraph: {
    title: "Flow-Media - Media Pipeline",
    description: "AI-driven media visibility and automated content pipelines.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
