/**
 * quote.js
 * ─────────────────────────────────────────────────────────────
 * Lógica compartida de "Armá tu presupuesto" (selección de
 * productos para cotización B2B). Se carga en index.html y en
 * todas las páginas generadas por build-pages.js.
 *
 * NO es un carrito de compras: no maneja precios, stock ni pagos.
 * Solo guarda una lista de productos + cantidad aproximada para
 * que el equipo comercial arme un presupuesto.
 *
 * Persistencia: localStorage (simple y suficiente para este caso).
 * ─────────────────────────────────────────────────────────────
 */
(function (window, document) {
  'use strict';

  var STORAGE_KEY = 'pampero_presupuesto_v1';
  var WA_PHONE = '5493513104836'; // mismo número que usa el resto del sitio

  // ── Storage ──────────────────────────────────────────────
  function getItems() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // localStorage no disponible (modo privado, cuota, etc.): la selección
      // simplemente no persiste entre páginas, pero el sitio sigue funcionando.
    }
    renderBadges();
  }

  function findIndex(items, id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return i;
    }
    return -1;
  }

  // ── API pública del "presupuesto" ───────────────────────
  function addItem(product) {
    var items = getItems();
    var idx = findIndex(items, product.id);
    if (idx !== -1) {
      return { added: false, duplicate: true, items: items };
    }
    items.push({
      id: product.id,
      name: product.name,
      category: product.category,
      categoryLabel: product.categoryLabel,
      img: product.img || '',
      qty: 1,
      note: '',
    });
    saveItems(items);
    return { added: true, duplicate: false, items: items };
  }

  function removeItem(id) {
    var items = getItems().filter(function (it) { return it.id !== id; });
    saveItems(items);
    return items;
  }

  function updateQty(id, qty) {
    var items = getItems();
    var idx = findIndex(items, id);
    if (idx === -1) return items;
    var n = parseInt(qty, 10);
    if (!n || n < 1) n = 1;
    items[idx].qty = n;
    saveItems(items);
    return items;
  }

  function updateNote(id, note) {
    var items = getItems();
    var idx = findIndex(items, id);
    if (idx === -1) return items;
    items[idx].note = note || '';
    saveItems(items);
    return items;
  }

  function hasItem(id) {
    return findIndex(getItems(), id) !== -1;
  }

  function getCount() {
    return getItems().length;
  }

  function waLink(text) {
    return 'https://wa.me/' + WA_PHONE + '?text=' + encodeURIComponent(text);
  }

  // ── Analytics (no rompe la implementación actual de gtag/GA) ──
  function pushEvent(name, params) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: name };
    for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) payload[k] = params[k]; }
    window.dataLayer.push(payload);
  }

  // ── Badge "Mi presupuesto · N" en el header ─────────────
  function renderBadges() {
    var count = getCount();
    var badges = document.querySelectorAll('[data-quote-badge]');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = String(count);
      badges[i].classList.toggle('quote-badge--empty', count === 0);
    }
  }

  // ── Marca los botones "Agregar al presupuesto" ya agregados ──
  function syncAddButtons() {
    var buttons = document.querySelectorAll('.js-add-to-quote');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var added = hasItem(btn.getAttribute('data-id'));
      setButtonState(btn, added);
    }
  }

  function setButtonState(btn, added) {
    btn.classList.toggle('is-added', added);
    var label = btn.querySelector('.js-add-to-quote-label');
    var icon = btn.querySelector('.js-add-to-quote-icon');
    if (label) label.textContent = added ? 'En tu presupuesto' : (btn.getAttribute('data-label') || 'Agregar al presupuesto');
    if (icon) icon.className = 'js-add-to-quote-icon fas ' + (added ? 'fa-check' : 'fa-plus');
  }

  // ── Toast de feedback ("✓ Agregado a tu presupuesto") ───
  var toastTimer = null;
  function ensureToastEl() {
    var el = document.getElementById('quoteToast');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'quoteToast';
    el.className = 'quote-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, opts) {
    opts = opts || {};
    var el = ensureToastEl();
    el.innerHTML = '<i class="fas ' + (opts.icon || 'fa-check-circle') + '"></i>' +
      '<span class="quote-toast__msg">' + message + '</span>' +
      (opts.showLink !== false ? '<a href="/presupuesto/" class="quote-toast__link">Ver presupuesto</a>' : '') +
      '<button type="button" class="quote-toast__close" aria-label="Cerrar">&times;</button>';
    el.classList.add('is-visible');
    el.querySelector('.quote-toast__close').addEventListener('click', hideToast);
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(hideToast, 4000);
  }

  function hideToast() {
    var el = document.getElementById('quoteToast');
    if (el) el.classList.remove('is-visible');
    if (toastTimer) { window.clearTimeout(toastTimer); toastTimer = null; }
  }

  // ── Click en cualquier botón "Agregar al presupuesto" ───
  function onAddClick(e) {
    var btn = e.target.closest ? e.target.closest('.js-add-to-quote') : null;
    if (!btn) return;
    e.preventDefault();

    var product = {
      id: btn.getAttribute('data-id'),
      name: btn.getAttribute('data-name'),
      category: btn.getAttribute('data-category'),
      categoryLabel: btn.getAttribute('data-category-label'),
      img: btn.getAttribute('data-img'),
    };
    if (!product.id || !product.name) return;

    var result = addItem(product);
    setButtonState(btn, true);

    if (result.duplicate) {
      showToast('Ya está en tu presupuesto', { icon: 'fa-info-circle' });
    } else {
      showToast('Agregado a tu presupuesto', { icon: 'fa-check-circle' });
      pushEvent('add_to_quote', {
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        quote_items_count: getCount(),
      });
    }
  }

  function init() {
    renderBadges();
    syncAddButtons();
    document.addEventListener('click', onAddClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Sincroniza el badge si el usuario tiene el sitio abierto en más de una pestaña
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) renderBadges();
  });

  window.PamperoQuote = {
    WA_PHONE: WA_PHONE,
    getItems: getItems,
    addItem: addItem,
    removeItem: removeItem,
    updateQty: updateQty,
    updateNote: updateNote,
    hasItem: hasItem,
    getCount: getCount,
    waLink: waLink,
    pushEvent: pushEvent,
    renderBadges: renderBadges,
    syncAddButtons: syncAddButtons,
    showToast: showToast,
  };
})(window, document);
