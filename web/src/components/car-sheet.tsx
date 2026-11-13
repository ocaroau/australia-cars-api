import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiMode, asset, fetchCar, years, type Car } from "@/lib/api";
import { bodyFamily } from "@/lib/body";
import { cn } from "@/lib/utils";

export function CarSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [car, setCar] = useState<Car | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [colour, setColour] = useState(-1); // -1 = the original picture
  const [live, setLive] = useState(true);

  useEffect(() => {
    apiMode().then((m) => setLive(m === "live"));
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setCar(null);
    setError(null);
    setColour(-1);
    fetchCar(id).then(
      (c) => active && setCar(c),
      (e: Error) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [id]);

  const selected = car && colour >= 0 ? car.colors[colour] : null;
  const image = selected ? selected.image : car?.image;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="px-6 pt-6 pb-2">
          <p className="text-muted-foreground text-sm">{car?.make ?? " "}</p>
          <SheetTitle className="font-display text-3xl leading-none font-bold tracking-tight">
            {car ? car.model : error ? "Car not found" : "Loading…"}
          </SheetTitle>
          <SheetDescription className="sr-only">Details and colour options</SheetDescription>
        </SheetHeader>

        {error && <p className="text-muted-foreground px-6 py-4 text-sm">Couldn’t load this car: {error}. Close this panel and pick another car.</p>}

        {car && (
          <>
            {/* The showroom: swatches repaint the car. */}
            <div className="stage mx-6 mt-2 aspect-[16/8] overflow-hidden rounded-xl border">
              {image && (
                <img
                  key={image}
                  src={asset(image)}
                  alt={`${car.make} ${car.model}${selected ? ` in ${selected.name}` : ""}`}
                  width={512}
                  height={224}
                  className="animate-in fade-in absolute inset-0 m-auto h-auto max-h-full w-[94%] object-contain duration-300"
                />
              )}
            </div>

            {car.colors.length > 0 && (
              <section className="px-6 pt-5" aria-labelledby="paint-heading">
                <div className="flex items-baseline justify-between">
                  <h3 id="paint-heading" className="text-sm font-medium">
                    Paint
                  </h3>
                  <p className="text-muted-foreground text-sm" aria-live="polite">
                    {selected ? `${selected.name}${selected.finish ? ` · ${selected.finish}` : ""}` : "Original render"}
                  </p>
                </div>
                <div role="radiogroup" aria-label="Paint colour" className="mt-3 flex flex-wrap gap-2">
                  {car.colors.map((c, i) => (
                    <button
                      key={c.name}
                      type="button"
                      role="radio"
                      aria-checked={colour === i}
                      aria-label={`${c.name}${c.finish ? `, ${c.finish}` : ""}`}
                      title={c.name}
                      onClick={() => setColour(colour === i ? -1 : i)}
                      className={cn(
                        "relative size-11 rounded-full p-1 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                        colour === i ? "ring-2 ring-foreground" : "ring-1 ring-border hover:ring-foreground/40",
                      )}
                    >
                      <span
                        className="block size-full rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                        style={{
                          background:
                            c.finish && /metal|pearl|mica/i.test(c.finish)
                              ? `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55), transparent 45%), ${c.hex}`
                              : c.hex,
                        }}
                      />
                      {colour === i && (
                        <Check
                          aria-hidden
                          className="absolute inset-0 m-auto size-4 text-white mix-blend-difference"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <dl className="mx-6 mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border text-sm sm:grid-cols-4">
              {[
                ["Generation", car.generation],
                ["Years", years(car)],
                ["Body", bodyFamily(car.body)],
                ["Colours", String(car.colors.length)],
              ].map(([k, v]) => (
                <div key={k} className="bg-card px-3 py-2.5">
                  <dt className="text-muted-foreground text-xs">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            {car.yearTo == null && (
              <div className="px-6 pt-4">
                <Badge variant="outline" className="gap-1.5">
                  <span className="size-1.5 rounded-full bg-signal" aria-hidden /> On sale now
                </Badge>
              </div>
            )}

            <p className="text-foreground/85 px-6 pt-4 text-[15px] leading-relaxed text-pretty">{car.description}</p>

            <section className="mx-6 mt-6 mb-8 rounded-xl border bg-muted/50 p-4" aria-labelledby="endpoint-heading">
              <h3 id="endpoint-heading" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                This car in the API
              </h3>
              <CopyLine label="Car" value={`/api/cars/${car.id}${live ? "" : ".json"}`} />
              <CopyLine label="Image" value={image ?? ""} />
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const absolute = new URL(value.replace(/^\//, ""), window.location.href.split("#")[0]).href;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-muted-foreground w-12 shrink-0 text-xs">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{value}</code>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label={copied ? `Copied ${label} URL` : `Copy ${label} URL`}
        onClick={() => {
          navigator.clipboard?.writeText(absolute).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check className="text-primary" /> : <Copy />}
      </Button>
    </div>
  );
}
