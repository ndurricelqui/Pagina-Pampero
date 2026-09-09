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
    icon: 'fa-shirt',
  },
  pantalones: {
    title: 'Pantalones',
    desc: 'Pantalones resistentes para uso corporativo y laboral intensivo.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/06/BAJO_PORTADA_PANTALONES.jpg',
    icon: 'fa-socks',
  },
  calzado: {
    title: 'Calzado',
    desc: 'Calzado de seguridad y corporativo para toda la jornada laboral.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/06/BAJO_PORTADA_CALZADOS.jpg',
    icon: 'fa-shoe-prints',
  },
  impermeables: {
    title: 'Impermeables',
    desc: 'Camperas y pilotos impermeables para trabajo en exteriores.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/06/BAJO_PORTADA_IMPERMEABLES.jpg',
    icon: 'fa-cloud-showers-heavy',
  },
  abrigos: {
    title: 'Abrigos',
    desc: 'Abrigos corporativos para afrontar el frío con identidad de marca.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/07/BAJO_PORTADA_ABRIGOS.jpg',
    icon: 'fa-vest',
  },
  seguridad: {
    title: 'Seguridad',
    desc: 'Guantes, protecciones y equipamiento de seguridad para entornos exigentes.',
    img: 'https://pampero.com.ar/wp-content/uploads/2025/07/BAJO_PORTADA_SEGURIDAD.jpg',
    icon: 'fa-hard-hat',
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

// Botón "Agregar al presupuesto" (convive con el de WhatsApp, no lo reemplaza).
function addQuoteBtnHtml(id, name, catSlug, catLabel, img, variant, colors, initialColor) {
  const cls = variant === 'article' ? 'article__addquote' : 'prod-card__addquote';
  const colorsAttr = colors && colors.length
    ? ` data-colors="${esc(JSON.stringify(colors))}" data-color="${esc(initialColor || '')}"`
    : '';
  return `<button type="button" class="${cls} js-add-to-quote" data-id="${esc(id)}" data-name="${esc(name)}" data-category="${esc(catSlug)}" data-category-label="${esc(catLabel)}" data-img="${esc(img)}"${colorsAttr} data-label="Agregar al presupuesto"><i class="js-add-to-quote-icon fas fa-plus"></i> <span class="js-add-to-quote-label">Agregar al presupuesto</span></button>`;
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
.navbar__actions{display:flex;align-items:center;gap:.75rem}
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

/* Tabla de talles + guía de medición (sección al final de la página) */
.sizechart-section{margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border)}
.sizechart-section__label{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--black);margin-bottom:1rem}
.sizechart-section__imgs{display:flex;align-items:flex-start;gap:1.5rem;flex-wrap:wrap}
.sizechart-section__imgs img{height:160px;width:auto;max-width:100%;flex:0 1 auto;border:1px solid var(--border);cursor:zoom-in;transition:opacity .18s}
.sizechart-section__imgs img:hover{opacity:.85}
.sizechart-lightbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:2000;align-items:center;justify-content:center;padding:2rem;cursor:zoom-out}
.sizechart-lightbox.open{display:flex}
.sizechart-lightbox img{max-width:92vw;max-height:92vh;object-fit:contain;border:none;cursor:zoom-out}
@media(max-width:600px){.sizechart-section__imgs img{width:100% !important;height:auto !important}}

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
@media(max-width:400px){.navbar__actions{gap:.4rem}.navbar__cta{padding:.55rem .75rem;font-size:.6rem}}

