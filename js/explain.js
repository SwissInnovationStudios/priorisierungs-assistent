// Darstellungshilfen für die Begründung. Enthält KEINE Bewertungsregeln.
// Die Engine liefert die Begründungen als Texte (absteigend nach Stufe sortiert) und die Zuschläge als Zahlen.
// Hier wird nur zugeordnet, welche Prioritätsstufe ein Begründungstext auslöst, damit die Oberfläche zeigen kann,
// welches Kriterium die Stufe bestimmt. test/parity.test.mjs prüft, dass jede mögliche Begründung erfasst ist
// und die höchste zugeordnete Stufe immer der Engine-Priorität entspricht.
import { Priority, questions, activeQuestions, evaluate, unknownLabels } from './engine.js';

export const reasonLevel = {
  'Kritischer produktiver Dienst ausgefallen, schwerwiegende Folgen und keine tragfähige Umgehung.': 4,
  'Ein produktiver Dienst ist ausgefallen.': 3,
  'Akuter oder sofort meldepflichtiger Sicherheits-/Compliance-Vorfall.': 3,
  'Bestätigtes schwerwiegendes Risiko mit zeitnahem Handlungsbedarf.': 3,
  'Schwerwiegende Folgen bei einer kurzfristigen, verbindlichen Frist.': 3,
  'Schwerwiegender Schaden droht innerhalb von 24 Stunden, ohne tragfähige Übergangslösung.': 4,
  'Bestätigtes schwerwiegendes Risiko auf einem exponierten System.': 3,
  'Ein kritischer, zeitnaher Arbeitspfad ist blockiert, und die Folgen sind erheblich.': 3,
  'Ein produktiver Dienst ist eingeschränkt, und es gibt keine tragfähige Umgehung.': 2,
  'Sicherheitsthema auf einem exponierten System.': 2,
  'Ein kritischer Arbeitspfad ist blockiert. Das zieht nach vorne, hebt allein aber nicht über Major.': 2,
  'Die Auswirkungen sind wesentlich.': 2,
  'Die Auswirkungen sind schwerwiegend.': 2,
  'Bestätigtes schwerwiegendes Risiko, das nach aktuellen Angaben planbar ist.': 2,
  'Eine verbindliche Frist hat erhebliche oder schwerwiegende Verzögerungsfolgen.': 2,
  'Wichtige oder zeitkritische Arbeiten sind von diesem Vorgang abhängig.': 2,
  'Die Umsetzung bringt wesentlichen Nutzen oder reduziert ein relevantes Risiko.': 2,
  'Die Auswirkungen sind begrenzt.': 1,
  'Die Umsetzung bringt einen begrenzten Nutzen.': 1,
  'Die Auswirkungen sind minimal.': 0
};

export const reasonPriority = text => Priority[reasonLevel[text]] ?? null;

// Zuschläge der Vergleichsreihenfolge (Bezeichnungen wie im Hilfetext der Referenz).
export const bonusLabel = {
  expedite: 'Expedite',
  deadline: 'wirksame Frist',
  dependency: 'Abhängigkeit',
  effort: 'kleiner Aufwand'
};

export const bonusList = bonuses =>
  Object.entries(bonuses || {}).filter(([, n]) => n > 0).map(([key, n]) => ({ key, label: bonusLabel[key] || key, points: n }));

// Kurzbeschreibung der Bearbeitungsart (Class of Service) – reine Erläuterung.
export const serviceInfo = {
  Expedite: 'Sofort über den zuständigen Prozess, nicht über die normale Planung.',
  'Fixed Date': 'Vom verbindlichen Termin her planen.',
  Intangible: 'Kein Zeitdruck, aber bewusst einplanen.',
  Standard: 'Regulär im Vergleich mit anderen Fällen planen.'
};

// «Was müsste anders sein, damit die Stufe steigt?» – reine Was-wäre-wenn-Rechnung mit der Engine, keine eigenen Regeln.
// Probiert jede andere Antwort einer bereits beantworteten Frage aus. Öffnet die Änderung neue Folgefragen
// (z. B. Frist → Fristfolgen), werden auch deren Antworten durchprobiert. Ergebnis: bis zu `max` Varianten,
// die mindestens die nächsthöhere Stufe erreichen – zuerst einzelne Änderungen, dann Kombinationen.
const levelOf = r => r.priority === null ? -1 : Priority.indexOf(r.priority);
const skip = new Set(['effort', 'ready', 'confidence']);          // wirken nie auf die Stufe
// Faktenfragen zuletzt: «Wäre ein Dienst ausgefallen …» ist eine Feststellung, kein Hebel.
const rank = { impact: 0, deadline: 1, deadlineImpact: 1, deadlineWorkaround: 2, dependency: 3, value: 4, workaround: 5, exposure: 6, security: 7, production: 8 };

function completions(a, depth = 0) {
  const next = activeQuestions(a).find(q => !(q.id in a));
  if (!next) return [{ a, added: [] }];
  if (depth > 2) return [];
  const out = [];
  for (const [v] of next.options) {
    if (v === 'unknown') continue;
    for (const c of completions({ ...a, [next.id]: v }, depth + 1)) out.push({ a: c.a, added: [[next.id, v], ...c.added] });
  }
  return out;
}

export function raiseHints(answers, max = 3) {
  const current = levelOf(evaluate(answers));
  const target = current + 1;
  if (target > 4) return { target: null, hints: [] };
  const found = [];
  for (const q of activeQuestions(answers)) {
    if (skip.has(q.id)) continue;
    for (const [v] of q.options) {
      if (v === 'unknown' || v === answers[q.id]) continue;
      // Antwort ändern, nicht mehr gültige Folgefragen verwerfen, neue Folgefragen durchprobieren.
      const base = { ...answers, [q.id]: v };
      const path = activeQuestions(base).map(x => x.id);
      for (const k of Object.keys(base)) if (!path.includes(k)) delete base[k];
      // Folgefragen, die durch die Änderung neu erscheinen, neu beantworten.
      const qi = path.indexOf(q.id);
      for (const k of path.slice(qi + 1)) if (questions.find(x => x.id === k).when && !(k in answers)) delete base[k];
      for (const c of completions(base)) {
        const r = evaluate(c.a);
        if (levelOf(r) >= target) found.push({ changes: [[q.id, v], ...c.added], level: levelOf(r) });
      }
    }
  }
  const fact = h => (['production', 'security'].includes(h.changes[0][0]) ? 1 : 0);
  const label = id => unknownLabels[id] || id;
  const option = (id, v) => (questions.find(q => q.id === id)?.options.find(o => o[0] === v) || [])[1] || v;
  const seen = new Set();
  const hints = found
    .sort((x, y) => fact(x) - fact(y) || x.changes.length - y.changes.length || (x.level - target) - (y.level - target)
      || (rank[x.changes[0][0]] ?? 9) - (rank[y.changes[0][0]] ?? 9))
    .filter(h => { const k = h.changes[0][0]; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, max)
    .map(h => ({ level: Priority[h.level], changes: h.changes.map(([id, v]) => ({ id, label: label(id), value: option(id, v) })) }));
  return { target: Priority[target], hints };
}
