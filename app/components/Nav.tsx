"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NEW_ROUND_EVENT } from "@/lib/game";

const links = [
  { href: "/", label: "MAIN" },
  { href: "/submit", label: "SUBMIT WORD" },
  { href: "/records", label: "RECORDS" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800 bg-black bg-[url('/navbar-bg.png')] bg-cover bg-center text-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3"
      >
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ReQuiz
        </Link>
        <ul className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wide hover:bg-zinc-800 sm:px-3 sm:text-sm ${
                  pathname === href
                    ? "bg-zinc-800 text-white"
                    : "text-white"
                }`}
                onClick={(event) => {
                  if (href === "/" && pathname === "/") {
                    event.preventDefault();
                    window.dispatchEvent(new Event(NEW_ROUND_EVENT));
                  }
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}