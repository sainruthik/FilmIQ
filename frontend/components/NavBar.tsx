import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function NavBar() {
  return (
    <nav aria-label="Main" className="print:hidden sticky top-0 z-30 bg-paper border-b border-rule">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-20 font-bold tracking-[-0.02em]">
          FilmIQ
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
