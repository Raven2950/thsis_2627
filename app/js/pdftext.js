// Read a PDF's text and metadata in the browser (pdf.js). Nothing is uploaded anywhere.
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';
let lib = null;

async function load() {
  if (!lib) {
    lib = await import(PDFJS);
    lib.GlobalWorkerOptions.workerSrc = PDFJS.replace('pdf.min.mjs', 'pdf.worker.min.mjs');
  }
  return lib;
}

// Word-processor leftovers like "Microsoft Word - draft.docx" are not titles.
const usable = s => typeof s === 'string' && s.trim().length > 3 && !/\.(docx?|pdf|indd|tex)$|^microsoft|^untitled|^document\d*$/i.test(s.trim());

export async function readPdf(blob, maxPages = 4) {
  const pdfjs = await load();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const meta = await pdf.getMetadata().catch(() => null);
  let text = '';
  for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    text += content.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n\n';
  }
  return {
    pages: pdf.numPages,
    text: text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
    title: usable(meta?.info?.Title) ? meta.info.Title.trim() : null,
    author: usable(meta?.info?.Author) ? meta.info.Author.trim() : null,
  };
}
