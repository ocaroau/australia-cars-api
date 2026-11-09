#!/usr/bin/env node
// Builds the API dataset and the website images from the car-images pipeline output.
//
// usage: node scripts/build-data.js <path-to-car-images>
//
// Reads:  <src>/out/<make>/<stem>.png + <stem>.json   (transparent car picture + metadata)
//         <src>/variants/<make>/<stem>__<colour>.png  (colour variants)
//         <src>/catalog/colors.json                   (colour names / hex / finish)
// Writes: data/cars.json                              (dataset served by the API)
//         public/images/cars/<id>.webp                (512px WebP pictures)
//         public/images/colors/<id>__<colour>.webp    (512px WebP colour variants)

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const SRC = path.resolve(process.argv[2] || path.join(__dirname, "..", "..", "car-images"));
const ROOT = path.join(__dirname, "..");
const OUT_DATA = path.join(ROOT, "data", "cars.json");
const OUT_CARS = path.join(ROOT, "public", "images", "cars");
const OUT_COLORS = path.join(ROOT, "public", "images", "colors");
const WIDTH = 512;
const QUALITY = 80;
const CONCURRENCY = 8;

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function collectCars() {
  const outDir = path.join(SRC, "out");
  const cars = [];
  for (const makeDir of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (!makeDir.isDirectory() || makeDir.name.startsWith("_")) continue;
    const dir = path.join(outDir, makeDir.name);
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      const stem = f.slice(0, -5);
      const png = path.join(dir, `${stem}.png`);
      if (!fs.existsSync(png)) continue;
      const meta = readJson(path.join(dir, f));
      cars.push({ folder: makeDir.name, stem, png, meta });
    }
  }
  return cars;
}

async function pool(items, fn) {
  let i = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function toWebp(src, dest) {
  await sharp(src)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(dest);
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`car-images folder not found: ${SRC}`);
  const colorsAll = readJson(path.join(SRC, "catalog", "colors.json"));
  const cars = collectCars();
  console.log(`found ${cars.length} cars in ${path.join(SRC, "out")}`);

  fs.rmSync(OUT_CARS, { recursive: true, force: true });
  fs.rmSync(OUT_COLORS, { recursive: true, force: true });
  fs.mkdirSync(OUT_CARS, { recursive: true });
  fs.mkdirSync(OUT_COLORS, { recursive: true });

  const records = cars.map((c) => {
    const id = `${slug(c.folder)}-${c.stem}`;
    const colors = (colorsAll[`${c.folder}/${c.stem}`] || []).map((col) => ({
      name: col.name,
      hex: col.hex,
      finish: col.finish,
      colourSlug: slug(col.name),
    }));
    return {
      id,
      make: c.meta.make,
      model: c.meta.model,
      generation: c.meta.generation,
      yearFrom: c.meta.year_from,
      yearTo: c.meta.year_to,
      body: c.meta.body,
      description: c.meta.description || "",
      image: `/images/cars/${id}.webp`,
      colors,
      _src: c,
    };
  });

  // Convert the car pictures.
  await pool(records, async (r) => {
    await toWebp(r._src.png, path.join(OUT_CARS, `${r.id}.webp`));
  });

  // Convert the colour variants that exist; drop colours with no picture.
  let variantCount = 0;
  for (const r of records) {
    const variantDir = path.join(SRC, "variants", r._src.folder);
    for (const col of r.colors) {
      const src = path.join(variantDir, `${r._src.stem}__${col.colourSlug}.png`);
      col.image = null;
      if (fs.existsSync(src)) {
        col.image = `/images/colors/${r.id}__${col.colourSlug}.webp`;
        col._src = src;
      }
    }
    r.colors = r.colors.filter((col) => col.image);
  }
  const variantJobs = records.flatMap((r) =>
    r.colors.map((col) => ({ col, id: r.id })),
  );
  await pool(variantJobs, async ({ col, id }) => {
    await toWebp(col._src, path.join(OUT_COLORS, `${id}__${col.colourSlug}.webp`));
    variantCount++;
  });

  // Clean internal fields and write the dataset.
  const finalCars = records
    .map(({ _src, ...r }) => ({
      ...r,
      colors: r.colors.map(({ colourSlug, _src: _, ...col }) => col),
    }))
    .sort(
      (a, b) =>
        a.make.localeCompare(b.make) ||
        a.model.localeCompare(b.model) ||
        (a.yearFrom || 0) - (b.yearFrom || 0),
    );

  fs.mkdirSync(path.dirname(OUT_DATA), { recursive: true });
  fs.writeFileSync(
    OUT_DATA,
    JSON.stringify({ generatedAt: new Date().toISOString(), cars: finalCars }, null, 2) + "\n",
  );
  console.log(
    `wrote ${finalCars.length} cars, ${variantCount} colour variants -> ${path.relative(ROOT, OUT_DATA)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
