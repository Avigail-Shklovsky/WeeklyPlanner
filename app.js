import { firebaseConfig } from "./firebase-config.js";

/* =====================================================
   constants
   ===================================================== */
const FIREBASE_CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
const LOCAL_KEY = "beachPlanner.v1";
const MODE_KEY = "beachPlanner.mode";

const FIREBASE_READY = Boolean(
  firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("YOUR")
);

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

const CATEGORIES = [
  { id: "school",  label: "בית ספר", color: "#7f9bb5" },
  { id: "friends", label: "חברות",   color: "#d69595" },
  { id: "sport",   label: "ספורט",   color: "#86a88c" },
  { id: "hobby",   label: "תחביבים", color: "#a596c2" },
  { id: "family",  label: "משפחה",   color: "#cf9a72" },
  { id: "other",   label: "אחר",     color: "#c9a85e" },
];
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const QUOTES = [
  "כל גל מתחיל בטיפה קטנה",
  "שבוע חדש, אופק חדש",
  "צעד קטן כל יום, ושביל שלם בסוף",
  "לנשום עמוק, כמו רוח של ים",
  "את השקיעה הכי יפה שיש",
  "לאט לאט, כמו גאות",
  "לא חייבים למהר, הים לא הולך לשום מקום",
];
const CHEERS = ["כל הכבוד ✦", "יש! ✧", "אלופה ✦", "עוד צעד על החוף ✧", "איזה יופי ✦", "ככה עושים את זה ✧"];

/* =====================================================
   tiny helpers
   ===================================================== */
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -x.getDay()); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "style") node.style.cssText = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

const SVGNS = "http://www.w3.org/2000/svg";
function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// seeded random so the scene looks the same on every visit
function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/* =====================================================
   the beach scene (generated details)
   ===================================================== */
