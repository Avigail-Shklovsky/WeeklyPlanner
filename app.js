import { firebaseConfig } from "./firebase-config.js";

/* =====================================================
   constants
   ===================================================== */
const FIREBASE_CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
const LOCAL_KEY = "beachPlanner.v1";
const MODE_KEY = "beachPlanner.mode";
const VIEW_KEY = "beachPlanner.view";

const FIREBASE_READY = Boolean(
  firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("YOUR")
);

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const DAY_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
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
// ---- Hebrew calendar (built into the browser's Intl) ----
const HEB_FMT = new Intl.DateTimeFormat("he-u-ca-hebrew-nu-latn", { day: "numeric", month: "long", year: "numeric" });
const hebCache = new Map();
function heb(d) {
  const k = keyOf(d);
  let v = hebCache.get(k);
  if (!v) {
    const p = {};
    for (const part of HEB_FMT.formatToParts(d)) if (part.type !== "literal") p[part.type] = part.value;
    v = { day: Number(p.day), month: p.month, year: Number(p.year) };
    hebCache.set(k, v);
  }
  return v;
}
function gematria(n) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  n %= 1000;
  const r = n % 100;
  let s = hundreds[Math.floor(n / 100)];
  s += r === 15 ? "טו" : r === 16 ? "טז" : tens[Math.floor(r / 10)] + ones[r % 10];
  return s.length === 1 ? s + "׳" : s.slice(0, -1) + "״" + s.slice(-1);
}
const hebDay = (d) => gematria(heb(d).day);
const hebYear = (d) => gematria(heb(d).year);
const hebDate = (d) => `${hebDay(d)} ב${heb(d).month}`;
const firstOfHebMonth = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, 1 - heb(x).day); };
const nextHebMonth = (first) => firstOfHebMonth(addDays(first, 30)); // months are 29–30 days
const prevHebMonth = (first) => firstOfHebMonth(addDays(first, -1));

