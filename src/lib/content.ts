// Single source of truth for all portfolio content.
// Facts pulled from résumé + public GitHub. Items marked TODO need Divyansh's input.

export const profile = {
  name: "Divyansh Bansal",
  role: "AI Engineer",
  employer: "Amdocs · AT&T",
  location: "New Delhi, India",
  email: "divyanshb30@gmail.com",
  socials: {
    github: "https://github.com/Divyanshb30",
    linkedin: "https://www.linkedin.com/in/divyansh-bansal-873610229",
  },
  availability: "Open to senior AI roles — relocating, anywhere.",
};

export const hero = {
  eyebrow: "AI ENGINEER · AMDOCS × AT&T",
  // headline is split so we can style the emphasis word
  headline: ["I build agentic AI systems that ", "earn trust", " in production."],
  sub: "Five agents live at telecom scale. A published method. A transformer from scratch. Open to senior AI roles — and relocating, anywhere.",
};

export const ledger: [string, string, boolean?][] = [
  ["STATUS", "Open to roles", true],
  ["BASED", "New Delhi → Global"],
  ["SHIPPED", "5 agents · live"],
  ["SCALE", "75M records / day"],
  ["PUBLISHED", "Wiley · SPE"],
  ["CERTIFIED", "Databricks ×2"],
];

export const metrics = [
  { value: "40+", label: "hrs/week automated" },
  { value: "75M", label: "records / day" },
  { value: "73%", label: "latency reduction" },
  { value: "59%", label: "prompt tokens ↓" },
  { value: "1,200+", label: "ERP users" },
  { value: "121", label: "CI-gated tests" },
];

// The five-agent reconciliation platform — drives the 3D constellation + flagship case.
export const agents = [
  { id: "orchestrator", label: "Orchestrator", role: "plans · routes · budgets", cost: "—", lat: "—", core: true },
  { id: "ingest", label: "Ingest", role: "normalises inputs", cost: "$0.004", lat: "210ms" },
  { id: "match", label: "Match", role: "candidate linking", cost: "$0.009", lat: "340ms" },
  { id: "resolve", label: "Resolve", role: "conflict resolution", cost: "$0.006", lat: "180ms" },
  { id: "audit", label: "Audit", role: "human-in-the-loop", cost: "$0.011", lat: "290ms" },
  { id: "report", label: "Report", role: "writes results", cost: "$0.003", lat: "120ms" },
];

export const flagship = {
  kicker: "01 · THE FLAGSHIP",
  title: "A five-agent reconciliation platform. Live in production.",
  lede: "Custom Python/FastAPI runtime on Azure OpenAI GPT-4.1. Five specialised agents, each on a budget, with deterministic escape hatches — engineered to be trusted with real money.",
  decisions: [
    "Per-agent cost & latency budgets",
    "Human-in-the-loop checkpointing",
    "Async LLM gateway · circuit-breaker failover",
    "Four-plane memory · self-improving loop",
    "Hermetic CI eval gate — 8 suites · 1,000-recon scale",
  ],
  stack: ["Python", "FastAPI", "Azure OpenAI", "LangGraph", "Redis", "PostgreSQL"],
};

export const projects = [
  {
    n: "01",
    title: "Five-Agent Reconciliation Platform",
    desc: "Multi-agent LLM system, live in production at AT&T scale — per-agent budgets, human-in-the-loop, deterministic fallbacks.",
    tags: "Python · FastAPI · Azure OpenAI GPT-4.1",
    metric: "40+",
    metricLabel: "hrs/wk automated",
    flag: true,
    href: null as string | null,
  },
  {
    n: "02",
    title: "IntelliCode",
    desc: "Hybrid RAG over a codebase (FAISS + BM25 + RRF + cross-encoder) with an async AST analyser — Qwen2.5-3B on HF ZeroGPU.",
    tags: "FAISS · BM25 · cross-encoder · HF ZeroGPU",
    metric: "121",
    metricLabel: "tests · CI-gated",
    flag: false,
    href: "https://github.com/Divyanshb30/IntelliCode",
  },
  {
    n: "03",
    title: "Loan Risk Intelligence",
    desc: "Two-stage stacking ensemble over ~1.8M loans, SHAP-audited, drift-monitored (PSI/KS) on GCP Cloud Run.",
    tags: "XGBoost · PyTorch · SHAP · Cloud Run",
    metric: "0.9184",
    metricLabel: "Test AUC",
    flag: false,
    href: "https://github.com/Divyanshb30/Loan-Risk-Intelligence",
  },
  {
    n: "04",
    title: "Decoder-Only Transformer",
    desc: "Built from scratch in raw PyTorch — multi-head attention, positional encoding, autoregressive generation.",
    tags: "PyTorch · attention · from scratch",
    metric: "10.7M",
    metricLabel: "parameters",
    flag: false,
    href: "https://github.com/Divyanshb30/GPT-from-Scratch",
  },
];

