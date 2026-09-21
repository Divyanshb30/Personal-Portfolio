// The Intelligence brain. Builds a small knowledge base from the real portfolio
// content and answers questions locally (no keys, works today). A provider
// adapter (/api/intelligence) can override this with a real LLM later.

import {
  profile,
  flagship,
  agents,
  projects,
  research,
  erpJourney,
  skills,
  metrics,
  proof,
  certifications,
  education,
} from "./content";

export type Doc = { id: string; topic: string; keywords: string[]; text: string };

const STOP = new Set([
  "the", "a", "an", "of", "to", "and", "or", "is", "are", "in", "on", "for",
  "what", "who", "how", "tell", "me", "about", "your", "you", "do", "does",
  "did", "with", "at", "his", "her", "their", "this", "that", "it", "as", "by",
]);

function tok(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** The knowledge base, derived once from real content. */
export const KNOWLEDGE: Doc[] = [
  {
    id: "who",
    topic: "Divyansh",
    keywords: tok(`${profile.name} ${profile.role} who are you introduce yourself bio background engineer`),
    text: `${profile.name} is an ${profile.role} at ${profile.employer}, based in ${profile.location}. ${profile.availability} He builds agentic AI systems that earn trust in production.`,
  },
  {
    id: "flagship",
    topic: "The five-agent platform",
    keywords: tok(`${flagship.title} agents reconciliation production flagship telecom att azure openai fastapi langgraph budgets human-in-the-loop`),
    text: `${flagship.title} ${flagship.lede} Key engineering decisions: ${flagship.decisions.join("; ")}. Stack: ${flagship.stack.join(", ")}.`,
  },
  {
    id: "agents",
    topic: "The agents",
    keywords: tok(`agents orchestrator ingest match resolve audit report cost latency budgets swarm`),
    text: `The platform runs ${agents.length} specialised agents, each on a budget: ${agents
      .map((a) => `${a.label} (${a.role})`)
      .join("; ")}. The Orchestrator plans, routes and budgets; every agent has deterministic escape hatches.`,
  },
  ...projects.map((p) => ({
    id: `project-${p.n}`,
    topic: p.title,
    keywords: tok(`${p.title} ${p.desc} ${p.tags} project ${p.metric} ${p.metricLabel}`),
    text: `${p.title} — ${p.desc} (${p.tags}). ${p.metric} ${p.metricLabel}.${p.href ? ` Code: ${p.href}` : ""}`,
  })),
  {
    id: "research",
    topic: "Published research",
    keywords: tok(`${research.title} research published wiley paper doi erp software practice experience`),
    text: `Published research: "${research.title}", ${research.venue} (${research.publisher}), DOI ${research.doi}. It designed a multiuser ERP architecture for higher education — peer-reviewed and later funded by DTU.`,
  },
  {
    id: "erp",
    topic: "The ERP journey",
    keywords: tok(`erp journey ideation research build adoption impact deployment dtu funded 1200 users accreditation`),
    text: `The ERP platform went from problem to funded infrastructure: ${erpJourney
      .map((s) => `${s.kicker}: ${s.title}`)
      .join("; ")}. It reached 1,200+ users and cut accreditation prep ~72%.`,
  },
  {
    id: "skills",
    topic: "Skills & stack",
    keywords: tok(`skills stack tools ${skills.map((g) => `${g.group} ${g.items.join(" ")}`).join(" ")} llm rag mlops pytorch`),
    text: `Skill groups: ${skills.map((g) => `${g.group} (${g.items.join(", ")})`).join("; ")}.`,
  },
  {
    id: "impact",
    topic: "Impact & scale",
    keywords: tok(`impact scale metrics numbers ${metrics.map((m) => `${m.value} ${m.label}`).join(" ")} records latency tokens`),
    text: `By the numbers: ${metrics.map((m) => `${m.value} ${m.label}`).join("; ")}.`,
  },
  {
    id: "recognition",
    topic: "Recognition",
    keywords: tok(`recognition awards proof ${proof.map((p) => p.title).join(" ")} certifications ${certifications.map((c) => c.title).join(" ")} databricks education ${education.school}`),
    text: `Recognition: ${proof.map((p) => `${p.title} (${p.detail})`).join("; ")}. Certified: ${certifications
      .map((c) => c.title)
      .join(", ")}. Education: ${education.degree}, ${education.school} (${education.detail}).`,
  },
  {
    id: "contact",
    topic: "Contact",
    keywords: tok(`contact email github linkedin hire reach relocate available resume roles`),
    text: `Reach Divyansh at ${profile.email}. GitHub: ${profile.socials.github}. LinkedIn: ${profile.socials.linkedin}. ${profile.availability}`,
  },
];

/** Score docs against a query; return the best match(es). */
export function retrieve(query: string): { doc: Doc; score: number }[] {
  const q = tok(query);
  if (q.length === 0) return [];
  const scored = KNOWLEDGE.map((doc) => {
    let score = 0;
    for (const t of q) {
      if (doc.keywords.includes(t)) score += 2;
      else if (doc.keywords.some((k) => k.startsWith(t) || t.startsWith(k))) score += 1;
    }
    return { doc, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 2);
}

/** Compose a local answer from retrieval. Always returns something useful. */
export function localAnswer(query: string): { text: string; topic: string | null } {
  const hits = retrieve(query);
  if (hits.length === 0) {
    return {
      topic: null,
      text: `I can speak to Divyansh's production agent platform, his projects, the published ERP research, his skills, impact, or how to reach him. Ask about any of those.`,
    };
  }
  const primary = hits[0].doc;
  const extra = hits[1] && hits[1].score >= hits[0].score - 1 ? ` ${hits[1].doc.text}` : "";
  return { topic: primary.topic, text: primary.text + extra };
}

export type AskResult = { text: string; topic: string | null; source: "llm" | "local" };

/**
 * Ask the Intelligence. Tries the provider adapter (real LLM, wired later by the
 * user via /api/intelligence); on any failure or when unconfigured, composes a
 * local answer from real content — never a dead box.
 */
export async function ask(query: string): Promise<AskResult> {
  try {
    const res = await fetch("/api/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (res.ok) {
      const data = (await res.json()) as { configured?: boolean; text?: string; topic?: string | null };
      if (data.configured && data.text) {
        return { text: data.text, topic: data.topic ?? null, source: "llm" };
      }
    }
  } catch {
    // fall through to local
  }
  const local = localAnswer(query);
  return { ...local, source: "local" };
}

export const SUGGESTIONS = [
  "Show me your agentic systems",
  "Take me to the projects",
  "What research is published?",
  "How do I reach you?",
];

import type { Chapter } from "./scroll";

/** Map an answer's topic to a chapter the AI can navigate the world to. */
export function topicToChapter(topic: string | null): Chapter | null {
  if (!topic) return null;
  const t = topic.toLowerCase();
  if (t.includes("research") || t.includes("erp")) return "journey";
  if (t.includes("agent") || t.includes("platform") || t.includes("impact") || t.includes("intellicode") || t.includes("loan") || t.includes("transformer") || t.includes("project")) return "build";
  if (t.includes("skill") || t.includes("stack")) return "stack";
  if (t.includes("recognition")) return "explore";
  if (t.includes("contact")) return "human";
  if (t.includes("divyansh")) return "identity";
  return null;
}

/** True when the query asks to be taken/shown somewhere in the world. */
export function isNavIntent(query: string): boolean {
  return /\b(show|take|go|see|navigate|open|jump|bring)\b/i.test(query);
}
