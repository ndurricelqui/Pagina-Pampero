/**
 * build-pages.js
 * ─────────────────────────────────────────────────────────────
 * Genera páginas estáticas de categoría y de artículo a partir
 * de los datos embebidos en index.html (objeto PRODUCTS), SIN
 * modificar index.html.
 *
 * Resultado: /<categoria>/index.html
 *            /<categoria>/<articulo>/index.html
 *
 * Uso:  node build-pages.js
 * (Volver a correrlo cada vez que se agreguen/cambien productos
 *  en el objeto PRODUCTS de index.html.)
 * ─────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE_URL = 'https://www.pamperocordoba.com';
const WA_PHONE = '5493513104836';
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ── 1. Extraer el objeto PRODUCTS del index.html (sin tocarlo) ──
function extractProductsSource(html) {
  const marker = 'const PRODUCTS = {';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('No se encontró "const PRODUCTS = {" en index.html');
  const braceStart = start + marker.length - 1; // posición del '{'
  let depth = 0;
  let i = braceStart;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return html.slice(braceStart, i); // incluye llaves externas
}

function loadProducts(html) {
  const objSrc = extractProductsSource(html);
  // eslint-disable-next-line no-new-func
  const fn = new Function('return (' + objSrc + ');');
  return fn();
}

const PRODUCTS = loadProducts(INDEX_HTML);

// ── 2. Metadatos de cada categoría (texto tomado de index.html) ──
const CATEGORY_META = {
  camisas: {
    title: 'Camisas y Remeras',
    desc: 'Camisas para uniformes empresariales con personalización de marca.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/06/BAJO_PORTADA_CAMISAS.jpg',
  },
  pantalones: {
    title: 'Pantalones',
    desc: 'Pantalones resistentes para uso corporativo y laboral intensivo.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/06/BAJO_PORTADA_PANTALONES.jpg',
  },
  calzado: {
    title: 'Calzado',
    desc: 'Calzado de seguridad y corporativo para toda la jornada laboral.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/06/BAJO_PORTADA_CALZADOS.jpg',
  },
  impermeables: {
    title: 'Impermeables',
    desc: 'Camperas y pilotos impermeables para trabajo en exteriores.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/06/BAJO_PORTADA_IMPERMEABLES.jpg',
  },
  abrigos: {
    title: 'Abrigos',
    desc: 'Abrigos corporativos para afrontar el frío con identidad de marca.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/07/BAJO_PORTADA_ABRIGOS.jpg',
  },
  seguridad: {
    title: 'Seguridad',
    desc: 'Guantes, protecciones y equipamiento de seguridad para entornos exigentes.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/07/BAJO_PORTADA_SEGURIDAD.jpg',
  },
};

// ── 3. Slugify ──
function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function waLink(text) {
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;
}

// ── 4. CSS compartido (subconjunto liviano, pensado para carga rápida) ──
const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;font-size:16px}
body{font-family:'Barlow',sans-serif;background:#fff;color:#111;line-height:1.6;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
a{text-decoration:none;color:inherit}
:root{--yellow:#FFD100;--black:#111111;--white:#FFFFFF;--gray-bg:#F4F4F4;--gray-mid:#999999;--gray-txt:#444444;--border:#E0E0E0}
.topbar{background:var(--yellow);color:var(--black);text-align:center;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.45rem 1rem}
.navbar{position:sticky;top:0;z-index:1000;background:var(--black);display:flex;align-items:center;justify-content:space-between;padding:0 2.5rem;height:70px}
.navbar__logo{display:flex;align-items:center;gap:.85rem}
.navbar__logo img{height:38px;width:auto;filter:brightness(0) invert(1)}
.navbar__logo-sep{width:1px;height:28px;background:#444;margin:0 .5rem}
.navbar__logo-city{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.3rem;color:#fff;letter-spacing:.18em;text-transform:uppercase}
.navbar__cta{background:var(--yellow);color:var(--black);font-size:.75rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:.6rem 1.5rem;border-radius:2px;white-space:nowrap}
.navbar__cta:hover{opacity:.88}
.container{max-width:1200px;margin:0 auto;padding:0 2.5rem}
.breadcrumb{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gray-mid);margin:1.75rem 0 0}
.breadcrumb a{color:var(--gray-mid);transition:color .18s}
.breadcrumb a:hover{color:var(--black)}
.breadcrumb span.sep{color:#ccc}
.breadcrumb span.current{color:var(--black)}
.page-back{display:inline-flex;align-items:center;gap:.5rem;background:none;border:none;cursor:pointer;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gray-mid);padding:1.25rem 0 0;font-family:inherit}
.page-back:hover{color:var(--black)}
.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin:1.25rem 0 2.5rem;flex-wrap:wrap;gap:1rem;padding-bottom:2rem;border-bottom:1px solid var(--border)}
.section-label{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--gray-mid);margin-bottom:.65rem}
.section-label--yellow{color:#c9a400}
.section-title{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(2.2rem,4vw,3.4rem);text-transform:uppercase;line-height:1;letter-spacing:-.01em;color:var(--black);margin-bottom:.5rem}
.section-desc{color:var(--gray-txt);font-size:1rem;max-width:520px}
.btn{display:inline-flex;align-items:center;gap:.5rem;font-family:'Barlow',sans-serif;font-size:.8rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:.85rem 2rem;border-radius:2px;transition:all .18s;border:2px solid transparent;cursor:pointer}
.btn--outline-black{background:transparent;color:var(--black);border-color:var(--black)}
.btn--outline-black:hover{background:var(--black);color:#fff}
main{min-height:40vh;padding-bottom:4rem}
.prod-page__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;margin-top:.5rem}
.prod-card{background:var(--gray-bg)}
.prod-card__img{aspect-ratio:3/4;overflow:hidden;display:block;position:relative}
.prod-card__img img{width:100%;height:100%;object-fit:cover;object-position:center top;transition:transform .5s ease}
.prod-card:hover .prod-card__img img{transform:scale(1.04)}
.prod-card__badge{position:absolute;top:.6rem;left:.6rem;z-index:2;background:#e11;color:#fff;font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:.3rem .6rem;pointer-events:none}
.prod-card__body{padding:.75rem 1rem 1rem}
.prod-card__name{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--black);margin-bottom:.4rem;line-height:1.3;display:block}
.prod-card__name:hover{color:#8a7300}
.prod-card__desc{font-size:.75rem;color:var(--gray-txt);line-height:1.5;margin-bottom:.5rem}
.prod-card__sizes{display:inline-block;font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gray-mid);background:#e8e8e8;padding:.18rem .55rem;margin-bottom:.55rem}
.prod-card__btn{display:inline-flex;align-items:center;gap:.35rem;background:var(--yellow);color:var(--black);font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:.35rem .85rem;border:none;cursor:pointer;transition:opacity .18s}
.prod-card__btn:hover{opacity:.8}
@media(max-width:1024px){.prod-page__grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){.prod-page__grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:400px){.prod-page__grid{grid-template-columns:1fr}}

/* Article page */
.article{display:grid;grid-template-columns:1fr 1fr;gap:3.5rem;margin-top:.5rem;align-items:start}
.article__gallery{display:flex;flex-direction:column;background:var(--gray-bg)}
.article__main-img{aspect-ratio:3/4;overflow:hidden;position:relative}
.article__main-img img{width:100%;height:100%;object-fit:cover;object-position:center top;transition:opacity .2s}
.article__thumbs{display:flex;gap:.5rem;padding:.75rem;flex-wrap:wrap;background:#eaeaea}
.article__thumb{width:64px;height:82px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:border-color .15s;flex-shrink:0;background:none;padding:0}
.article__thumb:hover{border-color:#aaa}
.article__thumb.active{border-color:var(--yellow)}
.article__thumb img{width:100%;height:100%;object-fit:cover;object-position:center top}
.article__info{display:flex;flex-direction:column;gap:.9rem}
.article__cat{font-size:.68rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--gray-mid)}
.article__name{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:2.4rem;text-transform:uppercase;line-height:1;color:var(--black)}
.article__desc{font-size:.92rem;color:var(--gray-txt);line-height:1.7;border-top:1px solid var(--border);padding-top:.9rem}
.article__sizes-wrap{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}
.article__sizes-label{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--black)}
.article__sizes-val{font-size:.85rem;font-weight:600;color:var(--gray-txt);background:var(--gray-bg);padding:.3rem .75rem;border:1px solid var(--border)}
.article__colors-label{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--black);margin-bottom:.3rem}
.article__color-name{font-size:.82rem;font-weight:600;color:var(--gray-mid);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;min-height:1.1em}
.article__swatches{display:flex;gap:.5rem;flex-wrap:wrap}
.article__swatch{width:30px;height:30px;border-radius:50%;border:2.5px solid transparent;cursor:pointer;transition:border-color .15s,transform .15s;outline:none;padding:0}
.article__swatch:hover{transform:scale(1.1)}
.article__swatch.active{border-color:var(--black) !important;transform:scale(1.15)}
.article__swatch--white{border-color:#bbb !important}
.article__swatch--white.active{border-color:var(--black) !important}
.article__swatch--oos{position:relative;cursor:not-allowed;opacity:.45}
.article__swatch--oos:hover{transform:none}
.article__swatch--oos::after{content:'';position:absolute;top:50%;left:50%;width:140%;height:2px;background:#e11;transform:translate(-50%,-50%) rotate(-45deg)}
.article__wa{display:flex;align-items:center;justify-content:center;gap:.65rem;background:#25D366;color:#fff;font-size:.85rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:1.1rem;border:none;cursor:pointer;text-decoration:none;margin-top:.5rem;transition:background .18s}
.article__wa:hover{background:#1fba58;color:#fff}
.article__wa i{font-size:1.15rem}
@media(max-width:760px){.article{grid-template-columns:1fr;gap:1.5rem}.article__name{font-size:1.9rem}}

/* Footer + WA float (idénticos a index.html) */
footer{background:#0a0a0a;color:#666;padding:4rem 2.5rem 2rem}
.footer__grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr;gap:3rem;padding-bottom:3rem;border-bottom:1px solid #1e1e1e}
.footer__logo-wrap{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem}
.footer__logo-wrap img{height:30px;filter:brightness(0) invert(1)}
.footer__logo-city{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.3rem;color:#fff;text-transform:uppercase;letter-spacing:.08em}
.footer__logo-sub{font-size:.6rem;color:var(--yellow);font-weight:700;letter-spacing:.15em;text-transform:uppercase}
.footer__desc{font-size:.83rem;line-height:1.75;max-width:280px;color:#555}
.footer__social{display:flex;gap:.6rem;margin-top:1.25rem}
.footer__social a{width:34px;height:34px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;color:#666;font-size:.85rem;transition:all .18s}
.footer__social a:hover{background:var(--yellow);color:var(--black)}
.footer__col h4{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#fff;margin-bottom:1.1rem}
.footer__col ul{list-style:none}
.footer__col li{margin-bottom:.6rem}
.footer__col li a{font-size:.82rem;color:#555;transition:color .18s}
.footer__col li a:hover{color:var(--yellow)}
.footer__bottom{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding-top:2rem;flex-wrap:wrap;gap:.75rem}
.footer__bottom p{font-size:.75rem;color:#333}
.footer__bottom a{color:var(--yellow)}
.wa{position:fixed;bottom:1.75rem;right:1.75rem;z-index:900;background:#25D366;color:#fff;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.55rem;box-shadow:0 4px 18px rgba(37,211,102,.55);transition:transform .2s}
.wa:hover{transform:scale(1.1);color:#fff}
@media(max-width:768px){.navbar{padding:0 1.25rem}.container{padding:0 1.25rem}}
`;

const HEAD_FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
<link rel="icon" type="image/png" href="https://pampero.com.ar/wp-content/uploads/2024/09/FAV_PAMPERO.png" />`;

function navbar(homeHref) {
  return `
  <div class="topbar">Venta Corporativa Pampero &nbsp;·&nbsp; Córdoba, Argentina</div>
  <nav class="navbar">
    <a class="navbar__logo" href="${homeHref}">
      <img src="https://pampero.com.ar/wp-content/uploads/2024/07/logosimbolo.png" alt="Pampero logo" />
      <div class="navbar__logo-sep"></div>
      <span class="navbar__logo-city">Córdoba</span>
    </a>
    <a class="navbar__cta" href="${homeHref}#presupuesto">Pedir presupuesto</a>
  </nav>`;
}

function footer() {
  return `
  <footer>
    <div class="footer__grid">
      <div>
        <div class="footer__logo-wrap">
          <img src="https://pampero.com.ar/wp-content/uploads/2024/07/logosimbolo.png" alt="Pampero" />
          <div>
            <div class="footer__logo-city">Pampero</div>
            <div class="footer__logo-sub">Córdoba</div>
          </div>
        </div>
        <p class="footer__desc">Distribuidores oficiales de Pampero en Córdoba. Especialistas en indumentaria corporativa y de trabajo para empresas, con atención personalizada y pedidos por volumen.</p>
        <div class="footer__social">
          <a href="https://www.instagram.com/pamperocordobaoficial" target="_blank" rel="noopener" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          <a href="https://wa.me/${WA_PHONE}" aria-label="WhatsApp" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a>
        </div>
      </div>
      <div class="footer__col">
        <h4>Venta Corporativa</h4>
        <ul>${Object.keys(CATEGORY_META).map((k) => `<li><a href="/${k}/">${esc(CATEGORY_META[k].title)}</a></li>`).join('')}</ul>
      </div>
      <div class="footer__col">
        <h4>Empresa</h4>
        <ul>
          <li><a href="/#nosotros">Quiénes somos</a></li>
          <li><a href="/#presupuesto">Presupuesto</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h4>Contacto</h4>
        <ul>
          <li><a href="https://wa.me/${WA_PHONE}" target="_blank" rel="noopener">WhatsApp</a></li>
          <li><a href="mailto:Cordoba@pampenorte.com">Cordoba@pampenorte.com</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <p>&copy; 2025 Pampero Córdoba — Distribuidor Oficial.</p>
      <p><a href="https://www.pamperocordoba.com">www.pamperocordoba.com</a></p>
    </div>
  </footer>
  <a class="wa" href="${waLink('Hola Pampero Córdoba! Quiero solicitar un presupuesto para ropa de trabajo. ¿Me pueden asesorar?')}" target="_blank" rel="noopener" aria-label="Solicitar presupuesto por WhatsApp">
    <i class="fab fa-whatsapp"></i>
  </a>`;
}

function imgContainStyle(p) {
  return p.imgContain ? ' style="object-fit:contain;object-position:center center;background:#fff"' : '';
}

function renderCardHtml(p, catSlug) {
  const slug = slugify(p.name);
  let extraMeta = '';
  if (p.desc) extraMeta += `<p class="prod-card__desc">${esc(p.desc)}</p>`;
  if (p.sizes) extraMeta += `<span class="prod-card__sizes"><i class="fas fa-ruler-horizontal" style="margin-right:.3rem"></i>Talles: ${esc(p.sizes)}</span>`;
  const href = `./${slug}/`;
  const containAttr = imgContainStyle(p);
  if (p.colors && p.colors.length) {
    const first = p.colors[0];
    const firstImg = first.img || p.img;
    const isOos = p.colors.every((c) => c.outOfStock);
    const badge = isOos ? '<span class="prod-card__badge">Sin stock</span>' : '';
    const msg = waLink(`Hola Pampero Córdoba! Quiero consultar sobre ${p.name} — ${first.label}`);
    return `<div class="prod-card">
      <a class="prod-card__img" href="${href}">${badge}<img src="${firstImg}" alt="${esc(p.name)}" loading="lazy"${containAttr} /></a>
      <div class="prod-card__body">
        <a class="prod-card__name" href="${href}">${esc(p.name)}</a>
        ${extraMeta}
        <a class="prod-card__btn" href="${msg}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Consultar</a>
      </div></div>`;
  }
  const msg = waLink(`Hola Pampero Córdoba! Quiero consultar sobre ${p.name}`);
  return `<div class="prod-card">
    <a class="prod-card__img" href="${href}"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy"${containAttr} /></a>
    <div class="prod-card__body">
      <a class="prod-card__name" href="${href}">${esc(p.name)}</a>
      ${extraMeta}
      <a class="prod-card__btn" href="${msg}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Consultar</a>
    </div></div>`;
}

function pageShell({ title, description, canonical, ogImage, extraHead = '', bodyContent }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
${HEAD_FONTS}
<style>${SHARED_CSS}</style>
${extraHead}
</head>
<body>
${bodyContent}
</body>
</html>`;
}

// ── 5. Generar páginas de categoría ──
const outDirs = [];

Object.keys(PRODUCTS).forEach((catSlug) => {
  const cat = PRODUCTS[catSlug];
  const meta = CATEGORY_META[catSlug] || { title: cat.label, desc: '', img: '' };
  const canonical = `${SITE_URL}/${catSlug}/`;
  const cardsHtml = cat.items.map((p) => renderCardHtml(p, catSlug)).join('\n');

  const body = `
  ${navbar('/')}
  <main class="container">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href="/">Inicio</a><span class="sep">/</span><span class="current">${esc(meta.title)}</span>
    </nav>
    <button class="page-back" onclick="if(document.referrer){history.back()}else{location.href='/'}">
      <i class="fas fa-arrow-left"></i> Volver
    </button>
    <div class="page-header">
      <div>
        <span class="section-label">Venta Corporativa</span>
        <h1 class="section-title">${esc(meta.title)}</h1>
        <p class="section-desc">${esc(meta.desc)}</p>
      </div>
      <a class="btn btn--outline-black" href="/#presupuesto">Pedir presupuesto <i class="fas fa-arrow-right"></i></a>
    </div>
    <div class="prod-page__grid">
      ${cardsHtml}
    </div>
  </main>
  ${footer()}`;

  const html = pageShell({
    title: `${meta.title} | Pampero Córdoba`,
    description: `${meta.desc} Venta corporativa y mayorista en Córdoba, Argentina.`,
    canonical,
    ogImage: meta.img,
    bodyContent: body,
  });

  const dir = path.join(ROOT, catSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  outDirs.push(`/${catSlug}/`);

  // ── 6. Generar páginas de artículo dentro de la categoría ──
  cat.items.forEach((p) => {
    const slug = slugify(p.name);
    const canonicalP = `${SITE_URL}/${catSlug}/${slug}/`;

    let galleryImgs;
    let colorsBlock = '';
    let initialWa;
    if (p.colors && p.colors.length) {
      const first = p.colors[0];
      galleryImgs = (first.imgs && first.imgs.length) ? first.imgs : (first.img ? [first.img] : [p.img]);
      initialWa = waLink(`Hola Pampero Córdoba! Quiero consultar sobre ${p.name} — ${first.label}`);
      const swatches = p.colors.map((c, i) => {
        const whiteClass = c.white ? ' article__swatch--white' : '';
        const oosClass = c.outOfStock ? ' article__swatch--oos' : '';
        const activeClass = i === 0 ? ' active' : '';
        const imgs = JSON.stringify((c.imgs && c.imgs.length) ? c.imgs : (c.img ? [c.img] : [p.img]));
        const titleLabel = c.outOfStock ? `${esc(c.label)} — Sin stock` : esc(c.label);
        return `<button class="article__swatch${whiteClass}${oosClass}${activeClass}" style="background:${c.hex}" title="${titleLabel}" data-label="${esc(c.label)}" data-imgs='${imgs}' data-oos="${c.outOfStock ? '1' : '0'}" onclick="pmpSelectColor(this)"></button>`;
      }).join('');
      colorsBlock = `
        <div>
          <div class="article__colors-label">Color</div>
          <div class="article__color-name" id="colorName">${esc(first.label)}</div>
          <div class="article__swatches">${swatches}</div>
        </div>`;
    } else {
      galleryImgs = p.imgs && p.imgs.length ? p.imgs : [p.img];
      initialWa = waLink(`Hola Pampero Córdoba! Quiero consultar sobre ${p.name}`);
    }

    const containAttr = imgContainStyle(p);
    const thumbsHtml = galleryImgs.map((url, i) => `<button class="article__thumb${i === 0 ? ' active' : ''}" onclick="pmpSetImage(this,'${url.replace(/'/g, "\\'")}')"><img src="${url}" loading="lazy"${containAttr} alt="${esc(p.name)}" /></button>`).join('');

    const body = `
  ${navbar('/')}
  <main class="container">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href="/">Inicio</a><span class="sep">/</span>
      <a href="/${catSlug}/">${esc(meta.title)}</a><span class="sep">/</span>
      <span class="current">${esc(p.name)}</span>
    </nav>
    <button class="page-back" onclick="if(document.referrer){history.back()}else{location.href='/${catSlug}/'}">
      <i class="fas fa-arrow-left"></i> Volver
    </button>
    <div class="article" style="margin-top:1.5rem">
      <div class="article__gallery">
        <div class="article__main-img"><span class="prod-card__badge" id="oosBadge"${(p.colors && p.colors.length && p.colors[0].outOfStock) ? '' : ' style="display:none"'}>Sin stock</span><img id="mainImg" src="${galleryImgs[0]}" alt="${esc(p.name)}"${containAttr} /></div>
        <div class="article__thumbs"${galleryImgs.length > 1 ? '' : ' style="display:none"'}>${thumbsHtml}</div>
      </div>
      <div class="article__info">
        <span class="article__cat">${esc(meta.title)}</span>
        <h1 class="article__name">${esc(p.name)}</h1>
        ${p.desc ? `<p class="article__desc">${p.desc}</p>` : ''}
        ${p.sizes ? `<div class="article__sizes-wrap"><span class="article__sizes-label">Talles</span><span class="article__sizes-val">${esc(p.sizes)}</span></div>` : ''}
        ${colorsBlock}
        <a class="article__wa" id="waBtn" href="${initialWa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>
      </div>
    </div>
  </main>
  ${footer()}
  <script>
    function pmpSetImage(btn, src) {
      var main = document.getElementById('mainImg');
      main.style.opacity = '0';
      setTimeout(function () {
        main.src = src;
        main.style.opacity = '1';
      }, 120);
      document.querySelectorAll('.article__thumb').forEach(function (t) { t.classList.remove('active'); });
      if (btn) btn.classList.add('active');
    }
    function pmpSelectColor(btn) {
      if (btn.dataset.oos === '1') return;
      var imgs = JSON.parse(btn.dataset.imgs);
      var label = btn.dataset.label;
      document.querySelectorAll('.article__swatch').forEach(function (s) { s.classList.remove('active'); });
      btn.classList.add('active');
      var oosBadge = document.getElementById('oosBadge');
      if (oosBadge) oosBadge.style.display = 'none';
      var nameEl = document.getElementById('colorName');
      if (nameEl) nameEl.textContent = label;
      var thumbsWrap = document.querySelector('.article__thumbs');
      if (thumbsWrap) {
        if (imgs.length > 1) {
          thumbsWrap.style.display = '';
          thumbsWrap.innerHTML = imgs.map(function (url, i) {
            return '<button class="article__thumb' + (i === 0 ? ' active' : '') + '" onclick="pmpSetImage(this,\\'' + url.replace(/'/g, "\\\\'") + '\\')"><img src="' + url + '" loading="lazy"${containAttr} alt="${esc(p.name).replace(/'/g, "\\'")}" /></button>';
          }).join('');
        } else {
          thumbsWrap.style.display = 'none';
          thumbsWrap.innerHTML = '';
        }
      }
      pmpSetImage(null, imgs[0]);
      var waBtn = document.getElementById('waBtn');
      waBtn.href = 'https://wa.me/${WA_PHONE}?text=' + encodeURIComponent('Hola Pampero Córdoba! Quiero consultar sobre ${p.name.replace(/'/g, "\\'")} — ' + label);
    }
  </script>`;

    const html = pageShell({
      title: `${p.name} | ${meta.title} | Pampero Córdoba`,
      description: (p.desc ? p.desc.replace(/<[^>]+>/g, ' ').trim() : `${p.name} — ${meta.title} de Pampero Córdoba.`) + ' Venta corporativa y mayorista.',
      canonical: canonicalP,
      ogImage: galleryImgs[0],
      bodyContent: body,
    });

    const pdir = path.join(dir, slug);
    fs.mkdirSync(pdir, { recursive: true });
    fs.writeFileSync(path.join(pdir, 'index.html'), html, 'utf8');
  });
});

console.log('Generadas', outDirs.length, 'categorías:', outDirs.join(', '));
console.log('OK — index.html no fue modificado.');
