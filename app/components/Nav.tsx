"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NEW_ROUND_EVENT } from "@/lib/game";

const links = [
  { href: "/", label: "PLAY" },
  { href: "/submit", label: "ADD WORD" },
  { href: "/records", label: "CARDS", icon: "/cards-icon.png" }
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800 bg-black bg-[url('/navbar-bg.png')] bg-cover bg-center text-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-cover"
          />
          ReQuiz
        </Link>
        <ul className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {links.map((link) => {
            const { href, label } = link;
            const icon = "icon" in link ? link.icon : undefined;
            return (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`inline-flex items-center rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wide hover:bg-zinc-800 sm:px-3 sm:text-sm ${
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
                {icon ? (
                  <Image
                    src={icon}
                    alt=""
                    width={22}
                    height={20}
                    className="mr-1.5 inline-block h-5 w-auto align-middle"
                  />
                ) : null}
                {label}
              </Link>
            </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}