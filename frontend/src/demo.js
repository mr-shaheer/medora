// DEMO DATA. Shapes mirror the Python pipeline (evidence_pool chunks, router decision, verifier result).
// Replace with a real response from your API; see src/api.js.
export const DEMO = {
  demo: true,
  route: { sources: ['pubmed', 'clinicaltrials'], confidence: 0.85 },
  counts: { retrieved: 14, unique: 11, retracted: 0, selected: 4 },
  verification: { status: 'SUFFICIENT', missing: '' },
  answer: [
    'GLP-1 receptor agonists lower HbA1c and body weight in adults with type 2 diabetes. Meta-analytic evidence shows consistent reductions across the drug class [PMID:38000001], and a large randomized trial reports fewer major cardiovascular events with once-weekly dosing [PMID:38000002].',
    'Gastrointestinal effects such as nausea are the most commonly reported adverse events and usually fade with dose titration [PMID:38000001]. Several newer trials are still recruiting, so long-term comparative data remain limited [NCT:05000003].',
  ],
  evidence: [
    { id: 'PMID:38000001', refs: ['PMID:38000001'], source: 'pubmed', type: 'meta-analysis', title: 'GLP-1 receptor agonists and glycaemic control in type 2 diabetes: a systematic review and meta-analysis', date: '2024-03', excerpt: 'Across pooled randomized trials, GLP-1 receptor agonists produced clinically meaningful reductions in HbA1c versus placebo and active comparators, with modest weight loss. Nausea was the most frequent adverse event.' },
    { id: 'PMID:38000002', refs: ['PMID:38000002'], source: 'pubmed', type: 'rct', title: 'Once-weekly GLP-1 receptor agonist and cardiovascular outcomes: a randomized controlled trial', date: '2023-11', excerpt: 'In a double-blind randomized controlled trial, the treatment group had fewer major adverse cardiovascular events than placebo over the follow-up period.' },
    { id: 'NCT:05000003', refs: ['NCT:05000003'], source: 'clinicaltrials', type: 'unspecified', status: 'RECRUITING', title: 'Long-term comparison of incretin-based therapies in type 2 diabetes', date: '2025-01', excerpt: 'Status: RECRUITING. Phase 3 study comparing weekly incretin-based therapies on glycaemic and cardiovascular endpoints over 104 weeks.' },
    { id: 'PMID:38000004', refs: ['PMID:38000004'], source: 'pubmed', type: 'cohort', title: 'Real-world adherence and gastrointestinal tolerability of GLP-1 therapy', date: '2022-08', excerpt: 'In this cohort study, gastrointestinal symptoms were most common during the first weeks of therapy and decreased with gradual dose escalation.' },
  ],
};
