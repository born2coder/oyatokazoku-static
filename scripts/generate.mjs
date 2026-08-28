import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pages = JSON.parse(fs.readFileSync(path.join(root, 'content', 'pages.json'), 'utf8'));
const output = path.join(root, 'dist');
const origin = 'https://oyatokazoku.com';
const siteName = '親のこと、家族のこと。';

const byId = new Map(pages.map((page) => [Number(page.ID), page]));

function pagePath(page) {
  if (Number(page.ID) === 8 || page.post_name === 'home') return '/';
  const segments = [page.post_name];
  let parent = byId.get(Number(page.post_parent));
  const seen = new Set([Number(page.ID)]);
  while (parent && !seen.has(Number(parent.ID))) {
    seen.add(Number(parent.ID));
    segments.unshift(parent.post_name);
    parent = byId.get(Number(parent.post_parent));
  }
  return `/${segments.filter(Boolean).join('/')}/`;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function cleanContent(value) {
  return value
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '')
    .replaceAll('http://www.oyatokazoku.com', '')
    .replaceAll('https://www.oyatokazoku.com', '')
    .replaceAll('http://oyatokazoku.com', '')
    .replaceAll('https://oyatokazoku.com', '')
    .trim();
}

function plainText(value) {
  return value.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"').replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ').trim();
}

function description(page, content) {
  if (pagePath(page) === '/') {
    return '親の入院、介護、葬儀、相続、遺品整理、実家じまい。家族が困ったときに、次に確認することを順番に整理した実用ガイドです。';
  }
  const text = plainText(content);
  return text.length > 150 ? `${text.slice(0, 149).replace(/[、。\s]+$/u, '')}…` : text;
}

function documentFor(page) {
  const route = pagePath(page);
  const content = cleanContent(page.post_content);
  const home = route === '/';
  const title = home ? `${siteName}｜家族が困った瞬間に、次の一歩を` : `${page.post_title}｜${siteName}`;
  const desc = description(page, content);
  const canonical = `${origin}${route}`;
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': home ? 'WebSite' : 'WebPage',
    name: title,
    url: canonical,
    description: desc,
    inLanguage: 'ja',
    ...(home ? {} : { dateModified: `${page.post_modified.replace(' ', 'T')}+09:00`, isPartOf: { '@type': 'WebSite', name: siteName, url: `${origin}/` } }),
  }).replaceAll('<', '\\u003c');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${home ? 'website' : 'article'}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <script type="application/ld+json">${schema}</script>
</head>
<body><main id="main">${content}</main></body>
</html>\n`;
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, 'static', 'site.css'), path.join(output, 'assets', 'site.css'));
fs.copyFileSync(path.join(root, 'static', 'favicon.svg'), path.join(output, 'favicon.svg'));

const manifest = [];
for (const page of pages) {
  const route = pagePath(page);
  const relative = route === '/' ? '' : route.slice(1, -1);
  const directory = path.join(output, relative);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), documentFor(page));
  manifest.push({ id: Number(page.ID), path: route, title: page.post_title, modified: page.post_modified });
}

const sitemap = manifest.map((page) => `  <url><loc>${origin}${page.path}</loc><lastmod>${page.modified.slice(0, 10)}</lastmod></url>`).join('\n');
fs.writeFileSync(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`);
fs.writeFileSync(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
fs.writeFileSync(path.join(output, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
fs.writeFileSync(path.join(output, '_redirects'), `/index.php / 301\n/home/ / 301\n/wp-admin/* / 404\n/wp-login.php / 404\n/2026/08/04/hello-world/feed/ / 410\n`);
fs.writeFileSync(path.join(output, '404.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ページが見つかりません｜${siteName}</title><link rel="stylesheet" href="/assets/site.css"></head><body><main class="not-found"><p class="code">404</p><h1>ページが見つかりません</h1><p>URLが変わったか、ページが存在しない可能性があります。</p><a href="/">サイトTOPへ戻る</a></main></body></html>`);
fs.writeFileSync(path.join(root, 'page-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${manifest.length} pages.`);