function buildScene() {
  const rnd = seeded(42);

  // sun glints on the water
  const glints = $("glints");
  for (let i = 0; i < 26; i++) {
    const y = 304 + rnd() * 70;
    const spread = 30 + (y - 300) * 2.2;
    const x = 900 + (rnd() - 0.5) * spread * 2;
    const w = 6 + rnd() * (y - 296) * 0.5;
    const r = svg("rect", { x: x - w / 2, y, width: w, height: 1.4, rx: 0.7, fill: "#fff1d2", class: "glint" });
    r.style.animationDelay = `${-rnd() * 3.2}s`;
    glints.append(r);
  }

  // foam lines at the shore
  const foam = $("foam");
  [[384, "f1", 0.75], [376, "f2", 0.45]].forEach(([y, cls, op]) => {
    let d = `M-60,${y}`;
    for (let x = -60; x < 1520; x += 80) d += ` q20,${-3 - rnd() * 3} 40,0 t40,0`;
    foam.append(svg("path", { d, fill: "none", stroke: "#fbf3e6", "stroke-width": 2, opacity: op, class: `foam ${cls}`, "stroke-linecap": "round" }));
  });

  // ripples in the sand path
  const ripples = $("ripples");
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const y = 405 + t * t * 150;
    const half = 30 + t * t * 230;
    const cx = 720 + (rnd() - 0.5) * half * 0.6;
    const len = half * (0.25 + rnd() * 0.35);
    ripples.append(svg("path", {
      d: `M${cx - len},${y} q${len},${-2 - t * 5} ${len * 2},0`,
      "stroke-width": 0.6 + t * 1.6,
    }));
  }

  // fence posts converging on the horizon
  const fence = $("fence");
  const sides = [
    { near: [452, 590], far: [697, 394] },
    { near: [1012, 590], far: [744, 394] },
  ];
  for (const s of sides) {
    const posts = [];
    for (let i = 13; i >= 1; i--) {
      const t = 1 - 1 / (1 + 0.42 * i); // 0 near → 1 far
      const x = s.near[0] + (s.far[0] - s.near[0]) * t;
      const y = s.near[1] + (s.far[1] - s.near[1]) * t;
      const sc = Math.max(0.05, 1 - t * 0.97);
      posts.push({ x, y, sc });
    }
    // rope (far → near)
    let rope = "";
    posts.forEach((p, idx) => {
      const top = [p.x, p.y - 118 * p.sc - 4];
      if (idx === 0) rope = `M${top[0]},${top[1]}`;
      else {
        const prev = posts[idx - 1];
        const ptop = [prev.x, prev.y - 118 * prev.sc - 4];
        const mx = (top[0] + ptop[0]) / 2;
        const my = (top[1] + ptop[1]) / 2 + 10 * p.sc;
        rope += ` Q${mx},${my} ${top[0]},${top[1]}`;
      }
    });
    for (const p of posts) {
      const h = 120 * p.sc + 3;
      const w = 9 * p.sc + 1.4;
      const lean = (rnd() - 0.5) * 4;
      const g = svg("g", { transform: `rotate(${lean} ${p.x} ${p.y})` });
      g.append(svg("rect", { x: p.x - w / 2, y: p.y - h, width: w, height: h, rx: w * 0.25, fill: "#5f4838" }));
      g.append(svg("rect", { x: p.x - w / 2, y: p.y - h, width: w * 0.35, height: h, fill: "#86684f", opacity: 0.7 }));
      fence.append(g);
    }
    fence.append(svg("path", { d: rope, fill: "none", stroke: "#5f4838", "stroke-width": 1.3, opacity: 0.75 }));
  }

  // dune grass
  const grass = $("grass");
  const colors = ["#8b8a5a", "#a39661", "#6f7550", "#bfa975", "#7d7a52"];
  const cubic = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  function clump(x, y, size) {
    const g = svg("g", { class: "clump" });
    g.style.transformOrigin = `${x}px ${y}px`;
    g.style.animationDelay = `${-rnd() * 5}s`;
    g.style.animationDuration = `${4 + rnd() * 3}s`;
    const n = 5 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const h = size * (0.55 + rnd() * 0.6);
      const dx = (rnd() - 0.5) * size * 0.9;
      g.append(svg("path", {
        d: `M${x + (rnd() - 0.5) * size * 0.25},${y} Q${x + dx * 0.25},${y - h * 0.6} ${x + dx},${y - h}`,
        fill: "none", stroke: pick(colors), "stroke-width": Math.max(0.6, size * 0.035), "stroke-linecap": "round",
      }));
    }
    grass.append(g);
  }
  // along dune ridges
  const ridges = [
    [[0, 328], [200, 320], [420, 352], [620, 385]],
    [[1440, 322], [1240, 316], [1020, 350], [820, 385]],
  ];
  for (const r of ridges) {
    for (let t = 0; t <= 1; t += 0.018) {
      if (rnd() < 0.25) continue;
      const [x, y] = cubic(...r, t);
      clump(x + (rnd() - 0.5) * 10, y + 3 + rnd() * 6, 34 - t * 22);
    }
  }
  // big foreground tufts
  for (let i = 0; i < 22; i++) {
    const left = i % 2 === 0;
    const x = left ? rnd() * 380 : 1060 + rnd() * 380;
    const y = 430 + rnd() * 140;
    clump(x, y, 50 + (y - 430) * 0.45);
  }

  // golden motes floating in the light
  const motes = $("motes");
  for (let i = 0; i < 22; i++) {
    const m = el("span", { class: "mote" });
    m.style.cssText = `left:${10 + Math.random() * 80}%;top:${30 + Math.random() * 55}%;--s:${4 + Math.random() * 7}px;--d:${7 + Math.random() * 8}s;--delay:${-Math.random() * 12}s;--dx:${(Math.random() - 0.5) * 80}px`;
    motes.append(m);
  }
}

/* =====================================================
   data layer — local (this device) or cloud (Firebase)
   ===================================================== */
let mode = null;        // "local" | "cloud"
let cache = {};         // weekKey → week data
let user = null;
let fb = null;          // firebase functions + instances
let unsubscribe = null;
const pending = new Map(); // weekKey → timeout id

const blankWeek = () => ({ days: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }, goals: [], note: "" });

