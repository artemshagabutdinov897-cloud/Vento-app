/* Vento Flowers, мини-приложение. Цены в price.js, витрина в catalog.js, заказ уходит в api/ (bot.py).
   Одна длинная страница с обычной прокруткой: первый экран → липкие разделы и плитки → букеты лентой → конфигуратор (один раз или по подписке) → повод → стебли → весь прайс.
   В Telegram корзину открывает MainButton (а в открытом листе товара он же добавляет позицию), вне Telegram та же роль у нижней кнопки #bar. */
const tg = window.Telegram && Telegram.WebApp;
const inTg = !!(tg && tg.initData);
document.documentElement.classList.toggle("tg", inTg);
const API = "api/";
const BG = "#F5F1E9", INK = "#0E2B23";
if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor(BG); tg.setBackgroundColor(BG); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {} }
const hap = k => { try { k === "ok" ? tg.HapticFeedback.notificationOccurred("success") : k === "tap" ? tg.HapticFeedback.impactOccurred("light") : tg.HapticFeedback.selectionChanged(); } catch (e) {} };
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt = n => n.toLocaleString("ru-RU") + " ₽";
const plural = (n, a, b, c) => { const m = n % 100, d = n % 10; return n + " " + (m > 10 && m < 20 ? c : d === 1 ? a : d > 1 && d < 5 ? b : c); };
const ICON = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};
const api = async (path, body, method) => {
  const r = await fetch(API + path, { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", "X-Init-Data": tg ? tg.initData : "" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};

/* ---------- каталог: прайс поставщика, стебли, букеты ---------- */
const ALL = {}, BYKEY = {}, BYNAME = {};
PRICE.forEach(r => {
  const it = { id: r.i, kind: "stem", name: r.n, len: r.l, from: r.o, brand: r.b, sec: r.s, cat: catOf(r.n), price: priceOf(r), base: r.w,
    tone: toneOf(r.n), img: null, note: "", text: `Позиция из прайса от ${PRICE_DATE}. Наличие и оттенок подтвердим при заказе.` };
  ALL[it.id] = it; BYKEY[r.n + "|" + (r.l || "")] = it; (BYNAME[r.n] = BYNAME[r.n] || []).push(it);
});
// длины в прайсе меняются день ото дня: если нужной нет, берём ту же позицию ближайшей длины
const resolve = key => { const [nm, ln] = key.split("|"); return BYKEY[key] || (BYNAME[nm] || []).slice().sort((a, b) => Math.abs(a.len - ln) - Math.abs(b.len - ln))[0] || null; };
COLLECTION.forEach(c => {
  const it = resolve(c.key);
  if (!it) { console.warn("нет в прайсе:", c.key); return; }
  Object.assign(it, { cat: c.cat, img: c.img || null, tone: c.tone || it.tone, text: c.text, note: c.note || "", name: c.name || it.name, shown: true, bq: MAKER_PHOTO[c.key] || null });
});
const GENUS = ["Эустома", "Лимониум", "Маттиола", "Дельфиниум", "Шамелациум", "Скимия", "Хлопок", "Амариллис", "Хризантема", "Гвоздика", "Калла", "Лилия", "Тюльпан", "Протея", "Цимбидиум", "Антиринум"];
// короткое имя для составов: род (эустома, лимониум), у эустомы ещё цвет, у роз сорт без слова «Роза»
const COLOR = [[/Вайт|Уайт/, "белая"], [/Пинк/, "розовая"], [/Лаванд/, "лавандовая"], [/Блу/, "синяя"], [/Грин|Эмеральд/, "зелёная"]];
const shortName = it => { const n = it.name; for (const g of GENUS) if (n.startsWith(g)) { const c = g === "Эустома" ? COLOR.find(([re]) => re.test(n)) : null; return g.toLowerCase() + (c ? " " + c[1] : ""); } if (n.startsWith("Пион ")) return "пион " + n.slice(5); return n.replace(/^Роза куст /, "куст. ").replace(/^Роза Роза /, "").replace(/^Роза /, ""); };
BOUQUETS.forEach(b => {
  b.kind = "bouquet";
  const ps = b.parts.map(([k, q]) => ({ it: resolve(k), q })).filter(p => p.it);
  b.n = ps.reduce((a, p) => a + p.q, 0);
  b.compo = ps.map(p => `${p.q} ${shortName(p.it)}`).join(" · ");
  b.ok = ps.length === b.parts.length;
  if (!b.price) b.price = b.ok ? ceil100(ps.reduce((a, p) => a + p.it.price * p.q, 0) + WORK(b.n)) : null;
  ALL[b.id] = b;
});
const SHOWN_BOUQUETS = BOUQUETS.filter(b => b.price);
const CUSTOM = (() => { try { return JSON.parse(localStorage.getItem("vento-custom") || "{}"); } catch (e) { return {}; } })();
const item = id => ALL[id] || CUSTOM[id];
const swatch = (it, big) => `<div class="sw ${big ? "big" : ""}" style="background:linear-gradient(160deg,${it.tone} 0%,${it.tone}99 42%,#DCD3C3 100%)"><i>${it.kind === "stem" ? shortName(it) : it.name}</i></div>`;
const pic = (it, thumb) => it.img ? `<img src="img/${it.img}${thumb && it.kind === "stem" ? "-t" : ""}.jpg" alt="" loading="lazy">` : swatch(it);

/* ---------- корзина ---------- */
let cart = (() => { try { const c = JSON.parse(localStorage.getItem("vento-cart") || "{}"); Object.keys(c).forEach(k => { if (!item(k)) delete c[k]; }); return c; } catch (e) { return {}; } })();
const persist = () => { try { localStorage.setItem("vento-cart", JSON.stringify(cart)); localStorage.setItem("vento-custom", JSON.stringify(CUSTOM)); } catch (e) {} };
const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
const stemsCount = () => Object.entries(cart).reduce((a, [id, q]) => a + (item(id).kind === "stem" ? q : 0), 0);
const subtotal = () => Object.entries(cart).reduce((a, [id, q]) => a + item(id).price * q, 0);
const form = { wrap: "matte", date: null, slot: null, name: "", phone: "", address: "", card: "", comment: "", remind: false };
let occ = (() => { try { return localStorage.getItem("vento-occ") || ""; } catch (e) { return ""; } })();
const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
if (u) form.name = [u.first_name, u.last_name].filter(Boolean).join(" ");

function setQty(id, q) {
  if (q <= 0) delete cart[id]; else cart[id] = q;
  persist(); syncButtons();
  const n = count(), b = $("#cart-n");
  b.textContent = n; b.classList.toggle("on", n > 0);
  $("#bar-n").textContent = n;
  try { n > 0 ? tg.enableClosingConfirmation() : tg.disableClosingConfirmation(); } catch (e) {}
}

/* ---------- экраны ---------- */
let view = "home";
function show(name) {
  $$(".view").forEach(v => v.classList.toggle("on", v.id === "v-" + name));
  view = name; window.scrollTo(0, 0);
  $("#topbar").classList.toggle("hide", name !== "home");
  if (name === "cart") renderCart();
  if (name === "price") renderPrice();
  if (name === "orders") renderOrders();
  syncButtons();
}
function syncButtons() {
  const n = count(), sheetOpen = $("#sheet").classList.contains("on");
  if (inTg) {
    const mb = tg.MainButton;
    if (sheetOpen && cur) mb.setParams({ text: (cart[cur.id] ? "Обновить · " : "В корзину · ") + fmt(cur.price * qty), color: INK, text_color: BG, is_visible: true, is_active: true });
    else if (view !== "cart" && view !== "done" && n > 0) mb.setParams({ text: "Корзина · " + n, color: INK, text_color: BG, is_visible: true, is_active: true });
    else if (view === "cart" && n > 0) mb.setParams({ text: "Подтвердить заказ", color: INK, text_color: BG, is_visible: true, is_active: true });
    else mb.hide();
    view === "home" && !sheetOpen ? tg.BackButton.hide() : tg.BackButton.show();
  } else {
    $("#bar").classList.toggle("on", view !== "cart" && view !== "done" && n > 0);
  }
}
if (tg) {
  tg.MainButton.onClick(() => { hap("tap"); view === "cart" ? submit() : $("#sheet").classList.contains("on") ? addFromSheet() : show("cart"); });
  tg.BackButton.onClick(() => { if ($("#sheet").classList.contains("on")) closeSheet(); else show("home"); });
}
$("#bar").addEventListener("click", () => show("cart"));
$("#cart-btn").addEventListener("click", () => { hap("tap"); show("cart"); });
$$("[data-back]").forEach(b => b.addEventListener("click", () => show("home")));
$$("[data-orders]").forEach(b => b.addEventListener("click", () => { hap("tap"); show("orders"); }));

/* ---------- заставка, шапка, видео и параллакс ---------- */
(function splash() {
  const el = $("#splash"); let seen = false;
  try { seen = sessionStorage.getItem("vento-splash"); sessionStorage.setItem("vento-splash", "1"); } catch (e) {}
  if (seen) { el.remove(); return; }
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 450); }, 1200);
})();
(function heroVideo() {
  const v = $("#hero-video"); if (!v) return;
  v.addEventListener("canplay", () => v.classList.add("on"), { once: true });
  v.addEventListener("error", () => v.remove(), { once: true });
  v.querySelector("source").addEventListener("error", () => v.remove(), { once: true });
  document.addEventListener("visibilitychange", () => { try { document.hidden ? v.pause() : v.play(); } catch (e) {} });
})();
(function scrollFx() {
  const img = $(".hero .im"), txt = $(".hero .tx"), hero = $(".hero"), bar = $("#topbar"); let ticking = false;
  const apply = () => {
    const y = window.scrollY, h = hero.offsetHeight;
    bar.classList.toggle("solid", view !== "home" || y > h - 80);
    if (view === "home" && y < h) {
      img.style.transform = `translate3d(0,${(y * .35).toFixed(1)}px,0)`;
      txt.style.transform = `translate3d(0,${(y * .15).toFixed(1)}px,0)`;
      txt.style.opacity = Math.max(0, 1 - y / (h * .55)).toFixed(2);
    }
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
  apply();
})();

/* ---------- витрина ---------- */
// липкая строка разделов подсвечивает тот, что сейчас в середине экрана
const chipObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setChip(e.target.id); }), { rootMargin: "-45% 0px -50% 0px" });
function setChip(id) {
  const key = id === "make" && mk.mode === "sub" ? "sub" : id;
  $$("#chips button").forEach(b => {
    const on = (b.dataset.go || (b.hasAttribute("data-sub") ? "sub" : "")) === key;
    b.classList.toggle("on", on);
    if (on) $("#chips").scrollTo({ left: Math.max(0, b.offsetLeft - 20), behavior: "smooth" });
  });
}
const seenObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("seen"); seenObs.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
const stemCard = it => `<button class="sc" data-id="${it.id}"><div class="ph">${pic(it, true)}</div><div class="nm">${it.name}</div><div class="pr">${fmt(it.price)} <small>/ стебель</small></div></button>`;
const pickCard = b => `<button class="pk" data-id="${b.id}"><div class="ph"><img src="img/${b.img}-t.jpg" alt="" loading="lazy"></div><div class="nm">${b.name}</div><div class="pr">${fmt(b.price)}</div></button>`;
const bqCard = (b, i) => `<button class="bq" data-id="${b.id}"><div class="ph"><img src="img/${b.img}.jpg" alt="" ${i > 1 ? 'loading="lazy"' : ""}></div><div class="nm">${b.name}</div><p class="compo">${b.sub}</p><div class="pr"><b>${fmt(b.price)}</b><span>${plural(b.n, "стебель", "стебля", "стеблей")}</span></div></button>`;
function renderHome() {
  $("#hero-img").src = `img/${HERO_IMG}-s.jpg`;
  $("#occ").innerHTML = OCCASIONS.map(o => `<button data-o="${o.id}" class="${occ === o.id ? "on" : ""}">${o.name}</button>`).join("");
  $$("#occ button").forEach(b => b.addEventListener("click", () => { occ = occ === b.dataset.o ? "" : b.dataset.o; try { localStorage.setItem("vento-occ", occ); } catch (e) {} hap(); renderPicks(); }));
  renderPicks();
  $("#rail-b").innerHTML = SHOWN_BOUQUETS.map(bqCard).join("");
  $("#tile-bq-n").textContent = plural(SHOWN_BOUQUETS.length, "фирменный", "фирменных", "фирменных");
  $("#rail").innerHTML = Object.values(ALL).filter(it => it.shown).map(stemCard).join("");
  $("#p-count").textContent = plural(PRICE.length, "позиция", "позиции", "позиций");
  $("#p-date").textContent = PRICE_DATE;
  $$("section").forEach(s => seenObs.observe(s));
  $$("[data-chip]").forEach(s => chipObs.observe(s));
  renderMaker();
  document.body.addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b && !b.closest("#sheet") && !b.closest(".line") && !b.closest(".ord")) openSheet(b.dataset.id); });
  const goTo = id => { const t = document.getElementById(id); t && t.scrollIntoView({ behavior: "smooth", block: "start" }); };
  $$("[data-go]").forEach(b => b.addEventListener("click", () => { hap(); goTo(b.dataset.go); }));
  $$("[data-sub]").forEach(b => b.addEventListener("click", () => { hap(); mk.mode = "sub"; renderMaker(); goTo("make"); }));
  $$("#mk-mode button").forEach(b => b.addEventListener("click", () => { if (mk.mode === b.dataset.m) return; mk.mode = b.dataset.m; hap(); renderMaker(true); }));
  $$("[data-view]").forEach(b => b.addEventListener("click", () => { hap("tap"); openPrice(""); }));
  $("#p-q").addEventListener("focus", () => { openPrice(""); setTimeout(() => $("#q").focus(), 60); });
}
function renderPicks() {
  $$("#occ button").forEach(b => b.classList.toggle("on", b.dataset.o === occ));
  const o = OCCASIONS.find(x => x.id === occ);
  const box = $("#picks");
  if (!o) { box.innerHTML = ""; box.classList.remove("on"); return; }
  const list = o.picks.map(id => ALL[id]).filter(b => b && b.price);
  box.innerHTML = `<p class="lead">Флорист советует: ${o.name.toLowerCase()}</p><div class="pk-row">${list.map(pickCard).join("")}</div>`;
  box.classList.add("on");
}

