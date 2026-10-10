import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname, join, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const siteRoot = resolve('develop-with-raman');
const repoRoot = process.cwd();
const errors = [];
const htmlFiles = [];
const jsFiles = [];
const cssFiles = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git') continue;
      await walk(fullPath);
      continue;
    }
    if (entry.isFile()) {
      if (extname(entry.name).toLowerCase() === '.html') htmlFiles.push(fullPath);
      if (extname(entry.name).toLowerCase() === '.js') jsFiles.push(fullPath);
      if (extname(entry.name).toLowerCase() === '.css') cssFiles.push(fullPath);
    }
  }
}

function localPathFromUrl(raw, sourceFile = join(siteRoot, 'index.html')) {
  const value = raw.trim();
  if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(value)) return null;
  let pathname;
  try {
    const sourceUrl = 'https://site-check.invalid/' + relative(siteRoot, sourceFile).split(sep).join('/');
    pathname = new URL(value, sourceUrl).pathname;
  } catch {
    return null;
  }
  if (!pathname || pathname === '/') return join(siteRoot, 'index.html');
  return resolve(siteRoot, '.' + decodeURIComponent(pathname.startsWith('/') ? pathname : '/' + pathname));
}

async function exists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

if (!(await exists(join(siteRoot, 'index.html')))) {
  errors.push('Missing homepage: develop-with-raman/index.html');
} else if ((await readFile(join(siteRoot, 'index.html'), 'utf8')).trim().length === 0) {
  errors.push('Homepage is empty: develop-with-raman/index.html');
}

await walk(siteRoot);

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  // Ignore script/style bodies: they may contain JavaScript template strings, not DOM markup.
  const staticHtml = html
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/gi, '$1$2')
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style\s*>)/gi, '$1$2');
  const seen = new Set();
  for (const match of staticHtml.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = match[1];
    if (seen.has(id)) errors.push(`Duplicate id "${id}" in ${relative(repoRoot, file)}`);
    seen.add(id);
  }

  for (const match of staticHtml.matchAll(/\b(src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const attribute = match[1].toLowerCase();
    const raw = match[2];
    const target = localPathFromUrl(raw, file);
    if (!target) continue;
    const pathname = raw.split(/[?#]/, 1)[0];
    const isAsset = attribute === 'src' || /\.(?:html|css|js|mjs|json|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|pdf)$/i.test(pathname);
    if (!isAsset) continue;
    if (!target.startsWith(siteRoot + sep) && target !== join(siteRoot, 'index.html')) {
      errors.push(`Local reference escapes site root: ${raw} in ${relative(repoRoot, file)}`);
    } else if (!(await exists(target))) {
      errors.push(`Missing local ${attribute} target "${raw}" referenced by ${relative(repoRoot, file)}`);
    }
  }
}

for (const file of cssFiles) {
  const css = await readFile(file, 'utf8');
  const urls = [];
  for (const match of css.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi)) {
    urls.push((match[2] ?? match[3] ?? '').trim());
  }
  for (const match of css.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?/gi)) {
    urls.push(match[1].trim());
  }
  for (const raw of urls) {
    const target = localPathFromUrl(raw, file);
    if (!target) continue;
    if (!target.startsWith(siteRoot + sep) && target !== join(siteRoot, 'index.html')) {
      errors.push(`Local CSS reference escapes site root: ${raw} in ${relative(repoRoot, file)}`);
    } else if (!(await exists(target))) {
      errors.push(`Missing local CSS asset "${raw}" referenced by ${relative(repoRoot, file)}`);
    }
  }
}

const redirectsFile = join(siteRoot, '_redirects');
if (await exists(redirectsFile)) {
  const redirects = await readFile(redirectsFile, 'utf8');
  for (const line of redirects.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [source, destination] = trimmed.split(/\s+/);
    if (!destination || /^https?:\/\//i.test(destination)) continue;
    const target = localPathFromUrl(destination, redirectsFile);
    if (target && /\.[a-z0-9]+(?:[?#].*)?$/i.test(destination) && !(await exists(target))) {
      errors.push(`Redirect target "${destination}" from "${source}" does not exist`);
    }
  }
}

const authFormPages = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const staticHtml = html
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/gi, '$1$2')
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style\s*>)/gi, '$1$2');
  if (/\bid\s*=\s*["']account-form["']/i.test(staticHtml)) authFormPages.push(relative(repoRoot, file));
}
if (authFormPages.length !== 1 || authFormPages[0] !== 'develop-with-raman/auth.html') {
  errors.push(`Expected exactly one canonical account form in develop-with-raman/auth.html; found: ${authFormPages.join(', ') || 'none'}`);
}

const requiredFiles = [
  'index.html', 'auth.html', 'auth-callback.html', 'reset-password.html',
  'welcome.html', 'client-dashboard.html', 'admin-portal.html', 'profile.html',
  'portal-supabase.js', 'account-auth.js', 'client-portal.js', 'admin-portal.js'
];
for (const file of requiredFiles) {
  if (!(await exists(join(siteRoot, file)))) errors.push(`Required application file is missing: develop-with-raman/${file}`);
}

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    errors.push(`JavaScript syntax check failed for ${relative(repoRoot, file)}: ${String(error.stderr || error.message).trim()}`);
  }
}

if (errors.length) {
  console.error('Static site audit failed:');
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  console.log(`Static site audit passed: ${htmlFiles.length} HTML files, ${jsFiles.length} JavaScript files, ${cssFiles.length} CSS files, duplicate-ID checks, local asset/route checks, and required account pages.`);
}
