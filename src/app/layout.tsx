import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Nav from "@/components/Nav";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TTB Label Verification",
  description:
    "Verify an alcohol beverage label against its submitted application. A compliance review tool for the Alcohol and Tobacco Tax and Trade Bureau.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${publicSans.variable} ${plexMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <header className="bg-primary-deep text-white shadow-md">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20"
                aria-hidden
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold tracking-tight">
                  Label Verification
                </span>
                <span className="block text-[11px] font-medium text-white/60">
                  Compliance review tool
                </span>
              </span>
            </Link>
            <Nav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
