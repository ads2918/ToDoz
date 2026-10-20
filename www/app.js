// To Doz — to-do list with optional categories, day planning, reminders,
// custom backgrounds (solid / gradient / tie-dye) and a minimize-to-bubble mode.
// Everything is saved in localStorage, so it survives closing the app.

const STORAGE_KEY = "todoBubble.v1";
const BUBBLE_SIZE = 60;
const EDGE_MARGIN = 12;
const REMINDER_GRACE_MS = 60 * 60 * 1000;      // still show a reminder up to 1h late
const SUMMARY_GRACE_MS = 3 * 60 * 60 * 1000;   // still show the daily summary up to 3h late

const SOLIDS = [
  "#2b6cb0", "#2f855a", "#c53030", "#6b46c1", "#d69e2e", "#dd6b20",
  "#319795", "#b83280", "#1a202c", "#4a5568", "#f7fafc", "#fefcbf",
];

const GRADIENTS = [
  { id: "sunset", css: "linear-gradient(160deg, #ff7e5f, #feb47b)", accent: "#e8603c" },
  { id: "ocean", css: "linear-gradient(160deg, #1d6fa3, #6dd5ed)", accent: "#1d6fa3" },
  { id: "grape", css: "linear-gradient(160deg, #667eea, #764ba2)", accent: "#5a4fcf" },
  { id: "mint", css: "linear-gradient(160deg, #11998e, #38ef7d)", accent: "#11998e" },
  { id: "fire", css: "linear-gradient(160deg, #f12711, #f5af19)", accent: "#d63a0f" },
  { id: "night", css: "linear-gradient(160deg, #0f2027, #203a43, #2c5364)", accent: "#2c5364" },
  { id: "aurora", css: "linear-gradient(160deg, #00c9ff, #92fe9d)", accent: "#0098c7" },
  { id: "berry", css: "linear-gradient(160deg, #8e2de2, #ff0080)", accent: "#a0249a" },
  { id: "candy", css: "linear-gradient(160deg, #fbc2eb, #a6c1ee)", accent: "#7d6bd1", light: true },
  { id: "peach", css: "linear-gradient(160deg, #ffecd2, #fcb69f)", accent: "#d9713f", light: true },
  { id: "lime", css: "linear-gradient(160deg, #d4fc79, #96e6a1)", accent: "#3f8f4b", light: true },
  { id: "rainbow", css: "linear-gradient(160deg, #ff512f, #f09819, #ffe259, #56ab2f, #2193b0, #6a3093)", accent: "#6a3093" },
  { id: "steel", css: "linear-gradient(160deg, #232526, #414345, #5c6b73)", accent: "#414345" },
  { id: "deepsea", css: "linear-gradient(160deg, #000428, #004e92)", accent: "#004e92" },
  { id: "forest", css: "linear-gradient(160deg, #0b3d2e, #134e5e, #71b280)", accent: "#134e5e" },
  { id: "midnight", css: "linear-gradient(160deg, #0f0c29, #302b63, #24243e)", accent: "#302b63" },
];

const RAINBOW = ["#ff1f5a", "#ff8c1a", "#ffe11a", "#38d94a", "#1ab2ff", "#7a3cff"];
const TIEDYES = [
  { id: "spiral", mode: "spiral", arms: 1, twist: 4, palette: RAINBOW },
  { id: "ocean", mode: "spiral", arms: 2, twist: 3, palette: ["#0b3d91", "#1e90ff", "#7fdbff", "#e8fbff", "#20c997"] },
  { id: "sunset", mode: "spiral", arms: 2, twist: 5, palette: ["#ff4e50", "#fc913a", "#f9d62e", "#ff6fb5", "#8e44ad"] },
  { id: "bullseye", mode: "rings", twist: 6, palette: RAINBOW },
  { id: "scrunch", mode: "scrunch", palette: ["#ff3cac", "#784ba0", "#2b86c5", "#00f5d4"] },
  { id: "galaxy", mode: "spiral", arms: 3, twist: 2, palette: ["#120136", "#4a00e0", "#8e2de2", "#ff6ec7", "#1a1a6e"] },
  // Psychedelic
  { id: "kaleido", mode: "kaleido", segments: 8, twist: 5, palette: ["#ff00cc", "#3333ff", "#00ffcc", "#ffff00", "#ff6600"] },
  { id: "neon", mode: "kaleido", segments: 6, twist: 8, palette: ["#08f7fe", "#09fbd3", "#fe53bb", "#f5d300", "#7122fa"] },
  { id: "vortex", mode: "vortex", arms: 2, twist: 3, palette: ["#39ff14", "#ff073a", "#fffb00", "#00f0ff", "#bc13fe"] },
  { id: "lava", mode: "lava", palette: ["#ff2e00", "#ff9500", "#ffd000", "#c4005a", "#4b0082"] },
  { id: "groovy", mode: "waves", twist: 4, palette: ["#f4a259", "#e76f51", "#f4d35e", "#2a9d8f", "#8f2d56"] },
  { id: "marble", mode: "marble", palette: ["#0d0221", "#26408b", "#a6cfd5", "#ff6ec7", "#7122fa"] },
  { id: "mandala", mode: "mandala", petals: 8, twist: 5, palette: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"] },
  { id: "hypno", mode: "vortex", arms: 4, twist: 9, palette: ["#0a0a0a", "#f5f5f5", "#ff00aa", "#0a0a0a", "#00ffd5"] },
  { id: "plasma", mode: "plasma", palette: ["#00f5d4", "#9b5de5", "#f15bb5", "#fee440", "#00bbf9"] },
  { id: "sunburst", mode: "rays", rays: 12, palette: ["#ff4800", "#ffb700", "#ff0054", "#ffd500", "#ff7b00"] },
  { id: "warp", mode: "warp", palette: ["#06d6a0", "#118ab2", "#073b4c", "#ef476f", "#ffd166"] },
  // Dark & bold: fewer pinks
  { id: "camo", group: "bold", mode: "scrunch", palette: ["#3b4a2a", "#5b6b3a", "#8a8f5a", "#2e3320", "#6e5a3a"] },
  { id: "ice", group: "bold", mode: "spiral", arms: 2, twist: 4, palette: ["#0a1a3a", "#1e5aa8", "#4fc3f7", "#e1f5fe", "#0d47a1"] },
  { id: "toxic", group: "bold", mode: "lava", palette: ["#0b0b0b", "#39ff14", "#1a5c00", "#c6ff00", "#003300"] },
  { id: "inferno", group: "bold", mode: "vortex", arms: 3, twist: 4, palette: ["#0b0b0b", "#ff3d00", "#ffab00", "#b71c1c", "#212121"] },
  { id: "electric", group: "bold", mode: "kaleido", segments: 6, twist: 6, palette: ["#000814", "#003566", "#00b4d8", "#ffd60a", "#001d3d"] },
  { id: "space", group: "bold", mode: "marble", palette: ["#000000", "#0b132b", "#1c2541", "#3a506b", "#5bc0be"] },
  { id: "carbon", group: "bold", mode: "warp", palette: ["#111111", "#2b2b2b", "#3d3d3d", "#00e5ff", "#1a1a1a"] },
  { id: "jungle", group: "bold", mode: "mandala", petals: 6, twist: 5, palette: ["#081c15", "#1b4332", "#2d6a4f", "#52b788", "#b7e4c7"] },
];

const BUBBLE_ICONS = [
  "✓", "📝", "📋", "⭐", "🔥", "💡", "❤️", "🐱", "👻", "🍀", "🚀", "☮️",
  "👽", "👾", "🛸", "🍄", "🦄", "🪐", "🧿", "👁️", "🤖", "💀", "🐙", "🌈",
];

const CATEGORY_COLORS = ["#f56565", "#ed8936", "#ecc94b", "#48bb78", "#38b2ac", "#4299e1", "#9f7aea", "#ed64a6"];

// ---------- State ----------

let state = load();

function load() {
  const fallback = {
    items: [],
    categories: [],
    bg: { kind: "solid", value: SOLIDS[0] },
    icon: "✓",
    minimized: false,
    bubble: null,
    view: "list",
    filter: "all",
    summary: false,
    summaryTime: "08:00",
    composerCollapsed: false,
    hue: 0,
    celebrate: true,
    sound: true,
    motion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "still" : "ripple",
    notified: {},
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return fallback;
    // First version stored just a color
    if (saved.color && !saved.bg) saved.bg = { kind: "solid", value: saved.color };
    delete saved.color;
    // Reminders used to be one switch for everything; now each item has its own
    for (const item of saved.items || []) {
      if (item.remind === undefined) item.remind = !!(item.time && saved.reminders);
    }
    delete saved.reminders;
    return { ...fallback, ...saved };
  } catch {
    return fallback;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode etc.) — app still works for this session.
  }
  scheduleNativeSoon();
}

// ---------- Icons ----------
// Line icons in the style of Lucide (lucide.dev, ISC license), drawn as inline SVG
// so they stay crisp at any size and take the current text color.

const ICONS = {
  palette: '<circle cx="13.5" cy="6.5" r="1.2" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1.2" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  "chevron-up": '<path d="m18 15-6-6-6 6"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bell: '<path d="M10.27 21a2 2 0 0 0 3.46 0M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  grip: '<circle cx="9" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
  pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
};

