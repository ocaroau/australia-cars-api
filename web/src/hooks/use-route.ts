import { useCallback, useEffect, useState } from "react";

// Hash routes keep the static GitHub Pages copy working without server rewrites:
//   #/?make=Volvo&body=SUV   browse with filters
//   #/car/volvo-xc60-spa     a car, opened over the browse view
//   #/makes                  all makes
//   #/api                    API reference
export type Route = { view: "browse" | "makes" | "api"; carId: string | null; params: URLSearchParams };

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "makes") return { view: "makes", carId: null, params };
  if (parts[0] === "api") return { view: "api", carId: null, params };
  if (parts[0] === "car" && parts[1]) return { view: "browse", carId: decodeURIComponent(parts[1]), params };
  return { view: "browse", carId: null, params };
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(parse);

  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /** `replace` updates the URL without a history entry (used while typing in filters). */
  const go = useCallback((hash: string, { replace = false } = {}) => {
    const url = `${window.location.pathname}${window.location.search}#${hash}`;
    if (replace) {
      window.history.replaceState(null, "", url);
      setRoute(parse());
    } else {
      window.location.hash = hash;
    }
  }, []);

  return [route, go] as const;
}