/* ---------- конструктор «Собрать свой»: главный цветок, до двух дополнений, число стеблей; один раз или по подписке ---------- */
const MAIN_CATS = ["roses", "garden", "exotic"];
const MAIN = () => Object.values(ALL).filter(it => it.shown && MAIN_CATS.includes(it.cat));
const ACC = ACCENTS.map(resolve).filter(Boolean);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const mk = { main: (resolve("Роза Пионикисс|60") || MAIN()[0]).id, acc: [resolve("Эустома Алиша Пур Вайт|70")].filter(Boolean).map(it => it.id), n: 15, cat: "roses", plan: "14", mode: "once" };
// фото подбирается по тону главного цветка (палитра) и числу стеблей (размер)
function palOf(it) {
  const h = (it.tone || "#ffffff").replace("#", ""), r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
  let hue = 0; if (mx !== mn) { hue = mx === r ? (g - b) / (mx - mn) + (g < b ? 6 : 0) : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; hue *= 60; }
  if (sat < .18 || l > .9) return "white";
  if (hue >= 200 && hue < 320) return "lavender";
  if (hue >= 320 || hue < 8) return "pink";
  return "coral";
}
const sizeOf = n => n <= 11 ? "S" : n <= 19 ? "M" : n <= 35 ? "L" : "XL";
const ZOOM = { S: 1, M: 1.08, L: 1.17, XL: 1.28 };   // одно фото, но чем больше букет, тем ближе кадр
// главный цветок получает 60% стеблей, если есть дополнения, иначе все
function build(st) {
  st = st || mk;
  const main = item(st.main) || MAIN()[0], accs = st.acc.map(item).filter(Boolean), n = st.n;
  const counts = accs.map(() => Math.max(1, Math.round(n * .4 / accs.length)));
  const stems = [{ it: main, q: Math.max(1, n - counts.reduce((a, b) => a + b, 0)) }, ...accs.map((it, i) => ({ it, q: counts[i] }))];
  const sum = stems.reduce((a, s) => a + s.it.price * s.q, 0), pal = palOf(main);
  return { main, accs, stems, n, pal, price: ceil100(sum + WORK(n)), compo: stems.map(s => `${s.q} ${shortName(s.it)}`).join(" · "),
    title: cap(shortName(main)) + accs.map(a => " + " + shortName(a)).join(""), h: main.len ? `около ${Math.max(30, main.len - 10)} см` : "",
    img: main.bq || PAL_PHOTO[pal], fallback: PAL_PHOTO[pal], sz: sizeOf(n), key: main.id + accs.map(a => "+" + a.id).join("") };
}
function setPic(im, src, fallback) {
  if (im.dataset.src === src) return;
  im.dataset.src = src; im.classList.add("fade");
  setTimeout(() => { im.onerror = () => { im.onerror = null; im.src = `img/${fallback}.jpg`; }; im.src = `img/${src}.jpg`; im.classList.remove("fade"); }, 160);
}
function renderMaker(animate) {
  const c = build(), sub = mk.mode === "sub", plan = SUB_PLANS.find(p => p.id === mk.plan);
  const price = sub ? ceil100(c.price * (1 - SUB_DISCOUNT)) : c.price;
  $("#make").classList.toggle("sub", sub);
  $$("#mk-mode button").forEach(b => b.classList.toggle("on", b.dataset.m === mk.mode));
  setPic($("#mk-img"), c.img, c.fallback);
  $("#mk-img").style.transform = `scale(${ZOOM[c.sz]})`;
  $("#mk-rec").innerHTML = c.stems.map(s => `<span>${pic(s.it, true)}<b>${s.q}</b></span>`).join("");
  $("#mk-cats").innerHTML = MAIN_CATS.map(k => `<button data-c="${k}" class="${k === mk.cat ? "on" : ""}">${CATS[k].title}</button>`).join("");
  $("#mk-main").innerHTML = MAIN().filter(it => it.cat === mk.cat).map(it => `<button class="mc ${it.id === mk.main ? "on" : ""}" data-m="${it.id}"><div class="ph">${pic(it, true)}</div><div class="nm">${cap(shortName(it))}</div><div class="pr">${fmt(it.price)}</div></button>`).join("");
  $("#mk-acc").innerHTML = ACC.map(it => `<button data-a="${it.id}" class="${mk.acc.includes(it.id) ? "on" : ""}">${pic(it, true)}${cap(shortName(it))}</button>`).join("");
  $("#mk-sizes").innerHTML = SIZES.map(s => `<button data-s="${s.n}" class="${s.n === mk.n ? "on" : ""}"><b>${s.id}</b><span>${plural(s.n, "стебель", "стебля", "стеблей")}</span></button>`).join("");
  $("#mk-n").textContent = plural(mk.n, "стебель", "стебля", "стеблей");
  $("#mk-plans").innerHTML = SUB_PLANS.map(p => `<button data-pl="${p.id}" class="${p.id === mk.plan ? "on" : ""}">${p.name}</button>`).join("");
  $$("#mk-cats button").forEach(b => b.addEventListener("click", () => { mk.cat = b.dataset.c; hap(); renderMaker(); }));
  $$("#mk-main .mc").forEach(b => b.addEventListener("click", () => { mk.main = b.dataset.m; mk.acc = mk.acc.filter(a => a !== mk.main); hap(); renderMaker(true); }));
  $$("#mk-acc button").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.a;
    if (mk.acc.includes(id)) mk.acc = mk.acc.filter(a => a !== id);
    else if (id === mk.main) { toast("Это главный цветок"); return; }
    else if (mk.acc.length >= 2) { toast("Не больше двух дополнений"); return; }
    else mk.acc = [...mk.acc, id];
    hap(); renderMaker(true);
  }));
  $$("#mk-sizes button").forEach(b => b.addEventListener("click", () => { mk.n = +b.dataset.s; hap(); renderMaker(true); }));
  $$("#mk-plans button").forEach(b => b.addEventListener("click", () => { mk.plan = b.dataset.pl; hap(); renderMaker(true); }));
  const sel = $("#mk-main .mc.on"); if (sel) $("#mk-main").scrollTo({ left: Math.max(0, sel.offsetLeft - 20), behavior: animate ? "smooth" : "auto" });
  $("#mk-kick").textContent = sub ? `Подписка · −${SUB_DISCOUNT * 100}% к цене букета` : "Собрать свой";
  $("#mk-name").textContent = c.title;
  $("#mk-compo").textContent = [c.compo, c.h, sub ? plan.name.toLowerCase() : ""].filter(Boolean).join(" · ");
  $("#mk-was").textContent = fmt(c.price);
  $("#mk-add").textContent = sub ? "Оформить подписку" : "В корзину";
  $("#mk-hint").textContent = sub ? "Цена за каждую доставку. Первую выберите при оформлении, дальше привозим по графику и накануне спрашиваем, всё ли в силе." : "Цена считается по сегодняшнему прайсу. Состав и оттенок подтвердит флорист.";
  animate ? countTo($("#mk-price"), price) : ($("#mk-price").textContent = fmt(price), $("#mk-price").dataset.v = price);
}
$("#mk-minus").addEventListener("click", () => { if (mk.n > 5) { mk.n = Math.max(5, mk.n - 2); hap(); renderMaker(true); } });
$("#mk-plus").addEventListener("click", () => { if (mk.n < 101) { mk.n = Math.min(101, mk.n + 2); hap(); renderMaker(true); } });
$("#mk-add").addEventListener("click", () => {
  const c = build();
  if (mk.mode === "sub") {
    const plan = SUB_PLANS.find(p => p.id === mk.plan), price = ceil100(c.price * (1 - SUB_DISCOUNT));
    const id = `SUB-${plan.id}-${c.n}-${c.key}`;
    CUSTOM[id] = { id, kind: "custom", name: `Подписка «${c.title}» ${c.n}`, sub: `${plan.name}: ${c.compo}`, price, img: c.img, fallback: c.fallback, tone: c.main.tone, compo: c.compo, n: c.n, every: plan.days,
      text: `Букет ${plan.name.toLowerCase()}: ${c.compo}. Первую доставку выберите при оформлении, дальше привозим по графику, напоминаем накануне.` };
    Object.keys(cart).forEach(k => { if (k.startsWith("SUB-")) delete cart[k]; });
    setQty(id, 1); hap("ok"); toast("Подписка в корзине"); show("cart");
    return;
  }
  const id = `M-${c.n}-${c.key}`;
  CUSTOM[id] = { id, kind: "custom", name: `Букет «${c.title}» ${c.n}`, sub: `${plural(c.n, "стебель", "стебля", "стеблей")}: ${c.compo}`, price: c.price, img: c.img, fallback: c.fallback, tone: c.main.tone, compo: c.compo, n: c.n,
    text: `Собран под вас: ${c.compo}.${c.h ? " Высота " + c.h + "." : ""} Наличие и оттенок подтвердим при заказе.` };
  setQty(id, (cart[id] || 0) + 1); hap("ok"); toast("Букет в корзине");
});