function icon(name) {
  const span = document.createElement("span");
  span.className = "ico";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

for (const el of document.querySelectorAll("[data-icon]")) el.prepend(icon(el.dataset.icon));

// ---------- Elements ----------

const $ = (id) => document.getElementById(id);
const panel = $("panel");
const list = $("list");
const plan = $("plan");
const newItem = $("newItem");
const bubble = $("bubble");
const themePanel = $("themePanel");
const settingsPanel = $("settingsPanel");
const addDetails = $("addDetails");
const addWhen = $("addWhen");
const addAllDay = $("addAllDay");
const addCategory = $("addCategory");
const editDialog = $("editDialog");

// ---------- Dates ----------

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

function parseDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dueTime(item) {
  if (!item.date || !item.time) return null;
  const [h, m] = item.time.split(":").map(Number);
  const d = parseDay(item.date);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(key) {
  if (key === addDays(0)) return "Today";
  if (key === addDays(1)) return "Tomorrow";
  if (key === addDays(-1)) return "Yesterday";
  const d = parseDay(key);
  const diff = Math.round((d - parseDay(addDays(0))) / 86400000);
  return d.toLocaleDateString([], diff > 0 && diff < 7 ? { weekday: "long" } : { weekday: "short", month: "short", day: "numeric" });
}

const byTime = (a, b) => (a.time || "99") < (b.time || "99") ? -1 : 1;

// ---------- Categories ----------

const categoryOf = (item) => state.categories.find((c) => c.id === item.category) || null;

function fillCategorySelect(select, value) {
  select.innerHTML = "";
  const none = new Option("No category", "");
  select.append(none);
  for (const c of state.categories) select.append(new Option(c.name, c.id));
  select.value = value || "";
}

function renderCategories() {
  const catList = $("catList");
  catList.innerHTML = "";
  for (const c of state.categories) {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.setProperty("--c", c.color);
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = c.name;
    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "×";
    del.setAttribute("aria-label", `Delete ${c.name}`);
    del.onclick = () => deleteCategory(c.id);
    li.dataset.id = c.id;
    li.append(dragGrip(li, catList, reorderCategories), dot, name, del);
    catList.append(li);
  }
}

function deleteCategory(id) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat || !confirm(`Delete "${cat.name}"? Its items stay, just without a category.`)) return;
  state.categories = state.categories.filter((c) => c.id !== id);
  for (const item of state.items) if (item.category === id) item.category = null;
  if (state.filter === id) state.filter = "all";
  save();
  render();
}

$("catForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("catName").value.trim();
  if (!name) return;
  state.categories.push({ id: "c" + Date.now(), name, color: $("catColor").value });
  $("catName").value = "";
  $("catColor").value = CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length];
  save();
  render();
});

// ---------- Rendering ----------

function visibleItems() {
  if (state.filter === "all") return state.items;
  return state.items.filter((i) => i.category === state.filter);
}

// ---------- Drag to reorder ----------
// Press a row's grip and drag it up or down. Neighbours swap in as you pass their
// middle, the list scrolls when you reach its edge, and the new order is saved on release.

let lastDragEnd = 0;
const justDragged = () => performance.now() - lastDragEnd < 300;

function dragGrip(row, container, onDone) {
  const grip = document.createElement("span");
  grip.className = "grip";
  grip.setAttribute("aria-label", "Drag to reorder");
  grip.append(icon("grip"));
  grip.addEventListener("pointerdown", (e) => startDrag(e, grip, row, container, onDone));
  // Keep taps on the grip from checking off the task
  grip.addEventListener("click", (e) => e.stopPropagation());
  return grip;
}

function startDrag(e, grip, row, container, onDone) {
  e.preventDefault();
  e.stopPropagation(); // don't start the row's tap/hold handling
  try {
    grip.setPointerCapture(e.pointerId); // keep getting moves even if the finger leaves the grip
  } catch {}
  const scroller = container.closest("#views, .sheet") || container;
  const grabOffset = e.clientY - row.getBoundingClientRect().top;
  let offset = 0;
  let pointerY = e.clientY;
  let scrollTimer = null;
  row.classList.add("dragging");
  if (navigator.vibrate) navigator.vibrate(10);
  playPop();

  // Place the row under the finger, swapping with neighbours it has passed
  const follow = () => {
    const layoutTop = () => row.getBoundingClientRect().top - offset;
    offset = pointerY - grabOffset - layoutTop();
    row.style.transform = `translateY(${offset}px)`;
    for (;;) {
      const mid = row.getBoundingClientRect().top + row.offsetHeight / 2;
      const prev = row.previousElementSibling;
      const next = row.nextElementSibling;
      let moved = false;
      if (offset < 0 && prev && mid < prev.getBoundingClientRect().top + prev.offsetHeight / 2) {
        container.insertBefore(row, prev);
        moved = true;
      } else if (offset > 0 && next && mid > next.getBoundingClientRect().top + next.offsetHeight / 2) {
        container.insertBefore(next, row);
        moved = true;
      }
      if (!moved) break;
      offset = pointerY - grabOffset - layoutTop();
      row.style.transform = `translateY(${offset}px)`;
    }
  };

  // Scroll the list when dragging near its top or bottom edge
  const autoScroll = () => {
    const box = scroller.getBoundingClientRect();
    const edge = 60;
    let speed = 0;
    if (pointerY < box.top + edge) speed = -Math.ceil((box.top + edge - pointerY) / 6);
    else if (pointerY > box.bottom - edge) speed = Math.ceil((pointerY - (box.bottom - edge)) / 6);
    if (speed) {
      scroller.scrollTop += speed;
      follow();
    }
    scrollTimer = requestAnimationFrame(autoScroll);
  };
  scrollTimer = requestAnimationFrame(autoScroll);

  const onMove = (ev) => {
    pointerY = ev.clientY;
    follow();
  };
  const onUp = () => {
    cancelAnimationFrame(scrollTimer);
    grip.removeEventListener("pointermove", onMove);
    grip.removeEventListener("pointerup", onUp);
    grip.removeEventListener("pointercancel", onUp);
    row.classList.remove("dragging");
    row.style.transform = "";
    lastDragEnd = performance.now();
    onDone([...container.children].map((el) => el.dataset.id));
  };
  grip.addEventListener("pointermove", onMove);
  grip.addEventListener("pointerup", onUp);
  grip.addEventListener("pointercancel", onUp);
}

// Apply a new order for the tasks currently shown. With a category filter on, only
// those tasks move; everything else keeps its place.
function reorderItems(ids) {
  const shown = new Set(ids);
  const slots = [];
  state.items.forEach((item, i) => shown.has(String(item.id)) && slots.push(i));
  const byId = new Map(state.items.map((item) => [String(item.id), item]));
  const next = [...state.items];
  ids.forEach((id, k) => (next[slots[k]] = byId.get(id)));
  state.items = next;
  save();
  render();
}

function reorderCategories(ids) {
  const byId = new Map(state.categories.map((c) => [c.id, c]));
  state.categories = ids.map((id) => byId.get(id)).filter(Boolean);
  save();
  render();
}

// A bold hand-drawn style tick, bigger than the circle so it sweeps out past the top-right.
function checkMarkSvg() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", "M4.5 12.5 L10 18 L22 3.5");
  path.setAttribute("pathLength", "1");
  svg.append(path);
  return svg;
}

function itemEl(item, { showDate = true } = {}) {
  const li = document.createElement("li");
  li.className = "item";
  if (item.id === justAddedId) li.classList.add("enter");
  li.dataset.id = item.id;
  if (item.done) li.classList.add("done");
  if (!item.done && item.date && item.date < addDays(0)) li.classList.add("overdue");
  const cat = categoryOf(item);
  if (cat) li.style.setProperty("--c", cat.color);

  // Tap anywhere on the item to check it off; hold it (or tap ✎) to edit.
  li.setAttribute("role", "button");
  li.setAttribute("aria-pressed", item.done);
  li.title = "Tap to check off · hold to edit";
  let holdTimer = null;
  let held = false;
  let start = null;
  li.addEventListener("pointerdown", (e) => {
    held = false;
    start = { x: e.clientX, y: e.clientY };
    holdTimer = setTimeout(() => {
      held = true;
      if (navigator.vibrate) navigator.vibrate(15);
      openEdit(item.id);
    }, 500);
  });
  li.addEventListener("pointermove", (e) => {
    // Scrolling the list shouldn't count as a hold
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearTimeout(holdTimer);
  });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) li.addEventListener(ev, () => clearTimeout(holdTimer));
  li.addEventListener("contextmenu", (e) => e.preventDefault());
  li.addEventListener("click", () => {
    if (!held && !justDragged()) toggle(item.id, check.getBoundingClientRect());
  });

  const check = document.createElement("span");
  check.className = "check";
  if (item.done) check.append(checkMarkSvg());

  const body = document.createElement("div");
  body.className = "body";

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = item.text;

  const meta = document.createElement("div");
  meta.className = "meta";
  if (cat) {
    const tag = document.createElement("span");
    tag.className = "tag";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.setProperty("--c", cat.color);
    tag.append(dot, cat.name);
    meta.append(tag);
  }
  if (item.repeat) {
    const tag = document.createElement("span");
    tag.className = "when";
    tag.append(icon("repeat"), REPEAT_LABELS[item.repeat] || "Repeats");
    meta.append(tag);
  }
  const whenParts = [];
  if (showDate && item.date) whenParts.push(formatDay(item.date));
  if (item.time) whenParts.push(formatTime(item.time));
  if (whenParts.length) {
    const when = document.createElement("span");
    when.className = "when";
    when.append(icon(item.time && item.remind ? "bell" : item.time ? "clock" : "calendar"), whenParts.join(" · "));
    meta.append(when);
  }

  body.append(text, meta);

  const edit = document.createElement("button");
  edit.className = "edit";
  edit.append(icon("pencil"));
  edit.setAttribute("aria-label", `Edit ${item.text}`);
  edit.addEventListener("pointerdown", (e) => e.stopPropagation());
  edit.onclick = (e) => {
    e.stopPropagation();
    openEdit(item.id);
  };

  li.append(check, body, edit);
  // Reordering only makes sense in the List tab (Plan is sorted by day and time)
  if (state.view === "list") li.append(dragGrip(li, list, reorderItems));
  return li;
}

