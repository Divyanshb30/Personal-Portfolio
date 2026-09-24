// Everything the film says. Placeholders are marked; replace them here.

export const PROFILE = {
  name: "Divyansh Bansal",
  roles: "Engineer · Builder · Researcher",
  line: "I build intelligent systems, and keep exploring what comes next.",
  email: "divyanshb30@gmail.com",
  github: "https://github.com/Divyanshb30",
  linkedin: "https://www.linkedin.com/in/divyansh-bansal",
};

export const THINK = {
  title: "How he thinks",
  line: "Ask the right question, understand it deeply, iterate until it holds, then produce at volume.",
  steps: [
    { word: "Question", line: "Start with the right question." },
    { word: "Understand", line: "Understand it deeply." },
    { word: "Iterate", line: "Iterate until it holds." },
    { word: "Volume", line: "Then produce at volume." },
  ],
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
  href: string | null;
  // TODO(Divyansh): replace these three placeholders with the real write-ups
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
    line: "Retrieval over a codebase: FAISS, BM25 and cross-encoder reranking.",
    off: [-7.2, 1.2, 2.2],
    sc: 1.25,
    uses: ["Python", "FAISS", "BM25", "Cross-Encoder Reranking", "Hugging Face Transformers", "ChromaDB", "CI/CD Eval Gates"],
    href: "https://github.com/Divyanshb30/IntelliCode",
    problem: "",
    built: "",
    outcome: "",
  },
  {
    id: "gpt",
    title: "Decoder-Only Transformer",
    kind: "Models",
    metric: "10.7M parameters",
    line: "Attention, positional encoding and generation, built from scratch in PyTorch.",
    off: [-2.2, 3.4, -3],
    sc: 1.25,
    uses: ["PyTorch", "Python", "Tokenisation", "Sequence Modelling", "Text Generation"],
    href: "https://github.com/Divyanshb30/GPT-from-Scratch",
    problem: "",
    built: "",
    outcome: "",
  },
  {
    id: "loan",
    title: "Loan Risk Intelligence",
    kind: "Engineering",
    metric: "0.9184 test AUC",
    line: "A stacking ensemble over ~1.8M loans, SHAP-audited and drift-monitored.",
    off: [3.8, 0.8, 1.2],
    sc: 1.2,
    uses: ["XGBoost", "PyTorch", "SHAP Explainability", "MLflow", "DagsHub", "Drift Monitoring (PSI/KS)", "GCP Cloud Run", "Docker"],
    href: "https://github.com/Divyanshb30/Loan-Risk-Intelligence",
    problem: "",
    built: "",
    outcome: "",
  },
  {
    id: "dtu",
    title: "DTU ERP Platform",
    kind: "Product",
    metric: "1,200+ users",
    line: "A multiuser ERP for higher education: eight modules and semantic search.",
    off: [8.4, 2.8, -2],
    sc: 1.2,
    uses: ["ChromaDB", "Vector Embeddings", "Semantic Search", "Docker", "PostgreSQL"],
    href: null,
    problem: "",
    built: "",
    outcome: "",
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

export type Memory = {
  y: string;
  t: string;
  n: string;
  /** photo: [src, crop x, y, w, h]; null shows a "photo coming" plate */
  photo: [string, number, number, number, number] | null;
  cap: string;
  d: number;
  bank: number;
  h: number;
  win: [number, number];
  extra?: { photo: [string, number, number, number, number]; d: number; bank: number; h: number; w: number };
};

export const MEMORIES: Memory[] = [
  { y: "2021", t: "DTU", n: "Began B.Tech in Electronics & Communication at Delhi Technological University.", photo: ["/photos/dtu.jpg", 0, 0, 1206, 660], cap: "DTU · 2021", d: 60, bank: 3.4, h: 1.4, win: [0.18, 0.285] },
  { y: "2022", t: "First builds", n: "Started shipping real systems. Led the architecture and the frontend.", photo: ["/photos/builds.jpg", 0, 180, 960, 720], cap: "First builds · 2022", d: 100, bank: -3.6, h: 0.4, win: [0.365, 0.45] },
  { y: "2024", t: "The ERP", n: "We set out to turn 25 days of accreditation paperwork into 7.", photo: ["/photos/team.jpg", 0, 380, 960, 620], cap: "", d: 128, bank: 3.0, h: 2.4, win: [0.5, 0.605] },
  {
    y: "2025",
    t: "1,200+ users",
    n: "Live across the university. The method was published in Wiley, and DTU funded its next phase.",
    photo: ["/photos/stakeholders.jpg", 120, 110, 1040, 360],
    cap: "",
    d: 165,
    bank: -3.4,
    h: 0.7,
    win: [0.655, 0.765],
    extra: { photo: ["/photos/report.jpg", 0, 180, 1280, 900], d: 171, bank: 2.6, h: 1.6, w: 2.0 },
  },
  { y: "2025", t: "Amdocs · AT&T", n: "AI engineer, building for AT&T.", photo: ["/photos/amdocs.jpg", 0, 60, 1280, 840], cap: "", d: 200, bank: 3.0, h: 1.3, win: [0.8, 0.9] },
];

export const HORIZON = {
  kicker: "Now",
  title: "Every road so far\nbends toward this light.",
  line: "Today it rises at Amdocs, where he builds agentic AI\nthat earns its trust in production, for AT&T.",
};

export const RESUMES = [
  { code: "India", file: "/resume/Divyansh_Bansal.pdf" },
  { code: "UAE", file: "/resume/Divyansh_Bansal_UAE.pdf" },
  { code: "UK", file: "/resume/Divyansh_Bansal_UK.pdf" },
  { code: "Europe", file: "/resume/Divyansh_Bansal_EU.pdf" },
];
