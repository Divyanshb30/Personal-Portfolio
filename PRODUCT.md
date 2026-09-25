# PRODUCT.md — Divyansh Bansal · Portfolio

Durable product truth. Visual decisions live in [`DESIGN_DIRECTION.md`](./DESIGN_DIRECTION.md).

## What this is

A personal portfolio for **Divyansh Bansal**, an AI Engineer (Amdocs · AT&T),
conceived not as a résumé site but as an **interactive cinematic digital identity
experience** — a continuously evolving 3D world built around the person.

- **Mode (Impeccable):** **Experience.** The artifact leads from the first
  viewport; the interface recedes. Secondary Persuade goal underneath: a hiring
  manager should, within seconds, grasp *who this is and why it matters*, and be
  able to reach the work, the résumé, and contact.
- **Audience:** senior engineering / research hiring managers and peers
  evaluating for **senior AI roles, globally**. Technically literate; short on
  patience for fluff; moved by evidence of real production systems.
- **Real scene:** viewed on a laptop or phone, often late, often one of many
  tabs. It must hook in one viewport and reward scrolling, but never trap
  substance behind spectacle.

## The unique mechanism (one sentence)

Divyansh makes machine intelligence **trustworthy in production** — agentic
systems that run on budgets, keep humans in the loop, and are held accountable —
and this site lets you *watch intelligence think and be held to account*.

## Load-bearing facts (see `src/film/data.ts` for what the site says)

- 5-agent reconciliation platform **live in production** at AT&T scale
  (Python/FastAPI, Azure OpenAI GPT-4.1; per-agent cost+latency budgets,
  human-in-the-loop, deterministic fallbacks, hermetic CI eval gate).
- Also at Amdocs: leading the Databricks migration (PySpark, medallion,
  Unity Catalog) and an MCP/Airflow automation agent; mentors engineers in
  agentic AI.
- Scale/impact (résumé): **75M records/day**, **40+ hrs/week automated**, 73% latency ↓,
  59% prompt-token ↓. On the site the Amdocs work carries only 40+ stakeholders,
  8 offline eval suites, and 1,000-reconciliation scale across 6 failure
  archetypes; **no token, latency, volume or hours figures** (by choice). It also
  shows 1,200+ ERP users, 121 CI-gated tests and 0.9184 AUC.
- **Published research** — Wiley, *Software: Practice & Experience*,
  DOI 10.1002/spe.70060 (multiuser ERP for higher ed); ERP platform **funded by DTU**.
- Projects: IntelliCode (hybrid RAG), Loan Risk Intelligence (0.9184 AUC),
  decoder-only transformer from scratch (10.7M params).
- Databricks ×2 certified. B.Tech ECE, DTU, CGPA 8.06.
- Résumés localized: IN / UAE / UK / EU (`public/resume/*.pdf`).

## Must remain true / untouched

- Every metric and claim is real and lives in `src/film/data.ts`, taken from
  the résumé — **do not invent or inflate**. What isn't known yet is omitted,
  never fabricated.
- Contact: divyanshb30@gmail.com · github.com/Divyanshb30 ·
  linkedin.com/in/divyansh-bansal-873610229. Status: open to roles, relocating anywhere.

## Assets the user provides

- **The dust figure** is built from `public/models/divyansh.glb`.
- Journey photographs (`public/photos`), and the résumés.

## Constraints

- Client-only (Next.js), no assistant. Anyone short on time has the fast path:
  Work · Résumé · Contact in the top corner, quick jumps, and links to any
  section (`/#work`, `/#contact`, …).
- The film stays under ~30 screens, with the work in view within ~6.
- Performance is a first-class requirement (device-aware, mobile-simplified,
  reduced-motion honored) — the 3D world may not make the site unusable.
