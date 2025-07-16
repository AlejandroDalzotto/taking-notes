"use client"

import { IconAdd, IconHome, IconList } from "@/components/Icons";
import type { NavLink } from "@/lib/definitions";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";

export const navLinks: NavLink[] = [
  {
    id: "03fa4448-2463-4b8c-8e9a-955f71006ab5",
    label: "home",
    href: "/",
    icon: <IconHome size={34} className="fill-neutral-50" />,
  },
  {
    id: "6d8fd2e6-8994-4bac-a716-f9a739c159dc",
    label: "notes",
    href: "/notes",
    icon: <IconList size={34} className="fill-neutral-50" />,
  },
  {
    id: "5620f70f-3fdc-44e8-a2d7-1bf21c0e0788",
    label: "create",
    href: "/editor/create",
    icon: <IconAdd size={34} className="fill-neutral-50" />,
  }
];

export default function Navbar() {

  const pathname = usePathname()
  const router = useRouter()

  const handleNavigation = (e: MouseEvent<HTMLAnchorElement>, nagivateTo: string) => {
    e.preventDefault()

    // Prevent unnecesary navigations
    if (nagivateTo === pathname) {
      return
    }

    router.push(nagivateTo)
  }

  return (
    <nav className="flex justify-between px-3 pb-4">

      <div className="flex items-center gap-x-5">
        <Image
          width={50}
          height={50}
          alt="app_icon"
          src="/icon.png"
        />
        <p className="text-lg">Taking Notes</p>
      </div>

      <ul className="flex gap-x-4">
        {
          navLinks.map(link => {
            return (
              <Link
                onClick={(e) => handleNavigation(e, link.href)}
                aria-disabled={pathname === link.href}
                key={link.id}
                href={link.href}
                className={clsx(
                  "grid place-content-center px-4 transition-colors border border-transparent rounded-md hover:bg-white/5 hover:border-white/5",
                  { "bg-white/5 border-white/5": pathname === link.href }
                )}
              >
                {/* {link.icon} */}
                {link.label}
              </Link>
            )

          })
        }
      </ul>
    </nav>
  )
}