function renderFilters() {
  const filters = $("filters");
  filters.innerHTML = "";
  if (!state.categories.length) return;
  const chip = (label, value, color) => {
    const b = document.createElement("button");
    b.className = "chip" + (state.filter === value ? " active" : "");
    if (color) {
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.setProperty("--c", color);
      b.append(dot);
    }
    b.append(label);
    b.onclick = () => {
      state.filter = value;
      save();
      render();
      resetAddDetails();
    };
    filters.append(b);
  };
  chip("All", "all");
  for (const c of state.categories) chip(c.name, c.id, c.color);
}

function renderPlan(items) {
  plan.innerHTML = "";
  const today = addDays(0);
  const lastDay = addDays(6);

  const group = (title, sub, groupItems, { dayKey: key, cls, showDate = false, showEmpty = false } = {}) => {
    if (!groupItems.length && !showEmpty) return;
    const div = document.createElement("div");
    div.className = "day" + (cls ? " " + cls : "");
    const head = document.createElement("div");
    head.className = "day-head";
    const h = document.createElement("h4");
    h.textContent = title;
    const s = document.createElement("span");
    s.className = "sub";
    s.textContent = sub || "";
    head.append(h, s);
    if (key) {
      const plus = document.createElement("button");
      plus.className = "add-day";
      plus.textContent = "+";
      plus.setAttribute("aria-label", `Add for ${title}`);
      plus.onclick = () => startAddFor(key);
      head.append(plus);
    }
    div.append(head);
    if (groupItems.length) {
      const ul = document.createElement("ul");
      for (const item of [...groupItems].sort(byTime)) ul.append(itemEl(item, { showDate }));
      div.append(ul);
    } else {
      const p = document.createElement("p");
      p.className = "none";
      p.textContent = "Nothing planned";
      div.append(p);
    }
    plan.append(div);
  };

  group("Overdue", "", items.filter((i) => !i.done && i.date && i.date < today), { cls: "overdue", showDate: true });
  for (let n = 0; n < 7; n++) {
    const key = addDays(n);
    const d = parseDay(key);
    const title = n === 0 ? "Today" : n === 1 ? "Tomorrow" : d.toLocaleDateString([], { weekday: "long" });
    const sub = d.toLocaleDateString([], { month: "short", day: "numeric" });
    group(title, sub, items.filter((i) => i.date === key), { dayKey: key, showEmpty: true });
  }
  group("Later", "", items.filter((i) => i.date && i.date > lastDay), { showDate: true });
  group("Someday", "no day picked", items.filter((i) => !i.date && !i.done));
}

function render() {
  const items = visibleItems();
  $("today").textContent = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const isPlan = state.view === "plan";

  for (const b of document.querySelectorAll(".tabs button")) {
    b.classList.toggle("active", b.dataset.view === state.view);
  }
  renderFilters();

  list.hidden = isPlan;
  plan.hidden = !isPlan;
  if (isPlan) {
    renderPlan(items);
  } else {
    list.innerHTML = "";
    for (const item of items) list.append(itemEl(item));
  }

  const open = items.filter((i) => !i.done).length;
  const allOpen = state.items.filter((i) => !i.done).length;
  $("empty").hidden = isPlan || items.length > 0;
  $("count").textContent = items.length ? `${open} left` : "";
  $("clearDone").hidden = !state.items.some((i) => i.done);
  $("badge").textContent = allOpen > 0 ? allOpen : "";

  renderCategories();
  fillCategorySelect(addCategory, addCategory.value || (state.filter !== "all" ? state.filter : ""));
  $("addCategoryRow").hidden = !state.categories.length;
  updateDetailsBtn();
}

// ---------- Adding / editing ----------

let justAddedId = null;

function add(text, details) {
  text = text.trim();
  if (!text) return;
  const date = details.date || (details.time || details.repeat ? addDays(0) : null);
  state.items.push({
    id: Date.now() + Math.random(),
    text,
    done: false,
    category: details.category || null,
    date,
    time: details.time || null,
    remind: !!(details.time && details.remind),
    repeat: details.repeat || null,
  });
  justAddedId = state.items[state.items.length - 1].id;
  save();
  render();
  justAddedId = null; // later re-renders shouldn't replay the animation
  if (state.view === "list") $("views").scrollTop = $("views").scrollHeight;
}

// `from` is where the tap happened, so the confetti bursts out of the check mark.
function toggle(id, from) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  item.done = !item.done;
  const next = item.done ? scheduleNextRepeat(item) : retractNextRepeat(item);
  save();
  render();
  if (next) showToast("↻ Next one added", `"${next.text}" is on for ${formatDay(next.date)}.`);
  if (item.done) {
    const li = document.querySelector(`.item[data-id="${id}"]`);
    if (li) li.classList.add("celebrate");
    const x = from ? from.left + from.width / 2 : window.innerWidth / 2;
    const y = from ? from.top + from.height / 2 : window.innerHeight / 2;
    celebrate(x, y);
    playChime();
  } else {
    playPop();
  }
}

// ---------- Repeating tasks ----------
// Checking off a repeating task adds a fresh copy on its next date.

const REPEAT_LABELS = { daily: "Every day", weekdays: "Weekdays", weekly: "Every week", monthly: "Every month" };

// The next date after `key`, never in the past (catching up if you finish late).
function nextOccurrence(key, repeat) {
  const firstDay = parseDay(key).getDate();
  const d = parseDay(key);
  const step = () => {
    if (repeat === "daily") d.setDate(d.getDate() + 1);
    else if (repeat === "weekdays") {
      do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6);
    } else if (repeat === "weekly") d.setDate(d.getDate() + 7);
    else {
      // Monthly: same day of the month, or the last day if the month is shorter
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(firstDay, lastDay));
    }
  };
  step();
  const today = addDays(0);
  while (dayKey(d) < today) step();
  return dayKey(d);
}

function scheduleNextRepeat(item) {
  if (!item.repeat || item.spawnedNext) return null;
  const next = {
    ...item,
    id: Date.now() + Math.random(),
    done: false,
    date: nextOccurrence(item.date || addDays(0), item.repeat),
    snoozeUntil: null,
    spawnedNext: null,
  };
  item.spawnedNext = next.id;
  state.items.push(next);
  return next;
}

// Un-checking a repeating task removes the copy it created (unless that one is done too).
function retractNextRepeat(item) {
  if (!item.spawnedNext) return null;
  const next = state.items.find((i) => i.id === item.spawnedNext);
  if (next && !next.done) state.items = state.items.filter((i) => i !== next);
  item.spawnedNext = null;
  return null;
}

// Removing items always offers Undo for a few seconds.
let undoItems = null;
let snackTimer;

function removeWithUndo(keep, message) {
  undoItems = state.items;
  state.items = state.items.filter(keep);
  save();
  render();
  $("snackText").textContent = message;
  $("snack").hidden = false;
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => ($("snack").hidden = true), 6000);
}

$("snackUndo").onclick = () => {
  if (undoItems) state.items = undoItems;
  undoItems = null;
  $("snack").hidden = true;
  save();
  render();
};

function remove(id) {
  const item = state.items.find((i) => i.id === id);
  if (item) removeWithUndo((i) => i.id !== id, `Deleted "${item.text}"`);
}

// ---------- "When" field ----------
// One date+time picker plus an "All day" box. Items still store `date` and an
// optional `time`; "All day" just means the time part is ignored.

const DEFAULT_TIME = "09:00";

function readWhen(input, allDay) {
  if (!input.value) return { date: null, time: null };
  return { date: input.value.slice(0, 10), time: allDay.checked ? null : input.value.slice(11, 16) };
}

function writeWhen(input, allDay, date, time) {
  input.value = date ? `${date}T${time || DEFAULT_TIME}` : "";
  input.dataset.prev = input.value;
  allDay.checked = !!date && !time;
}

// Picking a new time in the picker means the user wants that time, so untick "All day".
function wireWhen(input, allDay, onChange) {
  input.addEventListener("input", () => {
    const prev = input.dataset.prev || "";
    if (!prev || prev.slice(11) !== input.value.slice(11)) allDay.checked = false;
    input.dataset.prev = input.value;
    onChange();
  });
  allDay.addEventListener("change", onChange);
}