export const erpJourney = [
  { n: "01", kicker: "IDEATION", title: "The problem worth solving", desc: "Accreditation preparation consumed 25 days of manual coordination every cycle — spreadsheets, email threads, duplicated effort across departments.", badge: null as string | null },
  { n: "02", kicker: "RESEARCH", title: "A method worth publishing", desc: "Designed a multiuser ERP architecture for higher education — rigorous enough to be peer-reviewed and published in Wiley's Software: Practice & Experience.", badge: "DOI 10.1002/spe.70060" },
  { n: "03", kicker: "BUILD", title: "Eight modules, one platform", desc: "Accreditation automation, analytics dashboards, and a student–alumni network — with semantic search over embeddings + ChromaDB. Led architecture and frontend.", badge: "8+ modules" },
  { n: "04", kicker: "ADOPTION", title: "Real users, real scale", desc: "Rolled out across the institution to 1,200+ users; drove stakeholder buy-in and iterated on live feedback.", badge: "1,200+ users" },
  { n: "05", kicker: "IMPACT", title: "Twenty-five days to seven", desc: "Accreditation prep cut by ~72% through intelligent, automated workflows.", badge: "~72% faster" },
  { n: "06", kicker: "DEPLOYMENT", title: "Funded to continue", desc: "The platform is now funded by DTU for continued development — a student project that became institutional infrastructure.", badge: "FUNDED BY DTU", accent: true },
];

export const research = {
  kicker: "FIELD NOTES · PUBLISHED RESEARCH",
  title: "Design and Implementation of a Multiuser ERP Solution for Higher Education Institutions",
  venue: "Software: Practice and Experience",
  publisher: "Wiley",
  doi: "10.1002/spe.70060",
  href: "https://doi.org/10.1002/spe.70060",
};

export const skills = [
  { group: "AI / LLM", items: ["Azure OpenAI", "LangGraph", "LangChain", "MCP", "RAG", "Agent Orchestration"] },
  { group: "Retrieval", items: ["FAISS", "ChromaDB", "BM25", "Cross-Encoder", "Semantic Search"] },
  { group: "ML / DL", items: ["PyTorch", "TensorFlow", "XGBoost", "LoRA / PEFT", "SHAP", "Transformers"] },
  { group: "Infra", items: ["Python", "FastAPI", "Docker", "GCP Cloud Run", "PostgreSQL", "Redis", "Airflow"] },
  { group: "MLOps", items: ["MLflow", "DagsHub", "CI/CD Eval Gates", "Drift (PSI/KS)", "Model Versioning"] },
  { group: "Tools", items: ["Git", "GitHub Actions", "Claude Code", "Pandas", "NumPy", "Streamlit"] },
];

// Recognition — known facts + TODO for anything Divyansh wants to add.
export const proof = [
  { title: "Published in Wiley", detail: "Software: Practice & Experience — peer-reviewed.", year: "2025" },
  { title: "Funded by DTU", detail: "ERP platform funded by the university for continued development.", year: "2025" },
  { title: "Mentored 15+ engineers", detail: "Agentic AI workshops (LangChain, LangGraph).", year: "2025" },
  { title: "Presented to 40+ stakeholders", detail: "Architecture sign-off across cross-functional teams.", year: "2025" },
  // TODO: add hackathons, scholarships, rankings, talks
];