function normalize(raw) {
  const w = blankWeek();
  if (!raw || typeof raw !== "object") return w;
  for (let i = 0; i < 7; i++) if (raw.days && Array.isArray(raw.days[i])) w.days[i] = raw.days[i];
  if (Array.isArray(raw.goals)) w.goals = raw.goals;
  if (typeof raw.note === "string") w.note = raw.note;
  return w;
}

function readLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    if (data && data.weeks) {
      const out = {};
      for (const [k, w] of Object.entries(data.weeks)) out[k] = normalize(w);
      return out;
    }
  } catch (e) { /* ignore */ }
  return {};
}
function writeLocal() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ weeks: cache })); } catch (e) { /* ignore */ }
}
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

let weekStart = startOfWeek(new Date());
const currentKey = () => keyOf(weekStart);

function week() {
  const k = currentKey();
  if (!cache[k]) cache[k] = blankWeek();
  return cache[k];
}

const hasContent = (w) => Object.values(w.days).some((d) => d.length) || w.goals.length || w.note;

function cloudWrite(k) {
  pending.delete(k);
  const ref = fb.doc(fb.db, "users", user.uid, "weeks", k);
  return fb.setDoc(ref, { ...cache[k], updatedAt: fb.serverTimestamp() })
    .then(() => setSync("נשמר בענן ✓"))
    .catch((e) => { console.error(e); toast("אופס, השמירה לא הצליחה"); setSync("השמירה נכשלה"); });
}

function persist() {
  const k = currentKey();
  if (mode === "local") { writeLocal(); return; }
  if (mode !== "cloud") return;
  setSync("שומר…");
  clearTimeout(pending.get(k));
  pending.set(k, setTimeout(() => cloudWrite(k), 450));
}

function flushPending() {
  if (mode !== "cloud") return;
  for (const [k, t] of pending) { clearTimeout(t); cloudWrite(k); }
}
window.addEventListener("pagehide", flushPending);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushPending(); });

function watchWeek() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (mode !== "cloud") return;
  const k = currentKey();
  unsubscribe = fb.onSnapshot(
    fb.doc(fb.db, "users", user.uid, "weeks", k),
    (snap) => {
      if (pending.has(k)) return; // our own unsaved edits win
      cache[k] = snap.exists() ? normalize(snap.data()) : (cache[k] || blankWeek());
      if (currentKey() === k) render();
    },
    (err) => { console.error(err); setSync("אין חיבור לענן"); }
  );
}

async function migrateLocalToCloud() {
  const flag = `beachPlanner.migrated.${user.uid}`;
  if (lsGet(flag)) return;
  const local = readLocal();
  try {
    for (const [k, w] of Object.entries(local)) {
      if (!hasContent(w)) continue;
      const ref = fb.doc(fb.db, "users", user.uid, "weeks", k);
      const snap = await fb.getDoc(ref);
      if (!snap.exists()) await fb.setDoc(ref, { ...w, updatedAt: fb.serverTimestamp() });
    }
    lsSet(flag, "1");
  } catch (e) { console.error("migration failed", e); }
}

/* =====================================================
   auth
   ===================================================== */
async function initFirebase() {
  const [appM, authM, fsM] = await Promise.all([
    import(FIREBASE_CDN + "firebase-app.js"),
    import(FIREBASE_CDN + "firebase-auth.js"),
    import(FIREBASE_CDN + "firebase-firestore.js"),
  ]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  let db;
  try {
    db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }) });
  } catch (e) {
    db = fsM.getFirestore(app);
  }
  fb = {
    auth, db,
    GoogleAuthProvider: authM.GoogleAuthProvider,
    signInWithPopup: authM.signInWithPopup,
    signInWithRedirect: authM.signInWithRedirect,
    signOut: authM.signOut,
    doc: fsM.doc, getDoc: fsM.getDoc, setDoc: fsM.setDoc, onSnapshot: fsM.onSnapshot, serverTimestamp: fsM.serverTimestamp,
  };
  authM.getRedirectResult(auth).catch((e) => console.warn(e));

  authM.onAuthStateChanged(auth, async (u) => {
    if (u) {
      user = u;
      lsSet(MODE_KEY, null);
      mode = "cloud";
      cache = {};
      await migrateLocalToCloud();
      enterApp();
      watchWeek();
    } else {
      user = null;
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      if (lsGet(MODE_KEY) === "local") enterLocal();
      else showGate();
    }
  });
}

