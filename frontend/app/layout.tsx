import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { InterviewProvider } from "./context/InterviewContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MockMind — AI Interview Simulator",
  description:
    "Practice real interviews with an AI-powered HR + Technical interviewer. Get instant feedback, scores, and a detailed improvement plan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#080b12] text-[#e2e8f0]">
        <InterviewProvider>{children}</InterviewProvider>
      </body>
    </html>
  );
}
