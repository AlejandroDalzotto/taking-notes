"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx"
import { navLinks } from "@/lib/constants";

export default function Navbar() {

  const pathname = usePathname()

  return (
    <nav className="flex flex-col px-6 py-5 min-w-60 gap-y-10">

      <p className="text-2xl font-geist-mono">Taking Notes</p>

      <ul className="flex flex-col flex-grow gap-y-4">
        {
          navLinks.map(link => {

            return (
              <Link
                key={link.id}
                href={link.href}
                className={clsx(
                  "flex items-center px-3 py-2 capitalize transition-colors border border-transparent rounded-md gap-x-4 hover:bg-white/5 hover:border-white/5",
                  {"bg-white/5 border-white/5": pathname === link.href}
                )}
              >
                <svg className="w-10 h-10 fill-neutral-50">
                  <use xlinkHref={`/sprites.svg#${link.icon}`} />
                </svg>
                {link.label}
              </Link>
            )

          })
        }
      </ul>

      <Link
        target="_blank"
        className="font-medium transition-colors hover:text-rose-600"
        href="https://github.com/AlejandroDalzotto"
      >
        Made by Alejandro
      </Link>
    </nav>
  )
}