// ---------- Add form ----------

$("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const { date, time } = readWhen(addWhen, addAllDay);
  add(newItem.value, { category: addCategory.value, date, time, remind: $("addRemind").checked, repeat: $("addRepeat").value });
  newItem.value = "";
  updateDetailsBtn();
  newItem.focus();
});

function resetAddDetails() {
  writeWhen(addWhen, addAllDay, null, null);
  $("addRemind").checked = true;
  $("addRepeat").value = "";
  fillCategorySelect(addCategory, state.filter !== "all" ? state.filter : "");
  updateDetailsBtn();
}

// The bar under the add box shows what's picked, e.g. "📅 Tomorrow · 3:00 PM 🔔 · Work"
function updateDetailsBtn() {
  const { date, time } = readWhen(addWhen, addAllDay);
  const parts = [];
  if (date) parts.push(formatDay(date));
  if (time) parts.push(formatTime(time) + ($("addRemind").checked ? " 🔔" : ""));
  if ($("addRepeat").value) parts.push("↻ " + REPEAT_LABELS[$("addRepeat").value]);
  const cat = state.categories.find((c) => c.id === addCategory.value);
  if (cat) parts.push(cat.name);

  $("detailsText").textContent = parts.length ? parts.join(" · ") : "Add day, time, or category";
  $("detailsBtn").classList.toggle("has-details", parts.length > 0);
  $("detailsBtn").classList.toggle("open", !addDetails.hidden);
  $("addWhenOptions").hidden = !date;
  $("addRemindField").hidden = !time;
  for (const chip of addDetails.querySelectorAll("[data-day]")) {
    chip.classList.toggle("active", date === addDays(Number(chip.dataset.day)));
  }
}

// Set the day but keep whatever time was already picked
function setAddDay(key) {
  const { time } = readWhen(addWhen, addAllDay);
  writeWhen(addWhen, addAllDay, key, time);
  updateDetailsBtn();
}

function startAddFor(key) {
  setComposerCollapsed(false);
  addDetails.hidden = false;
  setAddDay(key);
  newItem.focus();
}

$("detailsBtn").onclick = () => {
  addDetails.hidden = !addDetails.hidden;
  updateDetailsBtn();
};

for (const chip of addDetails.querySelectorAll("[data-day]")) {
  chip.onclick = () => {
    const key = addDays(Number(chip.dataset.day));
    if (readWhen(addWhen, addAllDay).date === key) writeWhen(addWhen, addAllDay, null, null);
    else setAddDay(key);
    updateDetailsBtn();
  };
}
wireWhen(addWhen, addAllDay, updateDetailsBtn);
addCategory.addEventListener("input", updateDetailsBtn);
$("addRepeat").addEventListener("input", updateDetailsBtn);
$("clearDetails").onclick = resetAddDetails;

// Turning a reminder on is a good moment to ask for notification permission.
$("addRemind").addEventListener("change", (e) => {
  if (e.target.checked) ensurePermission().then(offerExactOnce);
  updateDetailsBtn();
});

// ---------- Edit dialog ----------

const editWhen = $("editWhen");
const editAllDay = $("editAllDay");

function updateEditWhen() {
  const { date, time } = readWhen(editWhen, editAllDay);
  $("editWhenOptions").hidden = !date;
  $("editRemindField").hidden = !time;
}

wireWhen(editWhen, editAllDay, updateEditWhen);
$("editClearWhen").onclick = () => {
  writeWhen(editWhen, editAllDay, null, null);
  updateEditWhen();
};
$("editRemind").addEventListener("change", (e) => {
  if (e.target.checked) ensurePermission().then(offerExactOnce);
});

let editingId = null;

function openEdit(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  editingId = id;
  $("editText").value = item.text;
  writeWhen(editWhen, editAllDay, item.date, item.time);
  $("editRemind").checked = item.time ? !!item.remind : true;
  updateEditWhen();
  $("editRepeat").value = item.repeat || "";
  fillCategorySelect($("editCategory"), item.category);
  $("editCategoryField").hidden = !state.categories.length;
  editDialog.returnValue = "";
  editDialog.showModal();
}

editDialog.addEventListener("close", () => {
  const item = state.items.find((i) => i.id === editingId);
  editingId = null;
  if (!item) return;
  if (editDialog.returnValue === "delete") {
    remove(item.id);
  } else if (editDialog.returnValue === "save") {
    const { date, time } = readWhen(editWhen, editAllDay);
    item.text = $("editText").value.trim() || item.text;
    item.repeat = $("editRepeat").value || null;
    item.date = date || (item.repeat ? addDays(0) : null);
    item.time = time;
    item.remind = !!(time && $("editRemind").checked);
    item.snoozeUntil = null;
    item.category = $("editCategory").value || null;
    save();
    render();
  }
});

$("clearDone").onclick = () => {
  const n = state.items.filter((i) => i.done).length;
  removeWithUndo((i) => !i.done, `Cleared ${n} done item${n === 1 ? "" : "s"}`);
};

for (const b of document.querySelectorAll(".tabs button")) {
  b.onclick = () => {
    state.view = b.dataset.view;
    save();
    render();
  };
}

