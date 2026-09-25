// Everything the film says. Facts follow the résumé (public/resume); edit them here.

export const PROFILE = {
  name: "Divyansh Bansal",
  line: "AI, agentic systems and whatever seems interesting enough to break.",
  email: "divyanshb30@gmail.com",
  github: "https://github.com/Divyanshb30",
  linkedin: "https://www.linkedin.com/in/divyansh-bansal-873610229",
};

export const THINK = {
  title: "The process",
  line: "Ask the right question, stay with it, iterate until it holds, then make the useful thing real.",
  steps: [
    { word: "Question", line: "Start with the right question." },
    { word: "Understand", line: "Stay with it until the shape becomes clear." },
    { word: "Iterate", line: "Build. Test. Break. Repeat." },
    { word: "Build", line: "Make the useful thing real." },
  ],
};

export const BUILD = {
  kicker: "Build",
  title: "What I build",
  line: "From a transformer written by hand to five agents built for AT&T.",
};

export type Project = {
  id: "rag" | "gpt" | "loan" | "dtu" | "agents";
  /** the one to look at first: biggest, most central, its own label style */
  featured?: boolean;
  /** where its name sits (by default names alternate above and below) */
  label?: "above" | "below";
  title: string;
  kind: string;
  metric: string;
  line: string;
  /** offset from the projects sky centre, and scale of the constellation */
  off: [number, number, number];
  sc: number;
  uses: string[];
  links: { label: string; url: string }[];
  problem: string;
  /** a paragraph, or a few lines shown as a list */
  built: string | string[];
  outcome: string;
  /** more work from the same place, told briefly at the end of its story (no numbers) */
  also?: { title: string; line: string; uses: string[] }[];
};

