// Oberfläche des Priorisierungs-Assistenten. Enthält keine Bewertungsregeln – diese liegen vollständig in engine.js.
// Navigation (begin/back/advance) entspricht dem Inline-Prototyp v0.1; dazu Bearbeiten gespeicherter Fälle und Live-Meter.
import { questions, activeQuestions, evaluate, liveAlerts, orderCases, Priority, RULESET_VERSION } from './engine.js';
import { reasonPriority, bonusList, serviceInfo, raiseHints } from './explain.js';
import { loadCases, saveCases, storageAvailable, newId } from './storage.js';

const PUBLIC_URL = 'https://swissinnovationstudios.github.io/priorisierungs-assistent/';

const wiz = document.getElementById('wizard');
const compare = document.getElementById('comparison');
document.querySelectorAll('[data-ruleset]').forEach(n => { n.textContent = RULESET_VERSION; });

let cases = loadCases();
let a = {}, name = '', view = 'start', current = null, saved = false;
let savedCase = null;        // Referenz auf den zuletzt gespeicherten Fall (Hervorhebung, Position)
let confirmClear = false;
let shownNotes = '';         // für role="alert" nur beim ersten Erscheinen eines Hinweises
let editingId = null;        // Fall, der gerade bearbeitet wird
let positionBefore = null;   // Platz des bearbeiteten Falls vor der Änderung
let meterFrom;               // Stufe vor dem letzten «Weiter» (nur dann animiert der Meter)

// ---------- DOM-Helfer ----------
function el(tag, props = {}, content = '') {
  const out = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') out.className = value;
    else if (key === 'click') out.addEventListener('click', value);
    else out.setAttribute(key, value === true ? '' : value);
  }
  if (typeof content === 'string') { if (content) out.textContent = content; }
  else out.append(...content.filter(Boolean));
  return out;
}
const txt = (s, cls = '', extra = {}) => el('p', { class: cls || undefined, ...extra }, s);
const button = (label, onClick, variant = 'sbb-button', extra = {}) => el('button', { type: 'button', class: variant, click: onClick, ...extra }, label);
const heading = (s, level = 1, extra = {}) => el(level === 1 ? 'h1' : 'h2', { class: `sbb-title sbb-title--${level}`, tabindex: '-1', 'data-focus': '', ...extra }, s);

const ICONS = {
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  warn: '<path d="M12 3.5 2.8 19.5h18.4L12 3.5z"/><path d="M12 9.5v4.5M12 16.8v.3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
  success: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7L16.2 9.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 19h1.5M19.5 14v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
function icon(name, cls = 'app-icon') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.6');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', cls);
  s.innerHTML = ICONS[name];
  return s;
}

// Lyne: <sbb-notification type="error|warn|info|success">
function notification(type, items, title, extra = {}) {
  return el('div', { class: `sbb-notification sbb-notification--${type}`, ...extra }, [
    icon(type === 'success' ? 'success' : type === 'warn' ? 'warn' : type === 'info' ? 'info' : 'error', 'sbb-notification__icon'),
    el('div', { class: 'sbb-notification__content' }, [title ? el('strong', { class: 'sbb-notification__title' }, title) : null, ...items.map(s => txt(s))])
  ]);
}
// Prioritäts-Icons: eigene Zeichnung in der Bildsprache von Jira (Sperre, Pfeile hoch/runter), keine Atlassian-Assets.
// Farbe über currentColor, damit sie auf jedem Chip-Hintergrund lesbar bleibt. Ohne Text → ändert textContent nicht.
const PRIO_ICONS = {
  Blocker: '<circle cx="8" cy="8" r="6.25"/><path d="M4.75 8h6.5"/>',
  Critical: '<path d="M4 8.25 8 4.5l4 3.75M4 12 8 8.25 12 12"/>',
  Major: '<path d="M4 10.25 8 6.25l4 4"/>',
  Minor: '<path d="M4 5.75 8 9.75l4-4"/>',
  Trivial: '<path d="M4 4 8 7.75 12 4M4 7.75 8 11.5l4-3.75"/>'
};
function prioIcon(priority) {
  if (!PRIO_ICONS[priority]) return null;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'app-prio-icon' })) s.setAttribute(k, v);
  s.innerHTML = PRIO_ICONS[priority];
  return s;
}