export const certifications = [
  { title: "Databricks Data Engineer Associate", issuer: "Databricks" },
  { title: "Databricks Generative AI Engineer Associate", issuer: "Databricks" },
  // TODO: confirm any additional certifications
];

export const education = {
  school: "Delhi Technological University (DTU)",
  degree: "B.Tech, Electronics & Communication Engineering",
  detail: "CGPA 8.06 / 10",
  years: "2021 – 2025",
};

// TODO(Divyansh): replace with your real hobbies/interests.
export const offTheClock = {
  kicker: "OFF THE CLOCK",
  note: "Placeholder — send me your real interests and I'll make this sing.",
  items: [
    { title: "—", detail: "TODO: hobby #1" },
    { title: "—", detail: "TODO: hobby #2" },
    { title: "—", detail: "TODO: hobby #3" },
  ],
};

export const regions = [
  { code: "IN", label: "India", file: "/resume/Divyansh_Bansal.pdf" },
  { code: "AE", label: "UAE", file: "/resume/Divyansh_Bansal_UAE.pdf" },
  { code: "UK", label: "United Kingdom", file: "/resume/Divyansh_Bansal_UK.pdf" },
  { code: "EU", label: "Europe", file: "/resume/Divyansh_Bansal_EU.pdf" },
];

// A broad, long-run framing — a builder who explores and evolves, not locked to
// one title. Used in the Identity chapter.
export const identity = {
  name: "Divyansh Bansal",
  roles: ["Engineer", "Builder", "Researcher"],
  line: "I build intelligent systems — and keep exploring what comes next.",
};

// BUILD — projects as manifestations of what he builds (not per-project chapters).
// Each carries a short clue, not a full section. Grounded in the projects above.
export const builds = [
  {
    kind: "SYSTEMS",
    id: "agentic",
    title: "Agentic Reconciliation Platform",
    flow: ["INGEST", "PLAN", "EXECUTE", "SCHEDULE", "REPORT"],
    rel: ["rag", "gpt"],
    hint: "Five specialised agents, live in production at AT&T scale — each on a budget, human-in-the-loop, deterministic fallbacks.",
    tags: "Python · FastAPI · Azure OpenAI · LangGraph",
    metric: "40+ hrs/wk automated",
    href: null as string | null,
  },
  {
    kind: "INTELLIGENCE",
    id: "rag",
    title: "IntelliCode — Hybrid RAG",
    flow: ["QUERY", "RETRIEVE", "RERANK", "GENERATE"],
    rel: ["agentic", "gpt"],
    hint: "Retrieval over a codebase: FAISS + BM25 + RRF + cross-encoder, async AST analysis, CI-gated.",
    tags: "FAISS · BM25 · cross-encoder · HF ZeroGPU",
    metric: "121 tests",
    href: "https://github.com/Divyanshb30/IntelliCode",
  },
  {
    kind: "MODELS",
    id: "gpt",
    title: "Decoder-Only Transformer",
    flow: ["TOKENS", "ATTENTION", "OUTPUT"],
    rel: ["rag", "loan"],
    hint: "Built from scratch in raw PyTorch — attention, positional encoding, autoregressive generation.",
    tags: "PyTorch · attention · from scratch",
    metric: "10.7M params",
    href: "https://github.com/Divyanshb30/GPT-from-Scratch",
  },
  {
    kind: "ENGINEERING",
    id: "loan",
    title: "Loan Risk Intelligence",
    flow: ["DATA", "FEATURES", "ENSEMBLE", "RISK SCORE"],
    rel: ["gpt"],
    hint: "Two-stage stacking ensemble over ~1.8M loans, SHAP-audited, drift-monitored on Cloud Run.",
    tags: "XGBoost · PyTorch · SHAP · Cloud Run",
    metric: "0.9184 AUC",
    href: "https://github.com/Divyanshb30/Loan-Risk-Intelligence",
  },
  {
    kind: "PRODUCT",
    id: "dtu",
    title: "DTU ERP Platform",
    flow: ["FORM", "MODULES", "USERS", "PLATFORM"],
    rel: [] as string[],
    hint: "Multiuser ERP for higher ed — 8 modules, semantic search, 1,200+ users. See the Journey.",
    tags: "React · Node · ChromaDB · embeddings",
    metric: "1,200+ users",
    href: null,
  },
];

