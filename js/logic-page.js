// Erklärseite «Bewertungslogik»: Tabellen und Beispiele werden mit der Engine selbst berechnet.
// Enthält keine Regeln – die Texte kommen aus js/docs.js (von test/docs.test.mjs gegen die Engine geprüft).
import { questions, evaluate, liveAlerts, orderCases, Priority, unknownLabels, RULESET_VERSION } from './engine.js';
import { serviceInfo, serviceName, bonusLabel } from './explain.js';
import { el, chip } from './ui.js';
import { NEUTRAL, questionMeta, levelRules, serviceRules, bonusRules, BONUS_MAX, confidenceRules, gateRules, alertRules, examples } from './docs.js';

const run = ex => evaluate({ ...NEUTRAL, ...ex });
const slot = name => document.querySelector(`[data-render="${name}"]`);
const put = (name, node) => { const s = slot(name); if (s) s.replaceChildren(node); };
const badge = (text, cls = '') => el('span', { class: 'app-badge' + (cls ? ' ' + cls : '') }, text);
const v02 = r => (r.v02 ? badge('v0.2') : null);

function table(caption, head, rows, cls = '') {
  return el('div', { class: 'app-table-wrap', tabindex: '0', role: 'region', 'aria-label': caption }, [
    el('table', { class: 'app-table' + (cls ? ' ' + cls : '') }, [
      el('caption', { class: 'app-visually-hidden' }, caption),
      el('thead', {}, [el('tr', {}, head.map(h => el('th', { scope: 'col' }, h)))]),
      el('tbody', {}, rows)
    ])
  ]);
}
const td = (content, extra = {}) => el('td', extra, typeof content === 'string' ? content : [content].flat());

document.querySelectorAll('[data-ruleset]').forEach(n => { n.textContent = RULESET_VERSION; });
document.querySelectorAll('[data-chip]').forEach(n => n.replaceChildren(chip(n.dataset.chip)));

// ---- Fragen ----
put('questions', table('Alle Fragen', ['Frage', 'Antworten', 'Wirkt auf'], questions.map(q => {
  const m = questionMeta[q.id];
  const follow = m.when !== 'immer';
  return el('tr', {}, [
    td([el('strong', {}, q.title), follow ? el('span', { class: 'app-table__sub' }, [badge('Folgefrage'), ' wenn ' + m.when]) : null, m.v02 ? v02(m) : null]),
    td(el('ul', { class: 'app-table__options' }, q.options.filter(o => o[0] !== 'unknown').map(o => el('li', {}, o[1])))),
    td(el('span', { class: 'app-tags' }, m.affects.map(t => badge(t, 'app-badge--muted'))))
  ]);
})));

// ---- Stufenregeln (gruppiert, höchste Stufe zuerst) ----
const levelRows = [];
for (let lv = 4; lv >= 0; lv--) {
  const group = levelRules.filter(r => r.level === lv);
  group.forEach((r, i) => levelRows.push(el('tr', { class: i === 0 ? 'app-table__group' : '' }, [
    i === 0 ? td(chip(Priority[lv]), { rowspan: String(group.length), class: 'app-table__level' }) : null,
    td([r.rule, ' ', v02(r)]),
    td(el('span', { class: 'app-table__quote' }, r.reason))
  ].filter(Boolean))));
}
put('level-rules', table('Regeln für die Jira-Priorität', ['Stufe', 'Regel', 'Begründung in der Auswertung'], levelRows, 'app-table--levels'));

// ---- Belastbarkeit ----
const statusCls = { Hoch: 'success', Mittel: 'warning', Niedrig: 'error' };
put('confidence', table('Belastbarkeit', ['Belastbarkeit', 'Wann'], confidenceRules.map(r => el('tr', {}, [
  td(el('span', { class: 'sbb-status sbb-status--' + statusCls[r.value] }, r.value)), td(r.rule)
]))));

// ---- Bearbeitungsart ----
put('service-rules', table('Bearbeitungsart', ['Nr.', 'Bearbeitungsart', 'Wann', 'Bedeutung'], serviceRules.map((r, i) => el('tr', {}, [
  td(el('span', { class: 'app-table__rank' }, String(i + 1))), td([el('strong', {}, serviceName(r.service)), el('span', { class: 'app-table__sub' }, r.service), ' ', v02(r)]), td(r.rule), td(serviceInfo[r.service])
]))));

// ---- Startklar ----
put('gates', table('Gründe für «Noch zu klären»', ['Grund in der Liste', 'Bedingung'], gateRules.map(r => el('tr', {}, [td(el('strong', {}, r.gate)), td(r.rule)]))));

