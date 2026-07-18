# Lumora — Illuminate Your Web Presence

**Deep SEO & AI Search (GEO) analysis with intelligent fix suggestions.**

Search is splitting in two: classic SERPs, and AI answers (ChatGPT, Perplexity,
Google AI Overviews) that cite a handful of sources and ignore everyone else.
Lumora audits how visible a site is in *both* worlds and tells you exactly what
to fix — with evidence, not folklore.

## What it does

**AI Search / GEO**
- **Citation tracking** — monitor when and where AI engines cite your brand
- **Citation simulation** — estimate how extractable a page is for LLM answers
  (answer-first structure, assertive definitions, comparison tables, FAQ blocks)
- **Competitor citation analysis** — see who *is* getting cited for your queries
- **Brand mentions & entity graph** — entity consistency across the web, the
  #1 gate for AI engines trusting your facts
- **AI Overview monitoring** — track Google AI Overview presence per query

**Classic SEO**
- **Site crawl & analysis** — technical audit with prioritized fixes
- **Rank tracking** and **SERP volatility** monitoring
- **Competitor keywords** and side-by-side **compare** views

**Intelligence layer**
- Fix suggestions generated per finding (Claude-powered), ranked by impact
- Continuous monitors with scheduled scans and alerting
- PDF report export for client delivery

## Stack

Next.js (App Router) · Supabase (auth + data) · Anthropic API ·
Cheerio (crawling) · Recharts · Waffo Pancake (billing)

## Run locally

```bash
cp .env.example .env.local   # fill in Supabase + Anthropic keys
npm install
npm run dev
```

## Status

Active development. The audit methodology follows current published research on
generative engine optimization (Princeton GEO paper, Ahrefs controlled studies)
rather than legacy checklists — e.g. no schema-markup cargo cult, no llms.txt
snake oil.

## License

All rights reserved (product in development).
