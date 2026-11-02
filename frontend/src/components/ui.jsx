const P = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 5 5 9-10" />,
  link: <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  trash: <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7 7.5 20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1L17.5 7" /><path d="M10 11v6M14 11v6" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9m-4 4 3 3" /></>,
  logout: <><path d="M9 4H5v16h4" /><path d="m16 8 4 4-4 4M20 12H9" /></>,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-3.42" /><path d="M9.36 5.08A10.07 10.07 0 0 1 12 5c7 0 10 7 10 7a18.45 18.45 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 0 1-2.83-2.83" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />,
};
export const Icon = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>
);
export const Logo = () => (
  <span className="logo">
    <svg width="45" height="34" viewBox="0 0 20 36" aria-hidden="true"><path d="M13 3h8v10h10v8H21v10h-8V21H3v-8h10V3Z" fill="none" stroke="var(--cyan)" strokeWidth="3.2" strokeLinejoin="round" /></svg>
    MEDORA
  </span>
);
export const SOURCES = { pubmed: 'PubMed', clinicaltrials: 'ClinicalTrials', fda: 'FDA' };
