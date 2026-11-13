#!/usr/bin/env node
// Builds the GitHub Pages site into ./site: the website, its images, and the
// API as static JSON files (no server needed). Run after `npm run build:data`.

const fs = require("node:fs");
const path = require("node:path");
const { loadDataset } = require("../src/data");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "site");
const API = path.join(OUT, "api");

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function main() {
  const store = loadDataset(path.join(ROOT, "data", "cars.json"));
  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(ROOT, "public"), OUT);
  const web = path.join(ROOT, "web", "dist");
  if (!fs.existsSync(path.join(web, "index.html"))) throw new Error("web/dist missing: run `npm run build:web` first");
  copyDir(web, OUT);

  const all = store.search({ limit: store.size, page: 1 }).data;
  const meta = {
    name: "Australia Cars API",
    cars: store.size,
    makes: store.makes().length,
    bodies: store.bodies().length,
    generatedAt: store.generatedAt,
    static: true,
  };

  write(path.join(API, "meta.json"), meta);
  write(path.join(API, "makes.json"), { data: store.makes() });
  write(path.join(API, "bodies.json"), { data: store.bodies() });
  write(path.join(API, "cars.json"), { data: all, total: all.length });

  for (const make of store.makes()) {
    write(path.join(API, "makes", make.slug, "models.json"), {
      make: make.make,
      data: store.models(make.slug),
    });
  }

  for (const car of store.search({ limit: store.size }).data) {
    const full = store.get(car.id);
    write(path.join(API, "cars", `${car.id}.json`), full);
    write(path.join(API, "cars", car.id, "colours.json"), { id: car.id, data: full.colors });
  }

  console.log(`site built: ${store.size} cars, ${store.makes().length} makes -> ${path.relative(ROOT, OUT)}`);
}

main();
