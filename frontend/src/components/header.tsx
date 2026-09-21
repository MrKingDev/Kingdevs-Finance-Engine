"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "./ui/themeToggle";
import {
  Cog,
  WalletMinimal,
  CreditCardReader,
  ChartPie,
  Target,
  ChartLine,
  Crown,
  Settings,
} from "lucide-react";

const Header = () => {
  const links = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: <WalletMinimal className="size-7" />,
    },
    {
      to: "/transactions",
      label: "Transactions",
      icon: <CreditCardReader className="size-7" />,
    },
    { to: "/budgets", label: "Budgets", icon: <ChartPie className="size-7" /> },
    { to: "/goals", label: "Goals", icon: <Target className="size-7" /> },
    {
      to: "/reports",
      label: "Reports",
      icon: <ChartLine className="size-7" />,
    },
    { to: "/ai", label: "AI", icon: <Crown className="size-7" /> },
    {
      to: "/settings",
      label: "Settings",
      icon: <Settings className="size-7" />,
    },
  ];
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <header
      className={`
        flex h-screen shrink-0 flex-col
        overflow-hidden
        border-r
        px-2.5 py-3.5
        bg-sidebar text-sidebar-foreground
        transition-all duration-300 ease-in-out
        ${menuOpen ? "w-3xs" : "w-16"}
      `}
    >
      {/* Nav Logo */}
      <div className="flex flex-row items-center gap-2.5">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close sidebar" : "Open sidebar"}
        >
          <Cog className="text-sidebar-foreground size-12 animate-spin transition-colors duration-300 hover:text-sidebar-primary" />
        </button>
        <div
          className={`
            flex flex-col
            overflow-hidden whitespace-nowrap
            text-2xl leading-none
            transition-all duration-300
            ${menuOpen ? "w-auto opacity-100" : "w-0 opacity-0"}
          `}
        >
          <span className="font-bold">Finance</span> <span>Engine</span>
        </div>
      </div>
      {/* Nav Links */}
      <nav className="my-4 flex flex-col gap-2 text-lg">
        {links.map(({ to, label, icon }) => (
          <Link
            key={to}
            href={to}
            className="flex h-10 items-center gap-2.5 rounded-md px-2 transition-colors duration-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="flex shrink-0 items-center justify-center">
              {icon}
            </span>
            <span
              className={`
                overflow-hidden
                whitespace-nowrap
                text-lg
                transition-[max-width,opacity] duration-300 ease-in-out
                ${menuOpen ? "w-auto opacity-100" : "w-0 opacity-0"}
              `}
            >
              {label}
            </span>
          </Link>
        ))}
      </nav>
      {/* Theme Toggle */}
      <div className="flex h-10 items-center gap-2.5 rounded-md px-2">
        <div className="shrink-0">
          <ThemeToggle />
        </div>

        <span
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
            menuOpen ? "w-auto opacity-100" : "w-0 opacity-0"
          }`}
        >
          Theme
        </span>
      </div>
    </header>
  );
};

export default Header;
