import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { asset, slug, type CarSummary, type Make } from "@/lib/api";

/** Every make, each shown with its newest car so the grid reads as a car park, not a word list. */
export function MakesView({ makes, cars, makeHref }: { makes: Make[]; cars: CarSummary[] | null; makeHref: (make: string) => string }) {
  const [q, setQ] = useState("");

  const hero = useMemo(() => {
    const m = new Map<string, CarSummary>();
    for (const c of cars ?? []) {
      const k = slug(c.make);
      const cur = m.get(k);
      if (!cur || (c.yearFrom ?? 0) > (cur.yearFrom ?? 0)) m.set(k, c);
    }
    return m;
  }, [cars]);

  const list = makes.filter((m) => m.make.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <div className="flex flex-col gap-3 pt-2 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Makes</h1>
          <p className="text-muted-foreground mt-1 text-sm">{makes.length} makes sold in Australia since 2000</p>
        </div>
        <div className="relative sm:w-72">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a make"
            aria-label="Find a make"
            className="h-10 bg-card pl-9"
          />
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((m) => {
          const car = hero.get(m.slug);
          return (
            <li key={m.slug}>
              <a
                href={makeHref(m.make)}
                className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-[box-shadow,border-color] hover:border-foreground/20 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="stage aspect-[16/8]">
                  {car && (
                    <img
                      src={asset(car.image)}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 m-auto h-auto max-h-full w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2 border-t px-3 py-2.5">
                  <span className="font-display truncate text-lg font-semibold">{m.make}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{m.count}</span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="text-muted-foreground py-10 text-center text-sm">No make matches “{q}”.</p>}
    </>
  );
}