export const PROJECTS: Project[] = [
  {
    id: "rag",
    title: "IntelliCode · Hybrid RAG",
    kind: "Intelligence",
    metric: "121 tests · CI-gated",
    line: "Hybrid retrieval and AST analysis over a codebase.",
    off: [-7.4, 1.4, 2.0],
    sc: 1.25,
    uses: ["Python", "FAISS", "BM25", "Cross-Encoder Reranking", "Hugging Face Transformers", "ChromaDB", "CI/CD Eval Gates", "GitHub Actions"],
    links: [
      { label: "Code", url: "https://github.com/Divyanshb30/IntelliCode" },
      { label: "Live demo", url: "https://huggingface.co/spaces/Divb30/intellicode-rag" },
    ],
    problem:
      "Finding the right code means matching exact identifiers and intent at the same time, and without measurement there is no way to tell which retrieval stage is actually helping.",
    built:
      "A hybrid RAG pipeline: dense FAISS and sparse BM25, fused with reciprocal rank fusion and reranked by a cross-encoder, answering with Qwen2.5-3B on Hugging Face ZeroGPU. Beside it, an async-aware AST analyser covering 12 anti-pattern classes, and a security scanner for injection, weak crypto and hardcoded secrets.",
    outcome:
      "A labelled evaluation harness (MRR@5, Recall@k, NDCG) measures each stage's lift, and 121 tests gate every change in GitHub Actions CI.",
  },
  {
    id: "gpt",
    title: "GPT From Scratch",
    kind: "Models",
    metric: "10.7M parameters · PyTorch",
    line: "A decoder-only transformer with no framework abstractions.",
    off: [-3.4, 4.0, -3],
    sc: 1.25,
    uses: ["PyTorch", "Python", "Tokenisation", "Sequence Modelling", "Text Generation"],
    links: [{ label: "Code", url: "https://github.com/Divyanshb30/GPT-from-Scratch" }],
    problem: "Using transformers every day is not the same as understanding one. The only way to be sure was to build it with nothing hidden.",
    built:
      "A decoder-only transformer of about 10.7M parameters in raw PyTorch: multi-head self-attention, positional encoding, layer normalisation and autoregressive generation, all written by hand.",
    outcome: "Training convergence and generation quality validated end to end on text corpora.",
  },
  {
    id: "loan",
    title: "Loan Risk Intelligence",
    kind: "Engineering",
    metric: "0.9184 test AUC",
    line: "A stacking ensemble over ~1.8M LendingClub loans, SHAP-audited and drift-monitored.",
    off: [5.6, -0.3, 1.6],
    sc: 1.1,
    uses: ["XGBoost", "PyTorch", "SHAP Explainability", "MLflow", "DagsHub", "Drift Monitoring (PSI/KS)", "GCP Cloud Run", "Docker", "FastAPI", "Streamlit"],
    links: [
      { label: "Code", url: "https://github.com/Divyanshb30/Loan-Risk-Intelligence" },
      { label: "API", url: "https://loan-risk-api-263185384265.us-central1.run.app/docs" },
      { label: "Dashboard", url: "https://loan-risk-dashboard.streamlit.app/" },
    ],
    problem:
      "Credit models trained on years of loans can quietly learn from the future. Across ~1.8M LendingClub loans, a 2016 underwriting regime shift leaks through any split that ignores time.",
    built:
      "A two-stage stacking ensemble (XGBoost and PyTorch) on year-stratified splits, audited with SHAP, and served from GCP Cloud Run (FastAPI, Docker) with live TreeSHAP explanations, a Streamlit dashboard and PSI/KS drift monitoring.",
    outcome: "A test AUC of 0.9184, validated with McNemar's test (χ² = 194.8, p < 0.0001). The API and the dashboard are live.",
  },
  {
    id: "dtu",
    title: "DTU ERP Platform",
    kind: "Product",
    metric: "1,200+ users",
    line: "An ML-powered ERP for higher education, live across the university.",
    off: [8.8, 3.2, -2],
    sc: 1.2,
    uses: ["ChromaDB", "Vector Embeddings", "Semantic Search", "Docker", "PostgreSQL"],
    links: [{ label: "Paper · Wiley", url: "https://doi.org/10.1002/spe.70060" }],
    problem: "Preparing the university for accreditation took 25 days of manual work.",
    built:
      "An ML-powered ERP with 8+ modules for accreditation automation, analytics and networking, and a semantic-retrieval pipeline (vector embeddings, ChromaDB). I co-founded it and led the architecture, the frontend and adoption across stakeholders.",
    outcome:
      "Preparation went from 25 days to 7 (about 72% less). 1,200+ users across the university, a paper in Wiley's Software: Practice and Experience, and DTU funding for continued development.",
  },
  {
    id: "agents",
    featured: true,
    label: "below",
    title: "Five-Agent Reconciliation Platform",
    kind: "Featured · Amdocs · AT&T",
    metric: "5 agents · CI eval gate",
    line: "Five AI agents built to take over reconciliation work on the AT&T account.",
    off: [0.8, 1.0, 1.2],
    sc: 1.45,
    uses: ["Python", "FastAPI", "Azure OpenAI (GPT-4.1)", "Agent Orchestration", "NL-to-SQL", "Structured Output Generation", "Redis", "PostgreSQL", "Vector Embeddings", "CI/CD Eval Gates"],
    links: [],
    problem: "Reconciliation on the AT&T account ran on manual work every week, across systems that had to agree exactly.",
    built: [
      "Five agents on a custom Python/FastAPI runtime with Azure OpenAI (GPT-4.1), each with its own cost and latency budget, deterministic fallbacks and human-in-the-loop checkpoints.",
      "A unified async LLM gateway: structured output, bounded self-repair, circuit-breaker failover and per-session cost gating.",
      "Retrieval-grounded NL-to-SQL with schema pruning and dry-run self-correction.",
      "A hermetic, CI-blocking evaluation gate: 8 offline suites, no external dependencies.",
      "Four-plane agent memory (Redis, PostgreSQL, embeddings, a procedural library) driving a self-improving correction loop.",
    ],
    outcome:
      "Live in production on the AT&T account. Presented the architecture to 40+ cross-functional stakeholders. The evaluation gate blocks every change in CI, validated at 1,000-reconciliation scale across 6 failure archetypes.",
    also: [
      {
        title: "Databricks migration · leading",
        line: "Moving a legacy Oracle PL/SQL subscriber-event pipeline to Azure Databricks: parsing inbound events, applying business rules and populating gold-layer tables for downstream use, rebuilt in PySpark on a bronze/silver/gold medallion architecture with Unity Catalog. Along the way, tuning the stored procedures that carry the daily load.",
        uses: ["Databricks", "PySpark", "SQL", "Unity Catalog", "Medallion Architecture"],
      },
      {
        title: "MCP automation agent",
        line: "An MCP-based agent integrated with Apache Airflow, giving on-demand pause, resume and stop control over pipeline jobs during infrastructure maintenance windows.",
        uses: ["MCP", "Apache Airflow", "Python"],
      },
    ],
  },
];

