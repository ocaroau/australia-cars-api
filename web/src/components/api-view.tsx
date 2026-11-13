import { useEffect, useState } from "react";
import { Check, Copy, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiMode, fetchRaw, type Meta } from "@/lib/api";
import { cn } from "@/lib/utils";

type Endpoint = { live: string; static: string | null; title: string; about: string };

const ENDPOINTS: Endpoint[] = [
  { live: "/api/cars?make=volvo&body=SUV&sort=-year&limit=3", static: "/api/cars.json", title: "List cars", about: "Paginated and filterable. Every word in q must match make, model, generation, body or description." },
  { live: "/api/cars/volvo-xc60-spa", static: "/api/cars/volvo-xc60-spa.json", title: "One car", about: "Full record with description and every colour, each with its recoloured image." },
  { live: "/api/cars/volvo-xc60-spa/colours", static: "/api/cars/volvo-xc60-spa/colours.json", title: "Colours of a car", about: "Just the paint options: name, hex, finish and image." },
  { live: "/api/makes", static: "/api/makes.json", title: "Makes", about: "Every make with its slug and number of cars." },
  { live: "/api/makes/volvo/models", static: "/api/makes/volvo/models.json", title: "Models of a make", about: "Models with their generations and counts. Slugs and names both work." },
  { live: "/api/bodies", static: "/api/bodies.json", title: "Body types", about: "Body labels as they appear in the data, with counts." },
  { live: "/api/meta", static: "/api/meta.json", title: "Meta", about: "Counts, data timestamp and the list of endpoints." },
  { live: "/api/health", static: null, title: "Health", about: "Service status. Use it for uptime checks." },
];

const PARAMS: [string, string, string][] = [
  ["q", "xc60 hybrid", "Free-text search; every word must match"],
  ["make", "alfa-romeo", "Name or slug, case-insensitive"],
  ["model", "XC60", "Case-insensitive"],
  ["body", "SUV", "Body label, case-insensitive"],
  ["year", "2019", "Cars on sale in that year"],
  ["sort", "-year", "make (default), model, year, -year"],
  ["page", "2", "From 1"],
  ["limit", "50", "Default 24, max 100"],
];

export function ApiView({ meta }: { meta: Meta | null }) {
  const [mode, setMode] = useState<"live" | "static" | null>(null);
  useEffect(() => {
    apiMode().then(setMode);
  }, []);
  const list = ENDPOINTS.filter((e) => mode !== "static" || e.static);
  const [open, setOpen] = useState(0);
  const base = (window.location.origin + window.location.pathname).replace(/\/$/, "");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="pt-2 pb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">API</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-[15px] text-pretty">
          Read-only JSON over GET. No key, no sign-up. {meta ? `${meta.cars} cars from ${meta.makes} makes` : "Every car"}, each with an
          AI-generated picture and a recoloured picture for every paint option.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="font-mono font-normal">
            {base}
          </Badge>
          {mode === "static" && (
            <Badge variant="outline" className="font-normal">
              Static copy: query parameters need the live server
            </Badge>
          )}
          {meta?.generatedAt && (
            <span className="text-muted-foreground text-xs">Data from {new Date(meta.generatedAt).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
          )}
        </div>
      </header>

      <section aria-labelledby="endpoints" className="space-y-2">
        <h2 id="endpoints" className="sr-only">
          Endpoints
        </h2>
        {list.map((e, i) => (
          <EndpointRow key={e.title} endpoint={e} path={mode === "static" ? e.static! : e.live} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
      </section>

      {mode !== "static" && (
        <section aria-labelledby="params" className="pt-10">
          <h2 id="params" className="font-display text-2xl font-semibold">
            Query parameters for <code className="font-mono text-xl">/api/cars</code>
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Parameter</th>
                  <th className="px-4 py-2 font-medium">Example</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {PARAMS.map(([p, ex, note]) => (
                  <tr key={p} className="border-t align-top">
                    <td className="px-4 py-2.5 font-mono text-[13px] font-medium">{p}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px]">
                      {p}={ex}
                      <p className="text-muted-foreground mt-0.5 font-sans text-xs sm:hidden">{note}</p>
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            Lists return <code className="font-mono text-[13px]">{"{ data, pagination }"}</code>. Errors return{" "}
            <code className="font-mono text-[13px]">{'{ "error": "…" }'}</code> with status 400, 404 or 500. Images live at{" "}
            <code className="font-mono text-[13px]">/images/cars/&lt;id&gt;.webp</code> and{" "}
            <code className="font-mono text-[13px]">/images/colors/&lt;id&gt;__&lt;colour&gt;.webp</code>.
          </p>
        </section>
      )}
    </div>
  );
}

function EndpointRow({ endpoint, path, open, onToggle }: { endpoint: Endpoint; path: string; open: boolean; onToggle: () => void }) {
  const [res, setRes] = useState<{ status: number; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const id = `ep-${endpoint.title.replace(/\W+/g, "-").toLowerCase()}`;

  const run = async () => {
    setBusy(true);
    try {
      const r = await fetchRaw(path);
      setRes({ ...r, body: r.body.length > 12000 ? `${r.body.slice(0, 12000)}\n…` : r.body });
    } catch (e) {
      setRes({ status: 0, body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card transition-shadow", open && "shadow-[0_8px_30px_-16px_rgba(0,0,0,0.3)]")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <span className="rounded-md bg-primary/12 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">GET</span>
        <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{path.split("?")[0]}</code>
        <span className="text-muted-foreground hidden text-sm sm:block">{endpoint.title}</span>
      </button>
      {open && (
        <div id={id} className="border-t px-4 pt-3 pb-4">
          <p className="text-muted-foreground text-sm">{endpoint.about}</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/50 py-1 pr-1 pl-3">
            <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{path}</code>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={copied ? "Copied" : "Copy URL"}
              onClick={() =>
                navigator.clipboard?.writeText(new URL(path.replace(/^\//, ""), window.location.href.split("#")[0]).href).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })
              }
            >
              {copied ? <Check className="text-primary" /> : <Copy />}
            </Button>
            <Button size="sm" onClick={run} disabled={busy} className="rounded-md">
              <Play aria-hidden /> {busy ? "Sending…" : "Send Request"}
            </Button>
          </div>
          {res && (
            <div className="mt-3 overflow-hidden rounded-lg border bg-[#0d100f] text-[#d7ddd9]">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs">
                <span className={res.status >= 200 && res.status < 300 ? "text-[#3fbf7f]" : "text-[#f0614d]"}>
                  {res.status || "Network error"} {res.status >= 200 && res.status < 300 ? "OK" : ""}
                </span>
                <span className="text-white/50">application/json</span>
              </div>
              <ScrollArea className="h-72">
                <pre className="p-3 font-mono text-[12.5px] leading-relaxed">{res.body}</pre>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