// ---------- Backgrounds ----------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Pick dark or light text depending on how bright the background is.
function isLight(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

// Draws a tie-dye pattern pixel by pixel: a spiral/ring/scrunch "fold" pattern,
// wobbled by layered sine noise so the bands look hand-dyed instead of perfect.
function paintTieDye(canvas, t, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const pal = t.palette.map(hexToRgb);
  const n = pal.length;
  const cx = w * 0.5;
  const cy = h * (h > w ? 0.42 : 0.5);
  const R = Math.hypot(w, h) / 2;

  let p = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / R;
      const ny = (y - cy) / R;
      const r = Math.hypot(nx, ny);
      const a = Math.atan2(ny, nx) / (2 * Math.PI);
      const wobble = Math.sin(nx * 5 + Math.sin(ny * 4) * 1.5) * 0.5 + Math.sin(ny * 6 + Math.sin(nx * 3) * 1.3) * 0.5;
      const crinkle = Math.sin(nx * 40 + Math.sin(ny * 31) * 2) * Math.sin(ny * 37 + Math.sin(nx * 29) * 2);

      let v;
      if (t.mode === "rings") v = r * t.twist + wobble * 0.15 + crinkle * 0.03;
      else if (t.mode === "kaleido") {
        // Mirror the angle into wedges, like looking through a kaleidoscope
        const wedge = (((a % 1) + 1) % 1) * t.segments;
        v = Math.abs((wedge % 1) - 0.5) * 1.6 + r * t.twist + wobble * 0.08 + crinkle * 0.02;
      } else if (t.mode === "vortex") v = a * t.arms + Math.log(r + 0.03) * t.twist * 0.6 + wobble * 0.1 + crinkle * 0.02;
      else if (t.mode === "lava") v = (Math.sin(nx * 5 + wobble) + Math.sin(ny * 6.5 - wobble) + Math.sin((nx + ny) * 4) + Math.sin(r * 9)) * 0.22 + crinkle * 0.02;
      else if (t.mode === "waves") v = ny * t.twist * 0.5 + Math.sin(nx * 5 + Math.sin(ny * 3) * 2) * 0.35 + wobble * 0.08;
      else if (t.mode === "mandala") v = r * t.twist + Math.cos(a * Math.PI * 2 * t.petals) * 0.12 * (1 + r * 3) + wobble * 0.05 + crinkle * 0.02;
      else if (t.mode === "plasma") v = (Math.sin(nx * 10) + Math.sin(ny * 10 + wobble * 2) + Math.sin((nx * nx + ny * ny) * 20) + Math.sin(Math.hypot(nx + 0.5, ny - 0.3) * 15)) * 0.25;
      else if (t.mode === "rays") v = a * t.rays + r * 0.4 + wobble * 0.05 + crinkle * 0.02;
      else if (t.mode === "warp") v = Math.sin(nx * 10 + Math.sin(ny * 4) * 2) * Math.cos(ny * 10 + Math.sin(nx * 4) * 2) * 0.5 + wobble * 0.05;
      else if (t.mode === "marble") v = (nx + ny) * 1.5 + Math.sin(nx * 4 + wobble * 3) * 0.5 * Math.cos(ny * 5 - wobble) + crinkle * 0.03;
      else if (t.mode === "scrunch") v = wobble * 0.9 + Math.sin(nx * 9 + ny * 7 + wobble * 3) * 0.35 + crinkle * 0.05;
      else v = a * t.arms + r * t.twist + wobble * 0.12 + crinkle * 0.025;

      const f = (((v % 1) + 1) % 1) * n;
      const i = Math.floor(f);
      const local = f - i;
      // Mostly solid bands that bleed into the next color near the edge
      const s = Math.min(1, Math.max(0, (local - 0.65) / 0.35));
      const m = s * s * (3 - 2 * s);
      const c0 = pal[i];
      const c1 = pal[(i + 1) % n];
      img.data[p++] = c0[0] + (c1[0] - c0[0]) * m;
      img.data[p++] = c0[1] + (c1[1] - c0[1]) * m;
      img.data[p++] = c0[2] + (c1[2] - c0[2]) * m;
      img.data[p++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- Color shift ----------
// The "Color shift" slider turns gradient and pattern colors around the color wheel.

function shiftHex(hex, degrees) {
  if (!degrees) return hex;
  let [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  h = (h + degrees / 360) % 1;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

const shiftColors = (text) => text.replace(/#[0-9a-f]{6}/gi, (hex) => shiftHex(hex, state.hue));

function findGradient(id) {
  const g = GRADIENTS.find((x) => x.id === id);
  return g && { ...g, css: shiftColors(g.css), accent: shiftHex(g.accent, state.hue) };
}

function findPattern(id) {
  const t = TIEDYES.find((x) => x.id === id);
  return t && { ...t, palette: t.palette.map((hex) => shiftHex(hex, state.hue)) };
}

const tieDyeCache = {};
function tieDyeDataURL(t, size) {
  const key = t.id + size + ":" + t.palette.join("");
  // Sliding the color shift creates new images; don't let old ones pile up
  if (Object.keys(tieDyeCache).length > 120) for (const k in tieDyeCache) delete tieDyeCache[k];
  if (!tieDyeCache[key]) {
    const c = document.createElement("canvas");
    paintTieDye(c, t, size, size);
    tieDyeCache[key] = c.toDataURL();
  }
  return tieDyeCache[key];
}

function drawTieDyeBackground() {
  const t = findPattern(state.bg.value);
  if (state.bg.kind !== "tiedye" || !t) return;
  // Half resolution keeps it fast; the browser smooths it when scaling up.
  paintTieDye($("bgCanvas"), t, Math.ceil(window.innerWidth / 2), Math.ceil(window.innerHeight / 2));
}

function applyBg(bg) {
  let accent = SOLIDS[0], light = false, vivid = false, image = "none", bubbleBg;
  const g = bg.kind === "gradient" && findGradient(bg.value);
  const t = bg.kind === "tiedye" && findPattern(bg.value);

  if (g) {
    accent = g.accent;
    light = !!g.light;
    vivid = !light;
    image = g.css;
    bubbleBg = g.css;
  } else if (t) {
    accent = t.palette[0];
    vivid = true;
    bubbleBg = `url(${tieDyeDataURL(t, 120)}) center / cover`;
  } else {
    bg = { kind: "solid", value: bg.kind === "solid" ? bg.value : SOLIDS[0] };
    accent = bg.value;
    light = isLight(accent);
    bubbleBg = accent;
  }

  state.bg = bg;
  const root = document.documentElement.style;
  root.setProperty("--bg", accent);
  // Accent is the text color on solid "--fg" buttons, so on light themes it must be light
  root.setProperty("--accent", light ? "#ffffff" : accent);
  root.setProperty("--bg-image", image);
  root.setProperty("--bubble-bg", bubbleBg);
  document.body.classList.toggle("light", light);
  document.body.classList.toggle("vivid", vivid);
  document.querySelector('meta[name="theme-color"]').content = accent;
  $("customColor").value = accent;

  const live = useLiveBackground();
  $("bgCanvas").hidden = !t || live;
  if (t && !live) drawTieDyeBackground();
  updateLiveBackground();

  const key = bg.kind + ":" + bg.value;
  for (const s of document.querySelectorAll(".swatch")) s.classList.toggle("selected", s.dataset.key === key);
  save();
}

// ---------- Living background ----------
// livebg.js renders the background through WebGL so it can ripple and flow.

const liveCanvas = $("liveBg");
LiveBg.init(liveCanvas);

const useLiveBackground = () => LiveBg.ok && state.motion !== "still";

// Paint the current theme into a plain image for the live background to distort.
function backgroundImage() {
  const w = Math.ceil(window.innerWidth / 2);
  const h = Math.ceil(window.innerHeight / 2);
  const c = document.createElement("canvas");
  const t = state.bg.kind === "tiedye" && findPattern(state.bg.value);
  const g = state.bg.kind === "gradient" && findGradient(state.bg.value);
  if (t) {
    paintTieDye(c, t, w, h);
    return c;
  }
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (g) {
    // Same direction as the CSS gradients (160deg: mostly downward, slightly right)
    const colors = g.css.match(/#[0-9a-f]{6}/gi);
    const angle = (160 * Math.PI) / 180;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const len = Math.abs(w * dx) + Math.abs(h * dy);
    const grad = ctx.createLinearGradient(w / 2 - (dx * len) / 2, h / 2 - (dy * len) / 2, w / 2 + (dx * len) / 2, h / 2 + (dy * len) / 2);
    colors.forEach((col, i) => grad.addColorStop(i / (colors.length - 1), col));
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = state.bg.value;
  }
  ctx.fillRect(0, 0, w, h);
  return c;
}

function updateLiveBackground() {
  const live = useLiveBackground();
  liveCanvas.hidden = !live;
  for (const chip of document.querySelectorAll("[data-motion]")) {
    chip.classList.toggle("active", chip.dataset.motion === state.motion);
  }
  if (!live) return;
  LiveBg.setMode(state.motion);
  LiveBg.setImage(backgroundImage());
}

for (const chip of document.querySelectorAll("[data-motion]")) {
  chip.onclick = () => {
    state.motion = chip.dataset.motion;
    save();
    applyBg(state.bg);
    // Show off the effect right away
    if (state.motion !== "still") {
      const r = chip.getBoundingClientRect();
      LiveBg.drop(r.left + r.width / 2, r.top + r.height / 2, 1);
    }
  };
}

// Touching anywhere drops a ripple; dragging a finger leaves a trail of smaller ones.
let lastTrail = 0;
document.addEventListener("pointerdown", (e) => {
  if (useLiveBackground()) LiveBg.drop(e.clientX, e.clientY, 1);
}, true);
document.addEventListener("pointermove", (e) => {
  if (!e.buttons || !useLiveBackground()) return;
  if (e.timeStamp - lastTrail < 70) return;
  lastTrail = e.timeStamp;
  LiveBg.drop(e.clientX, e.clientY, 0.45);
}, true);

function addSwatch(containerId, bg, css) {
  const s = document.createElement("button");
  s.className = "swatch";
  s.style.background = css;
  s.dataset.key = bg.kind + ":" + bg.value;
  s.setAttribute("aria-label", `${bg.kind} ${bg.value}`);
  s.onclick = () => applyBg(bg);
  $(containerId).append(s);
}

for (const c of SOLIDS) addSwatch("solidSwatches", { kind: "solid", value: c }, c);
for (const g of GRADIENTS) addSwatch("gradientSwatches", { kind: "gradient", value: g.id }, "");
for (const t of TIEDYES) addSwatch(t.group === "bold" ? "boldSwatches" : "tiedyeSwatches", { kind: "tiedye", value: t.id }, "");

// Gradient and pattern previews follow the color shift
function paintSwatchPreviews() {
  for (const s of document.querySelectorAll(".swatch")) {
    const [kind, id] = s.dataset.key.split(":");
    if (kind === "gradient") s.style.background = findGradient(id).css;
    if (kind === "tiedye") s.style.background = `url(${tieDyeDataURL(findPattern(id), 64)}) center / cover`;
  }
}

// While dragging the slider, repaint at most every 150ms; previews update on release.
let hueTimer = null;
$("hueShift").addEventListener("input", (e) => {
  state.hue = Number(e.target.value);
  if (hueTimer) return;
  hueTimer = setTimeout(() => {
    hueTimer = null;
    applyBg(state.bg);
  }, 150);
});
$("hueShift").addEventListener("change", () => {
  applyBg(state.bg);
  paintSwatchPreviews();
});
$("hueReset").onclick = () => {
  state.hue = 0;
  $("hueShift").value = 0;
  applyBg(state.bg);
  paintSwatchPreviews();
};

$("customColor").addEventListener("input", (e) => applyBg({ kind: "solid", value: e.target.value }));

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    LiveBg.resize();
    if (useLiveBackground()) updateLiveBackground();
    else drawTieDyeBackground();
  }, 200);
});

// ---------- Bubble icon ----------

function firstSymbol(text) {
  if (window.Intl && Intl.Segmenter) {
    const seg = new Intl.Segmenter().segment(text)[Symbol.iterator]().next();
    return seg.done ? "" : seg.value.segment;
  }
  return Array.from(text)[0] || "";
}

function applyIcon(icon) {
  state.icon = icon || "✓";
  $("bubbleIcon").textContent = state.icon;
  $("miniBubbleIcon").textContent = state.icon;
  for (const b of document.querySelectorAll(".icon-choice")) b.classList.toggle("selected", b.textContent === state.icon);
  save();
}

for (const icon of BUBBLE_ICONS) {
  const b = document.createElement("button");
  b.className = "icon-choice";
  b.textContent = icon;
  b.onclick = () => {
    $("customIcon").value = "";
    applyIcon(icon);
  };
  $("iconChoices").append(b);
}

$("customIcon").addEventListener("input", (e) => {
  const icon = firstSymbol(e.target.value.trim());
  if (icon) applyIcon(icon);
});

// ---------- Collapsible add box ----------

function setComposerCollapsed(collapsed) {
  state.composerCollapsed = collapsed;
  $("composer").hidden = collapsed;
  $("composerOpen").hidden = !collapsed;
  save();
}

$("composerHide").onclick = () => setComposerCollapsed(true);
$("composerOpen").onclick = () => {
  setComposerCollapsed(false);
  newItem.focus();
};

// ---------- Sounds ----------
// Generated on the fly with Web Audio, so there are no sound files to ship.
// Android quirk: the audio output goes to sleep when nothing is playing, and the
// first ~100ms after it wakes is swallowed — longer than a whole pop. So we wake it
// with a burst of silence, schedule sounds slightly ahead, and keep it awake while
// the app is on screen.

const SOUND_LEAD = 0.03; // seconds between "play" and the sound actually starting
let audioCtx = null;
let master = null;
let keepAwake = null;

function audio() {
  if (!state.sound) return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC({ latencyHint: "interactive" });

    // Everything goes through a compressor so sounds can be loud without clipping
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(audioCtx.destination);

    // An inaudible signal keeps Android's audio output from falling asleep
    keepAwake = audioCtx.createConstantSource ? audioCtx.createConstantSource() : null;
    if (keepAwake) {
      const tiny = audioCtx.createGain();
      tiny.gain.value = 0.0005;
      keepAwake.connect(tiny).connect(audioCtx.destination);
      keepAwake.start();
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Let the audio output sleep while the app is in the background (saves battery).
document.addEventListener("visibilitychange", () => {
  if (!audioCtx) return;
  if (document.hidden) audioCtx.suspend();
  else if (state.sound) audioCtx.resume();
});

// One short tone with a quick attack and decay; the building block for every sound.
function tone(ac, { freq, endFreq = freq, start = 0, length = 0.1, volume = 0.3, type = "sine" }) {
  const t = ac.currentTime + SOUND_LEAD + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + length * 0.8);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

// A tiny burst of filtered noise: the "snap" at the start of a pop. Phone speakers
// barely reproduce low notes, so this is what makes the pop audible on a phone.
function snap(ac, { start = 0, volume = 0.5, freq = 2500 } = {}) {
  const t = ac.currentTime + SOUND_LEAD + start;
  const length = 0.03;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

// Bubbly "pop": a noise snap plus a quick downward pitch sweep, slightly different every time.
function playPop() {
  const ac = audio();
  if (!ac) return;
  const f = 900 + Math.random() * 400;
  snap(ac, { volume: 0.6, freq: 2000 + Math.random() * 1500 });
  tone(ac, { freq: f, endFreq: f * 0.35, length: 0.09, volume: 0.6 });
}

// Happy rising arpeggio plus a sparkle on top for finishing a task.
function playChime() {
  const ac = audio();
  if (!ac) return;
  snap(ac, { volume: 0.7, freq: 3000 });
  tone(ac, { freq: 1100, endFreq: 300, length: 0.08, volume: 0.5 });
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone(ac, { freq, start: 0.06 + i * 0.07, length: 0.3, volume: 0.35, type: "triangle" });
    tone(ac, { freq: freq * 2, start: 0.06 + i * 0.07, length: 0.2, volume: 0.12 });
  });
  tone(ac, { freq: 2093, start: 0.36, length: 0.45, volume: 0.15 });
  tone(ac, { freq: 2637, start: 0.44, length: 0.4, volume: 0.1 });
}

// Pop on taps around the app. Items handle their own sound in toggle().
document.addEventListener("click", (e) => {
  const el = e.target.closest("button, .chip, input[type=checkbox], select, input[type=color]");
  if (!el) return;
  if (el.closest(".item") && !el.classList.contains("edit")) return;
  if (el.id === "testSound") return; // plays the chime instead
  playPop();
}, true);

// ---------- Confetti + sparks ----------

const fx = $("fxCanvas");
const fxCtx = fx.getContext("2d");
const CONFETTI_COLORS = ["#ff3cac", "#ffd400", "#38d94a", "#1ab2ff", "#ff8c1a", "#7a3cff", "#ffffff"];
const SPARK_COLORS = ["#fff6a5", "#ffd400", "#ffffff", "#ffb347"];
let particles = [];
let fxRunning = false;

function celebrate(x, y) {
  if (!state.celebrate) return;
  const dpr = window.devicePixelRatio || 1;
  if (fx.width !== Math.round(innerWidth * dpr) || fx.height !== Math.round(innerHeight * dpr)) {
    fx.width = Math.round(innerWidth * dpr);
    fx.height = Math.round(innerHeight * dpr);
  }
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rand = (a, b) => a + Math.random() * (b - a);
  // Confetti shoots mostly upward, then tumbles down
  for (let i = 0; i < 70; i++) {
    const angle = -Math.PI / 2 + rand(-1.3, 1.3);
    const speed = rand(5, 13);
    particles.push({
      kind: "confetti", x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      w: rand(6, 11), h: rand(3, 6),
      rot: rand(0, Math.PI), vr: rand(-0.3, 0.3),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      life: 1, decay: rand(0.006, 0.012),
    });
  }
  // Sparks fly out in every direction and burn out fast
  for (let i = 0; i < 28; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(4, 11);
    particles.push({
      kind: "spark", x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
      life: 1, decay: rand(0.03, 0.05),
    });
  }
  if (!fxRunning) {
    fxRunning = true;
    requestAnimationFrame(fxFrame);
  }
}

function fxFrame() {
  fxCtx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of particles) {
    p.life -= p.decay;
    if (p.kind === "confetti") {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.28; // gravity
      p.rot += p.vr;
      p.x += p.vx;
      p.y += p.vy;
      fxCtx.save();
      fxCtx.globalAlpha = Math.min(1, p.life * 2);
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      // Squash horizontally over time so pieces look like they're flipping
      fxCtx.scale(Math.cos(p.rot * 2), 1);
      fxCtx.fillStyle = p.color;
      fxCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      fxCtx.restore();
    } else {
      p.vx *= 0.93;
      p.vy = p.vy * 0.93 + 0.12;
      p.x += p.vx;
      p.y += p.vy;
      fxCtx.save();
      fxCtx.globalCompositeOperation = "lighter";
      fxCtx.globalAlpha = Math.max(0, p.life);
      fxCtx.strokeStyle = p.color;
      fxCtx.lineWidth = 2.5;
      fxCtx.lineCap = "round";
      fxCtx.beginPath();
      fxCtx.moveTo(p.x, p.y);
      fxCtx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
      fxCtx.stroke();
      fxCtx.restore();
    }
  }
  particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  if (particles.length) {
    requestAnimationFrame(fxFrame);
  } else {
    fxRunning = false;
    fxCtx.clearRect(0, 0, innerWidth, innerHeight);
  }
}

$("celebrateOn").addEventListener("change", (e) => {
  state.celebrate = e.target.checked;
  save();
  if (state.celebrate) celebrate(innerWidth / 2, innerHeight / 2);
});
$("soundOn").addEventListener("change", (e) => {
  state.sound = e.target.checked;
  save();
  if (state.sound) playChime();
  else if (audioCtx) audioCtx.suspend();
});
$("testSound").addEventListener("click", () => {
  if (!state.sound) {
    showToast("Sounds are off", "Turn on 🔊 Sounds first.");
    return;
  }
  playChime();
});

// ---------- Panels ----------

function togglePanel(which) {
  const opening = which.hidden;
  themePanel.hidden = true;
  settingsPanel.hidden = true;
  which.hidden = !opening;
  $("themeBtn").classList.toggle("active", !themePanel.hidden);
  $("settingsBtn").classList.toggle("active", !settingsPanel.hidden);
}

for (const btn of document.querySelectorAll(".sheet-close")) {
  btn.onclick = () => togglePanel($(btn.dataset.close));
}

$("themeBtn").onclick = () => togglePanel(themePanel);

// Android Back button closes whatever is open before leaving the app (Android app only).
const NativeApp = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.App : null;
NativeApp?.addListener("backButton", () => {
  if (editDialog.open) editDialog.close("cancel");
  else if (!themePanel.hidden) togglePanel(themePanel);
  else if (!settingsPanel.hidden) togglePanel(settingsPanel);
  else if (!addDetails.hidden) {
    addDetails.hidden = true;
    updateDetailsBtn();
  } else NativeApp.minimizeApp();
});
$("settingsBtn").onclick = () => togglePanel(settingsPanel);

// ---------- Reminders ----------
// Installed Android app: reminders are scheduled with Android itself (Capacitor
// LocalNotifications), so they arrive even when the app is closed.
// Browser: reminders can only fire while the app is open.

const NativeNotif = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.LocalNotifications : null;
const SUMMARY_DAYS_AHEAD = 7;
const TEST_NOTIFICATION_ID = 1_000_000;

let swReg = null;
if (!NativeNotif && "serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("sw.js").then((r) => (swReg = r)).catch(() => {});
}

const canNotify = () => !!NativeNotif || ("Notification" in window && window.isSecureContext);

// "granted" | "denied" | "prompt"
async function permissionState() {
  if (NativeNotif) {
    const p = await NativeNotif.checkPermissions();
    return p.display === "granted" ? "granted" : p.display === "denied" ? "denied" : "prompt";
  }
  if (!canNotify()) return "denied";
  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

async function ensurePermission() {
  if (!canNotify()) return false;
  if ((await permissionState()) === "prompt") {
    if (NativeNotif) await NativeNotif.requestPermissions();
    else await Notification.requestPermission();
  }
  updateNotifyStatus();
  scheduleNativeSoon();
  return (await permissionState()) === "granted";
}

// Reminders show your bubble icon next to a checkbox, e.g. "👻 ☑️ Call dentist"
const reminderTitle = (item) => `${state.icon} ☑️ ${item.text}`;

function reminderBody(item) {
  const cat = categoryOf(item);
  return `${formatDay(item.date)} at ${formatTime(item.time)}${cat ? " · " + cat.name : ""}`;
}

// "Mark done" and "Snooze" buttons on reminder notifications (Android app only).
const SNOOZE_MINUTES = 10;
if (NativeNotif) {
  NativeNotif.registerActionTypes({
    types: [{
      id: "TASK",
      actions: [
        { id: "done", title: "✓ Mark done" },
        { id: "snooze", title: `Snooze ${SNOOZE_MINUTES} min` },
      ],
    }],
  }).catch(() => {});

  NativeNotif.addListener("localNotificationActionPerformed", ({ actionId, notification }) => {
    const item = state.items.find((i) => i.id === notification.extra?.itemId);
    if (!item) return;
    if (actionId === "done") {
      // Small delay so the app is on screen to show the confetti
      if (!item.done) setTimeout(() => toggle(item.id), 400);
    } else if (actionId === "snooze") {
      item.snoozeUntil = Date.now() + SNOOZE_MINUTES * 60 * 1000;
      save();
      showToast("😴 Snoozed", `"${item.text}" will remind you again in ${SNOOZE_MINUTES} minutes.`);
    }
  });
}

function summaryText(key) {
  const todays = state.items.filter((i) => !i.done && i.date === key).sort(byTime);
  const overdue = state.items.filter((i) => !i.done && i.date && i.date < key).length;
  let body = todays.length
    ? todays.slice(0, 5).map((i) => (i.time ? formatTime(i.time) + "  " : "• ") + i.text).join("\n")
    : "Nothing planned today.";
  if (todays.length > 5) body += `\n+${todays.length - 5} more`;
  if (overdue) body += `\n${overdue} overdue`;
  return { title: `${state.icon} 📋 Today's plan (${todays.length})`, body };
}

// Exact alarms are a separate Android 12+ setting. Without it reminders still
// arrive, just possibly a few minutes late. We only ask when the user taps the
// "Make reminders exact" button — otherwise the plugin would open Android's
// settings screen on every reschedule.
async function canExact() {
  try {
    return (await NativeNotif.checkExactNotificationSetting()).exact_alarm === "granted";
  } catch {
    return false;
  }
}

// Re-plan every upcoming notification with Android whenever the list changes.
// Simple and reliable: cancel what's pending, schedule what's due from now on.
async function scheduleNative() {
  if (!NativeNotif) return;
  try {
    if ((await permissionState()) !== "granted") return;
    const exact = await canExact();
    const now = Date.now();
    // Leave alone anything already due: without exact alarms Android may deliver a
    // few minutes late, and cancelling it now would lose the reminder entirely.
    const pending = (await NativeNotif.getPending()).notifications;
    const dueAt = (n) => Number(n.extra?.at) || Date.parse(n.schedule?.at) || 0;
    const keep = new Set(pending.filter((n) => n.id === TEST_NOTIFICATION_ID || dueAt(n) <= now).map((n) => n.id));
    const old = pending.filter((n) => !keep.has(n.id));
    if (old.length) await NativeNotif.cancel({ notifications: old.map((n) => ({ id: n.id })) });

    const list = [];
    for (const item of state.items) {
      if (!item.remind || item.done) continue;
      let due = dueTime(item);
      if (item.snoozeUntil && item.snoozeUntil > now) due = item.snoozeUntil;
      if (due === null || due <= now) continue;
      list.push({
        id: notificationId(`item:${item.id}`),
        title: reminderTitle(item),
        body: reminderBody(item),
        schedule: { at: new Date(due), allowWhileIdle: true },
        actionTypeId: "TASK",
        extra: { itemId: item.id, at: due },
      });
    }
    if (state.summary) {
      const [h, m] = state.summaryTime.split(":").map(Number);
      for (let n = 0; n < SUMMARY_DAYS_AHEAD; n++) {
        const key = addDays(n);
        const at = parseDay(key);
        at.setHours(h, m, 0, 0);
        if (at.getTime() <= now) continue;
        list.push({
          id: notificationId(`summary:${key}`),
          ...summaryText(key),
          schedule: { at, allowWhileIdle: true },
          extra: { at: at.getTime() },
        });
      }
    }
    // Android caps pending alarms per app; the nearest 60 is plenty.
    list.sort((a, b) => a.schedule.at - b.schedule.at);
    for (const n of list) n.isExactNotification = exact;
    const fresh = list.filter((n) => !keep.has(n.id)).slice(0, 60);
    if (fresh.length) await NativeNotif.schedule({ notifications: fresh });
  } catch (err) {
    console.warn("Could not schedule notifications", err);
  }
}

// Stable notification ID per item/summary, so re-planning replaces instead of duplicating.
function notificationId(key) {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(h) % 900000) + 1; // stays clear of TEST_NOTIFICATION_ID
}

let scheduleTimer;
function scheduleNativeSoon() {
  if (!NativeNotif) return;
  clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(scheduleNative, 500);
}

async function updateNotifyStatus() {
  const perm = await permissionState();
  let msg;
  if (NativeNotif) {
    msg = perm === "granted"
      ? "Notifications are on. Reminders arrive even when the app is closed."
      : perm === "denied"
        ? "Notifications are off for this app. Turn them on in Android Settings → Apps → To Doz → Notifications."
        : "You'll be asked to allow notifications when you turn a reminder on.";
    $("exactRow").hidden = perm !== "granted" || (await canExact());
  } else if (!canNotify()) {
    msg = "This browser can't send phone notifications from here, so reminders pop up inside the app while it's open. The installed Android app will get real notifications.";
  } else if (perm === "denied") {
    msg = "Notifications are blocked for this site, so reminders will only pop up inside the app.";
  } else if (perm === "granted") {
    msg = "Notifications are on. In the browser version, reminders only fire while the app is open.";
  } else {
    msg = "You'll be asked to allow notifications when you turn a reminder on.";
  }
  $("notifyStatus").textContent = msg;
}

let toastTimer;
function showToast(title, body) {
  $("toastTitle").textContent = title;
  $("toastBody").textContent = body;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 8000);
}
$("toast").onclick = () => ($("toast").hidden = true);

async function notify(title, body) {
  showToast(title, body);
  // In the Android app the system notification was already scheduled ahead of time.
  if (NativeNotif || !canNotify() || Notification.permission !== "granted") return;
  try {
    // Android Chrome only allows notifications through a service worker
    if (swReg) await swReg.showNotification(title, { body, tag: title });
    else new Notification(title, { body });
  } catch {
    // The in-app popup already showed it.
  }
}

function checkReminders() {
  const now = Date.now();
  let changed = false;

  for (const item of state.items) {
    const due = dueTime(item);
    if (!item.remind || item.done || due === null || due > now) continue;
    const key = `${item.id}@${item.date}T${item.time}`;
    if (state.notified[key]) continue;
    state.notified[key] = true;
    changed = true;
    if (now - due < REMINDER_GRACE_MS) notify(reminderTitle(item), reminderBody(item));
  }

  if (state.summary) {
    const today = addDays(0);
    const key = "summary@" + today;
    const [h, m] = state.summaryTime.split(":").map(Number);
    const at = new Date();
    at.setHours(h, m, 0, 0);
    if (!state.notified[key] && now >= at.getTime()) {
      state.notified[key] = true;
      changed = true;
      if (now - at.getTime() < SUMMARY_GRACE_MS) {
        const { title, body } = summaryText(today);
        notify(title, body);
      }
    }
  }

  if (changed) {
    // Forget reminders for items that no longer exist, and old summaries
    const ids = new Set(state.items.map((i) => String(i.id)));
    const oldest = "summary@" + addDays(-2);
    for (const k of Object.keys(state.notified)) {
      const keep = k.startsWith("summary@") ? k >= oldest : ids.has(k.split("@")[0]);
      if (!keep) delete state.notified[k];
    }
    save();
  }
}


$("summaryOn").addEventListener("change", async (e) => {
  state.summary = e.target.checked;
  if (state.summary) await ensurePermission();
  save();
  checkReminders();
});

$("summaryTime").addEventListener("change", (e) => {
  state.summaryTime = e.target.value || "08:00";
  delete state.notified["summary@" + addDays(0)];
  save();
  checkReminders();
});

$("testNotify").onclick = async () => {
  const granted = await ensurePermission();
  const title = "🔔 Test reminder";
  const body = "This is what a reminder looks like.";
  if (NativeNotif && granted) {
    // Arrives in 5 seconds, so you can close the app and watch it show up.
    await NativeNotif.schedule({
      notifications: [{
        id: TEST_NOTIFICATION_ID,
        title,
        body,
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        isExactNotification: await canExact(),
      }],
    });
    showToast("Test reminder coming in 5 seconds", "Try closing the app to see it arrive as a phone notification.");
  } else {
    notify(title, body);
  }
};

// Without "exact alarms" Android may deliver reminders minutes late. Ask once, nicely.
async function offerExactOnce(granted) {
  if (!NativeNotif || !granted || state.askedExact || (await canExact())) return;
  state.askedExact = true;
  save();
  const msg = "Want reminders right on time?\n\n" +
    "Android can delay reminders by a few minutes unless you allow \"Alarms & reminders\" for To Doz on the next screen.";
  if (confirm(msg)) {
    $("exactBtn").click();
  }
}

$("exactBtn").onclick = async () => {
  if (!NativeNotif) return;
  try {
    await NativeNotif.changeExactNotificationSetting();
  } catch {
    // User backed out of the settings screen
  }
  updateNotifyStatus();
  scheduleNativeSoon();
};

setInterval(checkReminders, 15000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkReminders();
    render(); // "Today"/"Tomorrow" labels may have changed overnight
    updateNotifyStatus(); // permissions may have changed in Android settings
    scheduleNativeSoon(); // daily summaries hold a snapshot of the day's list
  }
});