/* Formulario (idéntico al de index.html #presupuesto) */
.form{background:var(--gray-bg);padding:2.5rem}
.form__title{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.5rem;text-transform:uppercase;margin-bottom:1.75rem;padding-bottom:1.25rem;border-bottom:2px solid var(--yellow)}
.form__row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.form__group{margin-bottom:1.1rem}
.form__group label{display:block;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--black);margin-bottom:.4rem}
.form__group input,.form__group select,.form__group textarea{width:100%;padding:.75rem 1rem;border:1.5px solid var(--border);background:#fff;font-family:'Barlow',sans-serif;font-size:.92rem;color:var(--black);border-radius:0;outline:none;transition:border-color .18s;-webkit-appearance:none}
.form__group input:focus,.form__group select:focus,.form__group textarea:focus{border-color:var(--yellow)}
.form__group textarea{resize:vertical;min-height:90px}
.form__check{display:flex;gap:.65rem;align-items:flex-start;margin-bottom:1.5rem}
.form__check input{width:auto;margin-top:.2rem;accent-color:var(--yellow)}
.form__check label{font-size:.8rem;color:var(--gray-txt);font-weight:400;text-transform:none;letter-spacing:0}
.btn--submit{background:var(--black);color:#fff;width:100%;justify-content:center;font-size:.82rem;padding:1.1rem;border:2px solid var(--black);transition:background .18s,color .18s}
.btn--submit:hover{background:#fff;color:var(--black)}
#formSuccess{display:none;text-align:center;padding:3rem 2rem}
#formSuccess i{font-size:3rem;color:var(--yellow);display:block;margin-bottom:1rem}
#formSuccess h3{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.75rem;text-transform:uppercase;margin-bottom:.5rem}
#formSuccess p{color:var(--gray-txt);font-size:.9rem}

/* Página "Armá tu presupuesto" */
.quote-page__subtitle{color:var(--gray-txt);font-size:.95rem;max-width:640px;margin:-1.25rem 0 2.5rem}
.quote-empty{text-align:center;padding:4rem 1rem;background:var(--gray-bg)}
.quote-empty i{font-size:2.6rem;color:var(--gray-mid);margin-bottom:1rem;display:block}
.quote-empty h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.6rem;text-transform:uppercase;margin-bottom:.5rem}
.quote-empty p{color:var(--gray-txt);font-size:.9rem;margin-bottom:1.75rem}
.quote-empty__cats{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:2rem}
.quote-empty__cat{display:inline-flex;align-items:center;gap:.5rem;background:#fff;border:1.5px solid var(--border);color:var(--black);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:.65rem 1.1rem;transition:border-color .18s}
.quote-empty__cat:hover{border-color:var(--black)}
.quote-items{display:flex;flex-direction:column;gap:1px;background:var(--border);margin-bottom:2.5rem}
.quote-item{display:grid;grid-template-columns:72px 1fr auto auto;gap:1rem;align-items:center;background:#fff;padding:1rem}
.quote-item__img{width:72px;height:96px;object-fit:cover;object-position:center top;background:var(--gray-bg);flex-shrink:0}
.quote-item__name{font-size:.85rem;font-weight:700;text-transform:uppercase;color:var(--black);margin-bottom:.25rem}
.quote-item__cat{font-size:.68rem;color:var(--gray-mid);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem}
.quote-item__opts{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem}
.quote-item__opts label{display:flex;flex-direction:column;gap:.2rem;font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--gray-mid)}
.quote-item__color,.quote-item__personalize{padding:.45rem .6rem;border:1.5px solid var(--border);font-family:'Barlow',sans-serif;font-size:.75rem;font-weight:600;color:var(--black);background:#fff;outline:none;cursor:pointer;-webkit-appearance:none}
.quote-item__color:focus,.quote-item__personalize:focus{border-color:var(--yellow)}
.quote-item__addcolor{margin-top:.5rem}
.quote-item__addcolor-picker{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin-top:.4rem}
.quote-item__addcolor-picker[hidden]{display:none}
.quote-item__addcolor select{padding:.28rem .45rem;border:1.5px solid var(--border);font-family:'Barlow',sans-serif;font-size:.65rem;font-weight:600;color:var(--black);background:#fff;outline:none;cursor:pointer;-webkit-appearance:none}
.quote-item__addcolor-btn{display:inline-flex;align-items:center;gap:.25rem;background:transparent;border:1.5px solid var(--black);color:var(--black);font-size:.6rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:.3rem .55rem;cursor:pointer;transition:background .18s,color .18s;white-space:nowrap}
.quote-item__addcolor-btn:hover{background:var(--black);color:#fff}
.quote-item__addcolor-btn[hidden]{display:none}
.quote-item__note{width:100%;padding:.5rem .65rem;border:1.5px solid var(--border);font-family:'Barlow',sans-serif;font-size:.78rem;outline:none}
.quote-item__note:focus{border-color:var(--yellow)}
.quote-item__qty{display:flex;flex-direction:column;align-items:center;gap:.3rem}
.quote-item__qty label{font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--gray-mid)}
.quote-item__qty input{width:64px;padding:.5rem;text-align:center;border:1.5px solid var(--border);font-family:'Barlow',sans-serif;font-size:.9rem;font-weight:700;outline:none;-webkit-appearance:none}
.quote-item__qty input:focus{border-color:var(--yellow)}
.quote-item__remove{background:none;border:none;color:var(--gray-mid);font-size:1.05rem;cursor:pointer;padding:.5rem;transition:color .18s}
.quote-item__remove:hover{color:#e11}
@media(max-width:600px){.quote-item{grid-template-columns:56px 1fr;grid-template-rows:auto auto}.quote-item__img{width:56px;height:75px}.quote-item__qty{grid-column:1/2;flex-direction:row;justify-content:flex-start;gap:.5rem}.quote-item__remove{grid-column:2/3;grid-row:2/3;justify-self:end}}
.quote-section{margin-bottom:2.5rem}
.quote-section__title{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.15rem;text-transform:uppercase;margin-bottom:1rem}
.quote-submit-wa{display:flex;align-items:center;justify-content:center;gap:.65rem;background:#25D366;color:#fff;width:100%;font-size:.9rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:1.15rem;border:none;cursor:pointer;transition:background .18s;margin-bottom:.85rem}
.quote-submit-wa:hover{background:#1fba58}
.quote-submit-secondary{display:flex;align-items:center;justify-content:center;gap:.6rem;background:transparent;color:var(--black);width:100%;font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:1rem;border:2px solid var(--black);cursor:pointer;transition:background .18s,color .18s}
.quote-submit-secondary:hover{background:var(--black);color:#fff}
.quote-actions-note{font-size:.72rem;color:var(--gray-mid);text-align:center;margin-top:.85rem}
`;

const HEAD_FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
<link rel="stylesheet" href="/assets/quote.css" />
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
    <div class="navbar__actions">
      <a class="navbar__quote-link" href="/presupuesto/">
        <i class="fas fa-file-invoice"></i>
        <span class="navbar__quote-link-text">Mi presupuesto</span>
        <span class="quote-badge" data-quote-badge>0</span>
      </a>
      <a class="navbar__cta" href="${homeHref}#presupuesto">Pedir presupuesto</a>
    </div>
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
          <li><a href="/presupuesto/">Armá tu presupuesto</a></li>
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

// Lee el ancho/alto real de un PNG o JPEG local (para poder mostrarlo a
// exactamente la mitad de su tamaño original, sin distorsionar proporciones).
function readImageSize(relUrl) {
  try {
    const filePath = path.join(ROOT, relUrl.replace(/^\//, ''));
    const buf = fs.readFileSync(filePath);
    // PNG: firma 8 bytes + chunk IHDR (ancho/alto en offsets 16/20, big-endian)
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // JPEG: recorrer los markers hasta encontrar un SOFx (0xC0-0xC3)
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset < buf.length) {
        if (buf[offset] !== 0xff) break;
        const marker = buf[offset + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
          return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
        }
        offset += 2 + buf.readUInt16BE(offset + 2);
      }
    }
  } catch (e) {
    // archivo no encontrado o formato no soportado: se usa fallback CSS
  }
  return null;
}

// ── Tabla de talles + guía de medición (sección al final de la página, imágenes a mitad de tamaño y expandibles) ──
function renderSizeChart(p) {
  if (!p.sizeChartImg && !p.measureGuideImg) return '';
  const imgs = [];
  if (p.sizeChartImg) imgs.push({ src: p.sizeChartImg, alt: `Tabla de talles - ${esc(p.name)}` });
  if (p.measureGuideImg) imgs.push({ src: p.measureGuideImg, alt: `Guía de medición - ${esc(p.name)}` });
  return `
    <div class="sizechart-section">
      <div class="sizechart-section__label">Tabla de talles y guía de medición</div>
      <div class="sizechart-section__imgs">
        ${imgs
          .map((img) => {
            // Se renderiza a la mitad del tamaño real de cada imagen (no un
            // ancho compartido), para que cada una respete su propia
            // proporción tal cual la foto original.
            const size = readImageSize(img.src);
            const dims = size ? ` width="${Math.round(size.width / 2)}" height="${Math.round(size.height / 2)}"` : '';
            return `<img src="${img.src}" alt="${img.alt}" loading="lazy"${dims} onclick="pmpOpenLightbox(this.src)" />`;
          })
          .join('')}
      </div>
    </div>
    <div class="sizechart-lightbox" id="sizechartLightbox" onclick="this.classList.remove('open')">
      <img id="sizechartLightboxImg" src="" alt="" />
    </div>`;
}

function renderCardHtml(p, catSlug, meta) {
  const slug = slugify(p.name);
  const quoteId = `${catSlug}__${slug}`;
  const catLabel = meta ? meta.title : catSlug;
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
    const colorsForQuote = p.colors.map((c) => ({ label: c.label, hex: c.hex, img: (c.imgs && c.imgs[0]) || c.img || p.img }));
    return `<div class="prod-card">
      <a class="prod-card__img" href="${href}">${badge}<img src="${firstImg}" alt="${esc(p.name)}" loading="lazy"${containAttr} /></a>
      <div class="prod-card__body">
        <a class="prod-card__name" href="${href}">${esc(p.name)}</a>
        ${extraMeta}
        <a class="prod-card__btn" href="${msg}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Consultar</a>
        ${addQuoteBtnHtml(quoteId, p.name, catSlug, catLabel, firstImg, undefined, colorsForQuote, first.label)}
      </div></div>`;
  }
  const msg = waLink(`Hola Pampero Córdoba! Quiero consultar sobre ${p.name}`);
  return `<div class="prod-card">
    <a class="prod-card__img" href="${href}"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy"${containAttr} /></a>
    <div class="prod-card__body">
      <a class="prod-card__name" href="${href}">${esc(p.name)}</a>
      ${extraMeta}
      <a class="prod-card__btn" href="${msg}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Consultar</a>
      ${addQuoteBtnHtml(quoteId, p.name, catSlug, catLabel, p.img)}
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
<script src="/assets/quote.js" defer></script>
</body>
</html>`;
}

// ── 5. Generar páginas de categoría ──
const outDirs = [];

Object.keys(PRODUCTS).forEach((catSlug) => {
  const cat = PRODUCTS[catSlug];
  const meta = CATEGORY_META[catSlug] || { title: cat.label, desc: '', img: '' };
  const canonical = `${SITE_URL}/${catSlug}/`;
  const cardsHtml = cat.items.map((p) => renderCardHtml(p, catSlug, meta)).join('\n');

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
        ${addQuoteBtnHtml(`${catSlug}__${slug}`, p.name, catSlug, meta.title, galleryImgs[0], 'article', (p.colors && p.colors.length) ? p.colors.map((c) => ({ label: c.label, hex: c.hex, img: (c.imgs && c.imgs[0]) || c.img || p.img })) : undefined, (p.colors && p.colors.length) ? p.colors[0].label : undefined)}
      </div>
    </div>
    ${renderSizeChart(p)}
  </main>
  ${footer()}
  <script>
    function pmpOpenLightbox(src) {
      var lb = document.getElementById('sizechartLightbox');
      var img = document.getElementById('sizechartLightboxImg');
      if (!lb || !img) return;
      img.src = src;
      lb.classList.add('open');
    }
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
      var addQuoteBtn = document.querySelector('.js-add-to-quote');
      if (addQuoteBtn) {
        addQuoteBtn.setAttribute('data-color', label);
        addQuoteBtn.setAttribute('data-img', imgs[0]);
      }
      if (window.PamperoQuote) window.PamperoQuote.syncAddButtons();
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

// ── 7. Generar la página "Armá tu presupuesto" ──
function buildQuotePage() {
  const canonical = `${SITE_URL}/presupuesto/`;
  const quickCats = Object.keys(CATEGORY_META)
    .map((k) => `<a class="quote-empty__cat" href="/${k}/"><i class="fas ${CATEGORY_META[k].icon}"></i> ${esc(CATEGORY_META[k].title)}</a>`)
    .join('');

  const body = `
  ${navbar('/')}
  <main class="container">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href="/">Inicio</a><span class="sep">/</span><span class="current">Armá tu presupuesto</span>
    </nav>
    <div class="page-header" style="border-bottom:none;padding-bottom:0">
      <div>
        <span class="section-label">Venta Corporativa</span>
        <h1 class="section-title">Armá tu presupuesto</h1>
        <p class="section-desc quote-page__subtitle" style="margin-top:.5rem">Seleccioná los productos y cantidades aproximadas que necesita tu empresa. Nuestro equipo te enviará una cotización personalizada.</p>
      </div>
    </div>

    <div id="quoteEmpty" class="quote-empty" hidden>
      <i class="fas fa-file-invoice"></i>
      <h2>Todavía no agregaste productos</h2>
      <p>Recorré nuestras categorías y agregá los productos que necesita tu empresa.</p>
      <a class="btn btn--outline-black" href="/#lineas">Ver productos <i class="fas fa-arrow-right"></i></a>
      <div class="quote-empty__cats">${quickCats}</div>
    </div>

    <div id="quoteContent" hidden>
      <div id="quoteItems" class="quote-items"></div>

      <div class="quote-section">
        <h2 class="quote-section__title">Comentarios adicionales</h2>
        <div class="form__group" style="margin-bottom:0">
          <textarea id="quoteComments" placeholder="Ej: necesitamos logo bordado en pecho, es para personal de mantenimiento, entregas mensuales... (opcional)"></textarea>
        </div>
      </div>

      <div class="quote-section">
        <div class="form" id="quoteFormWrap">
          <h3 class="form__title">Datos de tu empresa</h3>
          <form id="quoteClientForm" novalidate>
            <input type="hidden" name="access_key" value="fec27d8a-e46f-4395-a586-009c5bf796f0" />
            <input type="hidden" name="subject" value="Nueva solicitud de presupuesto (Armá tu presupuesto) – Pampero Córdoba" />
            <input type="hidden" name="from_name" value="Web Pampero Córdoba" />
            <input type="hidden" name="redirect" value="false" />
            <div class="form__row">
              <div class="form__group">
                <label for="qEmpresa">Empresa / Organización *</label>
                <input type="text" id="qEmpresa" name="empresa" required placeholder="Nombre de tu empresa" />
              </div>
              <div class="form__group">
                <label for="qNombre">Nombre y apellido *</label>
                <input type="text" id="qNombre" name="name" required placeholder="Juan Pérez" />
              </div>
            </div>
            <div class="form__row">
              <div class="form__group">
                <label for="qWhatsapp">WhatsApp *</label>
                <input type="tel" id="qWhatsapp" name="phone" required placeholder="+54 9 351 000-0000" />
              </div>
              <div class="form__group">
                <label for="qEmail">Email <span style="font-weight:400;text-transform:none">(opcional)</span></label>
                <input type="email" id="qEmail" name="email" placeholder="nombre@empresa.com" />
              </div>
            </div>
            <div class="form__row">
              <div class="form__group">
                <label for="qLocalidad">Localidad *</label>
                <input type="text" id="qLocalidad" name="localidad" required placeholder="Córdoba" />
              </div>
              <div class="form__group">
                <label for="qCantidad">Cantidad aproximada de personas</label>
                <select id="qCantidad" name="cantidad_personas">
                  <option value="1 a 10">1 a 10</option>
                  <option value="11 a 30">11 a 30</option>
                  <option value="31 a 100">31 a 100</option>
                  <option value="Más de 100">Más de 100</option>
                </select>
              </div>
            </div>

            <button type="button" class="quote-submit-wa" id="quoteWaBtn"><i class="fab fa-whatsapp"></i> Solicitar presupuesto por WhatsApp</button>
            <button type="submit" class="quote-submit-secondary" id="quoteFormSubmitBtn"><i class="fas fa-paper-plane"></i> Enviar solicitud</button>
            <p class="quote-actions-note">Nunca compartimos tus datos con terceros. Te contactamos solo para responder esta solicitud.</p>
          </form>
        </div>
        <div id="quoteFormSuccess" style="display:none;text-align:center;padding:3rem 2rem">
          <i class="fas fa-check-circle" style="font-size:3rem;color:var(--yellow);display:block;margin-bottom:1rem"></i>
          <h3 style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.75rem;text-transform:uppercase;margin-bottom:.5rem">¡Solicitud enviada!</h3>
          <p style="color:var(--gray-txt);font-size:.9rem">Nos comunicaremos en menos de 24 horas hábiles.<br>También podés escribirnos directo por WhatsApp.</p>
        </div>
      </div>
    </div>
  </main>
  ${footer()}
  <script>
  document.addEventListener('DOMContentLoaded', function () {
    var Q = window.PamperoQuote;
    if (!Q) return;

    var quoteEmpty = document.getElementById('quoteEmpty');
    var quoteContent = document.getElementById('quoteContent');
    var quoteItemsEl = document.getElementById('quoteItems');
    var clientForm = document.getElementById('quoteClientForm');
    var waBtn = document.getElementById('quoteWaBtn');
    var formSubmitBtn = document.getElementById('quoteFormSubmitBtn');

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

    function renderItems() {
      var items = Q.getItems();
      if (!items.length) {
        quoteEmpty.hidden = false;
        quoteContent.hidden = true;
        return;
      }
      quoteEmpty.hidden = true;
      quoteContent.hidden = false;

      var colorsInUseByBase = {};
      items.forEach(function (it) {
        var key = it.baseId || it.id;
        colorsInUseByBase[key] = colorsInUseByBase[key] || [];
        if (it.color) colorsInUseByBase[key].push(it.color);
      });

      quoteItemsEl.innerHTML = items.map(function (it) {
        var colors = Array.isArray(it.colors) ? it.colors : [];
        var colorField = '';
        if (colors.length) {
          var colorOptions = colors.map(function (c) {
            var selected = c.label === it.color ? ' selected' : '';
            return '<option value="' + esc(c.label) + '"' + selected + '>' + esc(c.label) + '</option>';
          }).join('');
          colorField = '<label>Color<select class="quote-item__color js-item-color">' + colorOptions + '</select></label>';
        }
        var personalizeOptions = ['', 'Bordado de logo', 'Estampa / serigrafía', 'Necesito asesoramiento'].map(function (opt) {
          var selected = opt === (it.personalization || '') ? ' selected' : '';
          var text = opt || 'Sin personalización';
          return '<option value="' + esc(opt) + '"' + selected + '>' + esc(text) + '</option>';
        }).join('');
        var personalizeField = '<label>Personalización<select class="quote-item__personalize js-item-personalize">' + personalizeOptions + '</select></label>';

        var addColorField = '';
        var usedColors = colorsInUseByBase[it.baseId || it.id] || [];
        var remainingColors = colors.filter(function (c) { return usedColors.indexOf(c.label) === -1; });
        if (remainingColors.length) {
          var addColorOptions = remainingColors.map(function (c) { return '<option value="' + esc(c.label) + '">' + esc(c.label) + '</option>'; }).join('');
          addColorField = '<div class="quote-item__addcolor">' +
            '<button type="button" class="quote-item__addcolor-btn js-item-addcolor-toggle"><i class="fas fa-plus"></i> Agregar otro color</button>' +
            '<div class="quote-item__addcolor-picker" hidden>' +
            '<select class="js-item-addcolor">' + addColorOptions + '</select>' +
            '<button type="button" class="quote-item__addcolor-btn js-item-addcolor-confirm"><i class="fas fa-check"></i> Agregar</button>' +
            '</div></div>';
        }

        return '<div class="quote-item" data-id="' + esc(it.id) + '">' +
          '<img class="quote-item__img" src="' + esc(it.img) + '" alt="' + esc(it.name) + '" loading="lazy" />' +
          '<div><div class="quote-item__name">' + esc(it.name) + '</div>' +
          '<div class="quote-item__cat">' + esc(it.categoryLabel || '') + '</div>' +
          '<div class="quote-item__opts">' + colorField + personalizeField + '</div>' +
          '<input type="text" class="quote-item__note js-item-note" placeholder="Comentarios sobre este producto (opcional)" value="' + esc(it.note || '') + '" />' +
          addColorField +
          '</div>' +
          '<div class="quote-item__qty"><label>Cantidad</label><input type="number" min="1" class="js-item-qty" value="' + esc(it.qty) + '" /></div>' +
          '<button type="button" class="quote-item__remove js-item-remove" aria-label="Quitar producto"><i class="fas fa-trash"></i></button>' +
          '</div>';
      }).join('');
    }

    quoteItemsEl.addEventListener('input', function (e) {
      var row = e.target.closest('.quote-item');
      if (!row) return;
      var id = row.getAttribute('data-id');
      if (e.target.classList.contains('js-item-qty')) Q.updateQty(id, e.target.value);
      else if (e.target.classList.contains('js-item-note')) Q.updateNote(id, e.target.value);
    });

    quoteItemsEl.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('.js-item-remove');
      if (removeBtn) {
        var id = removeBtn.closest('.quote-item').getAttribute('data-id');
        Q.removeItem(id);
        Q.pushEvent('remove_from_quote', { product_id: id, quote_items_count: Q.getCount() });
        renderItems();
        return;
      }

      var toggleBtn = e.target.closest('.js-item-addcolor-toggle');
      if (toggleBtn) {
        var picker = toggleBtn.parentElement.querySelector('.quote-item__addcolor-picker');
        if (picker) {
          picker.hidden = false;
          toggleBtn.hidden = true;
        }
        return;
      }

      var addColorBtn = e.target.closest('.js-item-addcolor-confirm');
      if (addColorBtn) {
        var row = addColorBtn.closest('.quote-item');
        var select = row.querySelector('.js-item-addcolor');
        var color = select ? select.value : '';
        if (!color) return;
        var items = Q.getItems();
        var current = null;
        for (var i = 0; i < items.length; i++) { if (items[i].id === row.getAttribute('data-id')) { current = items[i]; break; } }
        if (!current) return;
        var colorImg = '';
        for (var j = 0; j < (current.colors || []).length; j++) { if (current.colors[j].label === color) { colorImg = current.colors[j].img || ''; break; } }
        var result = Q.addItem({
          id: current.baseId || current.id,
          name: current.name,
          category: current.category,
          categoryLabel: current.categoryLabel,
          img: colorImg || current.img,
          color: color,
          colors: current.colors,
        });
        if (result.added) {
          Q.pushEvent('add_to_quote', { product_id: current.baseId, product_name: current.name, product_category: current.category, quote_items_count: Q.getCount() });
          Q.showToast('Agregado a tu presupuesto', { icon: 'fa-check-circle' });
        }
        renderItems();
      }
    });

    quoteItemsEl.addEventListener('change', function (e) {
      var row = e.target.closest('.quote-item');
      if (!row) return;
      var id = row.getAttribute('data-id');
      if (e.target.classList.contains('js-item-color')) {
        var updated = Q.updateColor(id, e.target.value);
        var idx = -1;
        for (var i = 0; i < updated.length; i++) { if (updated[i].id === id) { idx = i; break; } }
        var imgEl = row.querySelector('.quote-item__img');
        if (idx !== -1 && imgEl && updated[idx].img) imgEl.src = updated[idx].img;
      } else if (e.target.classList.contains('js-item-personalize')) {
        Q.updatePersonalization(id, e.target.value);
      }
    });

    function buildMessage() {
      var items = Q.getItems();
      var empresa = document.getElementById('qEmpresa').value.trim();
      var nombre = document.getElementById('qNombre').value.trim();
      var localidad = document.getElementById('qLocalidad').value.trim();
      var cantidad = document.getElementById('qCantidad').value;
      var comentarios = document.getElementById('quoteComments').value.trim();

      var lines = [];
      lines.push('Hola Pampero Córdoba, quiero solicitar un presupuesto para mi empresa.');
      lines.push('');
      lines.push('Empresa: ' + empresa);
      lines.push('Contacto: ' + nombre);
      lines.push('Localidad: ' + localidad);
      lines.push('Cantidad de personas: ' + cantidad);
      lines.push('');
      lines.push('Productos solicitados:');
      items.forEach(function (it) {
        var details = [];
        if (it.color) details.push('Color: ' + it.color);
        if (it.personalization) details.push('Personalización: ' + it.personalization);
        if (it.note) details.push(it.note);
        var extra = details.length ? ' (' + details.join(' — ') + ')' : '';
        lines.push('• ' + it.name + ' — ' + it.qty + ' unidades' + extra);
      });
      if (comentarios) lines.push('Comentarios: ' + comentarios);
      lines.push('');
      lines.push('Quedo a la espera de la cotización.');
      return lines.join('\\n');
    }

    waBtn.addEventListener('click', function () {
      if (!clientForm.checkValidity()) { clientForm.reportValidity(); return; }
      var msg = buildMessage();
      Q.pushEvent('quote_whatsapp_click', { quote_items_count: Q.getCount() });
      window.open(Q.waLink(msg), '_blank', 'noopener');
    });

    clientForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!clientForm.checkValidity()) { clientForm.reportValidity(); return; }
      formSubmitBtn.disabled = true;
      formSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

      var fd = new FormData(clientForm);
      var personalizaciones = Q.getItems().filter(function (it) { return it.personalization; })
        .map(function (it) { return it.name + ': ' + it.personalization; }).join(', ');
      fd.append('personalizacion', personalizaciones);
      fd.append('comentarios', document.getElementById('quoteComments').value.trim());
      fd.append('mensaje', buildMessage());

      fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            document.getElementById('quoteFormWrap').style.display = 'none';
            document.getElementById('quoteFormSuccess').style.display = 'block';
            Q.pushEvent('quote_form_submit', { quote_items_count: Q.getCount() });
          } else {
            alert('Hubo un error al enviar. Por favor contactanos por WhatsApp.');
            formSubmitBtn.disabled = false;
            formSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar solicitud';
          }
        })
        .catch(function () {
          alert('Hubo un error de conexión. Por favor contactanos por WhatsApp.');
          formSubmitBtn.disabled = false;
          formSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar solicitud';
        });
    });

    renderItems();
    Q.pushEvent('view_quote', { quote_items_count: Q.getCount() });
  });
  </script>`;

  const html = pageShell({
    title: 'Solicitá presupuesto de ropa de trabajo | Pampero Córdoba',
    description: 'Armá tu presupuesto: seleccioná indumentaria de trabajo, uniformes, calzado y elementos de seguridad, indicá cantidades y recibí una cotización personalizada por WhatsApp.',
    canonical,
    bodyContent: body,
  });

  const qdir = path.join(ROOT, 'presupuesto');
  fs.mkdirSync(qdir, { recursive: true });
  fs.writeFileSync(path.join(qdir, 'index.html'), html, 'utf8');
}

buildQuotePage();

console.log('Generadas', outDirs.length, 'categorías:', outDirs.join(', '));
console.log('Generada página /presupuesto/.');
console.log('OK — index.html no fue modificado.');
