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
  line: "From a transformer written by hand to a voice agent that haggles with airlines, and the platform I build for AT&T.",
};

export type Project = {
  id: "rag" | "gpt" | "loan" | "dtu" | "agents" | "voice";
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
  /**
   * The same, in the film's vertical cut (a portrait screen): the six stand in a column, the featured
   * one first (and the voice agent next), and each name sits beside its constellation (or below it)
   */
  tall: { off: [number, number, number]; sc: number; label: "left" | "right" | "below" };
  uses: string[];
  links: { label: string; url: string }[];
  problem: string;
  /** a paragraph, or a few lines shown as a list */
  built: string | string[];
  outcome: string;
  /** more work from the same place, told briefly at the end of its story */
  also?: { title: string; line: string; uses: string[] }[];
};

export const PROJECTS: Project[] = [
  {
    id: "rag",
    title: "IntelliCode · Hybrid RAG",
    kind: "Intelligence",
    metric: "121 tests · 92% coverage",
    line: "Hybrid retrieval and AST analysis over a codebase.",
    off: [-7.4, 1.4, 2.0],
    sc: 1.25,
    tall: { off: [-0.95, -1.5, 0], sc: 0.95, label: "right" },
    uses: ["Python", "Qwen2.5-3B", "FAISS", "BM25", "Cross-Encoder Reranking", "Hugging Face Transformers", "GitHub Actions"],
    links: [
      { label: "Code", url: "https://github.com/Divyanshb30/IntelliCode" },
      { label: "Live demo", url: "https://huggingface.co/spaces/Divb30/intellicode-rag" },
    ],
    problem:
      "Finding the right code means matching exact identifiers and intent at the same time, and without measurement there is no way to tell which retrieval stage is actually helping.",
    built:
      "A hybrid RAG pipeline: dense FAISS and sparse BM25, fused with reciprocal rank fusion and reranked by a cross-encoder, answering with Qwen2.5-3B on Hugging Face ZeroGPU. Beside it, an async-aware AST analyser covering 12 anti-pattern classes, and a security scanner for injection, weak crypto and hardcoded secrets.",
    outcome:
      "A labelled evaluation harness (MRR@5, Recall@k, NDCG) measures each stage's lift, and 121 tests at 92% coverage gate every change in GitHub Actions CI.",
  },
  {
    id: "gpt",
    title: "GPT From Scratch",
    kind: "Models",
    metric: "10.7M parameters · PyTorch",
    line: "A decoder-only transformer with no framework abstractions.",
    off: [-3.4, 4.0, -3],
    sc: 1.25,
    tall: { off: [1.0, -4.9, 0], sc: 1.1, label: "left" },
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
    tall: { off: [-0.9, -8.2, 0], sc: 0.95, label: "right" },
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
    tall: { off: [1.0, -11.5, 0], sc: 1.05, label: "left" },
    uses: ["ChromaDB", "Vector Embeddings", "Semantic Search", "Docker", "PostgreSQL"],
    links: [{ label: "Paper · Wiley", url: "https://doi.org/10.1002/spe.70060" }],
    problem: "Preparing the university for accreditation took 25 days of manual work.",
    built:
      "An ML-powered ERP with 8+ modules for accreditation automation, analytics and networking, and a semantic-retrieval pipeline (vector embeddings, ChromaDB). I co-founded it as its product architect: I led the architecture and the frontend, trained the pilot department's faculty and staff, supported the rollout, and pitched it to the university administration.",
    outcome:
      "Preparation went from 25 days to 7 (about 72% less). 1,200+ users across the university, a paper in Wiley's Software: Practice and Experience, and the university now funds it.",
  },
  {
    id: "agents",
    featured: true,
    label: "below",
    title: "Agentic Reconciliation Platform",
    kind: "Featured · Amdocs · AT&T",
    metric: "Sole engineer · CI eval gate",
    line: "Agents for the language, a deterministic engine for every verdict. Built alone, for the AT&T account.",
    off: [0.8, 1.0, 1.2],
    sc: 1.45,
    tall: { off: [0, 7.3, 0], sc: 1.05, label: "below" },
    uses: ["Python", "FastAPI", "Azure OpenAI (GPT-4.1)", "Agent Orchestration", "NL-to-SQL", "Structured Output Generation", "Human-in-the-loop", "CI/CD Eval Gates", "GitLab CI", "PostgreSQL", "Redis"],
    links: [],
    problem:
      "Reconciliation on the AT&T account means proving that systems which should agree really do, table by table and row by row. That verdict has to be exact, so a language model can't be the one giving it.",
    built: [
      "As the sole engineer: GPT-4.1 agents handle intake, NL-to-SQL and reporting, and a deterministic engine owns every verdict. LLM intake lifted completion from 71% to 96% of 126 test requests, at $0.004 each.",
      "A reproducible evaluation platform (12+ suites and a record/replay LLM proxy) that gates every merge request in CI at $0 API cost. It surfaced 38 ranked issues, the next two among them.",
      "Tables over 10k rows were being silently sampled. I rebuilt the read path with batched streaming, which made reconciliation exact at 1M rows per side on a synthetic benchmark: missed breaks went from 97,212 to 0.",
      "An agent-runtime defect failed every run. With it fixed, the NL-to-SQL agent reached 87.8% execution accuracy on 498 benchmark questions (a fixed-step pipeline: 67%), at $0.006 and 7.8 s p50 each.",
      "A self-healing loop that proves each format-noise fix by re-comparison before a human approves it. It cleared all noise on 16 of 18 test pairs while masking 0 real breaks across 17,842 out-of-sample cells.",
    ],
    outcome:
      "Every one of those numbers comes from a run pinned to its commit and its data, and it can be replayed. Along the way: technical discussions, solution demos and POCs with 40+ Amdocs and AT&T stakeholders, and their feedback turned into product iterations.",
    also: [
      {
        title: "Databricks migration · leading",
        line: "Moving the subscriber-event pipeline from Oracle PL/SQL to Azure Databricks (about 80% of the way there): parsing inbound events, applying business rules and populating gold-layer tables, rebuilt in PySpark on a bronze/silver/gold medallion architecture with Unity Catalog. Along the way, a production stored-procedure run over 75M records a day went from 45 minutes to 12–15.",
        uses: ["Databricks", "PySpark", "SQL", "Oracle", "Unity Catalog", "Medallion Architecture"],
      },
    ],
  },
  {
    id: "voice",
    label: "above",
    title: "VocalisAI · Voice Agent",
    kind: "Voice",
    metric: "91% success · 0 leaks",
    line: "A real-time voice agent that calls airlines for refunds.",
    off: [1.2, 6.6, 0],
    sc: 1.15,
    tall: { off: [1.25, 1.1, 0], sc: 0.6, label: "left" },
    uses: ["Python", "Pipecat", "LangGraph", "Deepgram", "BM25", "Cross-Encoder Reranking", "Vector Embeddings", "LLM-as-judge", "Cohen's κ", "Guardrails"],
    links: [
      { label: "Live demo", url: "https://divyanshb30.github.io/VocalisAI/" },
      { label: "Code", url: "https://github.com/Divyanshb30/VocalisAI" },
    ],
    problem:
      "Airline refunds are won on the phone: long holds, scripted pushback, and knowing which passenger-rights rule applies where. An agent making that call also carries the passenger's personal details, which must never be said to the wrong party.",
    built: [
      "A real-time voice agent (Pipecat, LangGraph, Deepgram) that negotiates refunds under Indian, UK/EU and UAE passenger-rights rules.",
      "Secrets never enter the model's context: placeholders are resolved only at speaking time, behind a deterministic streaming output guard.",
      "Jurisdiction-scoped hybrid retrieval (BM25, dense embeddings, cross-encoder reranking) for citing the regulations, lifting top-1 accuracy from 47% to 65% on 78 gold questions.",
      "An LLM judge that rated 29 of 30 calls 5/5, recalibrated with an anchored rubric: its agreement with an independent LLM labeller went from κ −0.05 to 0.73 on 30 held-out calls.",
      "A phonetic read-back fix for the phone line, which lifted task success over audio from 56% to 68% (25 calls each).",
    ],
    outcome:
      "91% task success over 75 adversarial simulated calls in the text harness, with 0 sensitive-data leaks across them, and 1.86 s p50 (2.70 s p95) voice-to-voice latency on a simulated 8 kHz phone line.",
  },
];

