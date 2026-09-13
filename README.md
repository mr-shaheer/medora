<div align="center">

# 🩺 Medora

**An autonomous, agentic evidence-synthesis engine for medical research.**

Medora routes a clinical question to the right biomedical data source, retrieves and ranks the evidence, reasons over it with an LLM, and then verifies its own answer against that evidence before it ever reaches you.

[![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#-license)
[![Status: Research Preview](https://img.shields.io/badge/status-research%20preview-orange.svg)](#-disclaimer)
[![Built with OpenAI Agents SDK](https://img.shields.io/badge/built%20with-openai--agents--sdk-black.svg)](https://github.com/openai/openai-agents-python)

[Overview](#-overview) • [How It Works](#-how-it-works) • [Getting Started](#-getting-started) • [Usage](#-usage) • [Architecture](#-project-structure) • [Configuration](#-configuration) • [Disclaimer](#-disclaimer)

</div>

---

## 📖 Overview

Medora is a command-line research assistant built for **doctors, medical students, healthcare professionals, and researchers** who need to synthesize clinical evidence quickly — without sacrificing traceability.

Instead of asking a single LLM to "know" the answer, Medora treats every question as a small research pipeline:

1. **Understand** what kind of question is being asked (literature? trials? drug safety?).
2. **Retrieve** primary-source documents from live medical MCP servers.
3. **Rank** that evidence by relevance and study design.
4. **Reason** over only the retrieved evidence — never the model's parametric memory.
5. **Verify** the draft answer against that same evidence and strip out anything unsupported.

Every claim in a Medora answer is expected to carry an inline citation (`[PMID:xxxxx]` or `[DOI:xxxxx]`) back to a real, retrieved source.

<br>

<details>
<summary><strong>💡 Why not just ask an LLM directly?</strong></summary>
<br>

General-purpose LLMs are prone to hallucinating citations and blending outdated training data with current guidance. Medora constrains the model at two points instead of one:

- The **Evidence Reasoner** is instructed to use *only* the supplied evidence chunks and to cite every claim.
- The **Grounding Verifier** independently re-checks the draft against the same evidence and removes or corrects anything unsupported — including fabricated PMIDs/DOIs.

This "generate, then verify" pattern trades a bit of latency for a much stronger grounding guarantee.

</details>

<details>
<summary><strong>🗂️ What sources does it query?</strong></summary>
<br>

Medora connects to biomedical data over the **Model Context Protocol (MCP)**:

| Source | Covers |
|---|---|
| **PubMed** | Peer-reviewed biomedical literature, systematic reviews, meta-analyses |
| **ClinicalTrials.gov** | Trial protocols, recruitment/enrollment status, study design |
| **OpenFDA** | Drug approvals, labels, adverse events, recalls, contraindications |

</details>

---

## ⚙️ How It Works

Every question runs through a six-step pipeline (see [`app/pipeline.py`](app/pipeline.py)):

```mermaid
flowchart TD
    Q["🧑 User question"] --> R["1. Router\nkeyword + LLM fallback"]
    R -->|selects source(s)| M["MCP Retriever Agent"]
    M -->|PubMed / ClinicalTrials / OpenFDA| D["Raw documents"]
    D --> P["2. Evidence Pool\ndedupe · clean · classify · chunk"]
    P --> V["3. Vector Store (Neon + pgvector)\nembed · hybrid search · RRF fuse"]
    V --> RR["Rerank\nby study-type priority"]
    RR --> ER["4. Evidence Reasoner\ncites [PMID]/[DOI]"]
    ER --> GV["5. Grounding Verifier\nstrips unsupported claims"]
    GV --> A["✅ Final, cited answer"]

    style Q fill:#1f6feb,color:#fff
    style A fill:#2ea043,color:#fff
```

### The pipeline, stage by stage

| Stage | Module | What it does |
|---|---|---|
| **1. Routing** | [`router/main_router.py`](app/router/main_router.py) | A fast keyword-based router scores the question against PubMed / ClinicalTrials / OpenFDA vocabularies. If it isn't confident (`< 0.80`), an LLM router ([`router/llm_router.py`](app/router/llm_router.py)) makes the call instead. |
| **2. Retrieval** | [`pipeline.py`](app/pipeline.py) → `plan_and_retrieve` | An `Agent` connects to the chosen MCP server(s) and pulls raw documents — never summarizing, never inventing results. |
| **3. Evidence Pool** | [`retrieval/evidence_pool.py`](app/retrieval/evidence_pool.py) | Deduplicates by PMID/DOI/study ID, strips retracted papers, classifies study design (RCT, cohort, meta-analysis, etc.), and chunks text for embedding. |
| **4. Vector Store** | [`retrieval/vector_store.py`](app/retrieval/vector_store.py) | Chunks are embedded (Gemini embeddings) and cached in **Neon Postgres + pgvector**. Retrieval is **hybrid**: semantic similarity (pgvector) fused with full-text search (`tsvector`) via Reciprocal Rank Fusion. |
| **5. Rerank** | [`retrieval/rerank.py`](app/retrieval/rerank.py) | Fused candidates are reordered by study-type priority (e.g. meta-analyses before case reports) before being trimmed to the top-k. |
| **6. Reasoning + Verification** | [`agents/evidence_reasoner.py`](app/agents/evidence_reasoner.py), [`agents/verifier.py`](app/agents/verifier.py) | One agent drafts a cited answer from the evidence; a second, independent agent checks that draft against the same evidence and removes anything unsupported. |

<details>
<summary><strong>🧹 How the evidence cache stays bounded</strong></summary>
<br>

The vector store is a **cache, not an archive** — PubMed/MCP sources remain the source of truth. `cli.py` runs a maintenance pass on startup and every 24 hours that:

- **Purges retracted papers** outright (`purge_retracted`)
- **Expires stale chunks** unused for `EVIDENCE_TTL_DAYS` (default: 60 days)
- **Enforces a row cap** (`EVIDENCE_MAX_ROWS`, default: 50,000) via LRU eviction

This keeps the Postgres table self-healing without an external cron job.

</details>

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.12+**
- A **Gemini API key** (used for both the LLM agents and embeddings)
- A **Neon Postgres** database with the `pgvector` extension available

### Installation

<details open>
<summary><strong>Using <code>uv</code> (recommended — this project ships a <code>uv.lock</code>)</strong></summary>

```bash
git clone <your-fork-or-repo-url>
cd medora
uv sync
```
</details>

<details>
<summary><strong>Using <code>pip</code></strong></summary>

```bash
git clone <your-fork-or-repo-url>
cd medora
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
</details>

### Configuration

Create a `.env` file in the project root:

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key
NEON_DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Optional (sensible defaults shown)
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=1536
EVIDENCE_MAX_ROWS=50000
EVIDENCE_TTL_DAYS=60
```

> On first run, Medora creates the `evidence_chunks` table and its indexes (HNSW for vector search, GIN for full-text) automatically — no manual migration needed.

---

## 🧑‍💻 Usage

Launch the interactive research CLI:

```bash
uv run cli.py
# or, with pip/venv:
python cli.py
```

```text
You: What does recent evidence say about SGLT2 inhibitors in heart failure with preserved ejection fraction?

>>> STEP 1: BioMCP Retriever
>>> MCP ROUTER: pubmed (confidence=0.85)
>>> STEP 2: Evidence Pool
>>> STEP 3: Vector Search
>>> STEP 4: Evidence Reasoner
>>> STEP 5: Grounding Verifier
>>> STEP 6: Done

Researcher: Recent RCT evidence supports a benefit of SGLT2 inhibitors in HFpEF,
reducing the composite of cardiovascular death or heart failure hospitalization
[PMID:xxxxxxx] ...
```

**In-session commands:**

| Command | Effect |
|---|---|
| `/reset` | Clears the current session |
| `/quit` or `/exit` | Ends the session |

---

## 🗺️ Project Structure

```text
medora/
├── cli.py                        # Interactive entry point + cache maintenance loop
├── pyproject.toml / uv.lock      # Project metadata & locked dependencies
├── requirements.txt              # pip-compatible dependency list
└── app/
    ├── model.py                  # LLM + embedding client config (Gemini via OpenAI-compatible API)
    ├── pipeline.py                # Orchestrates the full 6-step research pipeline
    ├── router/
    │   ├── keyword_router.py     # Fast, rule-based source scoring
    │   ├── llm_router.py         # LLM fallback router (structured output)
    │   ├── main_router.py        # Combines keyword + LLM routing by confidence
    │   └── metadata.py           # MCP source descriptions
    ├── mcp/
    │   └── mcp_client.py         # MCP server connections (PubMed, ClinicalTrials, OpenFDA)
    ├── retrieval/
    │   ├── evidence_pool.py      # Dedup, cleaning, study-type classification, chunking
    │   ├── vector_store.py       # Neon/pgvector storage, hybrid search, cache maintenance
    │   └── rerank.py             # Study-type-aware reranking
    └── agents/
        ├── evidence_reasoner.py  # Drafts a cited answer from evidence only
        └── verifier.py           # Grounds/corrects the draft against the evidence
```

---

## 🧩 Configuration Reference

<details>
<summary><strong>Full environment variable reference</strong></summary>
<br>

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | API key for the Gemini models used for reasoning, routing, and embeddings |
| `NEON_DATABASE_URL` | — | Postgres connection string (Neon or any Postgres with `pgvector`) |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model used for the evidence cache |
| `EMBEDDING_DIM` | `1536` | Embedding vector dimensionality |
| `EVIDENCE_MAX_ROWS` | `50000` | Row cap for the evidence cache before LRU eviction kicks in |
| `EVIDENCE_TTL_DAYS` | `60` | Days a chunk can go unused before it's expired |

</details>

<details>
<summary><strong>Routing thresholds</strong></summary>
<br>

- The keyword router scores each source on **strong** (+5) and **weak** (+1) term matches.
- If the top score's confidence is **≥ 0.80**, that decision is used directly.
- Otherwise, control falls back to the **LLM router**, which picks a single best source with its own confidence score.

</details>

## ⚠️ Disclaimer

Medora is a **research and information-retrieval tool**, not a diagnostic or treatment-decision system. It is intended to support literature review and evidence discovery for qualified professionals and researchers — it does **not** provide medical advice, and its output should always be independently verified against primary sources before being used in any clinical decision.

---

## 🤝 Contributing

Issues and pull requests are welcome. Please open an issue to discuss significant changes before submitting a PR.

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.