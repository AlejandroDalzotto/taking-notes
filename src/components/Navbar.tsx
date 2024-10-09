import { navLinks } from "@/lib/constants";
import Link from "next/link";

export default function Navbar() {

  return (
    <nav className="px-6 py-5 flex flex-col gap-y-10">

      <p className="font-geist-mono text-xl">Taking Notes</p>

      <ul className="flex flex-col gap-y-4 flex-grow">
        {
          navLinks.map(link => {

            return (
              <Link
                key={link.id}
                href={link.href}
                className="py-2 px-3 rounded-md border border-transparent transition-colors hover:border-white/5"
              >
                <svg className="w-10 h-10">
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