/* ---------- весь прайс: поиск и разделы ---------- */
let pq = "", psec = "all", pt;
function openPrice(q) { pq = q || ""; psec = "all"; $("#q").value = pq; show("price"); }
function renderPrice() {
  $("#secs").innerHTML = SECTIONS.map(([k, t]) => `<button data-s="${k}" class="${psec === k ? "on" : ""}">${t}</button>`).join("");
  $$("#secs button").forEach(b => b.addEventListener("click", () => { psec = b.dataset.s; hap(); renderPrice(); }));
  const q = pq.trim().toLowerCase();
  const list = Object.values(ALL).filter(it => it.kind === "stem" && (psec === "all" || it.sec === psec) && (!q || it.name.toLowerCase().includes(q) || it.from.toLowerCase().includes(q)));
  $("#p-n").textContent = plural(list.length, "позиция", "позиции", "позиций") + " · цена за стебель";
  $("#plist").innerHTML = list.map(it => `<button class="row" data-id="${it.id}"><span class="dot" style="background:${it.tone}"></span><span class="rn"><b>${it.name}</b><small>${it.len ? it.len + " см · " : ""}${it.from}</small></span><span class="rp">${fmt(it.price)}${cart[it.id] ? `<em>${cart[it.id]}</em>` : ""}</span></button>`).join("") || `<p class="lead">Ничего не нашлось. Попробуйте другое слово: «эустома», «пионовидная», «кения».</p>`;
}
$("#q").addEventListener("input", () => { pq = $("#q").value; clearTimeout(pt); pt = setTimeout(renderPrice, 90); });

