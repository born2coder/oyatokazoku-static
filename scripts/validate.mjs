import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'index.html') htmlFiles.push(file);
  }
}
walk(root);

const errors = [];
let internalLinks = 0;
const titles = new Set();
const canonicals = new Set();
function targetFor(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\//, '');
  return clean ? path.join(root, clean, path.extname(clean) ? '' : 'index.html') : path.join(root, 'index.html');
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const route = file === path.join(root, 'index.html') ? '/' : `/${path.relative(root, path.dirname(file)).replaceAll(path.sep, '/')}/`;
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  if (!title || titles.has(title)) errors.push(`${route}: missing or duplicate title`); else titles.add(title);
  if (!canonical || canonicals.has(canonical)) errors.push(`${route}: missing or duplicate canonical`); else canonicals.add(canonical);
  if ((html.match(/<h1\b/gi) || []).length !== 1) errors.push(`${route}: h1 count is not 1`);
  if (!html.includes('name="description"')) errors.push(`${route}: missing description`);
  if (!html.includes('application/ld+json')) errors.push(`${route}: missing JSON-LD`);
  for (const match of html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["']/gi)) {
    const href = match[1].trim();
    if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;
    const url = new URL(href, `https://oyatokazoku.com${route}`);
    if (url.origin !== 'https://oyatokazoku.com') continue;
    internalLinks += 1;
    const target = targetFor(url.pathname);
    if (!fs.existsSync(target)) errors.push(`${route}: missing ${url.pathname}`);
    else if (url.hash) {
      const targetHtml = fs.readFileSync(target, 'utf8');
      const anchor = decodeURIComponent(url.hash.slice(1));
      if (!targetHtml.includes(`id="${anchor}"`) && !targetHtml.includes(`id='${anchor}'`)) errors.push(`${route}: missing anchor ${href}`);
    }
  }
}

for (const required of ['sitemap.xml', 'robots.txt', '_headers', '_redirects', '404.html', 'favicon.svg']) {
  if (!fs.existsSync(path.join(root, required))) errors.push(`missing ${required}`);
}
const actions = JSON.parse(fs.readFileSync('content/actions.json', 'utf8'));
if (Object.keys(actions).length !== 75) errors.push('Expected practical actions for all 75 guides');
for (const [id, steps] of Object.entries(actions)) {
  if (steps.length !== 3 || steps.some(x => !x.trim())) errors.push(`Incomplete action for ${id}`);
}
const models = ['comparison','chapter-5','chapter-6'].map(x => fs.readFileSync(path.join(root,'family-home',x,'index.html'),'utf8').match(/<section><h2>共通の試算[^]*?<\/section>/)?.[0]);
if (!models[0] || models.some(x=>x!==models[0])) errors.push('Inconsistent family-home models');
if (fs.readFileSync(path.join(root,'care/chapter-5/index.html'),'utf8').includes('同じ親で比べる月額モデル')) errors.push('Mixed-scope care comparison remains');
console.log(JSON.stringify({ pages: htmlFiles.length, internalLinks, errors: errors.length }, null, 2));
if (errors.length) {
  console.error(errors.slice(0, 100).join('\n'));
  process.exitCode = 1;
}
