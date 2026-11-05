# Tachana

Live arrival times for Israeli bus stops, in Hebrew and English. Type a stop number or find nearby stops, then see what's on the way.

Arrival times come from [curlbus](https://curlbus.app), which uses the Ministry of Transport's SIRI feed. Stop names come from [Open Bus](https://open-bus-stride-api.hasadna.org.il/docs). Times are estimates.

## Develop

```sh
pnpm install
pnpm dev
```

## Deploy

```sh
pnpm deploy
```

Cloudflare Workers Builds settings: build command `pnpm build`, deploy command `pnpm exec wrangler deploy`.

## Stack

Vite, React, TypeScript, Tailwind, shadcn/ui, and a Hono API on Cloudflare Workers.