// ---------- Minimize / bubble ----------

function setMinimized(min) {
  state.minimized = min;
  panel.classList.toggle("hidden", min);
  bubble.hidden = !min;
  document.body.classList.toggle("minimized", min);
  if (min) placeBubble();
  save();
}

$("minBtn").onclick = async () => {
  themePanel.hidden = true;
  settingsPanel.hidden = true;
  if (await floatOverOtherApps()) return;
  setMinimized(true);
};

// ---------- Floating bubble over other apps (Android app only) ----------
// Native code lives in android/.../BubbleService.java and BubblePlugin.java.

const NativeBubble = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.Bubble : null;

// The colors the native bubble paints itself with; several colors make it swirl.
function bubbleColors() {
  const bg = state.bg;
  if (bg.kind === "gradient") {
    const g = findGradient(bg.value);
    if (g) return g.css.match(/#[0-9a-f]{6}/gi);
  }
  if (bg.kind === "tiedye") {
    const t = findPattern(bg.value);
    if (t) return t.palette;
  }
  return [bg.kind === "solid" ? bg.value : SOLIDS[0]];
}

// Returns true if the bubble is now floating over other apps.
async function floatOverOtherApps() {
  if (!NativeBubble) return false;
  try {
    let { granted } = await NativeBubble.canDrawOverlays();
    if (!granted) {
      const ok = confirm(
        "To float over your other apps, Android needs the \"Display over other apps\" permission.\n\n" +
        "On the next screen, turn it on for To Doz, then come back."
      );
      if (!ok) return false;
      ({ granted } = await NativeBubble.requestPermission());
    }
    if (!granted) {
      showToast("Bubble stays inside the app", "Without \"Display over other apps\", the bubble can only float inside To Doz.");
      return false;
    }
    await NativeBubble.show({
      icon: state.icon,
      count: state.items.filter((i) => !i.done).length,
      colors: bubbleColors(),
    });
    return true;
  } catch (err) {
    console.warn("Could not show the floating bubble", err);
    return false;
  }
}

// Default spot is the bottom-right corner.
function placeBubble() {
  const pos = state.bubble || {
    x: window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN,
    y: window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN * 6,
  };
  moveBubble(pos.x, pos.y);
}

function moveBubble(x, y) {
  x = Math.max(EDGE_MARGIN, Math.min(x, window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN));
  y = Math.max(EDGE_MARGIN, Math.min(y, window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN));
  bubble.style.left = x + "px";
  bubble.style.top = y + "px";
  return { x, y };
}

// Drag the bubble around; tap (without dragging) opens the list.
// On release it snaps to the nearest left/right edge, like chat heads.
let drag = null;

bubble.addEventListener("pointerdown", (e) => {
  bubble.setPointerCapture(e.pointerId);
  bubble.classList.remove("snapping");
  const rect = bubble.getBoundingClientRect();
  drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, startX: e.clientX, startY: e.clientY, moved: false };
});

