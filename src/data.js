"use strict";

const fs = require("node:fs");
const path = require("node:path");

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function loadDataset(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return createStore(raw.cars, raw.generatedAt);
}

function createStore(cars, generatedAt = null) {
  const byId = new Map(cars.map((c) => [c.id, c]));
  const makes = new Map();
  for (const c of cars) {
    const key = slug(c.make);
    if (!makes.has(key)) makes.set(key, { make: c.make, slug: key, count: 0 });
    makes.get(key).count++;
  }
  const bodies = new Map();
  for (const c of cars) {
    const key = slug(c.body || "unknown");
    if (!bodies.has(key)) bodies.set(key, { body: c.body || "unknown", slug: key, count: 0 });
    bodies.get(key).count++;
  }

  const activeIn = (c, year) => c.yearFrom <= year && (c.yearTo == null || year <= c.yearTo);

  function search({ make, model, body, year, q, sort = "make", page = 1, limit = 24 }) {
    let list = cars;
    if (make) list = list.filter((c) => slug(c.make) === slug(make));
    if (model) list = list.filter((c) => slug(c.model) === slug(model));
    if (body) list = list.filter((c) => slug(c.body || "unknown") === slug(body));
    if (year != null) list = list.filter((c) => activeIn(c, year));
    if (q) {
      const terms = String(q).toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((c) => {
        const hay = `${c.make} ${c.model} ${c.generation} ${c.body} ${c.description}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }
    const sorters = {
      make: (a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || (a.yearFrom || 0) - (b.yearFrom || 0),
      "-year": (a, b) => (b.yearFrom || 0) - (a.yearFrom || 0) || a.make.localeCompare(b.make),
      year: (a, b) => (a.yearFrom || 0) - (b.yearFrom || 0) || a.make.localeCompare(b.make),
      model: (a, b) => a.model.localeCompare(b.model),
    };
    list = [...list].sort(sorters[sort]);
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return {
      data: list.slice(start, start + limit).map(summary),
      pagination: { page, limit, total, pages, hasNext: page < pages },
    };
  }

  function summary(c) {
    return {
      id: c.id,
      make: c.make,
      model: c.model,
      generation: c.generation,
      yearFrom: c.yearFrom,
      yearTo: c.yearTo,
      body: c.body,
      image: c.image,
      colourCount: c.colors.length,
    };
  }

  return {
    size: cars.length,
    generatedAt,
    get: (id) => byId.get(id) || null,
    search,
    summary,
    makes: () => [...makes.values()].sort((a, b) => a.make.localeCompare(b.make)),
    bodies: () => [...bodies.values()].sort((a, b) => b.count - a.count),
    models(makeSlug) {
      const group = new Map();
      for (const c of cars) {
        if (slug(c.make) !== makeSlug) continue;
        const key = slug(c.model);
        if (!group.has(key)) group.set(key, { model: c.model, slug: key, generations: new Set(), count: 0 });
        const g = group.get(key);
        g.generations.add(c.generation);
        g.count++;
      }
      return [...group.values()]
        .map((g) => ({ model: g.model, slug: g.slug, generations: [...g.generations], count: g.count }))
        .sort((a, b) => a.model.localeCompare(b.model));
    },
  };
}

module.exports = { loadDataset, createStore, slug };
