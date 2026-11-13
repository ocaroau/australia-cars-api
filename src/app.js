"use strict";

const path = require("node:path");
const express = require("express");
const { slug } = require("./data");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 24;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function intParam(value, name, { min, max, fallback }) {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || (max != null && n > max)) {
    throw new HttpError(400, `"${name}" must be an integer${max != null ? ` between ${min} and ${max}` : ` >= ${min}`}`);
  }
  return n;
}

// Vite fingerprints everything under assets/, so those files never change.
function immutableAssets(res, file) {
  if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
}

function createApp(
  store,
  { publicDir = path.join(__dirname, "..", "public"), webDir = path.join(__dirname, "..", "web", "dist") } = {},
) {
  const app = express();
  app.disable("x-powered-by");

  const api = express.Router();

  api.get("/health", (req, res) => {
    res.json({ status: "ok", cars: store.size });
  });

  api.get("/meta", (req, res) => {
    res.json({
      name: "Australia Cars API",
      cars: store.size,
      makes: store.makes().length,
      bodies: store.bodies().length,
      generatedAt: store.generatedAt,
      endpoints: [
        "GET /api/meta",
        "GET /api/health",
        "GET /api/makes",
        "GET /api/makes/:make/models",
        "GET /api/bodies",
        "GET /api/cars",
        "GET /api/cars/:id",
        "GET /api/cars/:id/colours",
      ],
    });
  });

  api.get("/makes", (req, res) => {
    res.json({ data: store.makes() });
  });

  api.get("/makes/:make/models", (req, res, next) => {
    const models = store.models(slug(req.params.make));
    if (!models.length) return next(new HttpError(404, `make "${req.params.make}" not found`));
    res.json({ make: req.params.make, data: models });
  });

  api.get("/bodies", (req, res) => {
    res.json({ data: store.bodies() });
  });

  api.get("/cars", (req, res) => {
    const sorts = ["make", "model", "year", "-year"];
    const sort = req.query.sort || "make";
    if (!sorts.includes(sort)) throw new HttpError(400, `"sort" must be one of ${sorts.join(", ")}`);
    const year = req.query.year === undefined ? undefined : intParam(req.query.year, "year", { min: 2000, max: 2100 });
    const result = store.search({
      make: req.query.make,
      model: req.query.model,
      body: req.query.body,
      year,
      q: req.query.q,
      sort,
      page: intParam(req.query.page, "page", { min: 1, fallback: 1 }),
      limit: intParam(req.query.limit, "limit", { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT }),
    });
    res.json(result);
  });

  api.get("/cars/:id", (req, res, next) => {
    const car = store.get(req.params.id);
    if (!car) return next(new HttpError(404, `car "${req.params.id}" not found`));
    res.json(car);
  });

  api.get("/cars/:id/colours", (req, res, next) => {
    const car = store.get(req.params.id);
    if (!car) return next(new HttpError(404, `car "${req.params.id}" not found`));
    res.json({ id: car.id, data: car.colors });
  });

  // Read-only API: anything else under /api is an error.
  api.use((req, res) => {
    res.status(404).json({ error: `no such endpoint: ${req.method} ${req.originalUrl.split("?")[0]}` });
  });

  app.use("/api", api);
  // The website (built by `npm run build:web`) and the car images.
  app.use(express.static(webDir, { maxAge: "1h", setHeaders: immutableAssets }));
  app.use(express.static(publicDir, { maxAge: "1d" }));

  app.use((req, res) => res.status(404).json({ error: "not found" }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? "internal server error" : err.message });
  });

  return app;
}

module.exports = { createApp };