/** [capability, lead tool, tools, position in the field, a note under the lead (one line each)] */
export const STACK: [string, string, string[], [number, number, number], string[]?][] = [
  ["AI & LLM Engineering", "LangGraph", ["Azure OpenAI (GPT-4.1)", "LangChain", "LangGraph", "MCP", "RAG", "Agent Orchestration"], [-4.4, 2.3, -1.2]],
  ["Machine Learning & Deep Learning", "PyTorch", ["PyTorch", "TensorFlow", "scikit-learn", "XGBoost", "LoRA / PEFT Fine-tuning", "SHAP Explainability", "Statistical Hypothesis Testing"], [0.6, 2.8, -2.8]],
  ["Retrieval & Search", "FAISS", ["FAISS", "ChromaDB", "Semantic Search", "Vector Embeddings", "BM25", "Cross-Encoder Reranking"], [4.8, 1.6, -0.6]],
  [
    "Data Engineering",
    "Databricks",
    ["Databricks", "PySpark", "SQL", "Unity Catalog", "Medallion Architecture", "Apache Airflow"],
    [-1.4, 0.2, 1.6],
    ["Certified Data Engineer Associate", "Certified Generative AI Engineer Associate"],
  ],
  ["Data & Infrastructure", "Python", ["Python", "FastAPI", "Docker", "GCP Cloud Run", "PostgreSQL", "Redis"], [-1.6, -0.4, -3.6]],
  ["Natural Language Processing", "Transformers", ["Hugging Face Transformers", "NL-to-SQL", "Text Generation", "Structured Output Generation", "Sequence Modelling", "Tokenisation"], [-5.2, -1.7, 0.4]],
  ["MLOps & Evaluation", "MLflow", ["MLflow", "DagsHub", "CI/CD Eval Gates", "Drift Monitoring (PSI/KS)", "Model Versioning"], [1.9, -1.3, 2.2]],
  ["Tools & Languages", "Git", ["Git", "GitHub Actions", "Claude Code", "GitHub Copilot", "Pandas", "NumPy", "Streamlit"], [5.4, -2.3, 1.0]],
];
export const LEAD_OF: Record<string, string> = { Transformers: "Hugging Face Transformers" };

export type Photo = [string, number, number, number, number];
export type Memory = {
  y: string;
  t: string;
  /** an optional key figure, set large */
  k?: string;
  /** the photo's width in the world (default 3.3) */
  w?: number;
  n: string;
  /** photo: [src, crop x, y, w, h]; null shows a "photo coming" plate */
  photo: Photo | null;
  cap: string;
  d: number;
  bank: number;
  h: number;
  win: [number, number];
  /** a second, smaller plate beside the first */
  extra?: { photo: Photo; d: number; bank: number; h: number; w: number };
};

