/* Standalone design prototype. All content is sample data; no production storage is touched. */
const main = document.querySelector("#main");
const state = {
  mode: "kanji",
  level: "N5",
  count: 10,
  kana: "Hiragana",
  range: "1–99",
  date: "Weekdays",
  form: "Polite",
  wordType: "Verbs",
  query: "",
  page: 0,
  index: 0,
  answers: [],
  items: [],
  revealed: false,
  theme: "dark",
  accent: "amber",
  cap: 20,
  skip: false,
  activityYear: 2026,
  jlptCategory: "Grammar",
  jlptSet: 1,
};
const modes = [
  ["kana", "あ", "Kana", "Hiragana & katakana"],
  ["kanji", "漢", "Kanji", "Characters & readings"],
  ["vocab", "語", "Vocabulary", "Words & meanings"],
  ["numbers", "123", "Numbers", "Counting practice"],
  ["dates", "日", "Dates", "Days & dates"],
  ["conjugation", "活", "Conjugation", "Verbs & adjectives"],
];
const kanji = [
  ["山", "サン", "やま", "mountain"],
  ["水", "スイ", "みず", "water"],
  ["火", "カ", "ひ", "fire"],
  ["木", "モク・ボク", "き・こ", "tree; wood"],
  ["人", "ジン・ニン", "ひと", "person"],
  ["日", "ニチ・ジツ", "ひ・か", "day; sun"],
  ["月", "ゲツ・ガツ", "つき", "moon; month"],
  ["川", "セン", "かわ", "river"],
  ["口", "コウ・ク", "くち", "mouth"],
  ["学", "ガク", "まなぶ", "study"],
  ["生", "セイ・ショウ", "いきる・うまれる", "life; birth"],
  ["何", "カ", "なに・なん", "what"],
];
const kana = [
  ["あ", "a"],
  ["い", "i"],
  ["う", "u"],
  ["え", "e"],
  ["お", "o"],
  ["か", "ka"],
  ["き", "ki"],
  ["く", "ku"],
  ["け", "ke"],
  ["こ", "ko"],
  ["さ", "sa"],
  ["し", "shi"],
];
const vocab = [
  ["学校", "がっこう", "gakkou", "school"],
  ["水", "みず", "mizu", "water"],
  ["日本", "にほん", "nihon", "Japan"],
  ["先生", "せんせい", "sensei", "teacher"],
  ["学生", "がくせい", "gakusei", "student"],
  ["本", "ほん", "hon", "book"],
  ["電車", "でんしゃ", "densha", "train"],
  ["友達", "ともだち", "tomodachi", "friend"],
  ["今日", "きょう", "kyou", "today"],
  ["明日", "あした", "ashita", "tomorrow"],
  ["時間", "じかん", "jikan", "time"],
  ["天気", "てんき", "tenki", "weather"],
];
const numbers = [
  ["一", "いち", "ichi", "1"],
  ["二", "に", "ni", "2"],
  ["三", "さん", "san", "3"],
  ["四", "よん", "yon", "4"],
  ["五", "ご", "go", "5"],
  ["六", "ろく", "roku", "6"],
  ["七", "なな", "nana", "7"],
  ["八", "はち", "hachi", "8"],
  ["九", "きゅう", "kyuu", "9"],
  ["十", "じゅう", "juu", "10"],
  ["二十", "にじゅう", "nijuu", "20"],
  ["九十九", "きゅうじゅうきゅう", "kyuujuukyuu", "99"],
];
const weekdays = [
  ["月曜日", "げつようび", "getsuyoubi", "Monday"],
  ["火曜日", "かようび", "kayoubi", "Tuesday"],
  ["水曜日", "すいようび", "suiyoubi", "Wednesday"],
  ["木曜日", "もくようび", "mokuyoubi", "Thursday"],
  ["金曜日", "きんようび", "kinyoubi", "Friday"],
  ["土曜日", "どようび", "doyoubi", "Saturday"],
  ["日曜日", "にちようび", "nichiyoubi", "Sunday"],
];
const fullDates = [
  ["一月一日", "いちがつ ついたち", "ichigatsu tsuitachi", "January 1"],
  ["三月三日", "さんがつ みっか", "sangatsu mikka", "March 3"],
  ["五月五日", "ごがつ いつか", "gogatsu itsuka", "May 5"],
  ["七月七日", "しちがつ なのか", "shichigatsu nanoka", "July 7"],
  ["九月二十二日", "くがつ にじゅうににち", "kugatsu nijuuninichi", "September 22"],
  [
    "十二月三十一日",
    "じゅうにがつ さんじゅういちにち",
    "juunigatsu sanjuuichinichi",
    "December 31",
  ],
];
const verbs = [
  ["食べる", "taberu", "eat", "食べます", "tabemasu", "食べない", "tabenai", "食べた", "tabeta"],
  ["書く", "kaku", "write", "書きます", "kakimasu", "書かない", "kakanai", "書いた", "kaita"],
  ["読む", "yomu", "read", "読みます", "yomimasu", "読まない", "yomanai", "読んだ", "yonda"],
  ["見る", "miru", "see", "見ます", "mimasu", "見ない", "minai", "見た", "mita"],
  ["行く", "iku", "go", "行きます", "ikimasu", "行かない", "ikanai", "行った", "itta"],
  ["する", "suru", "do", "します", "shimasu", "しない", "shinai", "した", "shita"],
];
const adjectives = [
  [
    "高い",
    "takai",
    "expensive",
    "高いです",
    "takai desu",
    "高くない",
    "takakunai",
    "高かった",
    "takakatta",
  ],
  [
    "静か",
    "shizuka",
    "quiet",
    "静かです",
    "shizuka desu",
    "静かではない",
    "shizuka dewa nai",
    "静かだった",
    "shizuka datta",
  ],
];
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const modeName = () =>
  state.mode === "jlpt" ? `JLPT ${state.jlptCategory}` : modes.find((m) => m[0] === state.mode)[2];
