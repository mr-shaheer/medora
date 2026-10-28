import { Icon, SOURCES } from './ui.jsx';
const TYPES = { 'meta-analysis': 'Meta-analysis', rct: 'Randomized trial', cohort: 'Cohort study', 'case-report': 'Case report', 'case-control': 'Case-control study', review: 'Review', unspecified: 'Study' };

function getOfficialUrl(item) {
  if (typeof item.url === 'string') {
    try {
      const parsed = new URL(item.url);
      const host = parsed.hostname.toLowerCase();

      const allowed =
        host === 'pubmed.ncbi.nlm.nih.gov' ||
        host === 'clinicaltrials.gov' ||
        host === 'pmc.ncbi.nlm.nih.gov' ||
        host === 'doi.org' ||
        host === 'fda.gov' ||
        host.endsWith('.fda.gov');

      if (parsed.protocol === 'https:' && allowed) {
        return parsed.href;
      }
    } catch {
      // Try recovering the link from an identifier.
    }
  }

  const refs = [item.id, ...(item.refs || [])];

  for (const ref of refs) {
    const value = String(ref || '').trim();

    const pmid = value.match(/^(?:PMID:)?(\d+)$/i);
    if (pmid) {
      return `https://pubmed.ncbi.nlm.nih.gov/${pmid[1]}/`;
    }

    const nct = value.match(/^(?:NCT:)?(NCT\d{8})$/i);
    if (nct) {
      return `https://clinicaltrials.gov/study/${nct[1].toUpperCase()}`;
    }

    const doi = value.match(/^(?:DOI:)?(10\.\d{4,9}\/\S+)$/i);
    if (doi) {
      return `https://doi.org/${doi[1]}`;
    }
  }

  return null;
}


export default function Evidence({ item, open, active, onToggle }) {
  const officialUrl = getOfficialUrl(item);
  return (
    <article id={`ev-${item.id}`} className={`ev ${active ? 'active' : ''}`}>
      <header>
        <span className={`src src-${item.source}`}>{SOURCES[item.source] ?? item.source}</span>
        <span className="pill">{TYPES[item.type] ?? item.type}</span>
        {item.status && <span className="pill live">{item.status.toLowerCase().replaceAll('_', ' ')}</span>}
        
      </header>
      <h4>{item.title}</h4>
      
      <p className="meta">
        {[item.id, item.date].filter(Boolean).join(' · ')}
        {officialUrl && (
          <>
            {' · '}
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View official source for ${item.title}`}
            >
              View official source <Icon name="link" size={13} />
            </a>
          </>
        )}
      </p>

      <button className="expand" onClick={onToggle} aria-expanded={open}>
        {open ? 'Hide supporting passage' : 'Show supporting passage'} <span className={open ? 'rot' : ''}><Icon name="chevron" size={16} /></span>
      </button>
      {open && <blockquote className="passage"><small>Passage used by Medora (retrieved from the source)</small>{item.excerpt}</blockquote>}
    </article>
  );
}
