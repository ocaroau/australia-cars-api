import { useEffect, useMemo, useRef, useState } from "react";
import { ApiView } from "@/components/api-view";
import { Brand } from "@/components/brand";
import { BrowseView, filtersFrom, filtersToQuery, type Filters } from "@/components/browse-view";
import { CarSheet } from "@/components/car-sheet";
import { Dock } from "@/components/dock";
import { MakesView } from "@/components/makes-view";
import { useRoute } from "@/hooks/use-route";
import { useTheme } from "@/hooks/use-theme";
import { fetchAllCars, fetchMakes, fetchMeta, type CarSummary, type Make, type Meta } from "@/lib/api";

export default function App() {
  const [route, go] = useRoute();
  const [theme, setTheme] = useTheme();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [makes, setMakes] = useState<Make[]>([]);
  const [cars, setCars] = useState<CarSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta, () => {});
    fetchMakes().then(setMakes, () => {});
    fetchAllCars().then(setCars, (e: Error) => setError(e.message));
  }, []);

  const filters = useMemo(() => filtersFrom(route.params), [route.params]);
  const query = filtersToQuery(filters);

  // Scroll to top on view change, but not when a car opens over the list.
  const lastView = useRef(route.view);
  useEffect(() => {
    if (lastView.current !== route.view) window.scrollTo({ top: 0 });
    lastView.current = route.view;
  }, [route.view]);

  useEffect(() => {
    const titles = { browse: "Australia Cars", makes: "Makes · Australia Cars", api: "API · Australia Cars" };
    document.title = titles[route.view];
  }, [route.view]);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 pt-5 pb-3 sm:px-6">
        <a href="#/" aria-label="Australia Cars, home" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          <Brand />
        </a>
        <p className="text-muted-foreground hidden text-sm sm:block">
          {meta ? `${meta.cars} cars · ${meta.makes} makes · since 2000` : " "}
        </p>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pb-32 sm:px-6">
        {route.view === "browse" && (
          <BrowseView
            cars={cars}
            makes={makes}
            error={error}
            filters={filters}
            onFilters={(f: Filters) => go(`/${filtersToQuery(f)}`, { replace: true })}
            carHref={(id) => `#/car/${encodeURIComponent(id)}${query}`}
          />
        )}
        {route.view === "makes" && <MakesView makes={makes} cars={cars} makeHref={(m) => `#/?make=${encodeURIComponent(m)}`} />}
        {route.view === "api" && <ApiView meta={meta} />}
      </main>

      <CarSheet id={route.carId} onClose={() => go(`/${query}`)} />
      <Dock view={route.view} theme={theme} onTheme={setTheme} />
    </div>
  );
}
