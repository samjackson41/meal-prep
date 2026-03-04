"use client";

import Link from "next/link";
import { useLocalRecipes } from "@/lib/hooks/useLocalRecipes";
import { Badge } from "@/components/ui/badge";

export function NavBar() {
  const { savedRecipes } = useLocalRecipes();
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
      </div>
    </nav>
  );
}
