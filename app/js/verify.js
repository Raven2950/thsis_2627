// Check that something the AI named actually exists, using public catalogues that allow
// browser requests. Returns { status: 'verified' | 'not_found' | 'unverifiable' | 'unavailable', ... }.

const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const mainTitle = s => norm(String(s || '').split(/[:：]/)[0]);
const surname = s => norm(String(s || '').split(/[,;&]| and /)[0]).split(' ').filter(Boolean).at(-1) || '';
const getJ = url => fetch(url, { signal: AbortSignal.timeout(10000) }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

export async function verifyBook({ title, creator }) {
  const t = mainTitle(title), last = surname(creator);
  if (!t) return { status: 'not_found' };
  const q = `title=${encodeURIComponent(String(title).split(/[:：]/)[0])}${last ? `&author=${encodeURIComponent(last)}` : ''}`;
  const d = await getJ(`https://openlibrary.org/search.json?${q}&limit=8&fields=key,title,author_name,first_publish_year,isbn`).catch(() => null);
  if (!d) return { status: 'unavailable', by: 'Open Library' };
  const hit = (d.docs || []).find(b => mainTitle(b.title) === t && (!last || (b.author_name || []).some(a => surname(a) === last)));
  if (!hit) return { status: 'not_found', by: 'Open Library' };
  return {
    status: 'verified', by: 'Open Library',
    fields: { title: hit.title, creator: (hit.author_name || []).join(', '), year: hit.first_publish_year ?? null, url: `https://openlibrary.org${hit.key}` },
  };
}

export async function verifyPaper({ title, creator }) {
  const t = norm(title);
  if (!t) return { status: 'not_found' };
  const d = await getJ(`https://api.crossref.org/works?rows=5&select=DOI,title,author,issued,container-title&query.bibliographic=${encodeURIComponent(`${title} ${creator || ''}`)}`).catch(() => null);
  if (!d) return { status: 'unavailable', by: 'Crossref' };
  const hit = (d.message?.items || []).find(w => {
    const wt = norm(w.title?.[0]);
    return wt && (wt === t || (wt.length > 20 && (wt.startsWith(t) || t.startsWith(wt))));
  });
  if (!hit) return { status: 'not_found', by: 'Crossref' };
  const authors = (hit.author || []).map(a => [a.given, a.family].filter(Boolean).join(' ')).slice(0, 4).join(', ');
  return {
    status: 'verified', by: 'Crossref',
    fields: { title: hit.title[0], creator: authors || null, year: hit.issued?.['date-parts']?.[0]?.[0] ?? null, url: `https://doi.org/${hit.DOI}` },
    extra: { journal: hit['container-title']?.[0] },
  };
}

// Books via Open Library, papers via Crossref. Reports, organisations, apps, exhibitions… have no
// catalogue we can query from the browser, so they stay "unverifiable" and say so.
export async function verify(entry) {
  const type = entry.type || '';
  if (type === '书') return verifyBook(entry);
  if (type === '论文') {
    const paper = await verifyPaper(entry);
    if (paper.status === 'verified') return paper;
    const book = await verifyBook(entry);
    return book.status === 'verified' ? book : paper;
  }
  return { status: 'unverifiable' };
}

export const VERIFY_LABEL = {
  verified: '已核对', not_found: '查不到', unverifiable: '无法自动核对', unavailable: '核对服务没响应',
};
