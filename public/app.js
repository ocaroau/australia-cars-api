(() => {
  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 24;
  const state = { page: 1 };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function api(path) {
    const r = await fetch(`/api${path}`);
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  }

  const years = (c) => `${c.yearFrom ?? "?"}–${c.yearTo ?? "now"}`;

  async function loadFilters() {
    const [meta, makes, bodies] = await Promise.all([api("/meta"), api("/makes"), api("/bodies")]);
    $("stats").textContent = `${meta.cars} cars · ${meta.makes} makes · since 2000`;
    for (const m of makes.data) $("make").insertAdjacentHTML("beforeend", `<option value="${esc(m.make)}">${esc(m.make)} (${m.count})</option>`);
    for (const b of bodies.data) $("body").insertAdjacentHTML("beforeend", `<option value="${esc(b.body)}">${esc(b.body)} (${b.count})</option>`);
  }

  function currentQuery() {
    const p = new URLSearchParams({ page: state.page, limit: PAGE_SIZE, sort: $("sort").value });
    for (const [key, id] of [["q", "q"], ["make", "make"], ["body", "body"], ["year", "year"]]) {
      const v = $(id).value.trim();
      if (v) p.set(key, v);
    }
    return p.toString();
  }

  async function loadCars() {
    const grid = $("grid");
    try {
      const res = await api(`/cars?${currentQuery()}`);
      const { data, pagination } = res;
      $("count").textContent = `${pagination.total} result${pagination.total === 1 ? "" : "s"}`;
      grid.innerHTML = data.length
        ? data.map((c) => `
          <button class="card" data-id="${esc(c.id)}" type="button">
            <img loading="lazy" alt="" src="${esc(c.image)}">
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
    const car = await api(`/cars/${encodeURIComponent(id)}`);
    const colours = car.colors;
    $("detail-body").innerHTML = `
      <h2 id="detail-title">${esc(car.make)} ${esc(car.model)}</h2>
      <img class="detail-img" id="detail-img" alt="${esc(car.make)} ${esc(car.model)}" src="${esc(car.image)}">
      <dl class="detail-grid">
        <div><dt>Generation</dt><dd>${esc(car.generation)}</dd></div>
        <div><dt>Years</dt><dd>${years(car)}</dd></div>
        <div><dt>Body</dt><dd>${esc(car.body)}</dd></div>
        <div><dt>Colours</dt><dd>${colours.length}</dd></div>
      </dl>
      <p>${esc(car.description)}</p>
      ${colours.length ? `<h3>Colours</h3><div class="swatches">${colours.map((c, i) => `
        <button class="swatch" type="button" data-src="${esc(c.image)}" data-index="${i}">
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
