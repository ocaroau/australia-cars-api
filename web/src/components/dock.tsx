import { Braces, CarFront, LayoutGrid, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { ThemePref } from "@/hooks/use-theme";
import type { Route } from "@/hooks/use-route";
import { cn } from "@/lib/utils";

const ITEMS = [
  { view: "browse", href: "#/", label: "Browse", icon: CarFront },
  { view: "makes", href: "#/makes", label: "Makes", icon: LayoutGrid },
  { view: "api", href: "#/api", label: "API", icon: Braces },
] as const;

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

/**
 * Floating navigation dock. It sits on the functional layer, so it is the only
 * translucent surface in the app; content scrolls beneath it.
 */
export function Dock({
  view,
  theme,
  onTheme,
}: {
  view: Route["view"];
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
}) {
  const ThemeIcon = THEME_ICON[theme];
  const item =
    "flex h-12 min-w-12 items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-11 sm:min-w-11";
  // Phones: icon over a short label, like a tab bar. Wider screens: icon beside label.
  const navItem = "min-w-16 flex-col gap-0.5 px-3 text-[11px] sm:flex-row sm:gap-2 sm:px-3.5 sm:text-sm";

  return (
    <nav
      aria-label="Main"
      className="dock-glass fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-max items-center gap-1 rounded-full border p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)]"
    >
      {ITEMS.map(({ view: v, href, label, icon: Icon }) => {
        const active = view === v;
        return (
          <a
            key={v}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              item,
              navItem,
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            <span className="leading-none">{label}</span>
          </a>
        );
      })}
      <Separator orientation="vertical" className="mx-1 !h-6" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(item, "text-muted-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-accent")}
          aria-label={`Appearance: ${theme}`}
        >
          <ThemeIcon className="size-[18px]" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={12} className="w-44">
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => onTheme(v as ThemePref)}>
            <DropdownMenuRadioItem value="system">
              <Monitor className="text-muted-foreground" aria-hidden /> Match System
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">
              <Sun className="text-muted-foreground" aria-hidden /> Day
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="text-muted-foreground" aria-hidden /> Night
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
