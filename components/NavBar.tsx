"use client";

import Link from "next/link";
import { useLocalRecipes } from "@/lib/hooks/useLocalRecipes";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun } from "lucide-react";

export function NavBar() {
  const { savedRecipes } = useLocalRecipes();
  const { theme, toggle } = useTheme();
  const count = savedRecipes.length;

  return (
    <nav className="border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Search
        </Link>
        <Link
          href="/recipes"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
        >
          My Recipes
          {count > 0 && (
            <Badge className="bg-green-500 text-white text-xs px-1.5 py-0.5 h-auto">
              {count}
            </Badge>
          )}
        </Link>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="ml-auto relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{
            backgroundColor: theme === "dark" ? "var(--primary)" : "var(--border)",
          }}
        >
          <span
            className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-lg transition-transform"
            style={{
              transform: theme === "dark" ? "translateX(20px)" : "translateX(0px)",
            }}
          >
            {theme === "dark" ? (
              <Moon className="h-3 w-3 text-primary" />
            ) : (
              <Sun className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        </button>
      </div>
    </nav>
  );
}