// состав по палитре и размеру: нужен только для повтора старых заказов «M-<палитра>-<размер>»
function calc(palId, sizeId) {
  const pal = PALETTES.find(p => p.id === palId), sz = SIZES.find(s => s.id === sizeId);
  const stems = pal.stems.map(([k, r]) => ({ it: resolve(k), r })).filter(s => s.it);
  const counts = stems.map(s => Math.max(1, Math.round(sz.n * s.r)));
  counts[0] += sz.n - counts.reduce((a, b) => a + b, 0);
  const sum = stems.reduce((a, s, i) => a + s.it.price * counts[i], 0);
  return { pal, sz, stems, counts, price: ceil100(sum + WORK(sz.n)), compo: stems.map((s, i) => `${counts[i]} ${shortName(s.it)}`).join(" · "), img: `vm-${pal.id}-${sz.id}` };
}
/* ---------- мои заказы и повтор ---------- */
const STATUS = { new: "принят", making: "собираем", way: "курьер выехал", done: "доставлен" };
async function renderOrders() {
  const box = $("#olist"); box.innerHTML = `<p class="lead">Загружаем…</p>`;
  if (!inTg) { box.innerHTML = `<p class="lead">История заказов видна только внутри Telegram.</p>`; return; }
  try {
    const j = await api("my");
    if (!j.ok || !j.orders.length) { box.innerHTML = `<p class="lead">Заказов пока нет. Первый самый приятный.</p>`; return; }
    box.innerHTML = j.orders.map(o => `<div class="ord"><div class="oh"><b>Заказ № ${o.n}</b><span>${o.date.split("-").reverse().join(".")} · ${STATUS[o.status] || o.status}</span></div><p>${o.items.map(i => `${i.name} × ${i.qty}`).join(", ")}</p><div class="row"><b>${fmt(o.total)}</b><button class="btn sm ghost" data-rep="${o.n}">Повторить</button></div></div>`).join("");
    $$("[data-rep]").forEach(b => b.addEventListener("click", () => { hap("tap"); repeatOrder(j.orders.find(o => String(o.n) === b.dataset.rep)); }));
  } catch (e) { box.innerHTML = `<p class="lead">Не удалось загрузить. Попробуйте позже.</p>`; }
}
function repeatOrder(o) {
  if (!o) return;
  let missed = 0;
  o.items.forEach(i => {
    if (item(i.id)) { cart[i.id] = (cart[i.id] || 0) + i.qty; return; }
    // букет из конструктора: «M-<стеблей>-<главный+дополнения>» или «SUB-<дней>-<стеблей>-<состав>»; старый вид «M-<палитра>-<размер>»
    const m = i.id.match(/^(M|SUB)-(?:(\d+)-)?(\d+)-([A-Za-z0-9+]+)$/);
    if (m) {
      const [main, ...acc] = m[4].split("+"), every = m[1] === "SUB" ? +m[2] : undefined;
      if (item(main) && acc.every(item)) { const c = build({ main, acc, n: +m[3] }); CUSTOM[i.id] = { id: i.id, kind: "custom", name: i.name.split(" (")[0], sub: c.compo, price: every ? ceil100(c.price * (1 - SUB_DISCOUNT)) : c.price, img: c.img, fallback: c.fallback, tone: c.main.tone, compo: c.compo, n: c.n, every, text: "Повтор заказа по сегодняшнему прайсу." }; cart[i.id] = (cart[i.id] || 0) + i.qty; return; }
    } else if (i.id.startsWith("M-") || i.id.startsWith("SUB-")) { const [, pal, size, plan] = i.id.split("-"); if (PALETTES.find(p => p.id === pal) && SIZES.find(s => s.id === size)) { const c = calc(pal, size); CUSTOM[i.id] = { id: i.id, kind: "custom", name: i.name.split(" (")[0], sub: c.compo, price: plan ? ceil100(c.price * (1 - SUB_DISCOUNT)) : c.price, img: c.img, fallback: c.pal.img, tone: c.pal.tone, compo: c.compo, n: c.sz.n, every: plan ? +plan : undefined, text: "Повтор заказа по сегодняшнему прайсу." }; cart[i.id] = (cart[i.id] || 0) + i.qty; return; } }
    missed++;
  });
  persist(); setQty("", 0); hap("ok");
  if (missed) toast(`${plural(missed, "позиции", "позиций", "позиций")} нет в сегодняшнем прайсе`);
  show("cart");
}
async function repeatFromParam() {
  const p = new URLSearchParams(location.search).get("repeat") || ((tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || "").replace(/^repeat_/, "");
  if (!p || !inTg) return;
  try { const j = await api("order/" + p); if (j.ok) repeatOrder(j.order); } catch (e) {}
}

/* ---------- лист товара ---------- */
let cur = null, qty = 1;
function openSheet(id) {
  const it = item(id); if (!it) return; cur = it; hap("tap");
  const stem = it.kind === "stem";
  qty = cart[id] || (stem ? CATS[it.cat].presets[0] : 1);
  $("#sh-pic").innerHTML = it.img ? `<img src="img/${it.img}.jpg" alt="" onerror="this.onerror=null;this.src='img/${it.fallback || it.img}.jpg'">` : swatch(it, true);
  $("#sh-cd").textContent = stem ? CATS[it.cat].title + (it.len ? " · " + it.len + " см" : "") + " · " + it.from : it.every ? "Подписка" : it.kind === "custom" ? "Ваш букет" : "Фирменный букет";
  $("#sh-nm").textContent = it.name;
  $("#sh-mt").textContent = stem ? fmt(it.price) + " за стебель" : (it.compo ? `${plural(it.n, "стебель", "стебля", "стеблей")}: ${it.compo}` : it.sub);
  $("#sh-ds").textContent = it.text;
  $("#sh-note").textContent = it.note || "";
  $("#sh-lb").textContent = stem ? "Стеблей" : "Букетов";
  $(".qty").style.display = it.every ? "none" : "";
  $("#presets").innerHTML = stem ? CATS[it.cat].presets.map(p => `<button data-p="${p}">${p}</button>`).join("") : "";
  $$("#presets button").forEach(b => b.addEventListener("click", () => { hap(); qty = +b.dataset.p; paintQty(); }));
  $("#sh-add").innerHTML = (cart[id] ? "Обновить в корзине" : "Добавить в корзину") + ICON.arrow;
  $("#sh-sum").dataset.v = cur.price * qty; paintQty(true);
  $("#sheet").classList.add("on"); $(".sheet-card").scrollTop = 0; document.body.style.overflow = "hidden"; syncButtons();
}
function countTo(el, to) {
  const from = +(el.dataset.v || 0), t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / 280), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = fmt(v); if (k < 1) requestAnimationFrame(step); else el.dataset.v = to; };
  requestAnimationFrame(step);
}
function paintQty(instant) {
  $("#sh-q").textContent = qty;
  $$("#presets button").forEach(b => b.classList.toggle("on", +b.dataset.p === qty));
  instant ? ($("#sh-sum").textContent = fmt(cur.price * qty)) : countTo($("#sh-sum"), cur.price * qty);
  $("#sh-sum-l").textContent = cur.kind === "stem" ? `${plural(qty, "стебель", "стебля", "стеблей")} × ${fmt(cur.price)}` : cur.every ? "за каждую доставку" : plural(qty, "букет", "букета", "букетов");
  syncButtons();
}
function closeSheet() { $("#sheet").classList.remove("on"); document.body.style.overflow = ""; syncButtons(); }
function addFromSheet() {
  const it = cur; if (!it) return; setQty(it.id, qty); hap("ok"); closeSheet();
  toast(it.kind === "stem" ? `В корзине ${plural(stemsCount(), "стебель", "стебля", "стеблей")}` : "Букет в корзине");
  if (view === "price") renderPrice();
}
$("#sh-minus").addEventListener("click", () => { if (qty > 1) { qty--; hap(); paintQty(); } });
$("#sh-plus").addEventListener("click", () => { qty++; hap(); paintQty(); });
$("#sh-add").addEventListener("click", addFromSheet);
$("#sh-x").addEventListener("click", closeSheet);
$("#sheet .sheet-bg").addEventListener("click", closeSheet);
let tt; function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 1800); }