async function signIn() {
  if (!FIREBASE_READY || !fb) {
    toast("צריך קודם לחבר את Firebase");
    console.info("Firebase is not configured yet — see SETUP.md");
    return;
  }
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await fb.signInWithPopup(fb.auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-environment") {
      await fb.signInWithRedirect(fb.auth, provider);
    } else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
      console.error(e);
      toast("ההתחברות לא הצליחה, נסי שוב");
    }
  }
}

async function signOutNow() {
  flushPending();
  lsSet(MODE_KEY, null);
  if (mode === "cloud" && fb) await fb.signOut(fb.auth);
  else { mode = null; showGate(); }
}

function enterLocal() {
  mode = "local";
  lsSet(MODE_KEY, "local");
  cache = readLocal();
  enterApp();
}

function showGate() {
  document.body.classList.add("locked");
  $("gate").dataset.state = "ready";
  $("userChip").hidden = true;
}

function enterApp() {
  document.body.classList.remove("locked");
  renderUser();
  setGreeting();
  setSync(mode === "cloud" ? "מסונכרן עם החשבון שלך" : "נשמר במכשיר הזה בלבד");
  render();
}

/* =====================================================
   UI bits
   ===================================================== */
function setSync(text) { $("syncState").textContent = text; }

function setGreeting() {
  const h = new Date().getHours();
  const hello = h < 5 ? "לילה טוב" : h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 21 ? "ערב טוב" : "לילה טוב";
  const first = user && user.displayName ? user.displayName.split(" ")[0] : "";
  $("greeting").textContent = first ? `${hello}, ${first}` : hello;
}

function renderUser() {
  const chip = $("userChip");
  chip.replaceChildren();
  if (mode === "cloud" && user) {
    const first = (user.displayName || user.email || "").split(" ")[0];
    chip.append(
      user.photoURL
        ? el("img", { src: user.photoURL, alt: "", referrerpolicy: "no-referrer" })
        : el("span", { class: "avatar" }, first.charAt(0) || "✦"),
      el("span", { class: "name" }, first),
      el("button", { type: "button", onclick: signOutNow }, "יציאה"),
    );
  } else {
    chip.append(
      el("button", { type: "button", onclick: signIn }, "כניסה עם Google לסנכרון"),
      el("button", { type: "button", onclick: signOutNow, "aria-label": "חזרה למסך הפתיחה" }, "✕"),
    );
  }
  chip.hidden = false;
}

function sparkle(x, y) {
  for (let i = 0; i < 9; i++) {
    const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.4;
    const dist = 26 + Math.random() * 34;
    const s = el("span", { class: "spark" }, Math.random() < 0.5 ? "✦" : "✧");
    s.style.cssText = `left:${x}px;top:${y}px;--s:${9 + Math.random() * 9}px;--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px`;
    document.body.append(s);
    setTimeout(() => s.remove(), 1000);
  }
}

