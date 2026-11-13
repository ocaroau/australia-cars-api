export type CarSummary = {
  id: string;
  make: string;
  model: string;
  generation: string;
  yearFrom: number | null;
  yearTo: number | null;
  body: string;
  image: string;
  colourCount: number;
};

export type Colour = { name: string; hex: string; finish?: string; image: string };
export type Car = Omit<CarSummary, "colourCount"> & { description: string; colors: Colour[] };
export type Meta = { name: string; cars: number; makes: number; bodies: number; generatedAt: string | null };
export type Make = { make: string; slug: string; count: number };

/** Turns an API path ("/images/x.webp") into one that works at / and under /<repo>/. */
export const asset = (p: string) => (p || "").replace(/^\//, "");
export const slug = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const years = (c: Pick<CarSummary, "yearFrom" | "yearTo">) => `${c.yearFrom ?? "?"}–${c.yearTo ?? "now"}`;

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: string }).error || `HTTP ${r.status}`);
  return body as T;
}

/**
 * The Express server answers query-string endpoints; the GitHub Pages copy only has
 * static JSON files. Detect once and use the matching paths.
 */
let modePromise: Promise<"live" | "static"> | null = null;
export const apiMode = () =>
  (modePromise ??= getJson("api/health").then(
    () => "live" as const,
    () => "static" as const,
  ));

export async function fetchMeta() {
  return getJson<Meta>((await apiMode()) === "live" ? "api/meta" : "api/meta.json");
}

export async function fetchMakes() {
  return (await getJson<{ data: Make[] }>((await apiMode()) === "live" ? "api/makes" : "api/makes.json")).data;
}

/** The whole catalogue is ~800 small rows, so the site loads it once and filters locally. */
export async function fetchAllCars(): Promise<CarSummary[]> {
  if ((await apiMode()) === "static") return (await getJson<{ data: CarSummary[] }>("api/cars.json")).data;
  type Page = { data: CarSummary[]; pagination: { pages: number } };
  const first = await getJson<Page>("api/cars?limit=100&page=1");
  const rest = await Promise.all(
    Array.from({ length: first.pagination.pages - 1 }, (_, i) => getJson<Page>(`api/cars?limit=100&page=${i + 2}`)),
  );
  return [first, ...rest].flatMap((p) => p.data);
}

export async function fetchCar(id: string) {
  const live = (await apiMode()) === "live";
  return getJson<Car>(`api/cars/${encodeURIComponent(id)}${live ? "" : ".json"}`);
}

export async function fetchRaw(path: string) {
  const r = await fetch(path.replace(/^\//, ""));
  const text = await r.text();
  try {
    return { status: r.status, body: JSON.stringify(JSON.parse(text), null, 2) };
  } catch {
    return { status: r.status, body: text };
  }
}