/* ---------- корзина: строки, форма, открытка, итог ---------- */
function dates() {
  const out = [], now = new Date(); const start = now.getHours() >= DELIVERY.cutoff ? 1 : 0;
  const D = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"], M = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  for (let i = start; i < start + 7; i++) { const d = new Date(now); d.setDate(now.getDate() + i); out.push({ key: d.toISOString().slice(0, 10), top: i === 0 ? "сегодня" : i === 1 ? "завтра" : D[d.getDay()], day: d.getDate() + " " + M[d.getMonth()], today: i === 0 }); }
  return out;
}
// сегодня можно выбрать слот, который начинается не раньше чем через 2 часа
function slotsFor(day) { if (!day || !day.today) return SLOTS; const h = new Date().getHours(); return SLOTS.filter(s => +s.slice(0, 2) >= h + 2); }
function totals() {
  const sub = subtotal(), wrap = WRAPS.find(w => w.id === form.wrap) || WRAPS[0];
  const sc = stemsCount(), asm = sc > 0 ? WORK(sc) : 0, wp = count() > 0 ? wrap.price : 0;
  const del = sub + asm >= DELIVERY.freeFrom ? 0 : DELIVERY.price;
  return { sub, asm, wrap: wp, del, all: sub + asm + wp + del };
}
let cardBusy = false;
async function suggestCard() {
  if (cardBusy) return; cardBusy = true; hap("tap");
  const btn = $("#card-ai"); btn.disabled = true; btn.textContent = "Подбираем…";
  const o = OCCASIONS.find(x => x.id === occ) || OCCASIONS[OCCASIONS.length - 1];
  let variants = null;
  try { const j = await api("card", { occasion: o.name, hint: form.comment, name: form.name }); if (j.ok && j.variants && j.variants.length) variants = j.variants.slice(0, 3); } catch (e) {}
  if (!variants) variants = o.cards.slice().sort(() => Math.random() - .5).slice(0, 3);
  $("#card-vars").innerHTML = variants.map(v => `<button>${v}</button>`).join("");
  $$("#card-vars button").forEach(b => b.addEventListener("click", () => { form.card = b.textContent; $("#f-card").value = form.card; hap(); $$("#card-vars button").forEach(x => x.classList.toggle("on", x === b)); }));
  btn.disabled = false; btn.textContent = "Ещё варианты"; cardBusy = false;
}
$("#card-ai").addEventListener("click", suggestCard);
function renderCart() {
  const ids = Object.keys(cart);
  $("#lines").innerHTML = ids.map(id => { const it = item(id), q = cart[id]; return `<div class="line" data-line="${id}"><div class="im">${it.img ? `<img src="img/${it.img}${it.kind === "stem" ? "-t" : "-t"}.jpg" alt="" onerror="this.onerror=null;this.src='img/${it.fallback || it.img}-t.jpg'">` : swatch(it)}</div><div><div class="nm">${it.name}</div><div class="mt">${it.kind === "stem" ? `${it.len ? it.len + " см · " : ""}${it.from}` : it.sub}</div></div><div class="st">${it.every ? `<output>1</output>` : `<button data-d="-1">${ICON.minus}</button><output>${q}</output><button data-d="1">${ICON.plus}</button>`}</div><div class="pr"><span>${it.every ? "за доставку" : `${q} × ${fmt(it.price)}`}</span><span>${fmt(it.price * q)}</span></div></div>`; }).join("");
  $$("#lines .line").forEach(l => l.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const id = l.dataset.line; hap(); setQty(id, (cart[id] || 0) + +b.dataset.d); renderCart(); })));
  $("#frm").style.display = ids.length ? "" : "none";
  $("#empty").style.display = ids.length ? "none" : "";
  if (!ids.length) return;
  const hasSub = ids.some(k => item(k).every);
  $("#wraps").innerHTML = WRAPS.map(w => `<button data-w="${w.id}" class="${form.wrap === w.id ? "on" : ""}">${w.name}${w.price ? `<small>+ ${fmt(w.price)}</small>` : w.hint ? `<small>${w.hint}</small>` : ""}</button>`).join("");
  $$("#wraps button").forEach(b => b.addEventListener("click", () => { form.wrap = b.dataset.w; hap(); renderCart(); }));
  $("#l-date").textContent = hasSub ? "Первая доставка" : "День доставки";
  const ds = dates(); if (!ds.find(d => d.key === form.date)) form.date = ds[0].key;
  $("#dates").innerHTML = ds.map(d => `<button data-k="${d.key}" class="${form.date === d.key ? "on" : ""}">${d.top}<span>${d.day}</span></button>`).join("");
  $$("#dates button").forEach(b => b.addEventListener("click", () => { form.date = b.dataset.k; form.slot = null; hap(); renderCart(); }));
  const sl = slotsFor(ds.find(d => d.key === form.date)); if (!sl.includes(form.slot)) form.slot = sl[0] || null;
  $("#slots").innerHTML = sl.length ? sl.map(s => `<button data-s="${s}" class="${form.slot === s ? "on" : ""}">${s}</button>`).join("") : `<button disabled>Сегодня слотов не осталось, выберите другой день</button>`;
  $$("#slots button[data-s]").forEach(b => b.addEventListener("click", () => { form.slot = b.dataset.s; hap(); renderCart(); }));
  ["name", "phone", "address", "card", "comment"].forEach(k => { const el = $("#f-" + k); el.value = form[k]; el.oninput = () => { form[k] = el.value; el.classList.remove("bad"); }; });
  $("#f-remind").checked = form.remind; $("#f-remind").onchange = () => { form.remind = $("#f-remind").checked; hap(); };
  $("#remind-box").style.display = hasSub ? "none" : "";
  const t = totals(), sc = stemsCount(), bc = count() - sc;
  const what = [sc ? plural(sc, "стебель", "стебля", "стеблей") : "", bc ? plural(bc, "букет", "букета", "букетов") : ""].filter(Boolean).join(" и ");
  $("#tot").innerHTML = `<div><span>${what}</span><span>${fmt(t.sub)}</span></div>` +
    (t.asm ? `<div><span>Сборка стеблей в букет</span><span>${fmt(t.asm)}</span></div>` : "") +
    (t.wrap ? `<div><span>Упаковка</span><span>${fmt(t.wrap)}</span></div>` : "") +
    `<div><span>Доставка, ${DELIVERY.city}</span><span>${t.del ? fmt(t.del) : "бесплатно"}</span></div>` +
    `<div class="all"><span>${hasSub ? "Итого за первую доставку" : "Итого"}</span><b>${fmt(t.all)}</b></div>`;
  $("#del-note").textContent = (t.del ? `Бесплатно от ${fmt(DELIVERY.freeFrom)}. ` : "") + `Заказы после ${DELIVERY.cutoff}:00 доставляем на следующий день.`;
  $("#err").classList.remove("on");
}
$("#empty-cta").addEventListener("click", () => show("home"));
$("#f-submit").addEventListener("click", submit);

