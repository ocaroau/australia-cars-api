"use strict";

const path = require("node:path");
const { createApp } = require("./app");
const { loadDataset } = require("./data");

const port = Number(process.env.PORT || 3000);
const dataFile = process.env.DATA_FILE || path.join(__dirname, "..", "data", "cars.json");

const store = loadDataset(dataFile);
const app = createApp(store);

app.listen(port, () => {
  console.log(`australia-cars-api listening on :${port} (${store.size} cars)`);
});
