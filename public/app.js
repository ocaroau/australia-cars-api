(async () => {
  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 24;
  const state = { page: 1 };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const asset = (p) => (p || "").replace(/^\//, ""); // works at / and under /repo-name/
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  async function getJson(url) {
    const r = await fetch(url);
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  }

  // Live server: query-string API. Static (GitHub Pages): same data as JSON files, filtered in the browser.
  const isLive = await getJson("api/health").then(() => true, () => false);

  const liveApi = {
    meta: () => getJson("api/meta"),
    makes: () => getJson("api/makes"),
    bodies: () => getJson("api/bodies"),
    cars: (params) => getJson(`api/cars?${params}`),
    car: (id) => getJson(`api/cars/${encodeURIComponent(id)}`),
  };

  let allCars = null;
  const staticApi = {
    meta: () => getJson("api/meta.json"),
    makes: () => getJson("api/makes.json"),
    bodies: () => getJson("api/bodies.json"),
    async cars(params) {
      if (!allCars) allCars = (await getJson("api/cars.json")).data;
      const p = new URLSearchParams(params);
      const page = Number(p.get("page") || 1);
      const limit = Number(p.get("limit") || PAGE_SIZE);
      const activeIn = (c, y) => c.yearFrom <= y && (c.yearTo == null || y <= c.yearTo);
      let list = allCars;
      if (p.get("make")) list = list.filter((c) => slug(c.make) === slug(p.get("make")));
      if (p.get("body")) list = list.filter((c) => slug(c.body || "unknown") === slug(p.get("body")));
      if (p.get("year")) list = list.filter((c) => activeIn(c, Number(p.get("year"))));
      if (p.get("q")) {
        const terms = p.get("q").toLowerCase().split(/\s+/).filter(Boolean);
        list = list.filter((c) => {
          const hay = `${c.make} ${c.model} ${c.generation} ${c.body}`.toLowerCase();
          return terms.every((t) => hay.includes(t));
        });
      }
      const sorters = {
        make: (a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || (a.yearFrom || 0) - (b.yearFrom || 0),
        "-year": (a, b) => (b.yearFrom || 0) - (a.yearFrom || 0) || a.make.localeCompare(b.make),
        year: (a, b) => (a.yearFrom || 0) - (b.yearFrom || 0) || a.make.localeCompare(b.make),
        model: (a, b) => a.model.localeCompare(b.model),
      };
      list = [...list].sort(sorters[p.get("sort") || "make"]);
      const total = list.length;
      const pages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return { data: list.slice(start, start + limit), pagination: { page, limit, total, pages, hasNext: page < pages } };
    },
    car: (id) => getJson(`api/cars/${encodeURIComponent(id)}.json`),
  };

  const api = isLive ? liveApi : staticApi;

  const years = (c) => `${c.yearFrom ?? "?"}–${c.yearTo ?? "now"}`;

  async function loadFilters() {
    const [meta, makes, bodies] = await Promise.all([api.meta(), api.makes(), api.bodies()]);
    $("stats").textContent = `${meta.cars} cars · ${meta.makes} makes · since 2000${isLive ? "" : " · static copy"}`;
    for (const m of makes.data) $("make").insertAdjacentHTML("beforeend", `<option value="${esc(m.make)}">${esc(m.make)} (${m.count})</option>`);
    for (const b of bodies.data) $("body").insertAdjacentHTML("beforeend", `<option value="${esc(b.body)}">${esc(b.body)} (${b.count})</option>`);
  }

  function currentQuery() {
    const p = new URLSearchParams({ page: state.page, limit: PAGE_SIZE, sort: $("sort").value });
    for (const id of ["q", "make", "body", "year"]) {
      const v = $(id).value.trim();
      if (v) p.set(id, v);
    }
    return p.toString();
  }

  async function loadCars() {
    const grid = $("grid");
    try {
      const { data, pagination } = await api.cars(currentQuery());
      $("count").textContent = `${pagination.total} result${pagination.total === 1 ? "" : "s"}`;
      grid.innerHTML = data.length
        ? data.map((c) => `
          <button class="card" data-id="${esc(c.id)}" type="button">
            <img loading="lazy" alt="" src="${esc(asset(c.image))}">
            <h2>${esc(c.make)} ${esc(c.model)}</h2>
            <p>${esc(c.generation)} · ${years(c)}</p>
            <p>${esc(c.body)}${c.colourCount ? ` · ${c.colourCount} colours` : ""}</p>
          </button>`).join("")
        : `<p class="count">No cars match these filters.</p>`;
      $("pageinfo").textContent = `Page ${pagination.page} of ${pagination.pages}`;
      $("prev").disabled = pagination.page <= 1;
      $("next").disabled = !pagination.hasNext;
    } catch (err) {
      grid.innerHTML = `<p class="count">Could not load cars: ${esc(err.message)}</p>`;
    }
  }

  async function openCar(id) {
    const car = await api.car(id);
    const colours = car.colors;
    $("detail-body").innerHTML = `
      <h2 id="detail-title">${esc(car.make)} ${esc(car.model)}</h2>
      <img class="detail-img" id="detail-img" alt="${esc(car.make)} ${esc(car.model)}" src="${esc(asset(car.image))}">
      <dl class="detail-grid">
        <div><dt>Generation</dt><dd>${esc(car.generation)}</dd></div>
        <div><dt>Years</dt><dd>${years(car)}</dd></div>
        <div><dt>Body</dt><dd>${esc(car.body)}</dd></div>
        <div><dt>Colours</dt><dd>${colours.length}</dd></div>
      </dl>
      <p>${esc(car.description)}</p>
      ${colours.length ? `<h3>Colours</h3><div class="swatches">${colours.map((c, i) => `
        <button class="swatch" type="button" data-src="${esc(asset(c.image))}" data-index="${i}">
          <span class="dot" style="background:${esc(c.hex)}"></span>${esc(c.name)}
        </button>`).join("")}</div>` : ""}`;
    $("detail-body").querySelectorAll(".swatch").forEach((btn) => btn.addEventListener("click", () => {
      $("detail-img").src = btn.dataset.src;
      $("detail-body").querySelectorAll(".swatch").forEach((b) => b.classList.toggle("active", b === btn));
    }));
    $("detail").showModal();
  }

  let timer;
  const refresh = (resetPage = true) => {
    if (resetPage) state.page = 1;
    clearTimeout(timer);
    timer = setTimeout(loadCars, 200);
  };

  $("q").addEventListener("input", () => refresh());
  $("year").addEventListener("input", () => refresh());
  for (const id of ["make", "body", "sort"]) $(id).addEventListener("change", () => refresh());
  $("prev").addEventListener("click", () => { state.page--; loadCars(); window.scrollTo(0, 0); });
  $("next").addEventListener("click", () => { state.page++; loadCars(); window.scrollTo(0, 0); });
  $("grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openCar(card.dataset.id).catch((err) => alert(err.message));
  });
  $("close").addEventListener("click", () => $("detail").close());
  $("detail").addEventListener("click", (e) => { if (e.target === $("detail")) $("detail").close(); });
  $("filters").addEventListener("submit", (e) => e.preventDefault());

  loadFilters().then(loadCars).catch((err) => { $("stats").textContent = `Failed to load: ${err.message}`; });
})();
