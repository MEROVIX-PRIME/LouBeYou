/* ============================================================
   LOU BE YOU — основная логика
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.LOU_CONFIG;
  const DICT = window.LOU_I18N;

  /* ---------- Язык ---------- */
  const LANGS = ["vi", "en", "ru"];
  const flagHTML = l => `<span class="flag-icon flag-${l}" aria-hidden="true"></span>`;
  const langHTML = l => `${flagHTML(l)}<span class="lang-name">${DICT[l]["lang.name"]}</span>`;
  let lang = localStorage.getItem("lou_lang");
  if (!LANGS.includes(lang)) lang = CFG.defaultLang;

  function t(key, vars) {
    let s = DICT[lang] && Object.prototype.hasOwnProperty.call(DICT[lang], key)
      ? DICT[lang][key]
      : ((DICT.en && DICT.en[key]) || key);
    if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }
  function pick(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.en || obj.vi || Object.values(obj)[0] || "";
  }
  function money(n, product) {
    const vnd = Number(n || 0);
    if (lang === "en") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(vnd / CFG.usdToVnd);
    }
    if (lang === "ru") {
      const rub = (product && product.priceRub) ? Number(product.priceRub) : (vnd / CFG.usdToVnd * CFG.usdToRub);
      return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(rub);
    }
    return new Intl.NumberFormat("vi-VN").format(Math.round(vnd)) + " ₫";
  }

  /* ---------- Загрузка товаров ---------- */
  let PRODUCTS = [];
  let COLLECTIONS = window.LOU_COLLECTIONS || [];
  let CATEGORY_TREE = window.LOU_CATEGORY_TREE || {};

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else {
        if (c === '"') q = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
        else if (c !== "\r") cell += c;
      }
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(v => String(v).trim() !== ""));
  }

  function mapSheet(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const find = names => {
      for (const n of names) {
        const i = headers.indexOf(String(n).toLowerCase());
        if (i !== -1) return i;
      }
      return -1;
    };
    const C = {};
    for (const key in CFG.sheetColumns) C[key] = find(CFG.sheetColumns[key]);

    const at = (r, i) => (i === -1 ? "" : String(r[i] == null ? "" : r[i]).trim());
    const num = v => {
      const n = parseFloat(String(v == null ? "" : v)
        .replace(/\s/g, "").replace(/[^\d.,-]/g, "")
        .replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
      return isNaN(n) ? 0 : n;
    };
    const rateRow = rows.slice(1).find(r => num(at(r, C.rateVnd)) || num(at(r, C.rateRub)));
    if (rateRow) {
      const vndRate = num(at(rateRow, C.rateVnd));
      const rubRate = num(at(rateRow, C.rateRub));
      if (vndRate > 0) CFG.usdToVnd = vndRate;
      if (rubRate > 0) CFG.usdToRub = rubRate;
    }
    const toVnd = p => CFG.currency === "USD" ? Math.round(p * CFG.usdToVnd) : p;
    const imageUrl = value => {
      const s = String(value || "").trim();
      const drive = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
      return drive ? "https://drive.google.com/thumbnail?id=" + drive[1] + "&sz=w1600" : s;
    };

    /* Убираем из названия упоминание цвета:
       "Футболка «X» — чёрная, для книголюбов" → "Футболка «X» — для книголюбов" */
    const stripColor = s => {
      const i = s.indexOf(" — ");
      if (i === -1) return s;
      const head = s.slice(0, i), tail = s.slice(i + 3);
      const j = tail.indexOf(", ");
      return j === -1 ? head : head + " — " + tail.slice(j + 2);
    };

    /* Группируем строки в товары по началу артикула */
    const groups = new Map();

    rows.slice(1).forEach((r, idx) => {
      const sku = at(r, C.sku);
      const name = at(r, C.name);
      if (!sku && !name) return;

      const rawCat = at(r, C.category).toLowerCase();
      const category = CFG.categoryMap[rawCat] || rawCat || "tshirt";
      const key = (category === "mug" || /^mug_/i.test(sku))
        ? (sku || "mug_" + idx).toLowerCase()
        : (sku.split("_")[0] || sku || "p" + idx).toLowerCase();
      const designKey = key.indexOf("mug_") === 0 ? key.slice(4) : key;
      const size = at(r, C.size).toUpperCase();
      const color = at(r, C.color).toLowerCase();
      const stock = Math.round(num(at(r, C.stock)));
      const price = toVnd(num(at(r, C.price)));
      const oldPrice = toVnd(num(at(r, C.oldPrice)));

      if (!groups.has(key)) {
        const imgCell = at(r, C.image);
        const imgs = imgCell
          ? imgCell.split(/[,;|]/).map(imageUrl).filter(Boolean)
          : (CFG.images[key] || [CFG.imageFallback]);
        const localGalleries = CFG.variantImages[key] || CFG.variantImages[designKey] || {};

        groups.set(key, {
          id: key,
          category: category,
          collection: (at(r, C.collection) || CFG.collections[designKey] || designKey || "").toLowerCase(),
          image: imgs[0],
          gallery: imgs,
          galleries: JSON.parse(JSON.stringify(localGalleries)),
          price: price,
          oldPrice: oldPrice || null,
          name: {
            ru: stripColor(name),
            en: stripColor(at(r, C.nameEn) || name),
            vi: stripColor(at(r, C.nameVi) || at(r, C.nameEn) || name)
          },
          desc: {
            en: at(r, C.desc),
            ru: at(r, C.descRu) || at(r, C.desc),
            vi: at(r, C.descVi) || at(r, C.desc)
          },
          material: {
            ru: at(r, C.specs),
            en: at(r, C.specsEn) || at(r, C.specs),
            vi: at(r, C.specsVi) || at(r, C.specs)
          },
          quote: (name.match(/«([^»]+)»/) || name.match(/"([^"]+)"/) || [])[1] || "",
          variants: [],
          sizes: [],
          colors: [],
          stock: 0
        });
      }

      const g = groups.get(key);
      const rowImages = at(r, C.image).split(/[,;|]/).map(imageUrl).filter(Boolean);
      rowImages.forEach(function (src) {
        if (!g.gallery.includes(src)) g.gallery.push(src);
      });
      if (rowImages.length) {
        const galleryColor = color || "white";
        if (!g.galleries[galleryColor]) g.galleries[galleryColor] = [];
        rowImages.slice().reverse().forEach(function (src) {
          if (!g.galleries[galleryColor].includes(src)) g.galleries[galleryColor].unshift(src);
        });
      }
      /* Защита от дублей: один и тот же размер+цвет не добавляем дважды */
      const dup = g.variants.find(v => v.size === size && v.color === color);
      if (dup) { dup.stock = Math.max(dup.stock, stock); return; }

      g.variants.push({ sku: sku, size: size, color: color, stock: stock, price: price });
      if (price && !g.price) g.price = price;
    });

    /* Досчитываем сводные поля */
    const order = CFG.sizeOrder;
    return Array.from(groups.values()).map(g => {
      g.sizes = [...new Set(g.variants.map(v => v.size).filter(Boolean))]
        .sort((a, b) => {
          const ia = order.indexOf(a), ib = order.indexOf(b);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
      g.colors = [...new Set(g.variants.map(v => v.color).filter(Boolean))];
      g.colors.sort((a, b) => (a === "white" ? -1 : b === "white" ? 1 : 0));
      g.stock = g.variants.reduce((s, v) => s + v.stock, 0);
      const firstColor = g.colors.includes("white") ? "white" : g.colors[0];
      const colorGallery = g.galleries[firstColor] || g.gallery;
      g.gallery = colorGallery && colorGallery.length ? colorGallery : [g.image];
      g.image = g.gallery[0];
      return g;
    }).filter(g => g.price > 0);
  }

  /* Остаток конкретной комбинации размер+цвет */
  function variantStock(p, size, color) {
    if (!p.variants || !p.variants.length) return p.stock;
    const v = p.variants.find(x =>
      (!size || x.size === size) && (!color || x.color === color));
    return v ? v.stock : 0;
  }
  function findVariant(p, size, color) {
    if (!p.variants || !p.variants.length) return null;
    return p.variants.find(x =>
      (!size || x.size === size) && (!color || x.color === color)) || null;
  }
  function colorLabel(code) {
    const c = CFG.colorNames[code];
    return c ? (c[lang] || c.en) : code;
  }

  function applyCatalog(mapped) {
    PRODUCTS = mapped;
    CATEGORY_TREE = window.LOU_CATEGORY_TREE || CATEGORY_TREE || {};
    const ids = [...new Set(mapped.map(p => p.collection).filter(Boolean))];
    const known = new Map((window.LOU_COLLECTIONS || COLLECTIONS).map(c => [c.id, c]));
    COLLECTIONS = ids.map(id => known.get(id) || {
      id: id,
      image: (mapped.find(p => p.collection === id) || {}).image || CFG.imageFallback,
      vi: id, en: id, ru: id
    });
  }

  async function loadProducts() {
    try {
      localStorage.removeItem("lou_catalog_rows_v2");
    } catch (e) { console.warn("Кэш каталога повреждён:", e.message); }
    applyCatalog(window.LOU_PRODUCTS || []);
  }

  async function syncProducts(button) {
    if (button) { button.disabled = true; button.classList.add("syncing"); }
    const urls = [];
    if (CFG.sheetCsvUrl) urls.push(CFG.sheetCsvUrl);
    if (CFG.sheetId) {
      urls.push("https://docs.google.com/spreadsheets/d/" + CFG.sheetId +
        "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(CFG.sheetName || ""));
    }

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const rows = parseCSV(await res.text());
        const mapped = mapSheet(rows);
        if (mapped.length) {
          applyCatalog(mapped);
          localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({ rows: rows, updatedAt: Date.now() }));
          renderFooterCollections();
          document.dispatchEvent(new Event("products:ready"));
          toast(t("catalog.updated"));
          if (button) { button.disabled = false; button.classList.remove("syncing"); }
          return true;
        }
      } catch (e) {
        console.warn("Прайс не загрузился (" + url.slice(0, 60) + "…):", e.message);
      }
    }
    toast(t("catalog.failed"));
    if (button) { button.disabled = false; button.classList.remove("syncing"); }
    return false;
  }

  /* ---------- Корзина ---------- */
  const CART_KEY = "lou_cart_v1";
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }

  const saveCart = () => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateBadge();
    document.dispatchEvent(new Event("cart:change"));
  };
  const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingCost = () => {
    const sub = cartSubtotal();
    if (!sub) return 0;
    return sub >= CFG.shipping.freeFrom ? 0 : CFG.shipping.flatRate;
  };
  const lineKey = it => [it.id, it.size || "", it.color || ""].join("::");

  function addToCart(product, size, color, qty) {
    const v = findVariant(product, size, color);
    const item = {
      id: product.id, size: size || "", color: color || "",
      qty: qty || 1,
      price: (v && v.price) || product.price,
      priceRub: (v && v.priceRub) || product.priceRub || 0,
      name: (product.namesByColor && product.namesByColor[color]) || product.name,
      image: (product.galleries && product.galleries[color] && product.galleries[color][0]) || product.image,
      category: product.category
    };
    const found = cart.find(i => lineKey(i) === lineKey(item));
    if (found) found.qty += item.qty; else cart.push(item);
    saveCart();
  }
  function updateQty(key, qty) {
    const it = cart.find(i => lineKey(i) === key);
    if (!it) return;
    it.qty = Math.max(1, Math.min(99, qty));
    saveCart();
  }
  function removeItem(key) {
    cart = cart.filter(i => lineKey(i) !== key);
    saveCart();
  }
  function clearCart() { cart = []; saveCart(); }

  function updateBadge() {
    document.querySelectorAll("[data-cart-badge]").forEach(b => {
      const n = cartCount();
      b.textContent = n;
      b.classList.toggle("show", n > 0);
    });
  }

  /* ---------- Уведомление ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span></span>';
    el.querySelector("span").textContent = msg;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- Остатки ---------- */
  function stockBadge(stock) {
    const s = Number(stock) || 0;
    if (s <= 0) return { cls: "badge-out", text: t("stock.out") };
    if (s >= CFG.stock.manyThreshold) return { cls: "badge-many", text: t("stock.many") };
    if (s <= CFG.stock.lowThreshold) return { cls: "badge-low", text: t("stock.low", { n: s }) };
    return { cls: "badge-count", text: t("stock.left", { n: s }) };
  }

  /* ---------- Шапка и подвал ---------- */
  const ICONS = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-6V1"/><path d="M20 7a9 9 0 1 0 2 7"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    moon: '<span class="usp-moon" aria-hidden="true">☾</span>',
    lou: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9z"/><circle cx="9.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11" r="1" fill="currentColor" stroke="none"/><line x1="10.5" y1="14.5" x2="13.5" y2="14.5"/></svg>'
  };

  function buildHeader() {
    const host = document.querySelector("[data-header]");
    if (!host) return;
    const page = document.body.dataset.page || "";
    const link = (href, key, id) =>
      `<a href="${href}" class="${page === id ? "active" : ""}" data-i18n="${key}">${t(key)}</a>`;

    host.innerHTML = `
      <header class="header">
        <div class="wrap header-inner">
          <a href="index.html" class="logo">
            <img src="assets/img/lou-logo.webp" alt="Lou">
            <span>Lou Be You</span>
          </a>
          <nav class="nav">
            ${link("shop.html", "nav.shop", "shop")}
            ${link("collections.html", "nav.collections", "collections")}
            ${link("about.html", "nav.about", "about")}
          </nav>
          <div class="header-actions">
            <div class="header-contact-actions">
              <a href="${CFG.instagram}" target="_blank" rel="noopener" class="icon-btn" aria-label="Instagram">${ICONS.instagram}</a>
              <button type="button" class="header-email-copy" data-copy-email aria-label="${t("header.copyEmail")}" title="${t("header.copyEmail")}">
                ${ICONS.mail}<span>nastakinski1991@gmai.com</span>
              </button>
              <div class="lang lang-before-cart">
                <button class="lang-btn" data-lang-toggle aria-haspopup="true" aria-expanded="false" aria-label="${DICT[lang]["lang.name"]}" title="${DICT[lang]["lang.name"]}">
                  <span data-lang-flag>${langHTML(lang)}</span>
                  ${ICONS.chevron}
                </button>
                <div class="lang-menu">
                  ${LANGS.map(l => `<button data-set-lang="${l}" class="${l === lang ? "active" : ""}" aria-label="${DICT[l]["lang.name"]}">${langHTML(l)}</button>`).join("")}
                </div>
              </div>
              <a href="cart.html" class="icon-btn" aria-label="${t("nav.cart")}">
                ${ICONS.cart}<span class="cart-badge" data-cart-badge>0</span>
              </a>
            </div>
            <button class="icon-btn burger" data-burger aria-label="${t("nav.menu")}">${ICONS.menu}</button>
          </div>
        </div>
      </header>
      <div class="mobile-nav" data-mobile-nav>
        <a href="shop.html" data-i18n="nav.shop">${t("nav.shop")}</a>
        <a href="collections.html" data-i18n="nav.collections">${t("nav.collections")}</a>
        <a href="about.html" data-i18n="nav.about">${t("nav.about")}</a>
        <a href="cart.html" data-i18n="nav.cart">${t("nav.cart")}</a>
      </div>`;

    const langBox = host.querySelector(".lang");
    host.querySelector("[data-lang-toggle]").addEventListener("click", e => {
      e.stopPropagation();
      langBox.classList.toggle("open");
    });
    document.addEventListener("click", () => langBox.classList.remove("open"));
    host.querySelectorAll("[data-set-lang]").forEach(b => {
      b.addEventListener("click", () => setLang(b.dataset.setLang));
    });
    host.querySelector("[data-copy-email]").addEventListener("click", async () => {
      const email = "nastakinski1991@gmai.com";
      try {
        await navigator.clipboard.writeText(email);
      } catch (e) {
        const field = document.createElement("textarea");
        field.value = email; field.style.position = "fixed"; field.style.opacity = "0";
        document.body.appendChild(field); field.select(); document.execCommand("copy"); field.remove();
      }
      toast(t("header.emailCopied"));
    });

    const mob = host.querySelector("[data-mobile-nav]");
    const burger = host.querySelector("[data-burger]");
    burger.addEventListener("click", () => {
      const open = mob.classList.toggle("open");
      burger.innerHTML = open ? ICONS.close : ICONS.menu;
      document.body.style.overflow = open ? "hidden" : "";
    });

    updateBadge();
  }

  function buildFooter() {
    const host = document.querySelector("[data-footer]");
    if (!host) return;
    host.innerHTML = `
      <footer class="footer">
        <div class="wrap">
          <div class="footer-grid">
            <div class="footer-brand">
              <a href="index.html" class="logo">
                <img src="assets/img/lou-logo.webp" alt="Lou"><span>Lou Be You</span>
              </a>
              <p data-i18n="footer.tagline">${t("footer.tagline")}</p>
              <div class="socials">
                <a href="${CFG.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.instagram}</a>
                <a href="mailto:${CFG.orderEmail}" aria-label="Email">${ICONS.mail}</a>
              </div>
            </div>
            <div class="footer-col">
              <h4 data-i18n="footer.shop">${t("footer.shop")}</h4>
              <a href="shop.html?cat=tshirt" data-i18n="footer.tshirts">${t("footer.tshirts")}</a>
              <a href="shop.html?cat=mug" data-i18n="footer.mugs">${t("footer.mugs")}</a>
              <a href="shop.html" data-i18n="shop.all">${t("shop.all")}</a>
            </div>
            <div class="footer-col">
              <h4 data-i18n="footer.collections">${t("footer.collections")}</h4>
              <div data-footer-collections></div>
            </div>
            <div class="footer-col">
              <h4 data-i18n="footer.help">${t("footer.help")}</h4>
              <a href="about.html#faq" data-i18n="footer.faq">${t("footer.faq")}</a>
              <a href="about.html#shipping" data-i18n="footer.shipping">${t("footer.shipping")}</a>
              <a href="about.html#returns" data-i18n="footer.returns">${t("footer.returns")}</a>
            </div>
            <div class="footer-col">
              <h4 data-i18n="footer.about">${t("footer.about")}</h4>
              <a href="about.html" data-i18n="footer.story">${t("footer.story")}</a>
              <a href="${CFG.instagram}" target="_blank" rel="noopener">Instagram</a>
              <a href="mailto:${CFG.orderEmail}" data-i18n="footer.contact">${t("footer.contact")}</a>
            </div>
            <div class="footer-news">
              <h4 data-i18n="footer.newsletter">${t("footer.newsletter")}</h4>
              <p data-i18n="footer.newsletterText">${t("footer.newsletterText")}</p>
              <form class="news-form" data-news>
                <input type="email" required placeholder="${t("footer.emailPlaceholder")}" data-i18n-ph="footer.emailPlaceholder" aria-label="Email">
                <button type="submit" aria-label="${t("footer.subscribe")}">${ICONS.arrow}</button>
              </form>
              <div class="news-done" data-news-done data-i18n="footer.subscribed">${t("footer.subscribed")}</div>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} Lou Be You. <span data-i18n="footer.rights">${t("footer.rights")}</span></span>
            <nav>
              <a href="about.html#shipping" data-i18n="footer.shipping">${t("footer.shipping")}</a>
              <a href="about.html#returns" data-i18n="footer.returns">${t("footer.returns")}</a>
              <a href="mailto:${CFG.orderEmail}" data-i18n="footer.contact">${t("footer.contact")}</a>
            </nav>
          </div>
        </div>
      </footer>`;

    const form = host.querySelector("[data-news]");
    form.addEventListener("submit", e => {
      e.preventDefault();
      host.querySelector("[data-news-done]").classList.add("show");
      form.reset();
    });
    renderFooterCollections();
  }

  function renderFooterCollections() {
    const box = document.querySelector("[data-footer-collections]");
    if (!box) return;
    box.innerHTML = COLLECTIONS.slice(0, 5)
      .map(c => `<a href="collections.html?c=${encodeURIComponent(c.id)}">${pick(c)}</a>`).join("");
  }

  /* ---------- Применение перевода ---------- */
  function applyI18n(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach(el => {
      el.innerHTML = t(el.dataset.i18n);
    });
    (root || document).querySelectorAll("[data-i18n-ph]").forEach(el => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.documentElement.lang = lang;
  }

  function setLang(l) {
    if (!LANGS.includes(l) || l === lang) return;
    lang = l;
    localStorage.setItem("lou_lang", l);
    document.querySelectorAll("[data-lang-current]").forEach(e => (e.textContent = l));
    document.querySelectorAll("[data-lang-flag]").forEach(e => (e.innerHTML = langHTML(l)));
    document.querySelectorAll("[data-lang-toggle]").forEach(e => {
      e.setAttribute("aria-label", DICT[l]["lang.name"]);
      e.setAttribute("title", DICT[l]["lang.name"]);
    });
    document.querySelectorAll("[data-set-lang]").forEach(b =>
      b.classList.toggle("active", b.dataset.setLang === l));
    applyI18n();
    renderFooterCollections();
    document.dispatchEvent(new Event("lang:change"));
  }

  /* ---------- Карточка товара ---------- */
  function collectionLabel(p) {
    if (!p.collection) return "";
    var c = COLLECTIONS.find(function(x) { return x.id === p.collection; });
    return c ? pick(c) : "";
  }

  function cardHTML(p) {
    const sb = stockBadge(p.stock);
    const collName = collectionLabel(p);
    const catLine = collName ? (t("card.collection") + " «" + collName + "»") : "";
    return `
      <a class="card" href="product.html?id=${encodeURIComponent(p.id)}">
        <div class="card-media">
          <span class="badge ${sb.cls}">${sb.text}</span>
          ${p.hit ? '<span class="badge badge-hit">' + t("card.hit") + '</span>' : ""}
          ${p.oldPrice ? '<span class="badge badge-sale">-' + Math.round((1 - p.price / p.oldPrice) * 100) + "%</span>" : ""}
          <img src="${p.image}" alt="${pick(p.name)}" loading="lazy">
        </div>
        <div class="card-body">
          ${catLine ? '<div class="card-cat">' + catLine + '</div>' : ''}
          <div class="card-title">${pick(p.name)}</div>
          ${"" /* quote removed — дублирует название коллекции */}
          <div class="card-foot">
            <span class="price">${money(p.price, p)}</span>
            ${p.oldPrice ? '<span class="price-old">' + money(p.oldPrice) + "</span>" : ""}
          </div>
        </div>
      </a>`;
  }

  function renderGrid(host, items) {
    if (!host) return;
    if (!items.length) {
      host.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <img src="assets/img/lou-logo.webp" alt="">
        <p data-i18n="shop.empty">${t("shop.empty")}</p></div>`;
      return;
    }
    host.innerHTML = items.map(cardHTML).join("");
  }

  /* ---------- Модалка товара ---------- */
  const SIZE_TABLE = [
    ["S", 96, 66, 42], ["M", 102, 69, 45], ["L", 108, 72, 48],
    ["XL", 114, 75, 51], ["XXL", 120, 78, 54]
  ];

  function ensureModal() {
    let m = document.querySelector("[data-modal]");
    if (m) return m;
    m = document.createElement("div");
    m.className = "modal";
    m.setAttribute("data-modal", "");
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.innerHTML = '<div class="modal-backdrop" data-modal-close></div><div class="modal-box" data-modal-body></div>';
    document.body.appendChild(m);
    m.querySelector("[data-modal-close]").addEventListener("click", closeProduct);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && m.classList.contains("open")) closeProduct();
    });
    return m;
  }

  function closeProduct() {
    const m = document.querySelector("[data-modal]");
    if (!m) return;
    m.classList.remove("open");
    document.body.style.overflow = "";
    if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
  }

  function openProduct(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    const pageHost = document.querySelector("[data-product-page]");
    const pageMode = Boolean(pageHost);
    const m = pageMode ? pageHost : ensureModal();
    if (pageMode) m.innerHTML = '<div class="modal-box" data-modal-body></div>';
    const box = m.querySelector("[data-modal-body]");
    const requestedColor = pageMode ? new URLSearchParams(location.search).get("color") : "";
    const defaultColor = requestedColor && p.colors && p.colors.includes(requestedColor)
      ? requestedColor
      : (p.colors && p.colors.includes("white") ? "white" : (p.colors && p.colors[0]));
    const productCrumb = document.querySelector("[data-product-crumb]");
    if (productCrumb) productCrumb.textContent = pick((p.namesByColor && p.namesByColor[defaultColor]) || p.name);
    var gallery = (p.galleries && p.galleries[defaultColor]) || (p.gallery && p.gallery.length ? p.gallery : [p.image]);
    gallery = gallery.slice();
    if (p.sizeImage) gallery.push(p.sizeImage);
    const similar = PRODUCTS
      .filter(x => x.id !== p.id)
      .sort((a, b) => {
        const s = (x) => (x.collection === p.collection ? 0 : 1) + (x.category === p.category ? 0 : 2);
        return s(a) - s(b);
      })
      .slice(0, 5);

    box.innerHTML = `
      ${pageMode ? "" : `<button class="modal-close" data-modal-close aria-label="${t("common.close")}">${ICONS.close}</button>`}
      <div class="pd">
        <div class="pd-media">
          <div class="pd-main"><img src="${gallery[0]}" alt="${pick(p.name)}" data-pd-main></div>
          ${gallery.length > 1 ? '<div class="pd-thumbs">' + gallery.map((g, i) =>
            `<button class="pd-thumb ${i === 0 ? "active" : ""}" data-thumb="${g}"><img src="${g}" alt=""></button>`).join("") + "</div>" : ""}
        </div>
        <div class="pd-info">
          <div class="pd-cat">${collectionLabel(p) ? t("card.collection") + " «" + collectionLabel(p) + "»" : ""}</div>
          <h2 class="pd-title" data-pd-title>${pick((p.namesByColor && p.namesByColor[defaultColor]) || p.name)}</h2>
          ${"" /* quote removed — дублирует название коллекции */}
          <div class="pd-price">
            <span class="price">${money(p.price, p)}</span>
            ${p.oldPrice ? '<span class="price-old">' + money(p.oldPrice) + "</span>" : ""}
          </div>
          <div class="pd-stock" data-pd-stock></div>

          ${p.sizes && p.sizes.length ? `
          <div class="field">
            <div class="field-label">
              <span>${t("product.size")}</span>
            </div>
            <div class="opts" data-opts="size">
              ${p.sizes.map(s => `<button class="opt" data-val="${s}">${s}</button>`).join("")}
            </div>
          </div>` : ""}

          ${p.colors && p.colors.length ? `
          <div class="field">
            <div class="field-label">
              <span>${t("product.color")}</span>
              <em data-color-name style="font-style:normal;text-transform:none;letter-spacing:0"></em>
            </div>
            <div class="opts" data-opts="color">
              ${p.colors.map(c => {
                const sw = CFG.colorSwatch[c] || "#DDD4C5";
                return `<button class="opt opt-color" data-val="${c}" title="${colorLabel(c)}" aria-label="${colorLabel(c)}">
                  <i style="background:${sw}"></i></button>`;
              }).join("")}
            </div>
          </div>` : ""}

          <div class="field">
            <div class="field-label"><span>${t("product.qty")}</span></div>
            <div class="qty">
              <button data-qty="-1" aria-label="−">−</button>
              <input type="number" value="1" min="1" max="99" data-qty-input aria-label="${t("product.qty")}">
              <button data-qty="1" aria-label="+">+</button>
            </div>
          </div>

          <div class="pd-actions">
            <button class="btn btn-primary btn-lg" data-add>${t("product.add")}</button>
          </div>

          <div class="accordion">
            <div class="acc-item open">
              <button class="acc-head">${t("product.details")}${ICONS.chevron}</button>
              <div class="acc-body">${pick(p.desc) || ""}</div>
            </div>
            <div class="acc-item">
              <button class="acc-head">${t("product.material")}${ICONS.chevron}</button>
              <div class="acc-body">${pick(p.material) || ""}</div>
            </div>
            <div class="acc-item">
              <button class="acc-head">${t("product.sku")}${ICONS.chevron}</button>
              <div class="acc-body">${p.id}</div>
            </div>
          </div>
        </div>
      </div>
      ${similar.length ? `
      <div class="similar">
        <h3>${t("product.similar")}</h3>
        <div class="similar-row">
          ${similar.map(s => `
            <a class="similar-card" href="product.html?id=${encodeURIComponent(s.id)}">
              <div class="sc-media"><img src="${s.image}" alt="${pick(s.name)}" loading="lazy"></div>
              <strong>${pick(s.name)}</strong>
              <span>${money(s.price, s)}</span>
            </a>`).join("")}
        </div>
      </div>` : ""}`;

    /* Обработчики */
    const closeButton = box.querySelector("[data-modal-close]");
    if (closeButton) closeButton.addEventListener("click", closeProduct);

    let currentImgIdx = 0;
    let currentGallery = gallery.slice();

    function showImage(idx) {
      if (idx < 0 || idx >= currentGallery.length) return;
      currentImgIdx = idx;
      box.querySelector("[data-pd-main]").src = currentGallery[idx];
      box.querySelectorAll(".pd-thumb").forEach((x, i) => x.classList.toggle("active", i === idx));
      box.querySelectorAll(".pd-dot").forEach((d, i) => d.classList.toggle("active", i === idx));
    }

    function bindThumbs() {
      box.querySelectorAll("[data-thumb]").forEach((b, i) => {
        b.addEventListener("click", () => showImage(i));
      });
    }

    /* Mobile swipe on main image */
    (function initSwipe() {
      const main = box.querySelector(".pd-main");
      if (!main) return;
      let startX = 0, startY = 0, tracking = false;
      main.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
      }, { passive: true });
      main.addEventListener("touchend", e => {
        if (!tracking) return;
        tracking = false;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0 && currentImgIdx < currentGallery.length - 1) showImage(currentImgIdx + 1);
        else if (dx > 0 && currentImgIdx > 0) showImage(currentImgIdx - 1);
      }, { passive: true });
    })();

    function updateDots() {
      let dotsEl = box.querySelector(".pd-dots");
      if (currentGallery.length <= 1) { if (dotsEl) dotsEl.remove(); return; }
      if (!dotsEl) {
        dotsEl = document.createElement("div");
        dotsEl.className = "pd-dots";
        const main = box.querySelector(".pd-main");
        main.parentNode.insertBefore(dotsEl, main.nextSibling);
      }
      dotsEl.innerHTML = currentGallery.map((_, i) =>
        `<span class="pd-dot ${i === currentImgIdx ? "active" : ""}"></span>`).join("");
      dotsEl.querySelectorAll(".pd-dot").forEach((d, i) => {
        d.addEventListener("click", () => showImage(i));
      });
    }
    updateDots();
    function renderColorGallery(color) {
      var images = ((p.galleries && p.galleries[color]) || p.gallery || [p.image]).slice();
      if (p.sizeImage) images.push(p.sizeImage);
      currentGallery = images;
      currentImgIdx = 0;
      box.querySelector("[data-pd-main]").src = images[0];
      const colorTitle = p.namesByColor && p.namesByColor[color];
      if (colorTitle) {
        box.querySelector("[data-pd-title]").textContent = pick(colorTitle);
        if (productCrumb) productCrumb.textContent = pick(colorTitle);
      }
      const thumbs = box.querySelector(".pd-thumbs");
      if (thumbs) {
        thumbs.innerHTML = images.map((src, i) =>
          `<button class="pd-thumb ${i === 0 ? "active" : ""}" data-thumb="${src}"><img src="${src}" alt=""></button>`
        ).join("");
        bindThumbs();
      }
      updateDots();
    }
    bindThumbs();

    /* Выбор варианта пересчитывает остаток и доступность кнопки */
    const stockEl = box.querySelector("[data-pd-stock]");
    const addBtn = box.querySelector("[data-add]");
    const colorNameEl = box.querySelector("[data-color-name]");
    const sel = { size: "", color: "" };

    function currentStock() {
      const needSize = p.sizes && p.sizes.length;
      const needColor = p.colors && p.colors.length;
      if ((needSize && !sel.size) || (needColor && !sel.color)) return p.stock;
      return variantStock(p, sel.size, sel.color);
    }

    function refreshStock() {
      const s = currentStock();
      const b = stockBadge(s);
      stockEl.innerHTML = '<span class="badge ' + b.cls + '" style="position:static">' + b.text + "</span>";
      if (colorNameEl) colorNameEl.textContent = sel.color ? colorLabel(sel.color) : "";

      /* Обновляем цену при выборе варианта */
      const priceEl = box.querySelector(".pd-price .price");
      if (priceEl) {
        const v = findVariant(p, sel.size, sel.color);
        const vPrice = v && v.price ? v.price : p.price;
        const vPriceRub = v && v.priceRub ? v.priceRub : p.priceRub;
        priceEl.textContent = money(vPrice, { price: vPrice, priceRub: vPriceRub });
      }

      const chosen = (!p.sizes.length || sel.size) && (!p.colors.length || sel.color);
      const sold = chosen && s <= 0;
      addBtn.disabled = sold;
      addBtn.textContent = sold ? t("product.outOfStock") : t("product.add");

      if (s > 0) {
        qtyInput.max = s;
        if (parseInt(qtyInput.value, 10) > s) qtyInput.value = s;
      }
    }

    box.querySelectorAll("[data-opts]").forEach(group => {
      const kind = group.dataset.opts;
      group.querySelectorAll(".opt").forEach(o => {
        o.addEventListener("click", () => {
          group.querySelectorAll(".opt").forEach(x => x.classList.remove("active"));
          o.classList.add("active");
          sel[kind] = o.dataset.val;
          if (kind === "color") renderColorGallery(sel.color);
          refreshStock();
        });
      });
    });

    const qtyInput = box.querySelector("[data-qty-input]");
    box.querySelectorAll("[data-qty]").forEach(b => {
      b.addEventListener("click", () => {
        const max = Math.max(1, Math.min(99, currentStock() || 99));
        const v = Math.max(1, Math.min(max, (parseInt(qtyInput.value, 10) || 1) + parseInt(b.dataset.qty, 10)));
        qtyInput.value = v;
      });
    });

    /* Белая футболка всегда открывается первой; для кружки выбирается единственный цвет. */
    if (p.colors && p.colors.length) {
      const preferred = box.querySelector('[data-opts="color"] .opt[data-val="' + defaultColor + '"]') || box.querySelector('[data-opts="color"] .opt');
      if (preferred) {
        preferred.classList.add("active");
        sel.color = preferred.dataset.val;
        renderColorGallery(sel.color);
      }
    }
    refreshStock();

    box.querySelectorAll(".acc-head").forEach(h => {
      h.addEventListener("click", () => h.parentElement.classList.toggle("open"));
    });

    const guide = box.querySelector("[data-size-guide]");
    if (guide) guide.addEventListener("click", () => openSizeGuide(p));

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (p.sizes.length && !sel.size) { toast(t("product.chooseSize")); return; }
        if (p.colors.length && !sel.color) { toast(t("product.chooseColor")); return; }
        const s = currentStock();
        if (s <= 0) { toast(t("product.outOfStock")); return; }
        const qty = Math.min(parseInt(qtyInput.value, 10) || 1, s);
        addToCart(p, sel.size, sel.color, qty);
        toast(t("product.added"));
      });
    }

    if (!pageMode) {
      m.classList.add("open");
      document.body.style.overflow = "hidden";
      history.replaceState(null, "", "#p=" + encodeURIComponent(p.id));
    }
    box.scrollTop = 0;
  }

  function openSizeGuide(prod) {
    const m = ensureModal();
    const box = m.querySelector("[data-modal-body]");
    const prev = box.innerHTML;
    const sizeImg = prod && prod.sizeImage;
    box.innerHTML = `
      <button class="modal-close" data-back aria-label="${t("common.close")}">${ICONS.close}</button>
      <div style="padding:38px 34px 34px">
        <h2 class="display" style="font-size:1.7rem;margin-bottom:6px">${t("size.title")}</h2>
        ${sizeImg
          ? `<img src="${sizeImg}" alt="${t("size.title")}" style="width:100%;margin-top:18px;border-radius:16px">`
          : CFG.sizeChartImage
            ? `<img src="assets/img/${CFG.sizeChartImage}" alt="${t("size.title")}" style="margin-top:18px;border-radius:16px">`
            : `<table class="size-table">
                <thead><tr>
                  <th>${t("size.size")}</th><th>${t("size.chest")}</th>
                  <th>${t("size.length")}</th><th>${t("size.shoulder")}</th>
                </tr></thead>
                <tbody>${SIZE_TABLE.map(r => `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</tbody>
              </table>`}
        <p class="size-note">${t("size.note")}</p>
      </div>`;
    box.querySelector("[data-back]").addEventListener("click", () => {
      box.innerHTML = prev;
      const id = decodeURIComponent((location.hash.split("=")[1] || ""));
      if (id) openProduct(id); else closeProduct();
    });
    box.scrollTop = 0;
  }

  /* ---------- Экспорт ---------- */
  window.LOU = {
    t, pick, money, setLang, getLang: () => lang,
    get products() { return PRODUCTS; },
    get collections() { return COLLECTIONS; },
    get categoryTree() { return CATEGORY_TREE; },
    get cart() { return cart; },
    cartCount, cartSubtotal, shippingCost, lineKey,
    addToCart, updateQty, removeItem, clearCart,
    stockBadge, variantStock, findVariant, colorLabel, renderGrid, cardHTML, openProduct, toast,
    icons: ICONS, applyI18n
  };

  /* ---------- Старт ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    buildHeader();
    buildFooter();
    applyI18n();
    await loadProducts();
    renderFooterCollections();
    document.dispatchEvent(new Event("products:ready"));

    if (location.hash.startsWith("#p=")) {
      const id = decodeURIComponent(location.hash.slice(3));
      setTimeout(() => openProduct(id), 60);
    }
  });
})();