// ---- Zuschläge ----
put('bonus-rules', table('Zuschläge innerhalb einer Stufe', ['Zuschlag', 'Punkte'], bonusRules.map(r => el('tr', {}, [
  td([r.rule, el('span', { class: 'app-table__sub' }, 'angezeigt als «' + bonusLabel[r.key] + '»')]), td(el('strong', { class: 'app-table__num' }, '+' + r.points))
])), 'app-table--compact'));
put('bonus-max', document.createTextNode(String(BONUS_MAX)));

// Vergleichswert als Rechnung, z. B. «200 + 16 Frist + 1 Aufwand = 217».
function formula(res) {
  if (res.score === null) return null;
  const level = Priority.indexOf(res.priority);
  const parts = [String(100 * level)];
  for (const [k, n] of Object.entries(res.bonuses)) if (n > 0) parts.push(`${n} ${bonusLabel[k]}`);
  return parts.join(' + ') + ' = ' + res.score;
}

// ---- Reihenfolge an drei Fällen ----
const demo = [
  { name: 'Zertifikat läuft in 5 Tagen ab', ex: examples[2].ex },
  { name: 'Schnittstelle, zwei Teams warten', ex: examples[3].ex },
  { name: 'Nebendienst ausgefallen, Umgehung vorhanden', ex: { production: 'outage', workaround: 'yes', impact: 'limited' } }
].map(c => ({ ...c, result: run(c.ex) }));
const { ordered } = orderCases(demo);
put('ordering-example', el('figure', { class: 'app-order-demo' }, [
  el('figcaption', { class: 'app-order-demo__cap' }, 'Beispiel: drei gespeicherte Fälle, so sortiert die Vergleichsliste'),
  el('ol', { class: 'app-order-demo__list' }, ordered.map((c, i) => el('li', { class: 'app-order-demo__row' }, [
    el('span', { class: 'app-row__pos', 'aria-hidden': 'true' }, String(i + 1)),
    el('span', { class: 'app-order-demo__name' }, c.name),
    chip(c.result.priority),
    el('span', { class: 'app-order-demo__calc' }, formula(c.result))
  ]))),
  el('p', { class: 'sbb-text-xs app-muted app-mb-0' }, 'Der Ausfall steht oben, weil er eine Stufe höher ist (Critical). Unter den beiden Major-Fällen zieht die wirksame Frist (+16) stärker als die Abhängigkeit (+5).')
]));

// ---- Hinweise ----
put('alerts', table('Hinweise', ['Lage', 'Hinweis', 'Erscheint'], alertRules.map(r => {
  const answers = { ...NEUTRAL, ...r.ex };
  const text = evaluate(answers).alerts.find(t => t.startsWith(r.prefix));
  const live = liveAlerts(answers).length > 0;
  return el('tr', {}, [td(el('strong', {}, r.when)), td(text), td(live ? badge('sofort im Fragenpfad', 'app-badge--alert') : badge('in der Auswertung', 'app-badge--muted'))]);
})));

// ---- Beispiele ----
const shortLabel = id => unknownLabels[id] || 'Belastbarkeit';
const answerLabel = (id, v) => (questions.find(q => q.id === id)?.options.find(o => o[0] === v) || [])[1] || v;
put('examples', el('div', { class: 'app-examples' }, examples.map(e => {
  const res = run(e.ex);
  const provisional = res.confidence === 'Niedrig';
  return el('article', { class: 'app-example' }, [
    el('h3', { class: 'app-example__title' }, e.title),
    el('ul', { class: 'app-example__answers' }, Object.entries(e.ex).map(([k, v]) => el('li', {}, [el('span', {}, shortLabel(k) + ': '), answerLabel(k, v)]))),
    el('dl', { class: 'app-example__result' }, [
      el('div', {}, [el('dt', {}, 'Jira-Priorität'), el('dd', {}, [chip(res.priority), provisional ? ' vorläufig' : ''])]),
      el('div', {}, [el('dt', {}, 'Belastbarkeit'), el('dd', {}, res.confidence)]),
      el('div', {}, [el('dt', {}, 'Bearbeitungsart'), el('dd', {}, serviceName(res.service))]),
      el('div', {}, [el('dt', {}, 'Vergleichswert'), el('dd', {}, formula(res) || 'Noch zu klären: ' + res.gates.join(', '))]),
      el('div', {}, [el('dt', {}, 'Massgebend'), el('dd', {}, res.reasons[0] || '–')])
    ]),
    res.alerts.length ? el('p', { class: 'app-example__alert' }, res.alerts[0]) : null,
    el('p', { class: 'app-example__note' }, e.note)
  ]);
})));