// Lyne: <sbb-chip-label> – Prioritätsfarben sind app-spezifisch
const chip = (priority, extra = {}) => el('span', { class: 'sbb-chip-label app-prio app-prio--' + (priority ? priority.toLowerCase() : 'none'), ...extra }, [prioIcon(priority), priority || 'Ohne Einstufung']);
const optionLabel = (qid, value) => (questions.find(q => q.id === qid)?.options.find(o => o[0] === value) || [])[1] || value;

// ---------- Navigation (wie Referenz) ----------
function newCase() { a = {}; name = ''; view = 'start'; current = null; saved = false; savedCase = null; shownNotes = ''; editingId = null; positionBefore = null; meterFrom = undefined; render(true); window.scrollTo({ top: 0 }); }

// Gespeicherten Fall wieder öffnen: Auswertung mit allen Antworten, «Ändern» springt zur Frage, «Speichern» aktualisiert den Fall.
function startEdit(id) {
  const c = cases.find(x => x.id === id);
  if (!c || !c.answers) return;
  const { ordered } = orderCases(cases);
  const pos = ordered.findIndex(x => x.id === id);
  positionBefore = pos < 0 ? null : pos + 1;
  a = { ...c.answers }; name = c.name; editingId = id; saved = false; savedCase = null; shownNotes = ''; meterFrom = undefined;
  view = 'result'; render(true);
  wiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.getElementById('new-case').addEventListener('click', newCase);

function begin() { view = 'question'; current = activeQuestions(a)[0].id; render(true); }

function back() {
  const path = activeQuestions(a);
  if (view === 'result') { view = 'question'; current = path.at(-1).id; }
  else {
    const i = path.findIndex(q => q.id === current);
    if (i > 0) current = path[i - 1].id; else view = 'start';
  }
  render(true);
}

function jumpTo(qid) {
  if (!activeQuestions(a).some(q => q.id === qid)) return;
  view = 'question'; current = qid; meterFrom = undefined; render(true);
}

function advance(value) {
  const before = activeQuestions(a);
  meterFrom = levelIndex(prefixResult(before, before.findIndex(q => q.id === current)).priority);
  a[current] = value;
  // Antworten aus Zweigen vergessen, die nach dem Zurückgehen nicht mehr gelten.
  const path = activeQuestions(a);
  for (const key of Object.keys(a)) if (!path.some(q => q.id === key)) delete a[key];
  const next = path[path.findIndex(q => q.id === current) + 1];
  if (next) current = next.id; else view = 'result';
  render(true);
}

// Position im Vergleich: dieselbe Sortierung wie die Vergleichsliste (orderCases aus der Engine).
function comparisonPosition(result) {
  if (result.score === null) return null;
  if (savedCase) {
    const { ordered } = orderCases(cases);
    const pos = ordered.findIndex(c => cases[c.i] === savedCase);
    return pos < 0 ? null : { pos: pos + 1, of: ordered.length, projected: false };
  }
  if (editingId) {
    const list = cases.map(c => (c.id === editingId ? { ...c, result } : c));
    const idx = list.findIndex(c => c.id === editingId);
    const { ordered } = orderCases(list);
    return { pos: ordered.findIndex(c => c.i === idx) + 1, of: ordered.length, projected: true };
  }
  const { ordered } = orderCases([...cases, { name: '·', result }]);
  return { pos: ordered.findIndex(c => c.i === cases.length) + 1, of: ordered.length, projected: true };
}

// ---------- Live-Meter ----------
// Zeigt die Mindeststufe aus den Antworten VOR der aktuellen Frage. Er reagiert also erst nach «Weiter»,
// nicht beim Antippen einer Option. Die Stufe kann beim Vorwärtsbeantworten nur steigen (höchste Regel gewinnt).
const levelIndex = p => (p ? Priority.indexOf(p) : -1);
function prefixResult(path, i) {
  const pa = {};
  for (const q of path.slice(0, Math.max(i, 0))) if (q.id in a) pa[q.id] = a[q.id];
  return evaluate(pa);
}
function setGlow(level) {
  wiz.classList.remove('app-glow', ...Priority.map(p => 'app-prio--' + p.toLowerCase()));
  if (level >= 0) wiz.classList.add('app-glow', 'app-prio--' + Priority[level].toLowerCase());
}
function meter(level, from) {
  const start = from === undefined ? level : from;
  const fill = el('div', { class: 'app-meter__fill' });
  const apply = (lv, node) => {
    node.style.setProperty('--p', String((lv + 1) / 5));
    node.dataset.level = lv >= 0 ? Priority[lv].toLowerCase() : 'none';
    node.querySelectorAll('.app-meter__stop').forEach((s, idx) => s.classList.toggle('is-on', 4 - idx <= lv));
  };
  const stops = [...Priority].reverse().map(p => el('li', { class: 'app-meter__stop app-prio--' + p.toLowerCase() }, [prioIcon(p), el('span', {}, p)]));
  const box = el('div', { class: 'app-meter', 'aria-hidden': 'true' }, [
    el('span', { class: 'app-meter__label' }, 'Mindeststufe'),
    el('div', { class: 'app-meter__body' }, [el('div', { class: 'app-meter__track' }, [fill]), el('ol', { class: 'app-meter__stops' }, stops)]),
    el('span', { class: 'app-meter__now' }, level >= 0 ? Priority[level] : 'offen')
  ]);
  apply(start, box);
  if (start !== level) requestAnimationFrame(() => requestAnimationFrame(() => apply(level, box)));
  return box;
}

// ---------- Ansichten ----------
function startView() {
  const input = el('input', { id: 'case-title', class: 'sbb-input', type: 'text', maxlength: '120', autocomplete: 'off', placeholder: 'z. B. Zertifikat erneuern oder Backup prüfen' });
  input.value = name;
  input.addEventListener('input', () => { name = input.value; });
  const field = el('div', { class: 'sbb-form-field' }, [el('label', { for: 'case-title', class: 'sbb-form-field__label' }, 'Ticket oder Aufgabenbezeichnung (optional)'), input]);
  const form = el('form', { novalidate: true }, [field, el('button', { type: 'submit', class: 'sbb-button app-block' }, 'Bewertung starten')]);
  form.addEventListener('submit', e => { e.preventDefault(); begin(); });

  const step = (n, title, text) => el('li', { class: 'app-steps__item' }, [el('span', { class: 'app-steps__num', 'aria-hidden': 'true' }, String(n)), el('div', {}, [el('strong', {}, title), txt(text, 'sbb-text-xs app-muted')])]);
  wiz.append(
    txt('Vorgang bewerten', 'app-overline'),
    heading('Welche Priorität hat dieser Vorgang – und warum?'),
    txt('Beantworte rund zehn Fragen. Der Fragenpfad passt sich deinen Antworten an. Am Ende erhältst du eine begründete Jira-Priorität und eine Empfehlung, wie und in welcher Reihenfolge der Vorgang bearbeitet werden sollte.', 'app-lead'),
    form,
    el('ol', { class: 'app-steps', 'aria-label': 'Ablauf' }, [
      step(1, 'Fragen beantworten', 'Betrieb, Sicherheit, Frist, Abhängigkeiten, Nutzen, Aufwand.'),
      step(2, 'Jira-Priorität', 'Blocker bis Trivial – mit dem Kriterium, das die Stufe bestimmt.'),
      step(3, 'Bearbeitung', 'Behandlungsart und Position im Vergleich mit anderen Fällen.')
    ]),
    txt('Bei einem akuten Betriebs- oder Sicherheitsfall gilt der zuständige Prozess. Der Assistent ersetzt ihn nicht.', 'sbb-text-xs app-muted app-mt-4 app-mb-0')
  );
}

function questionView() {
  const path = activeQuestions(a);
  const i = path.findIndex(q => q.id === current);
  const q = path[i];
  const total = path.length;

  const pre = prefixResult(path, i);
  const level = levelIndex(pre.priority);
  const rose = meterFrom !== undefined && level > meterFrom;
  const cause = rose ? pre.reasons.find(r => reasonPriority(r) === Priority[level]) : null;
  setGlow(level);

  wiz.append(el('h1', { class: 'sbb-screen-reader-only' }, 'Vorgang bewerten: ' + (name.trim() || 'ohne Bezeichnung')));
  wiz.append(el('div', { class: 'app-progress' }, [
    el('div', { class: 'app-progress__meta' }, [
      txt(`Frage ${i + 1} von ${total}`, 'app-overline app-mb-0'),
      txt((editingId ? 'Bearbeiten · ' : '') + (name.trim() || 'Ohne Bezeichnung'), 'sbb-text-xs app-muted app-mb-0 app-truncate')
    ]),
    el('div', { class: 'app-progress__bar', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(total), 'aria-valuenow': String(i + 1), 'aria-label': `Frage ${i + 1} von ${total}` },
      [el('div', { class: 'app-progress__fill', style: `width:${((i + 1) / total) * 100}%` })])
  ]));

  // Eskalationshinweis bereits im Fragenpfad (wie Referenz: sobald die Antwort gegeben ist).
  const notes = liveAlerts(a);
  if (notes.length) {
    const key = notes.join('|');
    wiz.append(notification('error', notes, 'Eskalation prüfen', { 'data-test': 'live-alerts', role: key !== shownNotes ? 'alert' : undefined }));
    shownNotes = key;
  } else shownNotes = '';

  const legend = el('legend', { class: 'sbb-title sbb-title--2', tabindex: '-1', 'data-focus': '', 'data-test': 'question-title' }, q.title);
  const group = el('div', { class: 'sbb-radio-button-group' });
  let selected = a[q.id] || '';
  const next = el('button', { type: 'submit', class: 'sbb-button' }, i === total - 1 ? 'Empfehlung anzeigen' : 'Weiter');
  next.disabled = !selected;

  q.options.forEach(([id, label]) => {
    const radio = el('input', { type: 'radio', name: q.id, value: id });
    radio.checked = selected === id;
    radio.addEventListener('change', () => { selected = id; next.disabled = false; });
    group.append(el('label', { class: 'sbb-radio-button-panel' + (id === 'unknown' ? ' app-unknown' : '') }, [
      radio, el('span', { class: 'sbb-radio-button-panel__indicator', 'aria-hidden': 'true' }), el('span', { class: 'sbb-radio-button-panel__label' }, label)
    ]));
  });

  const form = el('form', { novalidate: true }, [
    el('fieldset', { class: 'app-fieldset' }, [legend, q.hint ? txt(q.hint, 'sbb-text-s app-muted app-mt-1') : null, group]),
    el('div', { class: 'sbb-action-group sbb-action-group--split' }, [button('Zurück', back, 'sbb-secondary-button'), next])
  ]);
  form.addEventListener('submit', e => { e.preventDefault(); if (selected) advance(selected); });

  // Ursache des Anstiegs (sichtbar und für Screenreader), danach Meter neben der Frage.
  wiz.append(el('p', { class: 'app-cause' + (cause ? ' is-new' : ''), role: 'status', 'data-test': 'meter' },
    cause ? [prioIcon(Priority[level]), el('strong', {}, `Neu ${Priority[level]}: `), cause]
      : level >= 0 ? [el('span', { class: 'app-muted' }, `Mindeststufe bis jetzt: ${Priority[level]}. Weitere Antworten können sie noch anheben.`)]
      : [el('span', { class: 'app-muted' }, 'Noch keine Einstufung – die Mindeststufe erscheint nach den ersten Antworten.')]));
  wiz.append(el('div', { class: 'app-qlayout' }, [form, meter(level, meterFrom)]));
  meterFrom = undefined;
}

function priorityScale(result) {
  const provisional = result.confidence === 'Niedrig';
  const items = [...Priority].reverse().map(p => {
    const active = p === result.priority;
    return el('li', { class: 'app-scale__step app-prio--' + p.toLowerCase() + (active ? ' is-active' : '') + (active && provisional ? ' is-provisional' : ''), 'aria-current': active ? 'true' : undefined }, [prioIcon(p), el('span', { class: 'app-scale__label' }, p)]);
  });
  return el('ol', { class: 'app-scale', 'aria-label': 'Prioritätsstufen von Blocker bis Trivial' }, items);
}

function resultView() {
  const result = evaluate(a);
  const provisional = result.confidence === 'Niedrig';
  const position = comparisonPosition(result);

  setGlow(levelIndex(result.priority));
  wiz.append(txt(editingId ? 'Bearbeiten' : 'Auswertung', 'app-overline'), heading(name.trim() || 'Deine Empfehlung'));
  if (editingId) {
    const input = el('input', { id: 'edit-title', class: 'sbb-input', type: 'text', maxlength: '120', autocomplete: 'off' });
    input.value = name;
    input.addEventListener('input', () => { name = input.value; });
    wiz.append(el('div', { class: 'sbb-form-field app-mt-4' }, [el('label', { for: 'edit-title', class: 'sbb-form-field__label' }, 'Bezeichnung'), input]),
      txt('Antworten unter «Deine Antworten» ändern, dann «Änderungen speichern». Der Fall behält seinen Platz in der Liste und wird neu eingeordnet.', 'sbb-text-xs app-muted'));
  }

  if (result.alerts.length) wiz.append(notification('error', result.alerts, 'Eskalationshinweise', { role: 'alert', 'data-test': 'alerts' }));

  // ---- Ergebnis 1: Jira-Priorität ----
  const reasons = result.reasons.map(r => {
    const p = reasonPriority(r);
    const decisive = p === result.priority;
    return el('li', { class: 'app-reason' + (decisive ? ' is-decisive' : '') }, [
      chip(p, { class: 'sbb-chip-label app-prio app-prio--' + (p ? p.toLowerCase() : 'none') + ' app-reason__chip' }),
      el('span', { class: 'app-reason__text', 'data-test': 'reason' }, r),
      decisive ? el('span', { class: 'app-reason__tag' }, 'massgebend') : null
    ]);
  });

  wiz.append(el('section', { class: 'app-result', 'aria-labelledby': 'r1' }, [
    el('div', { class: 'app-result__head' }, [el('span', { class: 'app-result__num', 'aria-hidden': 'true' }, '1'), el('h2', { id: 'r1', class: 'sbb-title sbb-title--3' }, 'Jira-Priorität')]),
    el('div', { class: 'app-priority' }, [
      el('div', {}, [
        el('span', { class: 'app-label', 'data-test': 'priority-label' }, provisional ? 'Jira-Priorität · vorläufig' : 'Empfohlene Jira-Priorität'),
        el('div', { class: 'app-priority__value' + (result.priority ? ' app-prio--' + result.priority.toLowerCase() : ''), 'data-test': 'priority' }, [prioIcon(result.priority), result.priority || 'Nicht belastbar einstufbar'])
      ]),
      el('div', { class: 'app-priority__conf' }, [
        el('span', { class: 'app-label' }, 'Belastbarkeit'),
        el('span', { class: 'sbb-status sbb-status--' + ({ Hoch: 'success', Mittel: 'warning', Niedrig: 'error' }[result.confidence]), 'data-test': 'confidence' }, result.confidence)
      ])
    ]),
    priorityScale(result),
    provisional ? txt('Vorläufig: Es fehlen entscheidende Angaben. Klären und bei erheblichen möglichen Folgen nicht auf die Klärung warten.', 'sbb-text-s app-muted') : null,
    el('h3', { class: 'sbb-title sbb-title--4 app-mt-4' }, 'Warum diese Stufe?'),
    reasons.length
      ? el('ul', { class: 'app-reasons' }, reasons)
      : txt('Es liegen noch nicht genug Angaben für eine fachliche Einstufung vor.', 'app-muted'),
    reasons.length ? txt('Die höchste zutreffende Regel bestimmt die Stufe. Weitere Kriterien heben sie nicht zusätzlich an. Der Aufwand zählt hier nicht.', 'sbb-text-xs app-muted') : null,
    result.open.length ? notification('warn', ['Offene Angaben: ' + result.open.join(', ') + '.'], 'Noch zu klären', { 'data-test': 'open' }) : null,
    raiseBlock(a)
  ]));

  // ---- Ergebnis 2: Bearbeitungsempfehlung ----
  const bonuses = bonusList(result.bonuses);
  const compareValue = position ? `Platz ${position.pos} von ${position.of}` : 'Klärung / nicht eingeordnet';
  const compareHint = position
    ? (position.projected
        ? (position.of === 1 ? 'noch keine anderen startklaren Fälle gespeichert' : 'voraussichtlich, unter den gespeicherten startklaren Fällen')
        : 'unter den gespeicherten startklaren Fällen')
    : (result.gates.join(' · '));

  wiz.append(el('section', { class: 'app-result', 'aria-labelledby': 'r2' }, [
    el('div', { class: 'app-result__head' }, [el('span', { class: 'app-result__num', 'aria-hidden': 'true' }, '2'), el('h2', { id: 'r2', class: 'sbb-title sbb-title--3' }, 'Bearbeitungsempfehlung')]),
    txt(result.treatment, 'app-treatment', { 'data-test': 'treatment' }),
    el('div', { class: 'app-tiles' }, [
      el('div', { class: 'app-tile' }, [el('span', { class: 'app-label' }, 'Bearbeitungsart'), el('strong', { class: 'app-tile__value', 'data-test': 'service' }, result.service), txt(serviceInfo[result.service] || '', 'sbb-text-xs app-muted app-mb-0')]),
      el('div', { class: 'app-tile' + (position ? '' : ' app-tile--pending') }, [el('span', { class: 'app-label' }, 'Vergleichsreihenfolge'), el('strong', { class: 'app-tile__value', 'data-test': 'position' }, compareValue), txt(compareHint, 'sbb-text-xs app-muted app-mb-0', { 'data-test': position ? undefined : 'gates' })])
    ]),
    position
      ? el('div', { class: 'app-bonuses' }, [
          el('span', { class: 'app-label' }, 'Vorziehen innerhalb der Stufe'),
          bonuses.length
            ? el('ul', { class: 'app-bonus-list' }, bonuses.map(b => el('li', { class: 'app-bonus' }, [el('strong', {}, '+' + b.points), ' ' + b.label])))
            : txt('Keine Zuschläge – Reihenfolge nach Stufe, bei Gleichstand nach Speicherzeitpunkt.', 'sbb-text-xs app-muted app-mb-0'),
          bonuses.length ? txt('Zuschläge ordnen nur innerhalb derselben Stufe – sie heben nie über die nächste Stufe.', 'sbb-text-xs app-muted app-mb-0 app-mt-1') : null
        ])
      : null
  ]));

  // Nachvollziehbarkeit: alle Antworten (reine Anzeige).
  const answers = activeQuestions(a).map(q => el('li', {}, [
    el('div', { class: 'app-answers__body' }, [el('span', { class: 'app-answers__q' }, q.title), el('span', { class: 'app-answers__a' }, optionLabel(q.id, a[q.id]))]),
    saved ? null : el('button', { type: 'button', class: 'sbb-transparent-button app-answers__edit', click: () => jumpTo(q.id), 'aria-label': `Antwort ändern: ${q.title}` }, 'Ändern')
  ]));
  wiz.append(el('details', { class: 'sbb-expansion-panel app-mt-4', open: editingId ? true : undefined }, [
    el('summary', { class: 'sbb-expansion-panel__header' }, 'Deine Antworten'),
    el('div', { class: 'sbb-expansion-panel__content' }, [
      saved ? null : txt('Eine Antwort ändern und mit «Weiter» zur neuen Auswertung – praktisch, um Was-wäre-wenn-Fragen zu zeigen.', 'sbb-text-xs app-muted'),
      el('ul', { class: 'app-answers' }, answers)
    ])
  ]));

  if (saved) {
    const where = position ? `Platz ${position.pos} von ${position.of} unter den startklaren Fällen` : 'Unter «Noch zu klären» eingetragen';
    const moved = positionBefore && position && positionBefore !== position.pos ? ` (vorher Platz ${positionBefore})` : '';
    wiz.append(notification('success', [where + moved + '.'], savedCase && savedCase.updatedAt ? 'Änderungen gespeichert' : 'In der Vergleichsliste gespeichert', { role: 'status' }));
  }
  const save = button(saved ? 'Gespeichert' : editingId ? 'Änderungen speichern' : 'Zur Vergleichsliste hinzufügen', () => {
    if (saved) return;
    if (editingId) {
      const idx = cases.findIndex(c => c.id === editingId);
      savedCase = { ...cases[idx], name: name.trim() || cases[idx].name, result, answers: { ...a }, updatedAt: new Date().toISOString() };
      cases[idx] = savedCase;
      editingId = null;
    } else {
      savedCase = { id: newId(), name: name.trim() || 'Fall ' + (cases.length + 1), result, answers: { ...a }, savedAt: new Date().toISOString() };
      cases.push(savedCase);
      positionBefore = null;
    }
    saveCases(cases);
    saved = true;
    render(true);
  }, 'sbb-button');
  save.disabled = saved;
  wiz.append(el('div', { class: 'sbb-action-group sbb-action-group--split' }, saved
    ? [button('Neuer Fall', newCase, 'sbb-secondary-button'), button('Zur Vergleichsliste', () => compare.scrollIntoView({ behavior: 'smooth', block: 'start' }), 'sbb-transparent-button app-only-stacked')]
    : [button(editingId ? 'Abbrechen' : 'Zurück', editingId ? newCase : back, 'sbb-secondary-button'), save]));
}

// «Was würde die Stufe heben?» – rechnerische Varianten aus der Engine, keine Aufforderung, Antworten anzupassen.
function raiseBlock(answers) {
  const { target, hints } = raiseHints(answers);
  if (!target || !hints.length) return null;
  return el('div', { class: 'app-raise', 'data-test': 'raise' }, [
    el('h3', { class: 'sbb-title sbb-title--4' }, ['Was würde die Stufe auf ', chip(target), ' heben?']),
    el('ul', { class: 'app-raise__list' }, hints.map(h => el('li', {}, h.changes.flatMap((c, k) => [k ? ' und ' : null, el('strong', {}, c.label + ': '), c.value]).filter(Boolean)))),
    txt('Rechnerische Was-wäre-wenn-Varianten: Sie zeigen, wo die Grenze liegt. Antworten bitte nur ändern, wenn sie tatsächlich anders sind.', 'sbb-text-xs app-muted app-mb-0')
  ]);
}

function comparisonView() {
  // Kopf und Fuss bleiben stehen, nur die Liste scrollt (Desktop; siehe .app-compare in app.css).
  const head = el('div', { class: 'app-compare__head' });
  const body = el('div', { class: 'app-compare__body', tabindex: '0', role: 'region', 'aria-label': 'Gespeicherte Fälle' });
  const foot = el('div', { class: 'app-compare__foot' });
  const keepScroll = compare.querySelector('.app-compare__body')?.scrollTop || 0;
  compare.replaceChildren(el('div', { class: 'app-compare' }, [head, body, foot]));
  head.append(
    txt('Vergleichsliste', 'app-overline'),
    el('h2', { class: 'sbb-title sbb-title--2', id: 'compare-title' }, cases.length + ' ' + (cases.length === 1 ? 'Fall' : 'Fälle')),
    txt('Reihenfolge nur unter den hier gespeicherten, startklaren Fällen. Kein Jira-Rank.', 'sbb-text-xs app-muted app-mb-0')
  );
  if (!cases.length) body.append(el('div', { class: 'app-empty' }, 'Bewerte einen Fall und füge ihn der Liste hinzu. Ab zwei Fällen siehst du, welcher zuerst bearbeitet werden sollte.'));

  const { ordered, pending } = orderCases(cases);
  const remove = index => () => {
    const [gone] = cases.splice(index, 1);
    if (gone === savedCase) { savedCase = null; saved = false; }
    if (gone.id === editingId) { editingId = null; positionBefore = null; }
    saveCases(cases); render(false);
  };
  const row = (c, n, meta, isPending = false) => {
    const bonuses = isPending ? [] : bonusList(c.result.bonuses);
    const isEditing = c.id && c.id === editingId;
    return el('li', { class: 'app-row' + (cases[c.i] === savedCase ? ' is-new' : '') + (isEditing ? ' is-editing' : '') }, [
      el('span', { class: 'app-row__pos' + (isPending ? ' app-row__pos--pending' : ''), 'aria-hidden': 'true' }, n),
      el('div', { class: 'app-row__body' }, [
        el('div', { class: 'app-row__name', 'data-test': isPending ? 'pending' : 'ordered' }, c.name),
        el('div', { class: 'app-row__meta' }, [chip(c.result.priority), el('span', {}, meta)]),
        bonuses.length ? el('div', { class: 'app-row__bonus' }, bonuses.map(b => `+${b.points} ${b.label}`).join(' · ')) : null
      ]),
      el('div', { class: 'app-row__actions' }, [
        c.answers ? el('button', { type: 'button', class: 'sbb-mini-button', 'aria-label': `Fall «${c.name}» bearbeiten`, title: 'Bearbeiten', 'data-test': 'edit', click: () => startEdit(c.id) }, [icon('edit', 'app-icon app-icon--s')]) : null,
        el('button', { type: 'button', class: 'sbb-mini-button', 'aria-label': `Fall «${c.name}» entfernen`, title: 'Entfernen', click: remove(c.i) }, [icon('close', 'app-icon app-icon--s')])
      ])
    ]);
  };

  if (ordered.length) body.append(el('h3', { class: 'sbb-title sbb-title--4 app-mt-4' }, 'Startklar · empfohlene Reihenfolge'),
    el('ol', { class: 'app-rows' }, ordered.map((c, n) => row(c, String(n + 1), c.result.service))));
  if (pending.length) body.append(el('h3', { class: 'sbb-title sbb-title--4 app-mt-4' }, 'Noch zu klären'),
    el('ul', { class: 'app-rows' }, pending.map(c => row(c, '?', c.result.gates.join(' · '), true))));

  if (cases.length) {
    foot.append(el('div', { class: 'sbb-action-group sbb-action-group--end' }, confirmClear
      ? [txt('Alle Fälle löschen?', 'sbb-text-s app-mb-0'), button('Abbrechen', () => { confirmClear = false; render(false); }, 'sbb-transparent-button'), button('Ja, löschen', () => { cases = []; savedCase = null; saved = false; confirmClear = false; saveCases(cases); render(false); }, 'sbb-secondary-button')]
      : [button('Liste leeren', () => { confirmClear = true; render(false); }, 'sbb-transparent-button')]));
  }
  if (!storageAvailable()) foot.append(txt('Lokales Speichern ist nicht verfügbar. Die Liste gilt nur bis zum Schliessen oder Neuladen der Seite.', 'sbb-text-xs app-muted app-mt-4'));
  // Scrollposition der Liste über Neuzeichnen hinweg halten; neuen bzw. bearbeiteten Fall sichtbar machen.
  body.scrollTop = keepScroll;
  const mark = body.querySelector('.is-new, .is-editing');
  if (mark && body.scrollHeight > body.clientHeight) {
    const top = mark.offsetTop, bottom = top + mark.offsetHeight;
    if (top < body.scrollTop || bottom > body.scrollTop + body.clientHeight) body.scrollTop = Math.max(0, top - 8);
  }
}

function render(focus = false) {
  wiz.replaceChildren();
  if (view === 'start') setGlow(-1);
  ({ start: startView, question: questionView, result: resultView })[view]();
  comparisonView();
  if (focus) wiz.querySelector('[data-focus]')?.focus({ preventScroll: true });
  if (focus && wiz.getBoundingClientRect().top < 0) wiz.scrollIntoView({ block: 'start' });
}

// ---------- QR-Dialog (Workshop: Handy-Zugang) ----------
const qrDialog = document.getElementById('qr-dialog');
document.getElementById('qr-open')?.addEventListener('click', () => qrDialog.showModal());
document.getElementById('qr-close')?.addEventListener('click', () => qrDialog.close());
qrDialog?.addEventListener('click', e => { if (e.target === qrDialog) qrDialog.close(); });
qrDialog?.addEventListener('close', () => { if (location.hash === '#handy') history.replaceState(null, '', location.pathname + location.search); });

// Footer-Sprungziele (auch von den rechtlichen Seiten aus): #logik klappt die Erklärung auf, #handy öffnet den QR-Dialog.
function followHash() {
  if (location.hash === '#handy' && qrDialog && !qrDialog.open) qrDialog.showModal();
  if (location.hash === '#logik') { const d = document.getElementById('logik'); d.open = true; d.scrollIntoView({ block: 'start' }); }
}
window.addEventListener('hashchange', followHash);
document.querySelectorAll('[data-public-url]').forEach(n => { n.textContent = PUBLIC_URL.replace('https://', '').replace('.io/', '.io/\u200B'); n.setAttribute('href', PUBLIC_URL); });

// Offline-Fähigkeit nur auf der veröffentlichten Seite (network-first, siehe sw.js).
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

render();
followHash();
