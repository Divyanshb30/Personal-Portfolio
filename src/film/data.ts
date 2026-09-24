// Everything the film says. Facts follow the résumé (public/resume); edit them here.

export const PROFILE = {
  name: "Divyansh Bansal",
  roles: "Engineer · Builder · Researcher",
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
  line: "Questions become systems. Systems become things people can use.",
};

export type Project = {
  id: "rag" | "gpt" | "loan" | "dtu";
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
  built: string;
  outcome: string;
};

export const PROJECTS: Project[] = [
  {
    id: "rag",
    title: "IntelliCode · Hybrid RAG",
    kind: "Intelligence",
    metric: "121 tests · CI-gated",
    line: "Hybrid retrieval and AST analysis over a codebase.",
    off: [-7.2, 1.2, 2.2],
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
    off: [-2.2, 3.4, -3],
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
    off: [3.8, 0.8, 1.2],
    sc: 1.2,
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
    off: [8.4, 2.8, -2],
    sc: 1.2,
    uses: ["ChromaDB", "Vector Embeddings", "Semantic Search", "Docker", "PostgreSQL"],
    links: [{ label: "Paper · Wiley", url: "https://doi.org/10.1002/spe.70060" }],
    problem: "Preparing the university for accreditation took 25 days of manual work.",
    built:
      "An ML-powered ERP with 8+ modules for accreditation automation, analytics and networking, and a semantic-retrieval pipeline (vector embeddings, ChromaDB). I co-founded it and led the architecture, the frontend and adoption across stakeholders.",
    outcome:
      "Preparation went from 25 days to 7 (about 72% less). 1,200+ users across the university, a paper in Wiley's Software: Practice and Experience, and DTU funding for continued development.",
  },
];

/** [capability, lead tool, tools, position in the field] */
export const STACK: [string, string, string[], [number, number, number]][] = [
  ["AI & LLM Engineering", "LangGraph", ["Azure OpenAI (GPT-4.1)", "LangChain", "LangGraph", "MCP", "RAG", "Agent Orchestration"], [-4.4, 2.3, -1.2]],
  ["Machine Learning & Deep Learning", "PyTorch", ["PyTorch", "TensorFlow", "scikit-learn", "XGBoost", "LoRA / PEFT Fine-tuning", "SHAP Explainability", "Statistical Hypothesis Testing"], [0.6, 2.8, -2.8]],
  ["Retrieval & Search", "FAISS", ["FAISS", "ChromaDB", "Semantic Search", "Vector Embeddings", "BM25", "Cross-Encoder Reranking"], [4.8, 1.6, -0.6]],
  ["Data & Infrastructure", "Python", ["Python", "FastAPI", "Docker", "GCP Cloud Run", "PostgreSQL", "Redis", "Apache Airflow"], [-1.4, 0.2, 1.6]],
  ["Natural Language Processing", "Transformers", ["Hugging Face Transformers", "NL-to-SQL", "Text Generation", "Structured Output Generation", "Sequence Modelling", "Tokenisation"], [-5.2, -1.7, 0.4]],
  ["MLOps & Evaluation", "MLflow", ["MLflow", "DagsHub", "CI/CD Eval Gates", "Drift Monitoring (PSI/KS)", "Model Versioning"], [1.9, -1.3, 2.2]],
  ["Tools & Languages", "Claude Code", ["Git", "GitHub Actions", "Claude Code", "GitHub Copilot", "Pandas", "NumPy", "Streamlit"], [5.4, -2.3, 1.0]],
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
    n: "Started B.Tech at Delhi Technological University.",
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
    n: "AI software engineer on the AT&T account. Five agents, live in production.",
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
 * and dim. Add one by putting the file in public/photos and a line here: [src, crop x, y, w, h].
 */
export const LOOSE_PHOTOS: Photo[] = [];

export const JOURNEY = { kicker: "Journey · 2021 → now", title: "It started somewhere." };

export const NOW = {
  kicker: "Now · Amdocs",
  title: "Still building.",
  line: "Agentic AI for AT&T, LLM systems, research,\nand whatever problem seems worth solving next.",
};

export const CONTACT = { kicker: "One last thing.", title: "Let's talk." };

export const RESUME = "/resume/Divyansh_Bansal.pdf";

/** what the loading screen says, one line at a time, while the film loads or jumps */
export const LOADING_LINES = [
  "There's a lot going on back here.",
  "Building the build.",
  "Teaching the orb to behave.",
  "Initializing curiosity",
  "Summoning the good parts.",
  "A few variables are having a discussion.",
  "We're about to make a lot of dots mean something.",
  "The universe is currently compiling.",
  "A moment of computational patience.",
];