bubble.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 8) drag.moved = true;
  if (drag.moved) moveBubble(e.clientX - drag.dx, e.clientY - drag.dy);
});

bubble.addEventListener("pointerup", () => {
  if (!drag) return;
  const wasDrag = drag.moved;
  drag = null;

  if (!wasDrag) {
    setMinimized(false);
    return;
  }

  const rect = bubble.getBoundingClientRect();
  const snapLeft = rect.left + BUBBLE_SIZE / 2 < window.innerWidth / 2;
  const x = snapLeft ? EDGE_MARGIN : window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN;
  bubble.classList.add("snapping");
  state.bubble = moveBubble(x, rect.top);
  save();
});

bubble.addEventListener("pointercancel", () => { drag = null; });

window.addEventListener("resize", () => {
  if (state.minimized) placeBubble();
});

// ---------- Backup / restore ----------
// A backup is a small JSON file with everything you set up. On Android it goes out
// through the share sheet (Drive, Gmail, Files...); in a browser it downloads.

const isNative = !!window.Capacitor?.isNativePlatform?.();
const NativeFS = isNative ? window.Capacitor.Plugins.Filesystem : null;
const NativeShare = isNative ? window.Capacitor.Plugins.Share : null;
const BACKUP_KEYS = ["items", "categories", "bg", "icon", "view", "filter", "summary", "summaryTime",
  "composerCollapsed", "celebrate", "sound", "motion", "hue"];

