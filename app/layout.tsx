import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hell Is Hot - Performer Sign-Up",
  description: "Sign up to perform at Hell Is Hot event",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
