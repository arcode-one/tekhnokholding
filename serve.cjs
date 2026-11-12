// Optional local HTTP server. Reads the site files as-is, without dependencies or a build.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const port = Number(
  process.argv.find((arg) => arg.startsWith('--port='))?.slice(7) || process.env.PORT || 5173,
);
const publicDirectories = new Set([
  'css',
  'js',
  'fonts',
  'icons',
  'images',
  'data',
  'docs',
  'objects',
]);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const server = http.createServer(async (request, response) => {
  let url, pathname;
  try {
    url = new URL(request.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }
  if (pathname.startsWith('/hero-test/')) {
    response.writeHead(308, { Location: pathname.slice('/hero-test'.length) + url.search });
    response.end();
    return;
  }
  if (pathname.startsWith('/img/')) {
    const folder = pathname.toLowerCase().endsWith('.svg') ? '/icons/' : '/images/';
    response.writeHead(308, { Location: folder + pathname.slice('/img/'.length) + url.search });
    response.end();
    return;
  }
  if (pathname === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const relative = pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  const contained = path.relative(root, file);
  const topLevel = !relative.includes('/') &&
    (relative.endsWith('.html') || relative === 'robots.txt' || relative === 'sitemap.xml');
  if (
    contained.startsWith('..') ||
    path.isAbsolute(contained) ||
    (!topLevel && !publicDirectories.has(relative.split('/')[0]))
  ) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  try {
    const bytes = await fs.readFile(file);
    const headers = {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes',
      'Content-Length': bytes.length,
    };
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, bytes.length - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
      if (start > end || start >= bytes.length) {
        response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` });
        response.end();
        return;
      }
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 });
      response.end(request.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
      return;
    }
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    if (request.headers.accept?.includes('text/html')) {
      const notFound = await fs.readFile(path.join(root, '404.html'));
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : notFound);
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}`));
