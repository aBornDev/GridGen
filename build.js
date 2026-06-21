#!/usr/bin/env node
/*
 * GridGen static site generator.
 *
 * Zero dependencies. Renders one set of templates + per-locale content into
 * static HTML, one directory tree per language. English is emitted at the
 * site root; every other locale lives under /<lang>/.
 *
 * Adding a language:
 *   1. Add site/locales/<lang>.json  (metadata, nav labels, schema strings)
 *   2. Add translated bodies under site/pages/<lang>/
 *   3. Register the lang in LOCALES below
 *   4. Run `node build.js`
 *
 * Nothing here runs on the server — GitHub Pages just serves the output.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'site');
const SITE_URL = 'https://aborndev.github.io/GridGen/';

// Locales in priority order. The first is the default and is emitted at the
// site root (no /<lang>/ prefix). Add new languages here.
const LOCALES = ['en', 'nl', 'de'];
const DEFAULT_LOCALE = 'en';

// Page registry. `out` maps locale -> output path (relative to the site root),
// so slugs can be localised (e.g. map-grid -> stafkaart).
//
// Note: each locale's body file (site/pages/<lang>/<id>.body.html) carries the
// full page markup, not just translatable strings — so a structural change to a
// page must be mirrored across every locale's body or they drift. Keep markup
// changes in lockstep across languages.
const PAGES = {
  home: {
    body: 'home',
    css: 'style.css',
    ogType: 'website',
    scripts: '<script src="{{base}}gridgen.js"></script>',
    schema: 'WebApplication',
    out: { en: 'index.html' },
  },
  wikiHow: {
    body: 'wiki-how',
    css: 'wiki/wiki.css',
    ogType: 'article',
    schema: 'HowTo',
    out: { en: 'wiki/index.html' },
  },
  wikiTech: {
    body: 'wiki-technical',
    css: 'wiki/wiki.css',
    ogType: 'article',
    schema: 'TechArticle',
    out: { en: 'wiki/technical.html' },
  },
  mapGrid: {
    body: 'map-grid',
    css: 'wiki/wiki.css',
    ogType: 'article',
    schema: 'HowTo',
    // Localized slugs for the map page; other locales auto-derive (see outFor).
    out: { en: 'wiki/map-grid.html', nl: 'nl/wiki/stafkaart.html', de: 'de/wiki/karten-gitter.html' },
  },
  useCases: {
    body: 'use-cases',
    css: 'wiki/wiki.css',
    ogType: 'article',
    schema: 'FAQPage',
    out: { en: 'wiki/use-cases.html', nl: 'nl/wiki/toepassingen.html', de: 'de/wiki/anwendungen.html' },
  },
  gridMethod: {
    body: 'grid-method',
    css: 'wiki/wiki.css',
    ogType: 'article',
    schema: 'HowTo',
    out: { en: 'wiki/grid-drawing-method.html', nl: 'nl/wiki/rastermethode.html', de: 'de/wiki/gitterzeichenmethode.html' },
  },
  countedCraft: {
    body: 'counted-craft',
    css: 'wiki/wiki.css',
    ogType: 'article',
    schema: 'HowTo',
    out: { en: 'wiki/cross-stitch-grid.html', nl: 'nl/wiki/telpatroon.html', de: 'de/wiki/zaehlmuster.html' },
  },
};
const PAGE_IDS = Object.keys(PAGES);

// ---------- helpers ----------
const read = (p) => fs.readFileSync(p, 'utf8');
const locales = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(read(path.join(SRC, 'locales', `${l}.json`)))])
);
const partials = Object.fromEntries(
  fs.readdirSync(path.join(SRC, 'partials')).map((f) => [
    path.basename(f, '.html'),
    read(path.join(SRC, 'partials', f)),
  ])
);
const layout = read(path.join(SRC, 'layouts', 'base.html'));

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render(tpl, ctx) {
  // Inline partials (a few passes to allow nesting).
  for (let i = 0; i < 4 && /\{\{>\s*[\w.-]+\s*\}\}/.test(tpl); i++) {
    tpl = tpl.replace(/\{\{>\s*([\w.-]+)\s*\}\}/g, (_, n) => partials[n] || '');
  }
  tpl = tpl.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, k) => (ctx[k] != null ? ctx[k] : ''));
  tpl = tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => esc(ctx[k] != null ? ctx[k] : ''));
  return tpl;
}

// Output path for a page in a locale. The default locale uses the base (en)
// path; other locales are auto-prefixed with /<locale>/ unless an explicit
// slug override is provided in the page's `out` map (e.g. stafkaart.html).
function outFor(pageId, locale) {
  const out = PAGES[pageId].out;
  if (out[locale]) return out[locale];
  return locale === DEFAULT_LOCALE ? out[DEFAULT_LOCALE] : `${locale}/${out[DEFAULT_LOCALE]}`;
}

// Absolute URL for an output path, collapsing trailing index.html to a dir URL.
const urlFor = (p) => SITE_URL + p.replace(/index\.html$/, '');
const baseFor = (p) => '../'.repeat(p.split('/').length - 1);

function faqObj(pageId, L) {
  const faqs = (L.schema && L.schema[pageId] && L.schema[pageId].faq) || [];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: L.meta.lang,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function jsonLd(pageId, L, ctx) {
  const s = (L.schema && L.schema[pageId]) || {};
  const name = L.pages[pageId].title;
  const desc = L.pages[pageId].description;
  let obj;
  if (PAGES[pageId].schema === 'WebApplication') {
    obj = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'GridGen',
      url: ctx.canonical,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any (browser-based)',
      inLanguage: L.meta.lang,
      description: desc,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: s.featureList || [],
    };
  } else if (PAGES[pageId].schema === 'HowTo') {
    obj = {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: s.howtoName || name,
      description: desc,
      inLanguage: L.meta.lang,
      step: (s.steps || []).map((st) => ({ '@type': 'HowToStep', name: st.name, text: st.text })),
    };
  } else if (PAGES[pageId].schema === 'FAQPage') {
    obj = faqObj(pageId, L);
  } else {
    obj = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: name,
      description: desc,
      url: ctx.canonical,
      inLanguage: L.meta.lang,
      about: s.about || [],
    };
  }
  let out = `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
  // Additionally emit an FAQPage block for non-FAQPage pages that declare an faq
  // array (so e.g. a HowTo page can also surface FAQ rich results).
  if (PAGES[pageId].schema !== 'FAQPage' && (s.faq || []).length) {
    out += `\n<script type="application/ld+json">\n${JSON.stringify(faqObj(pageId, L), null, 2)}\n</script>`;
  }
  return out;
}


// Small inline SVG flags for the language switcher (robust across platforms,
// unlike emoji flags which don't render on Windows). Keyed by locale code; a
// locale without a flag degrades gracefully (its code shows in the summary and
// its name in the menu). Add a flag here when adding a language.
const FLAGS = {
  en: '<svg viewBox="0 0 60 30" class="flag-svg" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" stroke-width="4"/><path d="M30 0V30M0 15H60" stroke="#fff" stroke-width="10"/><path d="M30 0V30M0 15H60" stroke="#C8102E" stroke-width="6"/></svg>',
  nl: '<svg viewBox="0 0 60 30" class="flag-svg" aria-hidden="true"><rect width="60" height="30" fill="#21468B"/><rect width="60" height="20" fill="#fff"/><rect width="60" height="10" fill="#AE1C28"/></svg>',
  de: '<svg viewBox="0 0 60 30" class="flag-svg" aria-hidden="true"><rect width="60" height="30" fill="#FFCE00"/><rect width="60" height="20" fill="#DD0000"/><rect width="60" height="10" fill="#000"/></svg>',
};
const flagFor = (loc) => FLAGS[loc] || '';

const CARET =
  '<svg class="lang-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Language switcher as a native <details> dropdown (no JS needed). The summary
// shows the current flag + code; the menu lists every language with its flag.
function langSwitcher(pageId, locale, base) {
  const label = esc(locales[locale].common.langLabel || 'Language');
  const items = LOCALES.map((loc) => {
    const L = locales[loc];
    const href = base + outFor(pageId, loc);
    const cur = loc === locale ? ' aria-current="true" class="active"' : '';
    return `<a hreflang="${loc}" href="${href}"${cur}>${flagFor(loc)}<span>${esc(L.meta.nativeName)}</span></a>`;
  });
  const code = esc((locales[locale].meta.lang || '').toUpperCase());
  return (
    `<details class="lang-switch">` +
    `<summary aria-label="${code} — ${label}" title="${label}">${flagFor(locale)}<span class="lang-code">${code}</span>${CARET}</summary>` +
    `<div class="lang-menu">${items.join('')}</div>` +
    `</details>`
  );
}

function hreflangBlock(pageId) {
  const links = LOCALES.map(
    (loc) => `  <link rel="alternate" hreflang="${loc}" href="${urlFor(outFor(pageId, loc))}">`
  );
  links.push(`  <link rel="alternate" hreflang="x-default" href="${urlFor(outFor(pageId, DEFAULT_LOCALE))}">`);
  return links.join('\n');
}

// ---------- build ----------
let written = 0;
for (const pageId of PAGE_IDS) {
  const P = PAGES[pageId];
  for (const locale of LOCALES) {
    const L = locales[locale];
    const outPath = outFor(pageId, locale);
    const base = baseFor(outPath);
    const canonical = urlFor(outPath);

    const ctx = {
      lang: L.meta.lang,
      locale: L.meta.locale,
      dir: L.meta.dir || 'ltr',
      base,
      css: P.css,
      canonical,
      title: L.pages[pageId].title,
      description: L.pages[pageId].description,
      ogType: P.ogType,
      ogImage: SITE_URL + 'og-image.png',
      ogImageAlt: L.common.ogImageAlt,
      keywordsTag: L.pages[pageId].keywords
        ? `<meta name="keywords" content="${esc(L.pages[pageId].keywords)}">`
        : '',
      hreflang: hreflangBlock(pageId),
      ogLocaleAlt: LOCALES.filter((l) => l !== locale)
        .map((l) => `<meta property="og:locale:alternate" content="${locales[l].meta.locale}">`)
        .join('\n  '),
      headExtra: P.headExtra ? render(P.headExtra, { base }) : '',
      scripts: P.scripts ? render(P.scripts, { base }) : '',
      navDocs: L.common.navDocs,
      openApp: L.common.openApp,
      brandWiki: L.common.brandWiki,
      langSwitcher: langSwitcher(pageId, locale, base),
    };
    ctx.jsonLd = jsonLd(pageId, L, ctx);
    // Per-locale link map so internal links always stay within the language.
    for (const id of PAGE_IDS) ctx['link.' + id] = base + outFor(id, locale);

    const bodyTpl = read(path.join(SRC, 'pages', locale, `${P.body}.body.html`));
    ctx.body = render(bodyTpl, ctx);

    const html = render(layout, ctx);
    const dest = path.join(ROOT, outPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, html);
    written++;
    console.log('  ' + outPath);
  }
}

// ---------- sitemap ----------
const urls = [];
for (const pageId of PAGE_IDS) {
  for (const locale of LOCALES) {
    const loc = urlFor(outFor(pageId, locale));
    const alts = LOCALES.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(outFor(pageId, l))}"/>`
    ).join('\n');
    const xdef = `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(outFor(pageId, DEFAULT_LOCALE))}"/>`;
    urls.push(
      `  <url>\n    <loc>${loc}</loc>\n${alts}\n${xdef}\n    <changefreq>monthly</changefreq>\n  </url>`
    );
  }
}
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  urls.join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

console.log(`\nBuilt ${written} pages across ${LOCALES.length} locales + sitemap.xml`);
