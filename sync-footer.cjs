// Copy the homepage footer into the static HTML pages before publishing.
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const home = path.join(root, 'index.html');
const start = '    <!-- FOOTER:START -->';
const end = '    <!-- FOOTER:END -->';
const markedFooter = /    <!-- FOOTER:START -->[\s\S]*?    <!-- FOOTER:END -->/;
const existingFooter = /^    <footer\b(?=[^>]*\bclass="site-footer")[\s\S]*?<\/footer>/m;
const canonical = fs.readFileSync(home, 'utf8').match(markedFooter)?.[0];
if (!canonical || !existingFooter.test(canonical)) {
  throw new Error('The homepage footer must be between FOOTER:START and FOOTER:END.');
}

function footerFor(file, newline) {
  const prefix = path.relative(path.dirname(file), root).split(path.sep).filter(Boolean).join('/');
  const base = prefix ? `${prefix}/` : '';
  const localUrl = (url) => {
    if (!url || /^[a-z][\w+.-]*:|^\//i.test(url) || url === '#' || url === '#contacts') return url;
    return url.startsWith('#') ? `${base}index.html${url}` : `${base}${url}`;
  };
  const block = file === home ? canonical : canonical.replace(
    /\b(href|src|srcset)=(["'])([\s\S]*?)\2/g,
    (_, attribute, quote, value) => {
      const resolved = attribute === 'srcset'
        ? value.replace(/[^\s,]+(?=\s+\d+(?:\.\d+)?[wx]\b)/g, localUrl)
        : localUrl(value);
      return `${attribute}=${quote}${resolved}${quote}`;
    },
  );
  return block.replace(/\r?\n/g, newline);
}

const pages = [
  ...fs.readdirSync(root, { withFileTypes: true }),
  ...fs.readdirSync(path.join(root, 'objects'), { withFileTypes: true, recursive: true }),
].filter((entry) => entry.isFile() && entry.name.endsWith('.html') && entry.name !== '404.html');
const check = process.argv.includes('--check');
let count = 0;
const outdated = [];

for (const entry of pages) {
  const file = path.join(entry.parentPath, entry.name);
  const html = fs.readFileSync(file, 'utf8');
  // Redirect-only documents do not have a main content section.
  if (!html.includes('</main>')) continue;
  const newline = html.includes('\r\n') ? '\r\n' : '\n';
  if (html.includes(start) !== html.includes(end)) {
    throw new Error(`Incomplete footer markers in ${path.relative(root, file)}`);
  }
  const replace = markedFooter.test(html) ? markedFooter : existingFooter;
  const showFooter = !/<body\b[^>]*\bdata-site-footer="off"/.test(html);
  let updated;
  if (showFooter) {
    count++;
    const footer = footerFor(file, newline);
    updated = replace.test(html)
      ? html.replace(replace, () => footer)
      : html.replace('</main>', `</main>${newline}${footer}`);
  } else {
    const current = html.match(replace)?.[0];
    updated = current ? html.replace(current + newline, '') : html;
  }
  if (updated === html) continue;
  outdated.push({ file, html: updated });
}

if (check && outdated.length) {
  console.error('Run node sync-footer.cjs to update:', outdated.map(({ file }) => path.relative(root, file)).join(', '));
  process.exitCode = 1;
} else {
  for (const { file, html } of outdated) fs.writeFileSync(file, html);
  console.log(`Footer: ${count} pages, ${outdated.length} updated.`);
}
