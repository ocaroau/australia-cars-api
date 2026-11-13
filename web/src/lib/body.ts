// The dataset has 130+ free-text body labels ("medium SUV", "2-door coupé", "dual-cab ute").
// Browsing groups them into the families people actually shop by. Order matters: the
// first match wins, so "coupe SUV" is an SUV and "minivan" is a people mover.
export const BODY_FAMILIES = [
  "SUV",
  "Sedan",
  "Hatch",
  "Ute",
  "Coupe",
  "Convertible",
  "Wagon",
  "People mover",
  "Van",
  "Other",
] as const;

export type BodyFamily = (typeof BODY_FAMILIES)[number];

const RULES: [BodyFamily, RegExp][] = [
  ["People mover", /people[ -]mover|mpv|minivan/],
  ["Ute", /\bute\b|utility|\bcab\b|pick-?up/],
  ["SUV", /suv|crossover|off-?road|4x4/],
  ["Van", /\bvan\b|bus|coaster|cargo/],
  ["Convertible", /convertible|roadster|cabrio|spider|spyder|targa|volante/],
  ["Coupe", /coup|grand tourer|sports car|supercar|\bgt\b/],
  ["Wagon", /wagon|estate|shooting brake|touring|avant/],
  ["Hatch", /hatch|liftback|city car/],
  ["Sedan", /sedan|saloon|fastback/],
];

export function bodyFamily(body: string | null | undefined): BodyFamily {
  const b = (body || "").toLowerCase();
  for (const [family, re] of RULES) if (re.test(b)) return family;
  return "Other";
}
