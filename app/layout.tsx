import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalSiteFooter from "../components/ConditionalSiteFooter";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAFS",
  description: "Child, adolescent and family mental health services in Sri Lanka.",
  icons: {
    icon: [{ url: "/cafs-logo.png", type: "image/png" }],
    apple: [{ url: "/cafs-logo.png", type: "image/png" }],
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
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/cafs-logo.png" type="image/png" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0..1&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ConditionalSiteFooter />
      </body>
    </html>
  );
}
