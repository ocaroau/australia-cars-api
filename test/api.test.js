"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createStore } = require("../src/data");
const { createApp } = require("../src/app");

const cars = [
  { id: "volvo-xc60-spa", make: "Volvo", model: "XC60", generation: "SPA", yearFrom: 2017, yearTo: null, body: "SUV", description: "Medium SUV", image: "/i/1.webp", colors: [{ name: "Crystal White", hex: "#fff", finish: "pearl", image: "/c/1.webp" }] },
  { id: "volvo-s60-p3", make: "Volvo", model: "S60", generation: "P3", yearFrom: 2018, yearTo: 2023, body: "Sedan", description: "Sports sedan", image: "/i/2.webp", colors: [] },
  { id: "holden-commodore-vf", make: "Holden", model: "Commodore", generation: "VF", yearFrom: 2013, yearTo: 2017, body: "Sedan", description: "Australian sedan", image: "/i/3.webp", colors: [] },
];

let server;
let base;

test.before(async () => {
  const app = createApp(createStore(cars, "2026-01-01T00:00:00Z"), { publicDir: __dirname });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

async function get(p) {
  const r = await fetch(base + p);
  return { status: r.status, body: await r.json() };
}

test("health and meta", async () => {
  assert.deepEqual((await get("/api/health")).body, { status: "ok", cars: 3 });
  const meta = (await get("/api/meta")).body;
  assert.equal(meta.cars, 3);
  assert.equal(meta.makes, 2);
});

test("makes and models", async () => {
  const makes = (await get("/api/makes")).body.data;
  assert.deepEqual(makes.map((m) => [m.make, m.count]), [["Holden", 1], ["Volvo", 2]]);
  const models = (await get("/api/makes/volvo/models")).body;
  assert.equal(models.data.length, 2);
  assert.equal((await get("/api/makes/nope/models")).status, 404);
});

test("cars filters: make, body, year, q", async () => {
  assert.equal((await get("/api/cars?make=Volvo")).body.pagination.total, 2);
  assert.equal((await get("/api/cars?body=sedan")).body.pagination.total, 2);
  // Volvo S60 (2018-2023) and Holden Commodore (2013-2017) are not both active in 2016
  assert.deepEqual((await get("/api/cars?year=2016")).body.data.map((c) => c.id), ["holden-commodore-vf"]);
  const q = (await get("/api/cars?q=australian")).body.data;
  assert.deepEqual(q.map((c) => c.id), ["holden-commodore-vf"]);
});

test("cars pagination and sort", async () => {
  const page = (await get("/api/cars?limit=2&page=2&sort=-year")).body;
  assert.equal(page.data.length, 1);
  assert.equal(page.pagination.total, 3);
  assert.equal(page.pagination.hasNext, false);
  assert.equal(page.data[0].id, "holden-commodore-vf");
});

test("single car and colours", async () => {
  const car = await get("/api/cars/volvo-xc60-spa");
  assert.equal(car.status, 200);
  assert.equal(car.body.colors[0].name, "Crystal White");
  assert.equal((await get("/api/cars/volvo-xc60-spa/colours")).body.data.length, 1);
  assert.equal((await get("/api/cars/missing")).status, 404);
});

test("bad input and unknown routes return JSON errors", async () => {
  assert.equal((await get("/api/cars?limit=500")).status, 400);
  assert.equal((await get("/api/cars?page=0")).status, 400);
  assert.equal((await get("/api/cars?sort=color")).status, 400);
  assert.equal((await get("/api/cars?year=abc")).status, 400);
  const unknown = await get("/api/nothing");
  assert.equal(unknown.status, 404);
  assert.match(unknown.body.error, /no such endpoint/);
});