function backupData() {
  const data = {};
  for (const k of BACKUP_KEYS) data[k] = state[k];
  // "todo-bubble" is the file format id (kept from the original name so old backups still load)
  return { app: "todo-bubble", format: 1, exportedAt: new Date().toISOString(), data };
}

function updateBackupStatus() {
  $("backupStatus").textContent = state.lastBackup
    ? `Last backup: ${new Date(state.lastBackup).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
    : "No backup yet. Save one before reinstalling or switching phones.";
}

$("backupBtn").onclick = async () => {
  const json = JSON.stringify(backupData(), null, 2);
  const name = `to-doz-backup-${addDays(0)}.json`;
  try {
    if (NativeFS && NativeShare) {
      const { uri } = await NativeFS.writeFile({ path: name, data: json, directory: "CACHE", encoding: "utf8" });
      await NativeShare.share({ title: "To Doz backup", files: [uri], dialogTitle: "Save your backup" });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    state.lastBackup = Date.now();
    save();
    updateBackupStatus();
  } catch (err) {
    const msg = String(err?.message || err);
    if (!/cancel/i.test(msg)) showToast("Backup didn't save", msg);
  }
};

$("restoreBtn").onclick = () => $("restoreFile").click();

$("restoreFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = ""; // allow picking the same file again later
  if (!file) return;
  try {
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      throw new Error("That file isn't a To Doz backup.");
    }
    if (backup?.app !== "todo-bubble" || !Array.isArray(backup.data?.items)) {
      throw new Error("That file isn't a To Doz backup.");
    }
    const when = new Date(backup.exportedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    const n = backup.data.items.length;
    if (!confirm(`Restore the backup from ${when}?

It has ${n} task${n === 1 ? "" : "s"}. This replaces everything in the app right now.`)) return;

    // Keep a copy of what was here, just in case
    try {
      localStorage.setItem(STORAGE_KEY + ".beforeRestore", JSON.stringify(state));
    } catch {}
    for (const k of BACKUP_KEYS) if (k in backup.data) state[k] = backup.data[k];
    state.notified = {};
    syncUi();
    save();
    showToast("✅ Restored", `${n} task${n === 1 ? " is" : "s are"} back.`);
  } catch (err) {
    showToast("Couldn't restore", err.message);
  }
});

// ---------- About ----------

if (NativeApp) {
  NativeApp.getInfo()
    .then((info) => ($("appVersion").textContent = `To Doz ${info.version} (build ${info.build})`))
    .catch(() => {});
} else {
  $("appVersion").textContent = "To Doz (browser preview)";
}

// ---------- Start ----------

// Put every control and the look of the app in line with `state` (startup and after a restore).
function syncUi() {
  $("summaryOn").checked = state.summary;
  $("celebrateOn").checked = state.celebrate;
  $("soundOn").checked = state.sound;
  setComposerCollapsed(state.composerCollapsed);
  $("summaryTime").value = state.summaryTime;
  $("hueShift").value = state.hue || 0;
  paintSwatchPreviews();
  $("catColor").value = CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length];
  updateNotifyStatus();
  updateBackupStatus();
  applyBg(state.bg);
  applyIcon(state.icon);
  resetAddDetails();
  render();
}

syncUi();
// The Android app uses the real floating bubble, so never reopen into the in-app one
if (NativeBubble) state.minimized = false;
setMinimized(state.minimized);
checkReminders();

// Startup screen: show the logo briefly, then fade into the app (tap to skip).
(function hideSplash() {
  const splash = $("splash");
  // The launch color on <html> would cover the moving backgrounds, so drop it now
  // that the startup screen is covering everything.
  $("bootBg")?.remove();
  $("splashIcon").textContent = state.icon;
  const leave = () => {
    if (splash.classList.contains("leaving")) return;
    splash.classList.add("leaving");
    setTimeout(() => splash.remove(), 600);
  };
  splash.addEventListener("click", leave);
  setTimeout(leave, 1400);
})();
