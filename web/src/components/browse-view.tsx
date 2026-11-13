import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CarCard, CarCardSkeleton } from "@/components/car-card";
import { slug, type CarSummary, type Make } from "@/lib/api";
import { BODY_FAMILIES, bodyFamily } from "@/lib/body";
import { cn } from "@/lib/utils";

const PAGE = 24;
const ANY = "any";
const SORTS = [
  { value: "make", label: "Make A–Z" },
  { value: "-year", label: "Newest First" },
  { value: "year", label: "Oldest First" },
  { value: "model", label: "Model A–Z" },
];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => String(THIS_YEAR - i));

export type Filters = { q: string; make: string; body: string; year: string; sort: string };

export function filtersFrom(params: URLSearchParams): Filters {
  return {
    q: params.get("q") ?? "",
    make: params.get("make") ?? "",
    body: params.get("body") ?? "",
    year: params.get("year") ?? "",
    sort: params.get("sort") ?? "make",
  };
}

export function filtersToQuery(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.make) p.set("make", f.make);
  if (f.body) p.set("body", f.body);
  if (f.year) p.set("year", f.year);
  if (f.sort !== "make") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

const sorters: Record<string, (a: CarSummary, b: CarSummary) => number> = {
  make: (a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || (a.yearFrom ?? 0) - (b.yearFrom ?? 0),
  "-year": (a, b) => (b.yearFrom ?? 0) - (a.yearFrom ?? 0) || a.make.localeCompare(b.make),
  year: (a, b) => (a.yearFrom ?? 0) - (b.yearFrom ?? 0) || a.make.localeCompare(b.make),
  model: (a, b) => a.model.localeCompare(b.model),
};

export function BrowseView({
  cars,
  makes,
  error,
  filters,
  onFilters,
  carHref,
}: {
  cars: CarSummary[] | null;
  makes: Make[];
  error: string | null;
  filters: Filters;
  onFilters: (f: Filters) => void;
  carHref: (id: string) => string;
}) {
  const [shown, setShown] = useState(PAGE);
  const [q, setQ] = useState(filters.q);
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });

  // Debounce typing into the URL; keep the field responsive.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => set({ q }), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => setShown(PAGE), [filters]);

  // Everything except the body filter, so the chips can show live counts.
  const base = useMemo(() => {
    if (!cars) return [];
    const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    const y = Number(filters.year);
    return cars.filter((c) => {
      if (filters.make && slug(c.make) !== slug(filters.make)) return false;
      if (y && !((c.yearFrom ?? 0) <= y && (c.yearTo == null || y <= c.yearTo))) return false;
      if (terms.length) {
        const hay = `${c.make} ${c.model} ${c.generation} ${c.body}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [cars, filters.q, filters.make, filters.year]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of base) m.set(bodyFamily(c.body), (m.get(bodyFamily(c.body)) ?? 0) + 1);
    return m;
  }, [base]);

  const results = useMemo(() => {
    const list = filters.body ? base.filter((c) => bodyFamily(c.body) === filters.body) : base;
    return [...list].sort(sorters[filters.sort] ?? sorters.make);
  }, [base, filters.body, filters.sort]);

  const active = !!(filters.q || filters.make || filters.body || filters.year);
  const clear = () => {
    setQ("");
    onFilters({ q: "", make: "", body: "", year: "", sort: filters.sort });
  };

  return (
    <>
      {/* Toolbar: search + the three filters that matter. */}
      <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-3 sm:-mx-6 sm:px-6 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-md">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search make, model or generation"
              aria-label="Search cars"
              className="h-10 bg-card pl-9 text-[15px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 md:flex">
            <Select value={filters.make || ANY} onValueChange={(v) => set({ make: v === ANY ? "" : v })}>
              <SelectTrigger aria-label="Make" className="!h-10 w-full bg-card md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value={ANY}>All Makes</SelectItem>
                {makes.map((m) => (
                  <SelectItem key={m.slug} value={m.make}>
                    {m.make} <span className="text-muted-foreground ml-auto pl-2 tabular-nums">{m.count}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.year || ANY} onValueChange={(v) => set({ year: v === ANY ? "" : v })}>
              <SelectTrigger aria-label="On sale in year" className="!h-10 w-full bg-card md:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value={ANY}>Any Year</SelectItem>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    On sale in {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={(v) => set({ sort: v })}>
              <SelectTrigger aria-label="Sort" className="!h-10 w-full bg-card md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ToggleGroup
          type="single"
          value={filters.body}
          onValueChange={(v) => set({ body: v })}
          aria-label="Body type"
          className="mt-3 -mb-1 flex w-full justify-start gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]"
        >
          {BODY_FAMILIES.filter((b) => b !== "Other" || counts.get("Other")).map((b) => {
            const n = counts.get(b) ?? 0;
            return (
              <ToggleGroupItem
                key={b}
                value={b}
                disabled={!n && filters.body !== b}
                className={cn(
                  "h-9 flex-none !rounded-full border bg-card px-3.5 text-[13px] font-medium",
                  "data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                )}
              >
                {b}
                <span className="tabular-nums opacity-60">{n}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      <div className="flex min-h-12 items-center justify-between gap-4 pt-4 pb-3">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {cars ? `${results.length} ${results.length === 1 ? "car" : "cars"}` : error ? "" : "Loading cars…"}
        </p>
        {active && (
          <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground -mr-2">
            <X aria-hidden /> Clear Filters
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="font-medium">Couldn’t load the catalogue</p>
          <p className="text-muted-foreground mt-1 text-sm">{error}. Check that the API server is running, then reload.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {!cars && !error && Array.from({ length: 8 }, (_, i) => <CarCardSkeleton key={i} />)}
        {results.slice(0, shown).map((c) => (
          <CarCard key={c.id} car={c} href={carHref(c.id)} />
        ))}
      </div>

      {cars && results.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No cars match</p>
          <p className="text-muted-foreground mt-1 text-sm">Try a shorter search, or clear the filters to see all {cars.length} cars.</p>
          <Button variant="outline" className="mt-4" onClick={clear}>
            Clear Filters
          </Button>
        </div>
      )}

      {results.length > shown && (
        <div className="flex flex-col items-center gap-2 pt-8">
          <Button variant="outline" size="lg" className="rounded-full px-6" onClick={() => setShown((s) => s + PAGE * 2)}>
            Show More Cars
          </Button>
          <p className="text-muted-foreground text-xs">
            Showing {shown} of {results.length}
          </p>
        </div>
      )}
    </>
  );
}
