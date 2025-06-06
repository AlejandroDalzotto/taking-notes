"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx"
import { navLinks } from "@/lib/constants";
import type { MouseEvent } from "react";
import Image from "next/image";
import { IconAdd, IconHome, IconList } from "./Icons";

export default function Navbar() {

  const pathname = usePathname()
  const router = useRouter()

  const handleNavigation = (e: MouseEvent<HTMLAnchorElement>, nagivateTo: string) => {
    e.preventDefault()

    if (nagivateTo === pathname) {
      return
    }

    router.push(nagivateTo)
  }

  return (
    <nav className="flex flex-col px-6 py-5 min-w-60 gap-y-10">

      <div className="flex items-center gap-x-5">
        <Image
          width={50}
          height={50}
          alt="app_icon"
          src="/icon.png"
        />
        <p className="text-2xl font-geist-mono">Taking Notes</p>
      </div>

      <ul className="flex flex-col grow gap-y-4">
        {
          navLinks.map(link => {

            return (
              <Link
                onClick={(e) => handleNavigation(e, link.href)}
                aria-disabled={pathname === link.href}
                key={link.id}
                href={link.href}
                className={clsx(
                  "flex items-center px-3 py-2 capitalize transition-colors border border-transparent rounded-md gap-x-4 hover:bg-white/5 hover:border-white/5",
                  { "bg-white/5 border-white/5": pathname === link.href }
                )}
              >
                {link.icon === "home" && <IconHome size={40} className="fill-neutral-50" />}
                {link.icon === "add" && <IconAdd size={40} className="fill-neutral-50" />}
                {link.icon === "list" && <IconList size={40} className="fill-neutral-50" />}
                {link.label}
              </Link>
            )

          })
        }
      </ul>

      <Link
        target="_blank"
        className="font-light font-geist-mono transition-colors hover:text-blue-500"
        href="https://github.com/AlejandroDalzotto"
      >
        Made by Alejandro
      </Link>
    </nav>
  )
}