/** [capability, lead tool, tools, position in the field, a note under the lead (one line each)] */
export const STACK: [string, string, string[], [number, number, number], string[]?][] = [
  ["AI & LLM Engineering", "LangGraph", ["Azure OpenAI (GPT-4.1)", "LangChain", "LangGraph", "MCP", "LiteLLM", "Agent Orchestration", "Guardrails", "Human-in-the-loop"], [-4.4, 2.3, -1.2]],
  ["Machine Learning & Deep Learning", "PyTorch", ["PyTorch", "TensorFlow", "scikit-learn", "XGBoost", "LoRA / PEFT Fine-tuning", "SHAP Explainability", "Statistical Hypothesis Testing"], [0.6, 2.8, -2.8]],
  ["Retrieval & Search", "FAISS", ["FAISS", "ChromaDB", "RAG", "Semantic Search", "Vector Embeddings", "BM25", "Cross-Encoder Reranking"], [4.8, 1.6, -0.6]],
  [
    "Data Engineering",
    "Databricks",
    ["Databricks", "PySpark", "SQL", "Oracle", "Unity Catalog", "Medallion Architecture", "Apache Airflow"],
    [-1.4, 0.2, 1.6],
    ["Certified Data Engineer Associate", "Certified Generative AI Engineer Associate"],
  ],
  ["Data & Infrastructure", "Python", ["Python", "FastAPI", "Celery", "Docker", "GCP Cloud Run", "PostgreSQL", "Redis"], [-1.6, -0.4, -3.6]],
  ["Voice & Language", "Pipecat", ["Pipecat", "Deepgram", "Hugging Face Transformers", "NL-to-SQL", "Structured Output Generation", "Text Generation", "Sequence Modelling", "Tokenisation"], [-5.2, -1.7, 0.4]],
  ["Evaluation & MLOps", "MLflow", ["MLflow", "DagsHub", "CI/CD Eval Gates", "LLM-as-judge", "Cohen's κ", "Drift Monitoring (PSI/KS)", "Model Versioning"], [1.9, -1.3, 2.2]],
  ["Tools & Languages", "Git", ["Git", "GitHub Actions", "GitLab CI", "Claude Code", "Pandas", "NumPy", "Streamlit", "React"], [5.4, -2.3, 1.0]],
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
    y: "2022 → 2023",
    t: "First builds",
    n: "Started turning ideas into systems.",
    // (cropped above the second laptop in the foreground)
    photo: ["/photos/builds.jpg", 0, 180, 960, 630],
    w: 3.1,
    cap: "First builds · 2022 → 2023",
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
    n: "AI software engineer on the AT&T account. Building its reconciliation platform alone: agents for the language, a deterministic engine for every verdict.",
    // the portrait cropped to him alone (short of the man at the counter on the left and the one at the bar
    // on the right), his eyes on the upper third
    photo: ["/photos/amdocs.jpg", 255, 280, 600, 820],
    w: 1.4,
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

export const CONTACT = { title: "Let's talk." };

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
  "Resolving merge conflicts",
  "Somewhere, a semicolon is missing",
  "Counting to ten, starting at zero",
  "Off by one, give or take",
  "Dividing by zero, carefully",
  "Pretending O(n²) is fine",
  "These dots are also loading",
  "Whispering to the compiler",
  "Asking the tests to believe in me",
  "Merging feelings into main",
  "Refusing to name it final_v2_really_final",
];
