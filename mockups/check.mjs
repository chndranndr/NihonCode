// Run from the repository: node mockups/check.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(readFileSync(new URL("index.html", import.meta.url), "utf8"), {
  url: "http://localhost/mockups/index.html",
  runScripts: "outside-only",
});
dom.window.assert = assert;
dom.window.scrollTo = () => {};
dom.window.eval(
  readFileSync(new URL("app.js", import.meta.url), "utf8") +
    `
  for (const [name, view] of Object.entries(views)) {
    assert.match(view(), /<h1>/, name + ' needs a page heading');
  }
  for (const [mode] of modes) {
    state.mode = mode;
    const data = pool();
    assert.ok(data.rows.length > 0, mode);
    assert.ok(data.rows.every(row => row.length === data.heads.length), mode);
    assert.ok(sessionItems().every(item => item.accepted.length > 0), mode);
  }
  state.mode = 'conjugation'; state.wordType = 'Adjectives'; state.form = 'Negative';
  assert.equal(pool().rows[0][3], '高くない');
  assert.equal(pool().rows[1][3], '静かではない');
  state.mode = 'kanji'; state.query = 'water';
  main.innerHTML = setup(); renderMatrix();
  assert.equal(document.querySelectorAll('tbody tr').length, 1);
  assert.match(document.querySelector('tbody').textContent, /水/);
  state.query = 'not-in-the-pool'; renderMatrix();
  assert.match(document.querySelector('tbody').textContent, /No matching items/);
  assert.equal(normalize(' スイ '), normalize('すい'));
  assert.equal(normalize('ＴＡＢＥＭＡＳＵ'), 'tabemasu');
  state.mode = 'kana'; state.items = sessionItems().slice(0, 2);
  state.answers = []; state.index = 0; state.revealed = false;
  main.innerHTML = practice();
  document.querySelector('#answer').value = 'a';
  document.querySelector('#answer-form').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
  assert.equal(state.answers[0].correct, true);
  state.index = 1; state.revealed = false; main.innerHTML = practice();
  document.querySelector('#answer').value = '<wrong>';
  document.querySelector('#answer-form').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
  assert.equal(state.answers[1].correct, false);
  assert.match(results(), /50/);
  assert.match(results(), /&lt;wrong&gt;/);
  const leap = sampleActivity(2024);
  assert.equal(leap.length, 366);
  assert.ok(leap.some(row => row.date === '2024-02-29'));
  assert.equal(sampleActivity(2025).length, 365);
  assert.equal(sampleActivity(2026).at(-1).date, ACTIVITY_TODAY);
  const totals = activityTotals(leap);
  assert.equal(totals.total, leap.reduce((sum,row)=>sum+row.count,0));
  assert.ok(Math.abs(totals.shares.reduce((a,b)=>a+b,0)-100)<1e-9);
  assert.equal(activityTotals([]).shares.join(','),'0,0,0,0');
  main.innerHTML = activityCalendar(true);
  assert.equal(document.querySelectorAll('[data-day]').length,91);
  state.activityYear=2024; main.innerHTML=activityCalendar();
  assert.equal(document.querySelectorAll('[data-day]').length,366);
  assert.ok(document.querySelector('[data-day="2024-02-29"]'));
  document.querySelector('[data-day="2024-02-29"]').click();
  assert.match(document.querySelector('.day-detail').textContent,/2024-02-29/);
  state.mode='jlpt'; state.jlptCategory='Grammar'; state.jlptSet=1;
  state.items=jlptItems(); state.index=0; state.answers=[]; state.revealed=false;
  main.innerHTML=practice();
  assert.equal(document.querySelectorAll('[name="jlpt-answer"]').length,4);
  document.querySelector('[name="jlpt-answer"]').checked=true;
  document.querySelector('#answer-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(state.answers[0].correct,true);
  for (const category of Object.keys(JLPT_SAMPLES)) {
    state.jlptCategory=category;
    assert.ok(jlptItems().every(item=>item.choices.includes(item.answer)));
  }
`,
);
dom.window.close();
console.log(
  "Mockup checks passed: nine views, six matrices, calendars, activity totals, JLPT, grading and results.",
);