export const MEMORIES: Memory[] = [
  {
    y: "2021",
    t: "The beginning",
    n: "B.Tech in Electronics and Communication Engineering at Delhi Technological University. CGPA 8.06.",
    photo: ["/photos/dtu.jpg", 0, 0, 1206, 660],
    cap: "DTU · 2021",
    d: 60,
    bank: 3.4,
    h: 1.4,
    win: [0.18, 0.285],
    extra: { photo: ["/photos/library.jpg", 0, 0, 1206, 667], d: 62, bank: 2, h: 3.3, w: 1.8 },
  },
  {
    y: "2022",
    t: "First builds",
    n: "Started turning ideas into systems.",
    photo: ["/photos/builds.jpg", 0, 180, 960, 720],
    cap: "First builds · 2022",
    // side by side with the night portrait, well apart, both facing the level shot
    d: 101,
    bank: -2.6,
    h: 1.0,
    win: [0.365, 0.45],
    extra: { photo: ["/photos/night.jpg", 0, 180, 720, 960], d: 101, bank: -7.1, h: 1.1, w: 1.75 },
  },
  {
    y: "2024",
    t: "The ERP",
    k: "25 days → 7",
    n: "We thought the process could be better. So we changed it.",
    photo: ["/photos/team.jpg", 0, 380, 960, 620],
    cap: "",
    d: 128,
    bank: 3.0,
    h: 2.4,
    win: [0.5, 0.605],
  },
  {
    y: "2025",
    t: "DTU ERP",
    n: "1,200+ users. A research paper. One university problem that got considerably larger.",
    photo: ["/photos/stakeholders.jpg", 120, 110, 1040, 360],
    cap: "",
    d: 165,
    bank: -3.4,
    h: 0.7,
    win: [0.655, 0.765],
    extra: { photo: ["/photos/report.jpg", 0, 180, 1280, 900], d: 171, bank: 2.6, h: 1.6, w: 2.0 },
  },
  {
    y: "2025",
    t: "Amdocs · AT&T",
    n: "AI software engineer on the AT&T account. Five agents, each with a budget and a fallback. I mentor engineers in agentic AI through hands-on workshops.",
    photo: ["/photos/amdocs.jpg", 0, 60, 1280, 840],
    w: 2.5,
    cap: "",
    d: 200,
    bank: 3.0,
    h: 1.3,
    win: [0.8, 0.9],
  },
];

/**
 * Photos that aren't tied to a year: they drift far off the river's banks through the Journey, small
 * and dim. Add one by putting the file in public/photos and a line here: `photo` is [src, crop x, y,
 * w, h]; `d` (how far down the river), `bank` (across it, + is the far side) and `h` (height) are
 * optional, and without them it finds a spot of its own.
 */
export type LoosePhoto = { photo: Photo; d?: number; bank?: number; h?: number };
export const LOOSE_PHOTOS: LoosePhoto[] = [
  // a night out, between the first year and the first builds
  { photo: ["/photos/cafe.jpg", 0, 0, 963, 1280], d: 82, bank: -6.5, h: 0.9 },
  // the letter: across the river from the ERP's biggest year
  { photo: ["/photos/letter.jpg", 0, 0, 960, 1280], d: 161, bank: 8, h: 2.5 },
];

export const JOURNEY = { kicker: "Journey · 2021 → now", title: "The early work." };

export const NOW = {
  kicker: "Now · Amdocs",
  title: "Still building.",
  line: "Agentic AI on the AT&T account,\nand leading a migration from Oracle to Azure Databricks.",
};

export const CONTACT = { kicker: "One last thing.", title: "Let's talk." };

export const RESUME = "/resume/Divyansh_Bansal.pdf";

/** what the loading screen says, one line at a time, while the film loads or jumps */
/** (no end punctuation: the loading screen adds the dots, and keeps them filling in) */
export const LOADING_LINES = [
  "There's a lot going on back here",
  "Building the build",
  "Teaching the orb to behave",
  "Staying inside the latency budget",
  "Waiting for the eval gate",
  "Checking with a human",
  "A few variables are having a discussion",
  "We're about to make a lot of dots mean something",
  "The universe is currently compiling",
  "A moment of computational patience",
];