let toastTimer;
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = el("div", { class: "toast", role: "status" }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

function footprintSVG() {
  const s = svg("svg", { viewBox: "0 0 20 32", class: "fp", "aria-hidden": "true" });
  s.append(svg("path", { d: "M10 31c-4 0-5.5-4-5.3-8.5C5 16 6 12 10 12s5 4 5.3 10.5C15.5 27 14 31 10 31z", fill: "currentColor" }));
  [[4.2, 8.2, 2.1], [8, 5.4, 2.2], [12, 5.2, 2], [15.4, 7.2, 1.7], [17.6, 10.4, 1.4]].forEach(([cx, cy, r]) =>
    s.append(svg("circle", { cx, cy, r, fill: "currentColor" })));
  return s;
}

function weekTitle(start) {
  const end = addDays(start, 6);
  const range = el("span", { dir: "ltr" });
  let monthText;
  if (start.getMonth() === end.getMonth()) {
    range.textContent = `${start.getDate()}–${end.getDate()}`;
    monthText = ` ב${MONTHS[start.getMonth()]}`;
  } else {
    range.textContent = "";
    return [
      el("span", {}, `${start.getDate()} ב${MONTHS[start.getMonth()]} – ${end.getDate()} ב${MONTHS[end.getMonth()]}`),
      el("small", {}, String(end.getFullYear())),
    ];
  }
  return [el("span", {}, range, monthText), el("small", {}, String(end.getFullYear()))];
}

const sortTasks = (list) => [...list].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

const checkIcon = () => {
  const s = svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
  s.append(svg("circle", { class: "ring", cx: 12, cy: 12, r: 10.5 }));
  s.append(svg("path", { class: "tick", d: "M7.5 12.5l3 3 6-6.5" }));
  return s;
};

/* =====================================================
   render
   ===================================================== */
function render() {
  if (!mode) return;
  const w = week();
  const todayKey = keyOf(new Date());

  $("weekRange").replaceChildren(...weekTitle(weekStart));
  $("thisWeek").hidden = currentKey() === keyOf(startOfWeek(new Date()));

  // days
  const days = $("days");
  days.replaceChildren();
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const isToday = keyOf(date) === todayKey;
    const tasks = sortTasks(w.days[i]);

    const list = el("ul", { class: "tasks" });
    if (!tasks.length) list.append(el("li", { class: "empty" }, i === 6 ? "יום של מנוחה וים" : "עוד ריק כאן"));

    for (const t of tasks) {
      const cat = catById(t.cat);
      list.append(el("li", {
        class: "task" + (t.done ? " done" : ""),
        style: `--cat:${cat.color}`,
        tabindex: "0",
        onclick: () => openDialog(i, t.id),
        onkeydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) openDialog(i, t.id); },
      },
        el("button", {
          class: "check", type: "button",
          "aria-label": t.done ? "סימון כלא בוצע" : "סימון כבוצע",
          onclick: (e) => { e.stopPropagation(); toggleTask(i, t.id, e); },
        }, checkIcon()),
        el("span", { class: "task-body" },
          el("span", { class: "task-title" }, t.title),
          el("span", { class: "task-meta" },
            el("i", { class: "dot" }),
            [t.time, cat.label].filter(Boolean).join(" · "),
          ),
        ),
      ));
    }

    days.append(el("article", { class: "day" + (isToday ? " today" : "") },
      el("div", { class: "day-head" },
        el("span", {},
          el("span", { class: "day-name" }, DAY_NAMES[i]),
          isToday ? el("span", { class: "today-tag" }, "היום") : null,
        ),
        el("span", { class: "day-date" }, `${date.getDate()}.${date.getMonth() + 1}`),
      ),
      list,
      el("button", { class: "add-btn", type: "button", onclick: () => openDialog(i) }, "+ להוסיף"),
    ));
  }

  // goals
  const goals = $("goals");
  goals.replaceChildren();
  if (!w.goals.length) goals.append(el("li", { class: "empty" }, "מה הייתי רוצה להשיג השבוע?"));
  for (const g of w.goals) {
    const id = "g-" + g.id;
    goals.append(el("li", { class: "goal" + (g.done ? " done" : "") },
      el("label", { for: id },
        el("input", {
          type: "checkbox", id, checked: g.done,
          onchange: (e) => {
            g.done = e.target.checked; persist(); render();
            if (g.done) { const r = e.target.getBoundingClientRect(); sparkle(r.left + r.width / 2, r.top + r.height / 2); toast("מטרה הושגה ✦"); }
          },
        }),
        el("span", {}, g.text),
      ),
      el("button", {
        class: "x", type: "button", "aria-label": "מחיקת מטרה",
        onclick: () => { w.goals = w.goals.filter((x) => x.id !== g.id); persist(); render(); },
      }, "✕"),
    ));
  }

  // note
  const note = $("note");
  if (document.activeElement !== note) note.value = w.note || "";

  // footprints progress
  const all = Object.values(w.days).flat();
  const done = all.filter((t) => t.done).length;
  const STEPS = 12;
  const lit = all.length ? Math.round((done / all.length) * STEPS) : 0;
  const fpWrap = $("footprints");
  if (fpWrap.children.length !== STEPS) fpWrap.replaceChildren(...Array.from({ length: STEPS }, footprintSVG));
  [...fpWrap.children].forEach((n, idx) => n.classList.toggle("on", idx < lit));
  $("progressText").textContent =
    !all.length ? "השביל עוד מחכה לצעד הראשון"
    : done === all.length ? "הגעת עד הים. סיימת הכל השבוע ✦"
    : `${done} מתוך ${all.length} צעדים על החוף`;
}