// STACK — capability-based, so it stays relevant as tools change.
export const stack = [
  { cap: "BUILD", items: ["Python", "C++", "JavaScript", "TypeScript", "SQL"] },
  { cap: "INTELLIGENCE", items: ["PyTorch", "TensorFlow", "Transformers", "LangGraph", "LangChain", "scikit-learn"] },
  { cap: "RETRIEVAL", items: ["FAISS", "ChromaDB", "BM25", "Cross-Encoder", "Embeddings"] },
  { cap: "SYSTEMS", items: ["FastAPI", "Docker", "PostgreSQL", "Redis", "Airflow"] },
  { cap: "APPLICATIONS", items: ["React", "Next.js", "Node", "REST APIs"] },
  { cap: "INFRASTRUCTURE", items: ["Git", "GitHub Actions", "MLflow", "DagsHub", "GCP Cloud Run", "CI/CD"] },
];

// STACK reverses BUILD: technology -> the projects that use it (project ids).
// Used by the STACK web to illuminate projects when a technology is focused.
export const techProjects: Record<string, string[]> = {
  Python: ["gpt", "agentic", "loan", "rag"],
  TypeScript: ["dtu"],
  JavaScript: ["dtu"],
  PyTorch: ["gpt", "loan"],
  TensorFlow: ["loan"],
  Transformers: ["gpt", "rag"],
  LangGraph: ["agentic"],
  LangChain: ["agentic", "rag"],
  "scikit-learn": ["loan"],
  FAISS: ["rag"],
  ChromaDB: ["dtu", "rag"],
  BM25: ["rag"],
  "Cross-Encoder": ["rag"],
  Embeddings: ["dtu", "rag"],
  FastAPI: ["agentic"],
  Docker: ["agentic", "dtu", "loan"],
  PostgreSQL: ["agentic"],
  Redis: ["agentic"],
  Airflow: ["agentic"],
  React: ["dtu"],
  "Next.js": ["dtu"],
  Node: ["dtu"],
  "GCP Cloud Run": ["loan"],
  MLflow: ["loan"],
  DagsHub: ["loan"],
  "CI/CD": ["agentic", "rag"],
};

// JOURNEY — how he became who he is (a physical journey, not a project list).
export const journey = [
  { year: "2021", title: "DTU", note: "Began B.Tech (ECE) at Delhi Technological University." },
  { year: "2022", title: "Building", note: "Started shipping real systems — led architecture and frontend." },
  { year: "2023", title: "Co-founder · ERP", note: "Architected a multiuser ERP for higher education; drove stakeholder buy-in." },
  { year: "2024", title: "Users & Research", note: "1,200+ users; the method peer-reviewed in Wiley, then funded by DTU." },
  { year: "2025", title: "Amdocs · AT&T", note: "AI engineer — five agents live in production at telecom scale." },
];

// EXPLORE — deliberately broad, so the site isn't locked to one identity.
// TODO(Divyansh): replace the open slots with your real interests (film, etc.).
export const explore = [
  { title: "RESEARCH", note: "Published method (Wiley); always digging into new ideas." },
  { title: "SYSTEMS", note: "How isolated technologies become systems that hold up." },
  { title: "LEARNING", note: "Continuously — the stack is a moving target." },
  { title: "CREATE", note: "TODO: your filmmaking / design / experiments go here." },
];

// NOW — present tense; meant to be updated every few months.
export const now = {
  building: "Agentic AI systems that earn trust in production, at Amdocs (AT&T).",
  exploring: "Retrieval, agent memory, and making machine reasoning legible.",
  open: profile.availability,
};

export const nav = [
  { label: "Work", href: "#work" },
  { label: "Journey", href: "#journey" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];
