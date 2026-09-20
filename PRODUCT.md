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

## Load-bearing facts (see `src/lib/content.ts` for canonical values)

- 5-agent reconciliation platform **live in production** at AT&T scale
  (Python/FastAPI, Azure OpenAI GPT-4.1; per-agent cost+latency budgets,
  human-in-the-loop, deterministic fallbacks, hermetic CI eval gate).
- Scale/impact: **75M records/day**, **40+ hrs/week automated**, 73% latency ↓,
  59% prompt-token ↓, 1,200+ ERP users, 121 CI-gated tests.
- **Published research** — Wiley, *Software: Practice & Experience*,
  DOI 10.1002/spe.70060 (multiuser ERP for higher ed); ERP platform **funded by DTU**.
- Projects: IntelliCode (hybrid RAG), Loan Risk Intelligence (0.9184 AUC),
  decoder-only transformer from scratch (10.7M params).
- Databricks ×2 certified. B.Tech ECE, DTU, CGPA 8.06.
- Résumés localized: IN / UAE / UK / EU (`public/resume/*.pdf`).

## Must remain true / untouched

- Every metric and claim is real and lives in `content.ts` — **do not invent or
  inflate**. Items marked `TODO` in `content.ts` are the user's to fill (hobbies,
  extra certs/awards); render them honestly or omit, never fabricate.
- Contact: divyanshb30@gmail.com · github.com/Divyanshb30 ·
  linkedin.com/in/divyansh-bansal. Status: open to roles, relocating anywhere.

## Assets the user provides

- **3D character GLB of Divyansh** (rigged). Until it lands, the character
  system runs on the provided PNG portrait as a depth/scan image-plane, behind a
  drop-in loader slot. Confirmed by the user: a GLB is coming.
- Any real photography/interests to replace `content.ts` TODOs.

## Constraints

- Client-only today (Next.js). The conversational **Intelligence** interface is
  built now with a provider adapter; a real LLM endpoint/key is wired later by
  the user. It must degrade gracefully (never a dead box).
- Performance is a first-class requirement (device-aware, mobile-simplified,
  reduced-motion honored) — the 3D world may not make the site unusable.