/* ---------- отправка ---------- */
let sending = false;
async function submit() {
  if (sending || !count()) return;
  const bad = [];
  if (form.name.trim().length < 2) bad.push("name");
  if (form.phone.replace(/\D/g, "").length < 10) bad.push("phone");
  if (form.address.trim().length < 5) bad.push("address");
  bad.forEach(k => $("#f-" + k).classList.add("bad"));
  if (bad.length || !form.slot) {
    $("#err").textContent = bad.length ? "Заполните имя, телефон и адрес." : "Выберите время доставки."; $("#err").classList.add("on");
    try { tg.HapticFeedback.notificationOccurred("error"); } catch (e) {}
    (bad[0] ? $("#f-" + bad[0]) : $("#slots")).scrollIntoView({ behavior: "smooth", block: "center" }); return;
  }
  const t = totals(), wrap = WRAPS.find(w => w.id === form.wrap);
  const subItem = Object.keys(cart).map(item).find(it => it.every);
  const order = {
    items: Object.entries(cart).map(([id, q]) => { const it = item(id); return { id, name: it.name + (it.compo ? ` (${it.compo})` : ""), qty: q, price: it.price, sum: it.price * q }; }),
    wrap: wrap.name, assembly: t.asm, wrapPrice: t.wrap, delivery: t.del, total: t.all, priceDate: PRICE_DATE,
    occasion: (OCCASIONS.find(x => x.id === occ) || {}).name || "", remind: !!form.remind && !subItem,
    subscription: subItem ? { every: subItem.every, name: subItem.name, price: subItem.price } : null,
    date: form.date, slot: form.slot, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), card: form.card.trim(), comment: form.comment.trim(),
  };
  sending = true; $("#f-submit").disabled = true; try { tg.MainButton.showProgress(); } catch (e) {}
  let ok = false, n = null;
  try { const j = await api("order", { initData: tg ? tg.initData : "", order }); ok = !!j.ok; n = j.n; } catch (e) {}
  sending = false; $("#f-submit").disabled = false; try { tg.MainButton.hideProgress(); } catch (e) {}
  if (ok) {
    cart = {}; persist(); setQty("", 0); hap("ok");
    $("#done-n").textContent = n ? "Заказ № " + n : "Заказ принят";
    $("#done-p").textContent = `${order.date.split("-").reverse().join(".")}, ${order.slot}. Флорист подтвердит наличие и оттенок, пришлёт фото букета перед доставкой и сообщит, когда курьер выедет.` + (order.remind ? " Напомним об этой дате через год." : "") + (order.subscription ? " Дальше привозим по графику и пишем накануне." : "");
    show("done");
    return;
  }
  // API недоступен: если витрина открыта кнопкой под полем ввода, заказ уходит боту напрямую (Telegram закроет окно)
  if (inTg && tg.sendData) {
    try { tg.sendData(JSON.stringify({ type: "order", order })); cart = {}; persist(); setQty("", 0); await new Promise(r => setTimeout(r, 1500)); } catch (e) {}
  }
  // и последний запасной путь: тот же заказ текстом в личку флористу
  const text = `Заказ Vento Flowers\n` + order.items.map(i => `${i.name} × ${i.qty}`).join("\n") + `\nИтого ${fmt(order.total)}\n${order.date.split("-").reverse().join(".")}, ${order.slot}` + (order.occasion ? `\nПовод: ${order.occasion}` : "") + `\n${order.name}, ${order.phone}\n${order.address}` + (order.card ? `\nОткрытка: ${order.card}` : "") + (order.comment ? `\n${order.comment}` : "") + (order.subscription ? `\nПодписка: раз в ${order.subscription.every} дн.` : "");
  const url = `https://t.me/${MANAGER}?text=${encodeURIComponent(text)}`;
  $("#err").textContent = "Не удалось отправить автоматически. Открываем чат с флористом, заказ уже вставлен в сообщение."; $("#err").classList.add("on");
  try { tg.openTelegramLink(url); } catch (e) { window.open(url, "_blank"); }
}

/* ---------- старт ---------- */
renderHome();
setQty("", 0);
repeatFromParam();