const link = (page, text, cls = "") => `<a class="${cls}" href="#${page}">${text}</a>`;
const heading = (title, desc = "") =>
  `<div class="page-head"><div><p class="label">キタ / ${state.level} STUDY</p><h1>${title}</h1>${desc ? `<p class="description">${desc}</p>` : ""}</div></div>`;
const panel = (title, body, extra = "") =>
  `<section class="panel ${extra}"><div class="panel-head"><h2>${title}</h2></div>${body}</section>`;
const levels = () =>
  `<div class="field"><span>Study level</span><div class="segmented" aria-label="Study level">${["N5", "N4", "N3", "N2", "N1"].map((n) => `<button data-level="${n}" aria-pressed="${state.level === n}">${n}</button>`).join("")}</div></div>`;
const practiceLinks = () =>
  `<div class="practice-list">${modes.map(([id, glyph, name, desc]) => `<a href="#setup/${id}" class="practice-link"><span lang="ja">${glyph}</span><span><b>${name}</b><small>${desc}</small></span><span class="arrow" aria-hidden="true">↗</span></a>`).join("")}</div>`;
// Fixed sample clock keeps this design preview reproducible, including leap years.
const ACTIVITY_TODAY = "2026-09-22";
const ACTIVITY_TYPES = ["Drills", "SRS Review", "Grammar", "JLPT"];
const DAY_MS = 86400000;
const dayKey = (date) => date.toISOString().slice(0, 10);
function sampleActivity(year) {
  const rows = [];
  for (let time = Date.UTC(year, 0, 1); time < Date.UTC(year + 1, 0, 1); time += DAY_MS) {
    const date = dayKey(new Date(time));
    if (date > ACTIVITY_TODAY) break;
    const seed = Math.floor(time / DAY_MS);
    const count = seed % 7 === 0 || seed % 11 === 0 ? 0 : ((seed * 13) % 5) + 1;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < count; i++) {
      const category = (seed + i * 3) % 10;
      counts[category < 4 ? 0 : category < 7 ? 1 : category < 9 ? 2 : 3]++;
    }
    rows.push({ date, count, counts });
  }
  return rows;
}
function activityTotals(rows) {
  const counts = ACTIVITY_TYPES.map((_, index) =>
    rows.reduce((sum, row) => sum + row.counts[index], 0),
  );
  const total = counts.reduce((sum, n) => sum + n, 0);
  return { counts, total, shares: counts.map((n) => (total ? (n / total) * 100 : 0)) };
}
function activityCalendar(compact = false) {
  const year = compact ? 2026 : state.activityYear;
  const end = compact ? new Date(`${ACTIVITY_TODAY}T00:00:00Z`) : new Date(Date.UTC(year, 11, 31));
  const start = compact ? new Date(end.getTime() - 90 * DAY_MS) : new Date(Date.UTC(year, 0, 1));
  const rows = sampleActivity(year).filter(
    (row) => row.date >= dayKey(start) && row.date <= dayKey(end),
  );
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const total = activityTotals(rows).total;
  const first = new Date(start.getTime() - start.getUTCDay() * DAY_MS);
  const weeks = Math.ceil(((end.getTime() - first.getTime()) / DAY_MS + 1) / 7);
  let cells = "",
    months = "",
    lastMonth = -1;
  for (let week = 0; week < weeks; week++) {
    const weekDate = new Date(first.getTime() + week * 7 * DAY_MS);
    const labelDate = week === 0 ? start : weekDate;
    const month = labelDate.getUTCMonth();
    if (month !== lastMonth) {
      months += `<span style="grid-column:${week + 1}">${labelDate.toLocaleDateString("en", { month: "short", timeZone: "UTC" })}</span>`;
      lastMonth = month;
    }
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekDate.getTime() + day * DAY_MS),
        key = dayKey(date);
      if (date < start || date > end) {
        cells += '<span class="heat-cell padding" aria-hidden="true"></span>';
        continue;
      }
      const future = key > ACTIVITY_TODAY;
      const count = byDate.get(key)?.count ?? 0;
      const label = `${key}: ${future ? "future date" : `${count} completed sessions`}`;
      cells += `<button class="heat-cell heat-${Math.min(count, 4)}${future ? " future" : ""}" data-day="${key}" title="${label}" aria-label="${label}" tabindex="${key === dayKey(start) ? 0 : -1}" ${future ? "disabled" : ""}></button>`;
    }
  }
  return `<div class="activity-calendar ${compact ? "compact" : "annual"}"><div class="activity-caption"><strong>${total} sessions</strong><span>${compact ? "Last 13 weeks" : year} · all levels</span></div><div class="heat-scroll" tabindex="0" role="group" aria-label="${compact ? "13-week" : "Annual"} study calendar; arrow keys move between days"><div class="heat-layout" style="--weeks:${weeks}"><div class="heat-months">${months}</div><div class="heat-days" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div><div class="heat-grid">${cells}</div></div></div><div class="heat-footer"><span>${rows.filter((row) => row.count > 0).length} active days</span><span class="heat-legend">Less ${[0, 1, 2, 3, 4].map((n) => `<i class="heat-cell heat-${n}" title="${n === 4 ? "4+" : n} sessions"></i>`).join("")} More</span></div><p class="day-detail" role="status">Select a day to see its activity.</p>${compact ? link("progress", "View full activity →", "text-link") : '<p class="sample-note">One contribution = one completed session. 0 / 1 / 2 / 3 / 4+ sessions per day. Sample history ends 22 Sep 2026.</p>'}</div>`;
}
function activityQuadrant() {
  const { counts, total, shares } = activityTotals(sampleActivity(state.activityYear));
  const points = [
    [220 - shares[0] * 1.45, 185],
    [220, 185 - shares[1] * 1.45],
    [220 + shares[3] * 1.45, 185],
    [220, 185 + shares[2] * 1.45],
  ];
  const largest = counts.indexOf(Math.max(...counts));
  return `<section class="panel activity-overview"><div class="panel-head"><h2>Activity overview</h2><span class="label">${state.activityYear} · ALL LEVELS</span></div><div class="quadrant-layout"><div><h3>Your study mix</h3><p class="description">${total ? `${ACTIVITY_TYPES[largest]} makes up the largest share of your ${total} completed sessions.` : "No completed sessions in this period yet."}</p><dl class="activity-breakdown">${ACTIVITY_TYPES.map((name, i) => `<div><dt>${name}</dt><dd>${counts[i]} sessions <strong>${shares[i].toFixed(1)}%</strong></dd></div>`).join("")}</dl><p class="sample-note">A picture of how you practice, not a skill score. There is no ideal shape to aim for.</p></div><svg class="quadrant" viewBox="0 0 440 370" role="img" aria-label="Study mix: ${ACTIVITY_TYPES.map((name, i) => `${name} ${shares[i].toFixed(1)} percent`).join(", ")}"><path class="quadrant-axis" d="M75 185H365 M220 40V330"/><polygon class="quadrant-area" points="${points.map((p) => p.join(",")).join(" ")}"/>${points.map((p) => `<circle class="quadrant-point" cx="${p[0]}" cy="${p[1]}" r="4"/>`).join("")}<text x="220" y="17" text-anchor="middle">${shares[1].toFixed(1)}% SRS Review</text><text x="12" y="166">${shares[0].toFixed(1)}%</text><text x="12" y="184">Drills</text><text x="428" y="166" text-anchor="end">${shares[3].toFixed(1)}%</text><text x="428" y="184" text-anchor="end">JLPT</text><text x="220" y="356" text-anchor="middle">${shares[2].toFixed(1)}% Grammar</text></svg></div></section>`;
}
const map = () =>
  `<div class="kanji-grid">${kanji.map((r, i) => `<button data-kanji="${i}" class="${i < 4 ? "mastered" : i < 8 ? "learning" : ""}" aria-label="${r[0]}, ${r[3]}, ${i < 4 ? "mastered" : i < 8 ? "learning" : "unseen"}" lang="ja">${r[0]}</button>`).join("")}</div><div class="legend"><span class="green">■ Mastered</span><span class="blue">■ Learning</span><span>□ Unseen</span></div><div class="inspector" id="inspector" aria-live="polite">Select a character to explore its readings.</div>`;
