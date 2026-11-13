import { asset, years, type CarSummary } from "@/lib/api";
import { bodyFamily } from "@/lib/body";

export function CarCard({ car, href }: { car: CarSummary; href: string }) {
  const onSale = car.yearTo == null;
  return (
    <a
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-[box-shadow,border-color] hover:border-foreground/20 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="stage aspect-[16/8] overflow-hidden">
        <img
          src={asset(car.image)}
          alt=""
          loading="lazy"
          decoding="async"
          width={512}
          height={224}
          className="absolute inset-0 m-auto h-auto max-h-full w-[92%] object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t px-4 py-3">
        <p className="text-muted-foreground text-[13px] leading-tight">{car.make}</p>
        <h3 className="font-display text-[21px] leading-tight font-semibold tracking-tight">{car.model}</h3>
        <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[13px]">
          <span className="inline-flex items-center gap-1.5">
            {onSale && <span className="size-1.5 rounded-full bg-signal" aria-hidden />}
            <span>{years(car)}</span>
            {onSale && <span className="sr-only">, on sale now</span>}
          </span>
          <span aria-hidden>·</span>
          <span>{bodyFamily(car.body)}</span>
          {car.colourCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{car.colourCount} colours</span>
            </>
          )}
        </div>
      </div>
    </a>
  );
}

export function CarCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="stage aspect-[16/8]" />
      <div className="flex flex-col gap-2 border-t px-4 py-3">
        <div className="bg-muted h-3 w-16 animate-pulse rounded" />
        <div className="bg-muted h-5 w-32 animate-pulse rounded" />
        <div className="bg-muted h-3 w-40 animate-pulse rounded" />
      </div>
    </div>
  );
}