// "15–21 בנובמבר 2026" (numbers isolated so they don't flip in RTL)
function gregRange(a, b) {
  if (a.getMonth() === b.getMonth()) return `⁦${a.getDate()}–${b.getDate()}⁩ ב${MONTHS[a.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} ב${MONTHS[a.getMonth()]} – ${b.getDate()} ב${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
}

// ---- Jewish holidays (Israel schedule), computed from the Hebrew date ----
const holidayCache = new Map();
function holidayFor(d) {
  const k = keyOf(d);
  if (holidayCache.has(k)) return holidayCache.get(k);
  const v = computeHoliday(d);
  holidayCache.set(k, v);
  return v;
}
function computeHoliday(d) {
  const { day, month } = heb(d);
  const wd = d.getDay(); // 0 = Sunday … 6 = Shabbat
  const H = (name, major = false) => ({ name, major });

  // Hanukkah: 25 Kislev + 7 days (crosses into Tevet)
  for (let n = 0; n < 8; n++) {
    const h = heb(addDays(d, -n));
    if (h.month === "כסלו" && h.day === 25) return H(`חנוכה · יום ${gematria(n + 1)}`);
  }

  switch (month) {
    case "תשרי":
      if (day === 1 || day === 2) return H("ראש השנה", true);
      if ((day === 3 && wd !== 6) || (day === 4 && wd === 0)) return H("צום גדליה");
      if (day === 9) return H("ערב יום כיפור");
      if (day === 10) return H("יום כיפור", true);
      if (day === 14) return H("ערב סוכות");
      if (day === 15) return H("סוכות", true);
      if (day >= 16 && day <= 20) return H("חול המועד סוכות");
      if (day === 21) return H("הושענא רבה");
      if (day === 22) return H("שמחת תורה", true);
      break;
    case "כסלו":
      if (day === 24) return H("ערב חנוכה");
      break;
    case "טבת":
      if (day === 10) return H("עשרה בטבת");
      break;
    case "שבט":
      if (day === 15) return H("ט״ו בשבט");
      break;
    case "אדר א׳":
      if (day === 14) return H("פורים קטן");
      break;
    case "אדר":
    case "אדר ב׳":
      if ((day === 13 && wd !== 6) || (day === 11 && wd === 4)) return H("תענית אסתר");
      if (day === 14) return H("פורים", true);
      if (day === 15) return H("שושן פורים");
      break;
    case "ניסן":
      if (day === 14) return H("ערב פסח");
      if (day === 15) return H("פסח", true);
      if (day >= 16 && day <= 20) return H("חול המועד פסח");
      if (day === 21) return H("שביעי של פסח", true);
      if ((day === 27 && wd !== 5 && wd !== 0) || (day === 26 && wd === 4) || (day === 28 && wd === 1)) return H("יום השואה");
      break;
    case "אייר": {
      // Independence Day moves so it never touches Shabbat
      const w5 = addDays(d, 5 - day).getDay();
      const atz = w5 === 5 ? 4 : w5 === 6 ? 3 : w5 === 1 ? 6 : 5;
      if (day === atz - 1) return H("יום הזיכרון");
      if (day === atz) return H("יום העצמאות", true);
      if (day === 18) return H("ל״ג בעומר");
      if (day === 28) return H("יום ירושלים");
      break;
    }
    case "סיוון":
      if (day === 5) return H("ערב שבועות");
      if (day === 6) return H("שבועות", true);
      break;
    case "תמוז":
      if ((day === 17 && wd !== 6) || (day === 18 && wd === 0)) return H("י״ז בתמוז");
      break;
    case "אב":
      if ((day === 9 && wd !== 6) || (day === 10 && wd === 0)) return H("תשעה באב");
      if (day === 15) return H("ט״ו באב");
      break;
    case "אלול":
      if (day === 29) return H("ערב ראש השנה");
      break;
  }
  return null;
}

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
let unsubs = [];        // live listeners for the visible weeks
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
let monthStart = firstOfHebMonth(new Date()); // first day of a Hebrew month
let view = lsGet(VIEW_KEY) === "month" ? "month" : "week";
const currentKey = () => keyOf(weekStart);
const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

function weekData(k = currentKey()) {
  if (!cache[k]) cache[k] = blankWeek();
  return cache[k];
}
const week = () => weekData();

// keys of every week row shown in the month grid
function monthWeeks() {
  const last = addDays(nextHebMonth(monthStart), -1);
  const keys = [];
  for (let d = startOfWeek(monthStart); d <= last; d = addDays(d, 7)) keys.push(keyOf(d));
  return keys;
}
const visibleKeys = () => (view === "month" ? monthWeeks() : [currentKey()]);

const hasContent = (w) => Object.values(w.days).some((d) => d.length) || w.goals.length || w.note;

function cloudWrite(k) {
  pending.delete(k);
  const ref = fb.doc(fb.db, "users", user.uid, "weeks", k);
  return fb.setDoc(ref, { ...cache[k], updatedAt: fb.serverTimestamp() })
    .then(() => setSync("נשמר בענן ✓"))
    .catch((e) => { console.error(e); toast("אופס, השמירה לא הצליחה"); setSync("השמירה נכשלה"); });
}

function persist(k = currentKey()) {
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

function stopWatching() { unsubs.forEach((u) => u()); unsubs = []; }

function watchVisible() {
  stopWatching();
  if (mode !== "cloud") return;
  for (const k of visibleKeys()) {
    unsubs.push(fb.onSnapshot(
      fb.doc(fb.db, "users", user.uid, "weeks", k),
      (snap) => {
        if (pending.has(k)) return; // our own unsaved edits win
        cache[k] = snap.exists() ? normalize(snap.data()) : (cache[k] || blankWeek());
        if (visibleKeys().includes(k)) render();
      },
      (err) => { console.error(err); setSync("אין חיבור לענן"); }
    ));
  }
}

// ---- shared events: /shared/{id}, visible to everyone in `participants` (emails) ----
let shared = [];
let sharedUnsub = null;
const myEmail = () => ((user && user.email) || "").toLowerCase();
const shortEmail = (e) => String(e || "").split("@")[0];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stopShared() {
  if (sharedUnsub) { sharedUnsub(); sharedUnsub = null; }
  shared = [];
}
function watchShared() {
  stopShared();
  if (mode !== "cloud" || !myEmail()) return;
  const q = fb.query(fb.collection(fb.db, "shared"), fb.where("participants", "array-contains", myEmail()));
  sharedUnsub = fb.onSnapshot(q,
    (snap) => { shared = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => { console.error("shared events", err); });
}
const sharedOn = (date) => { const k = keyOf(date); return shared.filter((e) => e.date === k); };

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
    collection: fsM.collection, query: fsM.query, where: fsM.where,
    addDoc: fsM.addDoc, updateDoc: fsM.updateDoc, deleteDoc: fsM.deleteDoc, arrayRemove: fsM.arrayRemove,
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
      watchVisible();
      watchShared();
    } else {
      user = null;
      stopWatching();
      stopShared();
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
  const primary = heb(start).month === heb(end).month
    ? `${hebDay(start)}–${hebDay(end)} ב${heb(start).month}`
    : `${hebDate(start)} – ${hebDate(end)}`;
  return [
    el("span", {}, primary),
    el("small", {}, el("b", {}, hebYear(end)), " · ", gregRange(start, end)),
  ];
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
  document.body.dataset.view = view;
  document.querySelectorAll(".view-toggle button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  $("prevWeek").setAttribute("aria-label", view === "month" ? "חודש קודם" : "שבוע קודם");
  $("nextWeek").setAttribute("aria-label", view === "month" ? "חודש הבא" : "שבוע הבא");
  if (view === "month") renderMonth();
  else renderWeek();
}

function renderProgress(all, scope) {
  const done = all.filter((t) => t.done).length;
  const STEPS = 12;
  const lit = all.length ? Math.round((done / all.length) * STEPS) : 0;
  const fpWrap = $("footprints");
  if (fpWrap.children.length !== STEPS) fpWrap.replaceChildren(...Array.from({ length: STEPS }, footprintSVG));
  [...fpWrap.children].forEach((n, idx) => n.classList.toggle("on", idx < lit));
  $("progressText").textContent =
    !all.length ? (scope === "month" ? "החודש עוד פתוח לגמרי" : "השביל עוד מחכה לצעד הראשון")
    : done === all.length ? (scope === "month" ? "סיימת הכל החודש ✦" : "הגעת עד הים. סיימת הכל השבוע ✦")
    : `${done} מתוך ${all.length} צעדים על החוף`;
}

// personal tasks + shared events for one day, by time
function dayItems(tasks, events) {
  return [...tasks.map((t) => ({ t, time: t.time })), ...events.map((e) => ({ e, time: e.time }))]
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

const peopleIcon = () => {
  const s = svg("svg", { viewBox: "0 0 24 24", class: "ppl", "aria-hidden": "true" });
  s.append(svg("circle", { cx: 9, cy: 8.5, r: 3.2 }));
  s.append(svg("circle", { cx: 16.6, cy: 9.6, r: 2.5 }));
  s.append(svg("path", { d: "M3.5 19.5c.6-3.3 2.9-5 5.5-5s4.9 1.7 5.5 5M14.6 14.6c.6-.3 1.3-.4 2-.4 2.2 0 3.9 1.5 4.4 4.3" }));
  return s;
};

function sharedWho(ev) {
  if (ev.ownerUid === (user && user.uid)) {
    const others = (ev.participants || []).filter((p) => p !== myEmail());
    return others.length ? `עם ${others.map(shortEmail).join(", ")}` : "משותף";
  }
  return `מאת ${ev.ownerName || shortEmail(ev.ownerEmail)}`;
}

function renderMonth() {
  const now = new Date();
  const todayKey = keyOf(now);
  const compact = matchMedia("(max-width: 640px)").matches;
  const next = nextHebMonth(monthStart);
  const last = addDays(next, -1);

  // Hebrew month is the headline; the Gregorian months it overlaps are secondary
  const ga = monthStart, gb = last;
  const greg = ga.getMonth() === gb.getMonth() ? `${MONTHS[ga.getMonth()]} ${ga.getFullYear()}`
    : ga.getFullYear() === gb.getFullYear() ? `${MONTHS[ga.getMonth()]}–${MONTHS[gb.getMonth()]} ${gb.getFullYear()}`
    : `${MONTHS[ga.getMonth()]} ${ga.getFullYear()} – ${MONTHS[gb.getMonth()]} ${gb.getFullYear()}`;
  $("weekRange").replaceChildren(
    el("span", {}, heb(monthStart).month),
    el("small", {}, el("b", {}, hebYear(monthStart)), " · ", greg),
  );
  $("thisWeek").textContent = "חזרה לחודש הזה";
  $("thisWeek").hidden = keyOf(monthStart) === keyOf(firstOfHebMonth(now));

  const grid = $("month");
  grid.replaceChildren(...DAY_NAMES.map((n, i) =>
    el("div", { class: "m-head" }, el("span", { class: "long" }, n), el("span", { class: "short" }, DAY_SHORT[i]))));

  const monthTasks = [];
  for (const wk of monthWeeks()) {
    const w = weekData(wk);
    const ws = parseKey(wk);
    for (let i = 0; i < 7; i++) {
      const date = addDays(ws, i);
      const inMonth = date >= monthStart && date < next;
      const tasks = sortTasks(w.days[i]);
      const items = dayItems(tasks, sharedOn(date));
      const hol = holidayFor(date);
      if (inMonth) monthTasks.push(...tasks);

      const gd = date.getDate();
      const gregLabel = !compact && (gd === 1 || keyOf(date) === keyOf(monthStart)) ? `${gd} ב${MONTHS[date.getMonth()]}` : String(gd);

      const cell = el("div", {
        class: "m-cell" + (inMonth ? "" : " out") + (keyOf(date) === todayKey ? " today" : "") + (hol && hol.major ? " yomtov" : ""),
        role: "button", tabindex: "0",
        "aria-label": `יום ${DAY_NAMES[i]}, ${hebDate(date)}, ${gd}.${date.getMonth() + 1}${hol ? ", " + hol.name : ""}, ${items.length ? items.length + " משימות" : "ריק"}`,
        onclick: () => (compact ? jumpToDay(ws, i) : openDialog(wk, i)),
        onkeydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) openDialog(wk, i); },
      }, el("span", { class: "m-top" },
        el("span", { class: "m-date" }, hebDay(date)),
        el("span", { class: "m-greg" }, gregLabel),
      ));
      if (hol) cell.append(el("span", { class: "m-hol", title: hol.name }, compact ? "✦" : hol.name));

      if (compact) {
        if (items.length) cell.append(el("span", { class: "m-dots" },
          ...items.slice(0, 4).map((it) => el("i", {
            class: it.e ? "shared" : it.t.done ? "done" : "",
            style: `--cat:${catById((it.t || it.e).cat).color}`,
          }))));
      } else {
        const MAX = 3;
        const list = el("ul", { class: "m-tasks" });
        for (const it of items.slice(0, MAX)) {
          const x = it.t || it.e;
          list.append(el("li", {
            class: "m-task" + (it.e ? " shared" : x.done ? " done" : ""),
            style: `--cat:${catById(x.cat).color}`,
            title: it.e ? `${x.title} · ${sharedWho(x)}` : x.title,
            onclick: (e) => { e.stopPropagation(); it.e ? openShared(x.id) : openDialog(wk, i, x.id); },
          }, el("i", { class: "dot" }), el("span", {}, x.time ? `${x.time} ${x.title}` : x.title)));
        }
        if (items.length > MAX) {
          list.append(el("li", {
            class: "m-more",
            onclick: (e) => { e.stopPropagation(); jumpToDay(ws, i); },
          }, `+${items.length - MAX} עוד`));
        }
        cell.append(list);
      }
      grid.append(cell);
    }
  }
  renderProgress(monthTasks, "month");
}

function taskItem(t, i) {
  const cat = catById(t.cat);
  return el("li", {
    class: "task" + (t.done ? " done" : ""),
    style: `--cat:${cat.color}`,
    tabindex: "0",
    onclick: () => openDialog(currentKey(), i, t.id),
    onkeydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) openDialog(currentKey(), i, t.id); },
  },
    el("button", {
      class: "check", type: "button",
      "aria-label": t.done ? "סימון כלא בוצע" : "סימון כבוצע",
      onclick: (e) => { e.stopPropagation(); toggleTask(currentKey(), i, t.id, e); },
    }, checkIcon()),
    el("span", { class: "task-body" },
      el("span", { class: "task-title" }, t.title),
      el("span", { class: "task-meta" },
        el("i", { class: "dot" }),
        [t.time, cat.label].filter(Boolean).join(" · "),
      ),
    ),
  );
}

function sharedItem(ev) {
  const cat = catById(ev.cat);
  return el("li", {
    class: "task shared",
    style: `--cat:${cat.color}`,
    tabindex: "0",
    onclick: () => openShared(ev.id),
    onkeydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) openShared(ev.id); },
  },
    el("span", { class: "share-badge", title: "אירוע משותף" }, peopleIcon()),
    el("span", { class: "task-body" },
      el("span", { class: "task-title" }, ev.title),
      el("span", { class: "task-meta" },
        el("i", { class: "dot" }),
        [ev.time, sharedWho(ev)].filter(Boolean).join(" · "),
      ),
    ),
  );
}

function renderWeek() {
  const w = week();
  const todayKey = keyOf(new Date());

  $("weekRange").replaceChildren(...weekTitle(weekStart));
  $("thisWeek").textContent = "חזרה לשבוע הזה";
  $("thisWeek").hidden = currentKey() === keyOf(startOfWeek(new Date()));

  // days
  const days = $("days");
  days.replaceChildren();
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const isToday = keyOf(date) === todayKey;
    const items = dayItems(sortTasks(w.days[i]), sharedOn(date));
    const hol = holidayFor(date);

    const list = el("ul", { class: "tasks" });
    if (!items.length) list.append(el("li", { class: "empty" }, i === 6 ? "יום של מנוחה וים" : "עוד ריק כאן"));
    for (const it of items) list.append(it.t ? taskItem(it.t, i) : sharedItem(it.e));

    days.append(el("article", { class: "day" + (isToday ? " today" : "") + (hol && hol.major ? " yomtov" : ""), "data-day": String(i) },
      el("div", { class: "day-head" },
        el("span", {},
          el("span", { class: "day-name" }, DAY_NAMES[i]),
          isToday ? el("span", { class: "today-tag" }, "היום") : null,
        ),
        el("span", { class: "day-date" },
          el("span", { class: "heb" }, hebDate(date)),
          el("small", {}, `${date.getDate()}.${date.getMonth() + 1}`),
        ),
      ),
      hol ? el("p", { class: "holiday" }, "✦ ", hol.name) : null,
      list,
      el("button", { class: "add-btn", type: "button", onclick: () => openDialog(currentKey(), i) }, "+ להוסיף"),
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

  renderProgress(Object.values(w.days).flat(), "week");
}

/* =====================================================
   actions
   ===================================================== */
function toggleTask(wk, day, id, evt) {
  const t = weekData(wk).days[day].find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  persist(wk);
  if (t.done) {
    const r = evt.currentTarget.getBoundingClientRect();
    sparkle(r.left + r.width / 2, r.top + r.height / 2);
    toast(pick(CHEERS));
  }
  render();
}

// dialog
const dialog = $("taskDialog");
let editing = null;      // { wk, day, id, sharedId, readonly }
let selectedCat = "school";
let shareEmails = [];

function renderChips() {
  $("catChips").replaceChildren(...CATEGORIES.map((c) =>
    el("button", {
      type: "button", class: "chip", style: `--cat:${c.color}`,
      "aria-pressed": String(c.id === selectedCat),
      disabled: Boolean(editing && editing.readonly),
      onclick: () => { selectedCat = c.id; renderChips(); },
    }, c.label)));
}

function renderEmails() {
  const input = $("emailInput");
  const ro = Boolean(editing && editing.readonly);
  $("emailBox").replaceChildren(...shareEmails.map((addr) => el("span", { class: "email-chip" },
    addr,
    ro ? null : el("button", {
      type: "button", "aria-label": `הסרת ${addr}`,
      onclick: () => { shareEmails = shareEmails.filter((x) => x !== addr); renderEmails(); },
    }, "✕"),
  )), input);
  input.hidden = ro;
}

// returns false if something typed isn't a valid email
function addEmails(text) {
  let ok = true;
  for (const raw of text.split(/[\s,;]+/)) {
    const addr = raw.trim().toLowerCase();
    if (!addr) continue;
    if (!EMAIL_RE.test(addr)) { ok = false; continue; }
    if (addr === myEmail() || shareEmails.includes(addr) || shareEmails.length >= 20) continue;
    shareEmails.push(addr);
  }
  renderEmails();
  return ok;
}

function commitTypedEmail() {
  const input = $("emailInput");
  if (!input.value.trim()) return true;
  if (!addEmails(input.value)) { toast("המייל הזה לא נראה תקין"); return false; }
  input.value = "";
  return true;
}

$("emailInput").addEventListener("keydown", (e) => {
  if (["Enter", ",", ";", " "].includes(e.key)) { e.preventDefault(); commitTypedEmail(); }
  else if (e.key === "Backspace" && !e.target.value && shareEmails.length) { shareEmails.pop(); renderEmails(); }
});
$("emailInput").addEventListener("blur", commitTypedEmail);

// one place that fills the postcard for every case
function fillDialog({ wk, day, title, time, cat, eyebrowNote, heading, emails, readonly, canDelete, deleteLabel, hint }) {
  const date = addDays(parseKey(wk), day);
  $("dialogDay").textContent = `יום ${DAY_NAMES[day]}, ${hebDate(date)} · ${date.getDate()}.${date.getMonth() + 1}${eyebrowNote ? " · " + eyebrowNote : ""}`;
  $("dialogTitle").textContent = heading;
  $("taskTitle").value = title || "";
  $("taskTime").value = time || "";
  $("taskDay").value = String(day);
  if (cat) selectedCat = cat;
  for (const id of ["taskTitle", "taskTime", "taskDay"]) $(id).disabled = readonly;
  $("taskForm").classList.toggle("readonly", readonly);
  $("saveTask").hidden = readonly;
  $("cancelTask").textContent = readonly ? "סגירה" : "ביטול";
  $("deleteTask").hidden = !canDelete;
  $("deleteTask").textContent = deleteLabel || "מחיקה";

  shareEmails = [...emails];
  $("emailInput").value = "";
  if (mode === "cloud") {
    $("emailBox").hidden = false;
    $("shareHint").textContent = hint || "היא תראה את זה כשתיכנס עם חשבון Google של המייל הזה";
  } else {
    $("emailBox").hidden = true;
    $("shareHint").textContent = "כדי לשתף אירוע עם חברות צריך להיכנס עם Google";
  }
  renderChips();
  renderEmails();
  dialog.showModal();
  if (!readonly) $("taskTitle").focus();
}

function openDialog(wk, day, id) {
  const t = id ? weekData(wk).days[day].find((x) => x.id === id) : null;
  editing = { wk, day, id: t ? t.id : null, sharedId: null, readonly: false };
  fillDialog({
    wk, day, title: t && t.title, time: t && t.time, cat: t && t.cat,
    heading: t ? "עריכת משימה" : "משימה חדשה",
    emails: [], readonly: false, canDelete: Boolean(t),
  });
}

function openShared(id) {
  const ev = shared.find((x) => x.id === id);
  if (!ev) return;
  const date = parseKey(ev.date);
  const wk = keyOf(startOfWeek(date));
  const day = date.getDay();
  const mine = ev.ownerUid === user.uid;
  editing = { wk, day, id: null, sharedId: id, readonly: !mine };
  const others = (ev.participants || []).filter((p) => p !== myEmail());
  fillDialog({
    wk, day, title: ev.title, time: ev.time, cat: ev.cat,
    eyebrowNote: "משותף",
    heading: mine ? "עריכת אירוע משותף" : "אירוע משותף",
    emails: others, readonly: !mine, canDelete: true,
    deleteLabel: mine ? "מחיקה לכולם" : "להסיר מהלוח שלי",
    hint: mine ? null : `שותף איתך ע״י ${ev.ownerName || shortEmail(ev.ownerEmail)}`,
  });
}

const sharedRef = (id) => fb.doc(fb.db, "shared", id);
const oops = (msg) => (err) => { console.error(err); toast(msg); };

$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!editing || editing.readonly) return;
  if (!commitTypedEmail()) return;
  const title = $("taskTitle").value.trim();
  if (!title) return;
  const time = $("taskTime").value;
  const newDay = Number($("taskDay").value);
  const date = addDays(parseKey(editing.wk), newDay);

  if (mode === "cloud" && shareEmails.length) {
    // save as a shared event
    const data = {
      title, time, cat: selectedCat, date: keyOf(date),
      participants: [myEmail(), ...shareEmails],
      ownerUid: user.uid, ownerEmail: myEmail(),
      ownerName: (user.displayName || shortEmail(myEmail())).split(" ")[0],
      updatedAt: fb.serverTimestamp(),
    };
    if (editing.sharedId) {
      fb.updateDoc(sharedRef(editing.sharedId), data).catch(oops("העדכון לא הצליח"));
    } else {
      fb.addDoc(fb.collection(fb.db, "shared"), { ...data, createdAt: fb.serverTimestamp() }).catch(oops("השיתוף לא הצליח"));
      if (editing.id) { // a personal task that just became shared
        const w = weekData(editing.wk);
        w.days[editing.day] = w.days[editing.day].filter((x) => x.id !== editing.id);
        persist(editing.wk);
      }
      toast("האירוע שותף ✦");
    }
  } else {
    // save as a personal task
    const w = weekData(editing.wk);
    let task;
    if (editing.sharedId) {
      fb.deleteDoc(sharedRef(editing.sharedId)).catch(oops("לא הצלחתי לבטל את השיתוף"));
    } else if (editing.id) {
      const list = w.days[editing.day];
      const idx = list.findIndex((x) => x.id === editing.id);
      if (idx >= 0) [task] = list.splice(idx, 1);
    }
    task = Object.assign(task || { id: uid(), done: false }, { title, time, cat: selectedCat });
    w.days[newDay].push(task);
    persist(editing.wk);
  }
  dialog.close();
  render();
});

$("deleteTask").addEventListener("click", () => {
  if (!editing) return;
  if (editing.sharedId) {
    if (editing.readonly) {
      fb.updateDoc(sharedRef(editing.sharedId), { participants: fb.arrayRemove(myEmail()) }).catch(oops("לא הצלחתי להסיר"));
    } else {
      fb.deleteDoc(sharedRef(editing.sharedId)).catch(oops("המחיקה לא הצליחה"));
    }
  } else if (editing.id) {
    const w = weekData(editing.wk);
    w.days[editing.day] = w.days[editing.day].filter((x) => x.id !== editing.id);
    persist(editing.wk);
  }
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

// navigation (week or month)
function refresh() { watchVisible(); render(); }

function step(dir) {
  flushPending();
  if (view === "month") monthStart = dir > 0 ? nextHebMonth(monthStart) : prevHebMonth(monthStart);
  else weekStart = addDays(weekStart, 7 * dir);
  refresh();
}
$("prevWeek").addEventListener("click", () => step(-1));
$("nextWeek").addEventListener("click", () => step(1));
$("thisWeek").addEventListener("click", () => {
  flushPending();
  const now = new Date();
  weekStart = startOfWeek(now);
  monthStart = firstOfHebMonth(now);
  refresh();
});

function setView(v) {
  if (v === view) return;
  flushPending();
  const now = new Date();
  if (v === "month") {
    // show the month of the week we were looking at (today's month if it's this week)
    const ref = currentKey() === keyOf(startOfWeek(now)) ? now : addDays(weekStart, 3);
    monthStart = firstOfHebMonth(ref);
  } else {
    const sameMonth = keyOf(monthStart) === keyOf(firstOfHebMonth(now));
    weekStart = startOfWeek(sameMonth ? now : monthStart);
  }
  view = v;
  lsSet(VIEW_KEY, v);
  refresh();
}
document.querySelectorAll(".view-toggle button").forEach((b) =>
  b.addEventListener("click", () => setView(b.dataset.view)));

function jumpToDay(ws, day) {
  flushPending();
  view = "week";
  lsSet(VIEW_KEY, "week");
  weekStart = ws;
  refresh();
  requestAnimationFrame(() => {
    const card = document.querySelector(`.day[data-day="${day}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
  });
}

// month cells switch between titles and dots at phone width
matchMedia("(max-width: 640px)").addEventListener("change", () => { if (view === "month") render(); });

// gate buttons
$("googleBtn").addEventListener("click", signIn);
$("localBtn").addEventListener("click", enterLocal);

/* =====================================================
   boot
   ===================================================== */
$("taskDay").replaceChildren(...DAY_NAMES.map((n, i) => el("option", { value: String(i) }, n)));
$("quote").textContent = pick(QUOTES);
$("year").textContent = String(new Date().getFullYear());
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