function home() {
  return `<div class="page-head"><div><p class="label">YOUR JAPANESE, A LITTLE EVERY DAY</p><h1>Welcome back.</h1></div><pre class="fuji" aria-hidden="true">                 /\
              . /  \\ .
           .   / /\\ \\   .
        ._____/ /  \\ \\_____.
      ─────────────────────────
            毎日、少しずつ。</pre>${levels()}</div><div class="grid-home"><section class="panel routine"><p class="label">TODAY’S PRACTICE</p><h2>Keep your Japanese moving.</h2><p class="muted">12 cards are ready for another look.</p>${link("setup/kanji", "Review 12 cards <span>→</span>", "button primary")}<span class="muted">Choose your session before you begin.</span></section>${panel("Your momentum", activityCalendar(true))}${panel("Choose a practice", practiceLinks(), "span-all")}</div><div class="compact-grid">${panel(`Grammar · ${state.level}`, `<div class="lesson-preview"><p class="label">LESSON 04 / PARTICLES</p><p class="jp" lang="ja">私は学生です。</p><p class="muted">Introduce a topic with は, then say something about it.</p>${link("grammar", "Continue lesson →", "button")}</div>`)}${panel("Your kanji", map())}</div><div class="jlpt-strip">${link("jlpt", "Explore JLPT practice →")}<span class="muted">Listening & reading practice are unavailable.</span></div>`;
}
function progress() {
  return `${heading("Your effort, taking shape.", "Every day adds up. Explore when you studied and how you spent your sessions.")}<section class="panel annual-panel"><div class="panel-head"><h2>Study activity</h2><label class="year-select">Year <select id="activity-year">${[2026, 2025, 2024].map((year) => `<option ${year === state.activityYear ? "selected" : ""}>${year}</option>`).join("")}</select></label></div>${activityCalendar()}</section>${activityQuadrant()}<div class="progress-layout">${panel("Spaced repetition", `<div class="srs-row"><span>Ready to review</span><strong class="blue">12 cards</strong></div><div class="srs-row"><span>Learned</span><strong>48 / 818</strong></div><div class="srs-row"><span>New today</span><strong>8 / 20</strong></div><p class="sample-note">Your next review builds on what you already know.</p>${link("setup/kanji", "Open review setup →", "button")}`)}${panel("Milestones", `<div class="achievement-list"><span><b>✓</b>First session</span><span><b>✓</b>Seven-day streak</span><span><b>✓</b>100 XP</span><span class="muted"><b>□</b>Ten grammar lessons</span></div>`)}${panel(`Kanji · ${state.level}`, map(), "span-all")}</div><p class="sample-note">Sample data only. Study activity measures participation, not JLPT exam readiness.</p>`;
}
function learn() {
  return `${heading("Choose what to learn.", "Practice a skill, explore a grammar point, or return to your review queue.")}<div class="toolbar">${levels()}<span class="muted">Sample lessons shown at every preview level.</span></div><div class="learn-layout">${panel("Practice", practiceLinks())}${panel(`Grammar library · ${state.level}`, `<p class="muted">Six sample lesson links · preview the lesson format.</p>${["です — saying what something is", "は — introducing the topic", "の — connecting nouns", "か — asking a question", "も — also, too", "を — marking the object"].map((s, i) => `<a class="lesson-row" href="#grammar"><span class="num">0${i + 1}</span><span><b lang="ja">${s}</b><small>${i < 2 ? "Completed" : "Sample lesson"}</small></span><span class="end">→</span></a>`).join("")}`)}${panel("Review what you know", `<p class="muted">12 sample cards ready for review.</p><br>${link("setup/kanji", "Review setup →", "button primary")}`)}${panel("JLPT practice", `<p class="muted">Grammar, kanji and vocabulary exercise sets.</p><p class="sample-note">Select a set and practice with multiple-choice questions. Listening and reading remain unavailable.</p>${link("jlpt", "Browse JLPT sets →", "button")}<p class="sample-note"></p>`)}</div>`;
}
function config() {
  return `${heading("Make space for your routine.", "Adjust the look and session preferences of this preview.")}<div class="settings"><section class="settings-section"><h2>Appearance</h2><div class="setting"><div><h3>Theme</h3><p>The same study console, in daylight or after dark.</p></div><div class="segmented">${["dark", "light"].map((t) => `<button data-theme="${t}" aria-pressed="${state.theme === t}">${t === "dark" ? "Dark" : "Light"}</button>`).join("")}</div></div><div class="setting"><div><h3>Accent</h3><p>Used for selected controls and your next action.</p></div><div class="segmented">${["amber", "green", "blue"].map((t) => `<button data-accent="${t}" aria-pressed="${state.accent === t}">${t}</button>`).join("")}</div></div></section><section class="settings-section"><h2>Review preferences</h2><div class="setting"><div><h3>Daily new-card limit</h3><p>A comfortable number of new cards to introduce each day.</p></div><input id="cap" aria-label="Daily new-card limit" type="number" min="1" max="100" value="${state.cap}"></div><div class="setting"><div><h3>Skip learning steps</h3><p>Preview preference only; this mockup does not run the SRS scheduler.</p></div><label class="checks"><input id="skip-steps" type="checkbox" ${state.skip ? "checked" : ""}> Enabled</label></div></section><section class="settings-section"><h2>Your data</h2><p>The real app keeps progress in your browser. This standalone mockup uses sample data and does not access that progress.</p><div class="notice">Preview settings last until you reload. No account, no upload, and no changes to your real learning history.</div></section></div>`;
}
function pool() {
  if (state.mode === "kana")
    return {
      heads: ["Character", "Romaji"],
      rows: kana.map((r) => [
        state.kana === "Katakana" ? String.fromCharCode(r[0].charCodeAt(0) + 96) : r[0],
        r[1],
      ]),
    };
  if (state.mode === "kanji")
    return { heads: ["Kanji", "On’yomi", "Kun’yomi", "Meaning"], rows: kanji };
  if (state.mode === "vocab")
    return { heads: ["Word", "Reading", "Romaji", "Meaning"], rows: vocab };
  if (state.mode === "numbers")
    return {
      heads: ["Japanese", "Reading", "Romaji", "Number"],
      rows:
        state.range === "1–999"
          ? [
              ...numbers,
              ["百", "ひゃく", "hyaku", "100"],
              ["三百", "さんびゃく", "sanbyaku", "300"],
              ["千", "せん", "sen", "1000"],
            ].filter((r) => Number(r[3]) <= 999)
          : numbers,
    };
  if (state.mode === "dates")
    return {
      heads: ["Japanese", "Reading", "Romaji", "Meaning"],
      rows: state.date === "Weekdays" ? weekdays : fullDates,
    };
  const offset = { Polite: 3, Negative: 5, Past: 7 }[state.form];
  return {
    heads: ["Base word", "Meaning", "Target form", "Example", "Romaji"],
    rows: (state.wordType === "Verbs" ? verbs : adjectives).map((r) => [
      r[0],
      r[2],
      state.form,
      r[offset],
      r[offset + 1],
    ]),
  };
}
const selectField = (id, label, options, value) =>
  `<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map((o) => `<option ${o === value ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;
function modeOptions() {
  switch (state.mode) {
    case "kana":
      return selectField("kana", "Script", ["Hiragana", "Katakana"], state.kana);
    case "numbers":
      return selectField("range", "Number range", ["1–99", "1–999"], state.range);
    case "dates":
      return selectField("date", "Date mode", ["Weekdays", "Full dates"], state.date);
    case "conjugation":
      return (
        selectField("wordType", "Word type", ["Verbs", "Adjectives"], state.wordType) +
        selectField("form", "Target form", ["Polite", "Negative", "Past"], state.form)
      );
    default:
      return levels();
  }
}
function setup() {
  return `${link("learn", "← Choose a practice", "back")}${heading(`${modeName()} practice`, "Explore the available items, then choose how much to practice.")}<div class="toolbar">${selectField(
    "mode",
    "Practice",
    modes.map((m) => m[2]),
    modeName(),
  )}${modeOptions()}<div class="field"><span>Questions</span><div class="segmented">${[10, 20, 50, "All"].map((n) => `<button data-count="${n}" aria-pressed="${state.count === n}">${n}</button>`).join("")}</div></div></div><div class="table-head"><div><h2>Available items</h2><p class="sample-note">${pool().rows.length} sample items · ${["numbers", "dates"].includes(state.mode) ? "representative possibilities" : "browsable preview pool"}</p></div><input id="search" type="search" aria-label="Search available items" placeholder="Search character, reading or meaning…" value="${esc(state.query)}"></div><div id="matrix"></div><div class="start-dock"><div><p id="session-count"></p><p class="sample-note">Search browses the preview; it does not change your session pool.</p></div><button class="primary" id="start">Start practice →</button></div><p class="sample-note">${state.mode === "vocab" ? "Vocabulary uses word readings. On’yomi and kun’yomi belong to individual kanji." : state.mode === "kanji" ? "The session accepts any of the displayed kana readings." : state.mode === "conjugation" ? "Examples update when you change the target form." : "Only the sample items above are used in this interactive mockup."} Levels are visual previews; sample content stays the same.</p>`;
}
function renderMatrix() {
  const data = pool();
  const rows = data.rows.filter((r) =>
    r.join(" ").toLowerCase().includes(state.query.toLowerCase()),
  );
  const size = 6;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  state.page = Math.min(state.page, pages - 1);
  const slice = rows.slice(state.page * size, (state.page + 1) * size);
  document.querySelector("#matrix").innerHTML =
    `<div class="table-wrap"><table><thead><tr>${data.heads.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${slice.length ? slice.map((r) => `<tr>${r.map((v, i) => `<td class="${i === 0 ? "char" : ""}" ${i === 0 ? 'lang="ja"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${data.heads.length}" class="empty">No matching items. Try another reading or meaning.</td></tr>`}</tbody></table></div><div class="table-foot"><span>${rows.length ? `Showing ${state.page * size + 1}–${Math.min((state.page + 1) * size, rows.length)} of ${rows.length}` : "0 items"}</span><div class="actions"><button data-page="-1" ${state.page === 0 ? "disabled" : ""}>← Previous</button><button data-page="1" ${state.page === pages - 1 ? "disabled" : ""}>Next →</button></div></div>`;
  document.querySelector("#session-count").textContent =
    `${Math.min(state.count === "All" ? data.rows.length : state.count, data.rows.length)} questions · from ${data.rows.length} sample items`;
}
function sessionItems() {
  if (state.mode === "jlpt") return jlptItems();
  return pool().rows.map((r) => {
    if (state.mode === "kana")
      return { prompt: r[0], answer: r[1], accepted: [r[1]], meaning: "Kana reading" };
    if (state.mode === "kanji")
      return {
        prompt: r[0],
        answer: r[2],
        accepted: [...r[1].split("・"), ...r[2].split("・")],
        meaning: r[3],
      };
    if (state.mode === "conjugation")
      return {
        prompt: r[0],
        target: state.form,
        answer: r[3],
        accepted: [r[3], r[4]],
        meaning: r[1],
      };
    if (state.mode === "numbers")
      return { prompt: r[0], answer: r[3], accepted: [r[3]], meaning: r[1] };
    if (state.mode === "dates")
      return { prompt: r[0], answer: r[3], accepted: [r[3]], meaning: r[1] };
    return { prompt: r[0], answer: r[1], accepted: [r[1], r[2]], meaning: r[3] };
  });
}
function startSession() {
  const items = sessionItems();
  state.items = items.slice(
    0,
    state.count === "All" ? items.length : Math.min(state.count, items.length),
  );
  state.index = 0;
  state.answers = [];
  state.revealed = false;
  location.hash = "practice";
  if (route() === "practice") render();
}
function practice() {
  if (!state.items.length) {
    state.items = sessionItems().slice(0, Math.min(10, sessionItems().length));
    state.index = 0;
  }
  if (state.mode === "jlpt") return jlptPractice();
  const item = state.items[state.index];
  const instruction = {
    kana: "Type the romaji",
    kanji: "Type any on’yomi or kun’yomi reading in kana",
    vocab: "Type the reading in kana or romaji",
    numbers: "Type the number in digits",
    dates: "Type the English weekday or date",
    conjugation: "Type the conjugated word in Japanese or romaji",
  }[state.mode];
  return `<section class="session"><div class="session-top"><div><p class="label">${modeName()} PRACTICE</p><h1>One item at a time.</h1></div><button id="exit">Exit session</button></div><div class="session-top"><span class="muted">Question ${state.index + 1} of ${state.items.length}</span><span class="label">${state.level} · PREVIEW</span></div><div class="track" role="progressbar" aria-label="Questions completed" aria-valuenow="${state.index}" aria-valuemin="0" aria-valuemax="${state.items.length}"><span style="--fill:${(state.index / state.items.length) * 100}%"></span></div><div class="prompt"><span class="glyph" lang="ja">${item.prompt}</span>${item.target ? `<span class="target">→ ${item.target} form</span>` : ""}<p class="muted">${instruction}</p></div><div id="answer-area"><form id="answer-form" class="answer-form"><label for="answer">Your answer</label><input id="answer" required autocomplete="off" spellcheck="false" placeholder="Type here…"><button class="primary">Check answer ↵</button></form></div><div class="session-hint"><span>Enter to check / continue</span><span>Esc to leave · no audio required</span></div></section>`;
}
function results() {
  const actual = state.answers.length > 0;
  const rows = actual
    ? state.answers
    : [
        { prompt: "山", answer: "やま", submitted: "やま", correct: true },
        { prompt: "水", answer: "みず", submitted: "すい", correct: true },
        { prompt: "火", answer: "ひ", submitted: "ほ", correct: false },
        { prompt: "木", answer: "き", submitted: "き", correct: true },
        { prompt: "人", answer: "ひと", submitted: "ひと", correct: true },
      ];
  const correct = rows.filter((r) => r.correct).length;
  return `<section class="results">${heading("Session complete.", "Take a moment to look back. Every attempt gives you something to build on.")}<div class="result-head"><div class="result-score">${Math.round((correct / rows.length) * 100)}<small>% accuracy</small></div><div class="result-metrics"><div><strong>${correct} / ${rows.length}</strong><span>correct answers</span></div><div><strong>${rows.length - correct}</strong><span>to revisit</span></div></div></div><div class="panel-head"><h2>${rows.some((r) => !r.correct) ? "Review your answers" : "A clean run. Nicely done."}</h2><span class="label">${actual ? "THIS PREVIEW SESSION" : "SAMPLE RESULTS"}</span></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Your answer</th><th>Expected answer</th><th>Result</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="char" lang="ja">${esc(r.prompt)}</td><td>${esc(r.submitted)}</td><td>${esc(r.answer)}</td><td class="${r.correct ? "green" : ""}">${r.correct ? "✓ Correct" : "↻ Revisit"}</td></tr>`).join("")}</tbody></table></div><div class="actions"><button class="primary" id="retry">Practice again →</button>${link(state.mode === "jlpt" ? "jlpt" : `setup/${state.mode}`, "Adjust practice", "button")}${link("home", "Back home", "button")}</div><p class="sample-note">This is a preview session. No XP or learning history has been saved.</p></section>`;
}
function grammar() {
  return `${link("learn", "← Grammar library", "back")}${heading("は — introducing the topic", "Lesson 04 · N5 grammar · About 4 minutes")}<div class="grammar-layout"><article class="reading"><p>The particle <span lang="ja">は</span> tells your listener what you are talking about. Think of it as “as for…” or “speaking of…”. As a particle, it is pronounced <b>wa</b>.</p><div class="formula"><span lang="ja">Topic <em>は</em> information <em>です</em>。</span></div><h2 id="examples">See it in a sentence</h2><div class="example"><p class="jp" lang="ja">私<span class="green">は</span>学生です。</p><p class="roman">Watashi wa gakusei desu.</p><p>I am a student.</p></div><div class="example"><p class="jp" lang="ja">これ<span class="green">は</span>本です。</p><p class="roman">Kore wa hon desu.</p><p>This is a book.</p></div><h2>A useful distinction</h2><p>は marks the topic, which is not always the grammatical subject. Start with simple introductions; you will meet the contrast with が in later lessons.</p><section class="panel quiz"><h2>Try it yourself</h2><p class="description">Choose the particle: “I am a teacher.”</p><p class="formula" lang="ja">私 <span class="blue">[ ? ]</span> 先生です。</p><div class="actions" id="quiz-options">${["は", "を", "に"].map((s) => `<button data-quiz="${s}" lang="ja">${s}</button>`).join("")}</div><p class="quiz-message" id="quiz-message" role="status"></p></section><div class="actions">${link("learn", "Return to library →", "button primary")}</div></article><aside class="grammar-aside"><p class="label">IN THIS LESSON</p><a href="#grammar" data-anchor="main">The topic marker</a><a href="#grammar" data-anchor="examples">Example sentences</a><p class="muted">Read → notice → practice</p><div class="notice">Remember: は is written “ha” but pronounced “wa” when it marks a topic.</div></aside></div>`;
}
const JLPT_SAMPLES = {
  Grammar: [
    [
      "私は学生（　）。",
      ["です", "ます", "を", "に"],
      0,
      "です completes a polite noun sentence: I am a student.",
    ],
    [
      "毎朝、パン（　）食べます。",
      ["に", "で", "を", "が"],
      2,
      "を marks パン as the object of 食べます.",
    ],
    [
      "学校（　）日本語を勉強します。",
      ["を", "で", "は", "の"],
      1,
      "で marks the place where an action happens.",
    ],
  ],
  Kanji: [
    [
      "「学校」の読み方は？",
      ["がこう", "がっこう", "かっこう", "がっこ"],
      1,
      "学校 is read がっこう and means school.",
    ],
    ["「山」の読み方は？", ["かわ", "みず", "やま", "ひと"], 2, "山 is やま: mountain."],
    ["「水」の読み方は？", ["みず", "き", "ひ", "つき"], 0, "水 is みず: water."],
  ],
  Vocabulary: [
    [
      "Choose the word meaning ‘teacher’.",
      ["学生", "先生", "友達", "学校"],
      1,
      "先生 (せんせい) means teacher.",
    ],
    [
      "Choose the word meaning ‘tomorrow’.",
      ["今日", "昨日", "明日", "毎日"],
      2,
      "明日 (あした) means tomorrow.",
    ],
    [
      "Choose the word meaning ‘train’.",
      ["本", "水", "時間", "電車"],
      3,
      "電車 (でんしゃ) means train.",
    ],
  ],
};
function jlptItems() {
  const rows = JLPT_SAMPLES[state.jlptCategory];
  const rotated = state.jlptSet === 1 ? rows : [...rows.slice(1), rows[0]];
  return rotated.map(([prompt, choices, index, meaning]) => ({
    prompt,
    choices,
    answer: choices[index],
    accepted: [choices[index]],
    meaning,
  }));
}
function jlpt() {
  return `${link("learn", "← Learning library", "back")}${heading("JLPT practice.", "Choose a category and a set. Work through each question, then review your answers.")}<div class="toolbar">${levels()}<span class="muted">N5 sample questions at every preview level.</span></div><div class="jlpt-categories" aria-label="JLPT category">${["Grammar", "Kanji", "Vocabulary"].map((name, i) => `<button data-category="${name}" aria-pressed="${state.jlptCategory === name}"><span lang="ja">${["文", "漢", "語"][i]}</span><b>${name}</b><small>${["Sentence patterns", "Character readings", "Word meanings"][i]}</small></button>`).join("")}<div class="jlpt-locked"><b>Listening</b><small>Unavailable · audio verification pending</small></div><div class="jlpt-locked"><b>Reading</b><small>Unavailable · passage curation pending</small></div></div><section class="panel"><div class="panel-head"><h2>${state.jlptCategory} sets · ${state.level}</h2><span class="label">2 PREVIEW SETS</span></div>${[1, 2].map((n) => `<label class="jlpt-set"><input type="radio" name="jlpt-set" value="${n}" ${state.jlptSet === n ? "checked" : ""}><span><b>Set ${String(n).padStart(2, "0")}</b><small>3 questions · ${n === 1 ? "Sample questions" : "Same sample questions, reordered"}</small></span><span class="muted">Untimed practice</span></label>`).join("")}<div class="start-dock"><div><p>${state.jlptCategory} · Set ${String(state.jlptSet).padStart(2, "0")}</p><p class="sample-note">Choose one answer per question. Feedback follows each answer.</p></div><button id="start-jlpt" class="primary">Start JLPT practice →</button></div></section><p class="sample-note">Illustrative questions, not an official test. No exam score prediction or saved set progress in this mockup.</p>`;
}
function jlptPractice() {
  const item = state.items[state.index];
  return `<section class="session jlpt-session"><div class="session-top"><div><p class="label">JLPT ${state.level} · ${state.jlptCategory} · SET ${state.jlptSet}</p><h1>Choose the best answer.</h1></div><button id="exit">Exit session</button></div><div class="session-top"><span>Question ${state.index + 1} of ${state.items.length}</span><span class="muted">Untimed practice</span></div><div class="track"><span style="--fill:${(state.index / state.items.length) * 100}%"></span></div><p class="jlpt-question" lang="ja">${esc(item.prompt)}</p><div id="answer-area"><form id="answer-form"><fieldset class="jlpt-options"><legend>Your answer</legend>${item.choices.map((choice, i) => `<label><input type="radio" name="jlpt-answer" value="${esc(choice)}" required><span class="muted">${i + 1}</span><span lang="ja">${esc(choice)}</span></label>`).join("")}</fieldset><button class="primary">Check answer ↵</button></form></div><p class="sample-note">Select an option, then check. Esc to exit.</p></section>`;
}
const views = { home, progress, learn, config, setup, practice, results, grammar, jlpt };
function route() {
  return location.hash.slice(1).split("/")[0] || "home";
}
function render() {
  let page = route();
  if (!views[page]) page = "home";
  if (page === "setup" && state.mode === "jlpt") state.mode = "kanji";
  const requested = location.hash.split("/")[1];
  if (page === "setup" && modes.some((m) => m[0] === requested) && requested !== state.mode) {
    state.mode = requested;
    state.page = 0;
    state.query = "";
  }
  main.innerHTML = views[page]();
  document.title = `Kita — ${page === "setup" ? "Practice setup" : page[0].toUpperCase() + page.slice(1)} · mockup`;
  document.querySelector("#page-switch").value = page;
  document.querySelectorAll(".rail nav a").forEach((a) => {
    const active =
      a.hash ===
      `#${["setup", "practice", "results", "grammar", "jlpt"].includes(page) ? "learn" : page}`;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (page === "setup") renderMatrix();
  if (page === "practice") document.querySelector("#answer")?.focus();
  if (page === "practice" && state.mode === "jlpt")
    document.querySelector('[name="jlpt-answer"]')?.focus();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button,a");
  if (!b) return;
  if (b.dataset.category) {
    state.jlptCategory = b.dataset.category;
    render();
  }
  if (b.id === "start-jlpt") {
    state.mode = "jlpt";
    startSession();
  }
  if (b.dataset.day) {
    const calendar = b.closest(".activity-calendar");
    calendar.querySelectorAll("[data-day]").forEach((cell) => {
      cell.tabIndex = -1;
      cell.setAttribute("aria-pressed", "false");
    });
    b.tabIndex = 0;
    b.setAttribute("aria-pressed", "true");
    const row = sampleActivity(Number(b.dataset.day.slice(0, 4))).find(
      (row) => row.date === b.dataset.day,
    );
    calendar.querySelector(".day-detail").textContent =
      `${b.dataset.day} · ${row?.count ?? 0} sessions${row?.count ? " — " + ACTIVITY_TYPES.map((name, i) => `${name}: ${row.counts[i]}`).join(" · ") : " — No study recorded."}`;
  }
  if (b.classList.contains("skip")) {
    e.preventDefault();
    main.focus();
    return;
  }
  if (b.dataset.level) {
    state.level = b.dataset.level;
    render();
  }
  if (b.dataset.count) {
    state.count = b.dataset.count === "All" ? "All" : Number(b.dataset.count);
    render();
  }
  if (b.dataset.page) {
    state.page += Number(b.dataset.page);
    renderMatrix();
  }
  if (b.dataset.theme) {
    state.theme = b.dataset.theme;
    document.documentElement.dataset.theme = state.theme;
    render();
  }
  if (b.dataset.accent) {
    state.accent = b.dataset.accent;
    document.documentElement.dataset.accent = state.accent;
    render();
  }
  if (b.dataset.kanji !== undefined) {
    const r = kanji[Number(b.dataset.kanji)];
    document.querySelector("#inspector").innerHTML =
      `<strong lang="ja">${r[0]}</strong>${r[3]}<p class="sample-note">On: ${r[1]} · Kun: ${r[2]}</p>`;
  }
  if (b.dataset.quiz) {
    const correct = b.dataset.quiz === "は";
    const msg = document.querySelector("#quiz-message");
    msg.textContent = correct
      ? "Correct. は marks 私 as the topic; read it as “wa”."
      : "Try again. Which particle introduces what the sentence is about?";
    msg.className = `quiz-message ${correct ? "green" : ""}`;
    b.setAttribute("aria-pressed", "true");
  }
  if (b.dataset.anchor) {
    e.preventDefault();
    document.getElementById(b.dataset.anchor)?.scrollIntoView();
  }
  if (b.id === "start" || b.id === "retry") startSession();
  if (b.id === "exit") document.querySelector("#exit-dialog").showModal();
  if (b.id === "resume") document.querySelector("#exit-dialog").close();
  if (b.id === "leave") {
    document.querySelector("#exit-dialog").close();
    state.items = [];
    state.answers = [];
    location.hash = state.mode === "jlpt" ? "jlpt" : `setup/${state.mode}`;
  }
  if (b.id === "next") {
    state.revealed = false;
    if (state.index + 1 === state.items.length) location.hash = "results";
    else {
      state.index++;
      render();
    }
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.name === "jlpt-set") {
    state.jlptSet = Number(el.value);
    render();
  }
  if (el.id === "activity-year") {
    state.activityYear = Number(el.value);
    render();
    document.querySelector("#activity-year").focus();
    return;
  }
  if (el.id === "page-switch") {
    location.hash = el.value;
    return;
  }
  if (el.id === "mode") {
    state.mode = modes.find((m) => m[2] === el.value)[0];
    state.query = "";
    state.page = 0;
    location.hash = `setup/${state.mode}`;
  }
  if (["kana", "range", "date", "wordType", "form"].includes(el.id)) {
    state[el.id] = el.value;
    state.page = 0;
    render();
  }
  if (el.id === "cap") {
    state.cap = Math.max(1, Math.min(100, Number(el.value) || 20));
    el.value = state.cap;
  }
  if (el.id === "skip-steps") state.skip = el.checked;
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    state.query = e.target.value;
    state.page = 0;
    renderMatrix();
  }
});
const normalize = (s) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[\s・]/g, "")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96));
document.addEventListener("submit", (e) => {
  if (e.target.id !== "answer-form") return;
  e.preventDefault();
  if (state.revealed) return;
  const input =
    document.querySelector('input[name="jlpt-answer"]:checked') ??
    document.querySelector("#answer");
  if (!input) return;
  if (!input.value.trim()) {
    input.setCustomValidity("Enter an answer first.");
    input.reportValidity();
    input.oninput = () => input.setCustomValidity("");
    return;
  }
  const item = state.items[state.index];
  const correct = item.accepted.some((a) => normalize(a) === normalize(input.value));
  state.answers.push({ ...item, submitted: input.value, correct });
  state.revealed = true;
  document.querySelector("#answer-area").innerHTML =
    `<div class="feedback ${correct ? "" : "wrong"}" role="status"><h2>${correct ? "✓ Correct" : "Let’s look at that again."}</h2><p><span lang="ja">${esc(item.prompt)} → ${esc(item.answer)}</span> · ${esc(item.meaning)}</p>${!correct ? `<p class="sample-note">You entered: ${esc(input.value)}<br>Accepted: ${item.accepted.map(esc).join(" / ")}</p>` : ""}<div class="actions"><button id="next" class="primary">${state.index + 1 === state.items.length ? "See results" : "Next question"} ↵</button></div></div>`;
  document.querySelector("#next").focus();
});
document.addEventListener("keydown", (e) => {
  if (e.target.matches("[data-day]")) {
    const delta = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key];
    if (delta) {
      e.preventDefault();
      const cells = [...e.target.closest(".heat-grid").querySelectorAll("button:not(:disabled)")];
      const next = cells[cells.indexOf(e.target) + delta];
      if (next) {
        e.target.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
      }
    }
  }
  if (
    route() === "practice" &&
    e.key === "Escape" &&
    !document.querySelector("#exit-dialog").open
  ) {
    e.preventDefault();
    document.querySelector("#exit-dialog").showModal();
  }
});
window.addEventListener("hashchange", () => {
  // Reopening the practice preview starts a fresh run, not a half-revealed answer.
  if (route() === "practice" && state.answers.length) {
    state.items = [];
    state.answers = [];
    state.index = 0;
    state.revealed = false;
  }
  render();
  window.scrollTo(0, 0);
  if (route() !== "practice") main.focus();
});
render();
