# OpenFox Homepage

Static homepage for `openfox.im`, built in the spirit of [`tos-homepage`](https://github.com/tos-network/tos-homepage): plain HTML, CSS, and JavaScript with a direct Cloudflare deployment path.

The visual direction is adapted from the local OpenClaw landing page language: bold typography, deep-space gradients, glass panels, and strong product-first messaging.

## Stack

- Static files in `public/`
- Cloudflare Workers static assets via `wrangler deploy`
- Optional Cloudflare Pages direct upload via `wrangler pages deploy`

## Local Development

```bash
corepack enable
corepack prepare pnpm@10.28.1 --activate
pnpm install
pnpm dev
```

This serves the site with Wrangler at `http://localhost:8787`.

## Deploy To Cloudflare Workers

```bash
pnpm cf:login
pnpm deploy
```

`wrangler.toml` is already configured to publish the `public/` directory as a static asset site.
The deploy script also passes `--assets public` explicitly so the publish target is unambiguous.

If you want to validate the deploy bundle without pushing it:

```bash
pnpm deploy:dry
```

## Deploy To Cloudflare Pages

Create the Pages project once:

```bash
pnpm pages:create
```

Deploy the current `public/` directory:

```bash
pnpm deploy:pages
```

If you want a local Pages-style preview:

```bash
pnpm preview:pages
```

## Structure

```text
homepage/
├── package.json
├── wrangler.toml
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
