/* =========================================================
   ELYSANYA PERFUMARIA v2 — vitrine, sacola e pedido pelo WhatsApp
   ========================================================= */
(() => {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDesk = () => window.matchMedia("(min-width: 960px)").matches;

  const state = { categorias: [], produtos: [], filtro: "Todos", busca: "", visiveis: [], lista: [], atual: -1, bag: loadBag() };

  /* ---------- util ---------- */
  const brl = (v) => (typeof v === "number" && v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Consulte");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const pad = (n) => String(n).padStart(2, "0");
  const waUrl = (text) => `https://wa.me/${CFG.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  function loadBag() { try { return JSON.parse(localStorage.getItem("ely_bag") || "[]"); } catch { return []; } }
  function saveBag() { try { localStorage.setItem("ely_bag", JSON.stringify(state.bag)); } catch {} }
  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("is-show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("is-show"), 2200); }

  function applyConfig() {
    $$("[data-wa-link]").forEach((a) => (a.href = waUrl("Olá, Elysanya! Vim pelo site e gostaria de mais informações.")));
    $$("[data-wa-display]").forEach((s) => (s.textContent = CFG.whatsappExibicao || ""));
    $$("[data-city]").forEach((s) => (s.textContent = CFG.cidade || ""));
    $$("[data-ig-link]").forEach((a) => { if (CFG.instagram) a.href = CFG.instagram; else a.remove(); });
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  }

  async function loadData() {
    try {
      const res = await fetch(`data/produtos.json?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      state.categorias = data.categorias || [];
      state.produtos = (data.produtos || []).filter((p) => p && p.nome);
    } catch (e) {
      console.error("Não foi possível carregar os produtos", e);
      $("#grid").innerHTML = `<p class="empty">Não foi possível carregar a vitrine agora. Fale com a gente pelo WhatsApp.</p>`;
    }
  }

  /* ---------- Categorias em arco ---------- */
  function catList() {
    const counts = {};
    state.produtos.forEach((p) => (counts[p.categoria] = (counts[p.categoria] || 0) + 1));
    const cats = state.categorias.filter((c) => counts[c]);
    Object.keys(counts).forEach((c) => { if (!cats.includes(c)) cats.push(c); });
    return { cats, counts };
  }
  function renderCats() {
    const { cats, counts } = catList();
    $("#cats").innerHTML = cats.map((c) => {
      const p = state.produtos.find((x) => x.categoria === c && x.destaque) || state.produtos.find((x) => x.categoria === c);
      return `<button class="cat reveal" data-gocat="${esc(c)}">
        <span class="cat__arch"><img src="${esc(p.imagem)}" alt="" loading="lazy" width="1000" height="1250"></span>
        <span class="cat__name">${esc(c)}</span>
        <span class="cat__count">${counts[c]} ${counts[c] === 1 ? "item" : "itens"}</span>
      </button>`;
    }).join("");
    observe($$(".cat"), true);
  }

  function renderChips() {
    const { cats, counts } = catList();
    const all = ["Todos", ...cats];
    $("#chips").innerHTML = all.map((c) => {
      const n = c === "Todos" ? state.produtos.length : counts[c];
      return `<button class="chip${c === state.filtro ? " is-active" : ""}" role="tab" aria-selected="${c === state.filtro}" data-cat="${esc(c)}">${esc(c)}<sup>${n}</sup></button>`;
    }).join("");
    const wrap = $("#chips"), act = $(".chip.is-active", wrap);
    if (act) wrap.scrollTo({ left: act.offsetLeft - wrap.clientWidth / 2 + act.offsetWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------- Grade ---------- */
  function applyFilter() {
    const q = norm(state.busca);
    state.visiveis = state.produtos.filter((p) => {
      if (state.filtro !== "Todos" && p.categoria !== state.filtro) return false;
      return !q || norm([p.nome, p.marca, p.categoria, p.familia, p.descricao].join(" ")).includes(q);
    });
  }
  function cardHTML(p) {
    const off = p.disponivel === false;
    const added = state.bag.some((b) => b.id === p.id);
    return `
      <article class="card${off ? " is-off" : ""}">
        <button class="card__media" data-open="${esc(p.id)}" aria-label="Ver detalhes de ${esc(p.nome)}">
          <img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" decoding="async" width="1000" height="1250" data-loaded="0" onload="this.dataset.loaded=1">
          ${off ? `<span class="card__tag card__tag--off">Esgotado</span>` : p.destaque ? `<span class="card__tag">Mais pedido</span>` : ""}
        </button>
        <div class="card__body">
          <span class="card__brand">${esc(p.marca)}</span>
          <h3 class="card__name"><button data-open="${esc(p.id)}">${esc(p.nome)}</button></h3>
          <span class="card__vol">${esc(p.volume || "")}</span>
          <span class="card__price">${brl(p.preco)}</span>
          ${off
            ? `<button class="card__add" data-open="${esc(p.id)}">Avise-me</button>`
            : `<button class="card__add${added ? " is-added" : ""}" data-add="${esc(p.id)}">${added ? "Na sacola ✓" : "Adicionar"}</button>`}
        </div>
      </article>`;
  }
  function renderGrid() {
    applyFilter();
    const list = state.visiveis;
    $("#count").textContent = `${list.length} ${list.length === 1 ? "produto" : "produtos"}`;
    if (!list.length) {
      $("#grid").innerHTML = `<p class="empty">Nada encontrado por aqui. <a href="${waUrl("Olá! Procuro um produto que não achei no site: " + state.busca)}" target="_blank" rel="noopener">Pergunte pelo WhatsApp</a>, a Elysanya pode ter.</p>`;
      return;
    }
    $("#grid").innerHTML = list.map(cardHTML).join("");
    observe($$("#grid .card"), true);
  }

  /* ---------- Escolhas ---------- */
  function renderFeatured() {
    const feat = state.produtos.filter((p) => p.destaque && p.disponivel !== false);
    if (!feat.length) { $("#escolhas").style.display = "none"; return; }
    $("#featured").innerHTML = feat.map((p) => `
      <button class="pick" data-open="${esc(p.id)}">
        <span class="pick__img"><img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" width="1000" height="1250"></span>
        <span class="pick__body">
          <span class="pick__brand">${esc(p.marca)}</span>
          <span class="pick__name">${esc(p.nome)}</span>
          <span class="pick__foot"><span class="pick__price">${brl(p.preco)}</span><span class="pick__go">Ver detalhes →</span></span>
        </span>
      </button>`).join("");
  }

  /* ---------- Painéis ---------- */
  let openSheet = null, lastFocus = null;
  function showSheet(el) {
    if (openSheet && openSheet !== el) openSheet.classList.remove("is-open");
    lastFocus = document.activeElement;
    openSheet = el;
    el.classList.add("is-open");
    $("#overlay").classList.add("is-open");
    document.body.classList.add("is-locked");
    $("#floatbar").classList.remove("is-visible");
    setTimeout(() => $("[data-close]", el)?.focus({ preventScroll: true }), 60);
  }
  function hideSheet() {
    if (!openSheet) return;
    openSheet.classList.remove("is-open");
    openSheet.style.transform = "";
    openSheet = null;
    $("#overlay").classList.remove("is-open");
    document.body.classList.remove("is-locked");
    if (location.hash.startsWith("#p/")) history.replaceState(null, "", location.pathname + location.search);
    lastFocus?.focus?.({ preventScroll: true });
    renderBag();
  }

  function openProduct(id) {
    let list = state.visiveis.length ? state.visiveis : state.produtos;
    let idx = list.findIndex((p) => p.id === id);
    if (idx < 0) { list = state.produtos; idx = list.findIndex((p) => p.id === id); }
    if (idx < 0) return;
    state.lista = list; state.atual = idx;
    renderProduct();
    showSheet($("#productSheet"));
    history.replaceState(null, "", "#p/" + id);
  }
  function renderProduct() {
    const list = state.lista, p = list[state.atual], off = p.disponivel === false;
    $("#pdCounter").textContent = `${pad(state.atual + 1)} / ${pad(list.length)}`;
    const tags = [p.volume, p.familia, p.categoria].filter(Boolean);
    const msg = `Olá, Elysanya! Vim pelo site e tenho interesse em:\n\n• ${p.nome}${p.volume ? " (" + p.volume + ")" : ""} — ${brl(p.preco)}\n\nAinda tem disponível?`;
    $("#pdContent").innerHTML = `
      <div class="pd">
        <div class="pd__media"><img src="${esc(p.imagem)}" alt="${esc(p.nome)}" width="1000" height="1250"></div>
        <div class="pd__body">
          <span class="pd__brand">${esc(p.marca)}</span>
          <h2 class="pd__name">${esc(p.nome)}</h2>
          <div class="pd__tags">${tags.map((t) => `<span class="pd__tag">${esc(t)}</span>`).join("")}</div>
          <p class="pd__desc">${esc(p.descricao)}</p>
          <div class="pd__price">${brl(p.preco)}<small>Valor confirmado no atendimento</small></div>
          ${off ? "" : `
          <div class="pd__buy">
            <div class="qty" aria-label="Quantidade"><button data-pdqty="-1" aria-label="Diminuir">−</button><span id="pdQty">1</span><button data-pdqty="1" aria-label="Aumentar">+</button></div>
            <button class="pill pill--cocoa pill--lg" data-pdadd="${esc(p.id)}">Adicionar à sacola</button>
          </div>`}
          <a class="pill pill--rose pill--lg pd__wa" href="${waUrl(off ? `Olá, Elysanya! Vi no site que o ${p.nome} está esgotado. Vai chegar de novo?` : msg)}" target="_blank" rel="noopener">${off ? "Avise-me quando chegar" : "Pedir agora no WhatsApp"} <span aria-hidden="true">→</span></a>
          <div class="pd__nav"><button data-pdnav="-1">← Anterior</button><button data-pdnav="1">Próximo →</button></div>
        </div>
      </div>`;
    $("#pdContent").scrollTop = 0;
  }

  /* ---------- Sacola ---------- */
  const findProduct = (id) => state.produtos.find((p) => p.id === id);
  const bagItems = () => state.bag.map((it) => ({ ...it, p: findProduct(it.id) })).filter((it) => it.p);
  function bagTotal(items) {
    let total = 0, consult = false;
    items.forEach((it) => { if (it.p.preco > 0) total += it.p.preco * it.qty; else consult = true; });
    return { total, consult };
  }
  function addToBag(id, qty = 1) {
    const it = state.bag.find((b) => b.id === id);
    if (it) it.qty += qty; else state.bag.push({ id, qty });
    saveBag(); renderBag();
    const badge = $("[data-bag-num]");
    badge.classList.remove("is-bump"); void badge.offsetWidth; badge.classList.add("is-bump");
    toast(`${findProduct(id)?.nome || "Produto"} na sacola`);
  }
  function setQty(id, qty) {
    if (qty <= 0) state.bag = state.bag.filter((b) => b.id !== id);
    else { const it = state.bag.find((b) => b.id === id); if (it) it.qty = qty; }
    saveBag(); renderBag();
  }
  function renderBag() {
    const items = bagItems();
    const n = items.reduce((s, it) => s + it.qty, 0);
    const { total, consult } = bagTotal(items);
    const totalTxt = total > 0 ? brl(total) + (consult ? " + consulta" : "") : consult ? "Consulte" : "R$ 0,00";
    $$("[data-bag-count]").forEach((el) => (el.textContent = `(${n})`));
    const badge = $("[data-bag-num]"); badge.textContent = n; badge.classList.toggle("is-on", n > 0);
    $("#bagTotal").textContent = totalTxt;
    $("#fbCount").textContent = `${n} ${n === 1 ? "item" : "itens"} na sacola`;
    $("#fbTotal").textContent = total > 0 ? totalTxt : "";
    $("#floatbar").classList.toggle("is-visible", n > 0 && !openSheet);
    $("#waFab").classList.toggle("is-hidden", n > 0);
    $("#bagFoot").style.display = n ? "" : "none";
    $$("[data-add]").forEach((b) => {
      const on = state.bag.some((x) => x.id === b.dataset.add);
      b.classList.toggle("is-added", on);
      b.textContent = on ? "Na sacola ✓" : "Adicionar";
    });
    $("#bagContent").innerHTML = n
      ? `<ul class="bag__list">${items.map((it) => `
          <li class="bag__item">
            <div class="bag__thumb"><img src="${esc(it.p.imagem)}" alt="" width="1000" height="1250"></div>
            <div><div class="bag__name">${esc(it.p.nome)}</div><div class="bag__meta">${esc(it.p.volume || it.p.marca)} · ${brl(it.p.preco)}</div></div>
            <div class="bag__controls">
              <div class="qty"><button data-bagqty="${esc(it.id)}" data-d="-1" aria-label="Diminuir">−</button><span>${it.qty}</span><button data-bagqty="${esc(it.id)}" data-d="1" aria-label="Aumentar">+</button></div>
              <button class="bag__remove" data-bagrm="${esc(it.id)}">Remover</button>
            </div>
          </li>`).join("")}</ul>`
      : `<div class="bag__empty"><h3>Sua sacola está vazia</h3><p>Escolha seus favoritos na vitrine e envie tudo de uma vez pelo WhatsApp.</p><button class="pill pill--cocoa" data-close data-goto="#vitrine">Ver a vitrine →</button></div>`;
  }
  function checkout() {
    const items = bagItems();
    if (!items.length) return;
    const { total, consult } = bagTotal(items);
    const nome = $("#custName").value.trim(), cidade = $("#custCity").value.trim();
    let msg = "Olá, Elysanya! Vim pelo site e quero fazer um pedido:\n\n";
    items.forEach((it) => { msg += `• ${it.qty}x ${it.p.nome}${it.p.volume ? " (" + it.p.volume + ")" : ""} — ${brl(it.p.preco)}\n`; });
    msg += `\nTotal estimado: ${brl(total)}${consult ? " + itens a consultar" : ""}`;
    if (nome) msg += `\nNome: ${nome}`;
    if (cidade) msg += `\nCidade: ${cidade}`;
    msg += "\n\nPode confirmar a disponibilidade?";
    window.open(waUrl(msg), "_blank", "noopener");
  }

  /* ---------- Movimento ---------- */
  let io;
  function observe(els, stagger) {
    if (reduceMotion || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    io ||= new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach((el, i) => {
      if (stagger) { el.classList.add("reveal"); el.style.transitionDelay = `${(i % 4) * 80}ms`; }
      io.observe(el);
    });
  }

  function scrollUI() {
    const top = $("#top"), fab = $("#waFab");
    let last = 0, gridIn = false, ticking = false;
    const big = $("#archBig"), small = $("#archSmall");
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      top.classList.toggle("is-solid", y > 20);
      top.classList.toggle("is-hidden", !isDesk() && y > 400 && y > last && !document.body.classList.contains("menu-open"));
      last = y;
      fab.classList.toggle("is-top", y < window.innerHeight * 0.6 || gridIn);
      if (!reduceMotion && y < window.innerHeight * 1.2) {
        big.style.transform = `translateY(${y * -0.06}px)`;
        small.style.transform = `translateY(${y * -0.14}px)`;
      }
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { gridIn = e.isIntersecting; update(); }).observe($("#grid"));
    update();
  }

  function menu() {
    const m = $("#menu"), btn = $("#menuOpen");
    const set = (open) => {
      m.classList.toggle("is-open", open);
      m.setAttribute("aria-hidden", String(!open));
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      document.body.classList.toggle("menu-open", open);
      document.body.classList.toggle("is-locked", open || !!openSheet);
    };
    btn.addEventListener("click", () => set(!m.classList.contains("is-open")));
    $$("[data-menu-link]").forEach((a) => a.addEventListener("click", () => set(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { set(false); hideSheet(); } });
  }

  /* Arrastar o painel para baixo para fechar (celular) */
  function sheetDrag() {
    $$(".sheet").forEach((sh) => {
      let y0 = null, dy = 0;
      sh.addEventListener("touchstart", (e) => {
        const sc = $(".sheet__scroll", sh);
        if (isDesk() || (sc.scrollTop > 0 && !e.target.closest(".sheet__bar, .sheet__grip"))) { y0 = null; return; }
        y0 = e.touches[0].clientY; dy = 0; sh.style.transition = "none";
      }, { passive: true });
      sh.addEventListener("touchmove", (e) => {
        if (y0 === null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        sh.style.transform = `translateY(${dy}px)`;
      }, { passive: true });
      sh.addEventListener("touchend", () => {
        if (y0 === null) return;
        sh.style.transition = "";
        if (dy > 110) hideSheet(); else sh.style.transform = "";
        y0 = null;
      });
    });
  }

  function goToFilter(cat) {
    state.filtro = cat;
    renderChips(); renderGrid();
    const top = $("#vitrine").getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - 10, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      const go = t.closest("[data-gocat]"); if (go) return goToFilter(go.dataset.gocat);
      const chip = t.closest("[data-cat]");
      if (chip) {
        state.filtro = chip.dataset.cat; renderChips(); renderGrid();
        const f = $("#filters"), top = $("#vitrine .grid").getBoundingClientRect().top + window.scrollY - f.offsetHeight - 80;
        if (window.scrollY > top) window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
        return;
      }
      const add = t.closest("[data-add]"); if (add) return addToBag(add.dataset.add);
      const open = t.closest("[data-open]"); if (open) return openProduct(open.dataset.open);
      const pdq = t.closest("[data-pdqty]");
      if (pdq) { const el = $("#pdQty"); el.textContent = Math.max(1, Math.min(99, +el.textContent + +pdq.dataset.pdqty)); return; }
      const pda = t.closest("[data-pdadd]"); if (pda) { addToBag(pda.dataset.pdadd, +($("#pdQty")?.textContent || 1)); hideSheet(); return; }
      const nav = t.closest("[data-pdnav]");
      if (nav) { const n = state.lista.length; state.atual = (state.atual + +nav.dataset.pdnav + n) % n; renderProduct(); history.replaceState(null, "", "#p/" + state.lista[state.atual].id); return; }
      const bq = t.closest("[data-bagqty]"); if (bq) { const it = state.bag.find((b) => b.id === bq.dataset.bagqty); if (it) setQty(it.id, it.qty + +bq.dataset.d); return; }
      const rm = t.closest("[data-bagrm]"); if (rm) return setQty(rm.dataset.bagrm, 0);
      if (t.closest("[data-open-bag]")) { renderBag(); showSheet($("#bagSheet")); return; }
      const close = t.closest("[data-close]");
      if (close || t === $("#overlay")) { hideSheet(); if (close?.dataset.goto) $(close.dataset.goto)?.scrollIntoView({ behavior: "smooth" }); return; }
      const feat = t.closest("[data-feat]");
      if (feat) { const tr = $("#featured"); tr.scrollBy({ left: +feat.dataset.feat * ((tr.firstElementChild?.offsetWidth || 300) + 18), behavior: "smooth" }); }
    });
    $("#checkout").addEventListener("click", checkout);
    $("#fbGo").addEventListener("click", () => { renderBag(); showSheet($("#bagSheet")); });
    let st;
    $("#search").addEventListener("input", (e) => { clearTimeout(st); st = setTimeout(() => { state.busca = e.target.value; renderGrid(); }, 140); });
  }

  async function init() {
    applyConfig(); menu(); bindEvents(); sheetDrag();
    const dataP = loadData();
    const ready = () => {
      document.body.classList.add("is-ready");
      observe($$(".reveal"));
      scrollUI();
    };
    if (reduceMotion) ready(); else setTimeout(ready, 700);
    setTimeout(() => $("#curtain")?.remove(), 2200);

    await dataP;
    renderCats(); renderChips(); renderGrid(); renderFeatured(); renderBag();
    if (location.hash.startsWith("#p/")) setTimeout(() => openProduct(decodeURIComponent(location.hash.slice(3))), 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
