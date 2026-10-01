import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FaGithub } from "react-icons/fa";
import { LuCrown } from "react-icons/lu";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex max-w-lg flex-col items-center text-center">
        <h1 className="mt-4 text-7xl font-bold tracking-tight">
          KingDev's Finance Engine
        </h1>

        <h2 className="mt-4 text-2xl font-semibold">Full Stack Project</h2>

        <p className="mt-3 text-muted-foreground">
          Press the buttons to got to the following
        </p>

        <div className="mt-8 flex gap-3">
          <Button>
            <Link href="/dashboard">Dashboard</Link>
          </Button>

          <Button variant="outline" size="icon">
            <Link href="https://mrkingdev.netlify.app">
              <LuCrown />
            </Link>
          </Button>

          <Button variant="outline" size="icon">
            <Link href="https://github.com/MrKingDev">
              <FaGithub />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