/* =====================================================
   actions
   ===================================================== */
function toggleTask(day, id, evt) {
  const t = week().days[day].find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  persist();
  if (t.done) {
    const r = evt.currentTarget.getBoundingClientRect();
    sparkle(r.left + r.width / 2, r.top + r.height / 2);
    toast(pick(CHEERS));
  }
  render();
}

// dialog
const dialog = $("taskDialog");
let editing = null;
let selectedCat = "school";

function renderChips() {
  $("catChips").replaceChildren(...CATEGORIES.map((c) =>
    el("button", {
      type: "button", class: "chip", style: `--cat:${c.color}`,
      "aria-pressed": String(c.id === selectedCat),
      onclick: () => { selectedCat = c.id; renderChips(); },
    }, c.label)));
}

function openDialog(day, id) {
  const t = id ? week().days[day].find((x) => x.id === id) : null;
  editing = { day, id: t ? t.id : null };
  $("dialogDay").textContent = `יום ${DAY_NAMES[day]}, ${addDays(weekStart, day).getDate()}.${addDays(weekStart, day).getMonth() + 1}`;
  $("dialogTitle").textContent = t ? "עריכת משימה" : "משימה חדשה";
  $("taskTitle").value = t ? t.title : "";
  $("taskTime").value = t ? t.time || "" : "";
  $("taskDay").value = String(day);
  if (t) selectedCat = t.cat;
  $("deleteTask").hidden = !t;
  renderChips();
  dialog.showModal();
  $("taskTitle").focus();
}

$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("taskTitle").value.trim();
  if (!title || !editing) return;
  const w = week();
  let task;
  if (editing.id) {
    const list = w.days[editing.day];
    const idx = list.findIndex((x) => x.id === editing.id);
    if (idx >= 0) [task] = list.splice(idx, 1);
  }
  task = Object.assign(task || { id: uid(), done: false }, { title, time: $("taskTime").value, cat: selectedCat });
  w.days[Number($("taskDay").value)].push(task);
  persist();
  dialog.close();
  render();
});

$("deleteTask").addEventListener("click", () => {
  if (!editing || !editing.id) return;
  const w = week();
  w.days[editing.day] = w.days[editing.day].filter((x) => x.id !== editing.id);
  persist();
  dialog.close();
  render();
});
$("cancelTask").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

// goals & note
$("goalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("goalInput");
  const text = input.value.trim();
  if (!text) return;
  week().goals.push({ id: uid(), text, done: false });
  input.value = "";
  persist();
  render();
});
$("note").addEventListener("input", (e) => { week().note = e.target.value; persist(); });

// week navigation
function goWeek(date) { flushPending(); weekStart = date; watchWeek(); render(); }
$("prevWeek").addEventListener("click", () => goWeek(addDays(weekStart, -7)));
$("nextWeek").addEventListener("click", () => goWeek(addDays(weekStart, 7)));
$("thisWeek").addEventListener("click", () => goWeek(startOfWeek(new Date())));

// gate buttons
$("googleBtn").addEventListener("click", signIn);
$("localBtn").addEventListener("click", enterLocal);

/* =====================================================
   boot
   ===================================================== */
$("taskDay").replaceChildren(...DAY_NAMES.map((n, i) => el("option", { value: String(i) }, n)));
$("quote").textContent = pick(QUOTES);
buildScene();

if (FIREBASE_READY) {
  initFirebase().catch((e) => {
    console.error("Firebase failed to load", e);
    if (lsGet(MODE_KEY) === "local") enterLocal(); else showGate();
  });
} else {
  // no Firebase yet: the app still works, saved on this device only
  setTimeout(() => { if (lsGet(MODE_KEY) === "local") enterLocal(); else showGate(); }, 350);
}
