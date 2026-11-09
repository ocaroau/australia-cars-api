# Australia Cars API

A read-only JSON API and website for cars sold in Australia since 2000.
Each car has an AI-generated picture and colour options, with a recoloured
picture for each colour.

## Website on GitHub Pages

The site is published to GitHub Pages by `.github/workflows/pages.yml` on every
push to `main`: `scripts/build-static.js` writes `site/` (the website plus the
API as static JSON files under `site/api/`), and Pages serves it. On Pages the
website reads those JSON files and filters in the browser; the live server
uses the query-string endpoints below.

## Run it

```bash
npm install
npm run build:data -- /path/to/car-images   # only when the dataset changes
npm start                                   # http://localhost:3000
npm test
```

Or with Docker:

```bash
docker build -t australia-cars-api .
docker run -p 3000:3000 australia-cars-api
```

Pushes to `main` build and publish an image to `ghcr.io/<owner>/australia-cars-api`
(see `.github/workflows/docker.yml`). Pull requests and pushes run the tests (`ci.yml`).

## API

All endpoints are `GET`, return JSON, and are under `/api`.

| Endpoint | What it returns |
| --- | --- |
| `/api/health` | Service status and number of cars |
| `/api/meta` | Counts, data timestamp, list of endpoints |
| `/api/makes` | Makes with car counts |
| `/api/makes/:make/models` | Models of one make (e.g. `/api/makes/volvo/models`) |
| `/api/bodies` | Body types with car counts |
| `/api/cars` | Paginated, filterable list of cars |
| `/api/cars/:id` | One car, with its colours |
| `/api/cars/:id/colours` | Colour options of one car |

### `/api/cars` query parameters

| Parameter | Example | Notes |
| --- | --- | --- |
| `q` | `q=xc60 hybrid` | Every word must match make, model, generation, body or description |
| `make` | `make=Volvo` | Case-insensitive, slugs work too (`alfa-romeo`) |
| `model` | `model=XC60` | Case-insensitive |
| `body` | `body=SUV` | Case-insensitive |
| `year` | `year=2019` | Cars on sale in that year |
| `sort` | `sort=-year` | `make` (default), `model`, `year`, `-year` |
| `page` | `page=2` | From 1 |
| `limit` | `limit=50` | Default 24, max 100 |

Responses for lists look like:

```json
{
  "data": [ { "id": "volvo-xc60-spa", "make": "Volvo", "model": "XC60", "...": "..." } ],
  "pagination": { "page": 1, "limit": 24, "total": 1, "pages": 1, "hasNext": false }
}
```

Errors are JSON too: `{ "error": "..." }` with status 400 (bad parameter),
404 (unknown car, make or endpoint) or 500.

Images are served from `/images/cars/<id>.webp` and `/images/colors/<id>__<colour>.webp`.

## Data

`scripts/build-data.js` reads the car-images pipeline output
(`out/`, `variants/`, `catalog/colors.json`) and writes `data/cars.json`
plus 512px WebP images under `public/images/`.

## Licence

Private project. Images are generated, not photographs.
