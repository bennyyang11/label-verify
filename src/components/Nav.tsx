"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Single" },
  { href: "/batch", label: "Batch" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-lg bg-white/10 p-1 ring-1 ring-white/15">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-primary-deep shadow-sm"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
