# OpenFox Homepage

Static homepage for [openfox.im](https://openfox.im). Pure HTML + CSS + JS, no build step, deployed to Cloudflare Pages via Wrangler.

## Stack

- Static files in `public/`
- Cloudflare Pages direct upload via `wrangler pages deploy`

## Local Development

```bash
corepack enable
corepack prepare pnpm@10.28.1 --activate
pnpm install
pnpm dev
```

This serves the site with Wrangler Pages locally at `http://localhost:8788` by default.

## Deploy To Cloudflare Pages

Create the Pages project once:

```bash
pnpm pages:create
```

Deploy the current `public/` directory:

```bash
pnpm cf:login
pnpm deploy
```

If you want a local Pages-style preview:

```bash
pnpm preview:pages
```

Verify that a deployment target is serving the expected Pages site:

```bash
pnpm verify:url https://openfox.im/
```

## Structure

```text
homepage/
├── package.json
└── public/
    ├── index.html
    ├── openfox.sh
    ├── robots.txt
    ├── sitemap.xml
    ├── css/
    │   └── main.css
    ├── js/
    │   └── main.js
    └── img/
        ├── fox-mark.svg
        └── og-image.svg
```

## Notes

- The installer exposed on the homepage is hosted at `/openfox.sh` and mirrors the OpenFox repository bootstrap flow.
- Canonical metadata currently targets `https://openfox.im/`.
- The production site is served from the Cloudflare Pages project `openfox-homepage`.
- Production verification checks the Pages deployment markers embedded in `public/index.html`.
