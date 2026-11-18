// Darstellungshilfen für die Begründung. Enthält KEINE Bewertungsregeln.
// Die Engine liefert die Begründungen als Texte (absteigend nach Stufe sortiert) und die Zuschläge als Zahlen.
// Hier wird nur zugeordnet, welche Prioritätsstufe ein Begründungstext auslöst, damit die Oberfläche zeigen kann,
// welches Kriterium die Stufe bestimmt. test/parity.test.mjs prüft, dass jede mögliche Begründung erfasst ist
// und die höchste zugeordnete Stufe immer der Engine-Priorität entspricht.
import { Priority } from './engine.js';

export const reasonLevel = {
  'Kritischer produktiver Dienst ausgefallen, schwerwiegende Folgen und keine tragfähige Umgehung.': 4,
  'Ein produktiver Dienst ist ausgefallen.': 3,
  'Akuter oder sofort meldepflichtiger Sicherheits-/Compliance-Vorfall.': 3,
  'Bestätigtes schwerwiegendes Risiko mit zeitnahem Handlungsbedarf.': 3,
  'Schwerwiegende Folgen bei einer kurzfristigen, verbindlichen Frist.': 3,
  'Ein kritischer, zeitnaher Arbeitspfad hängt von diesem Vorgang ab.': 3,
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
  expedite: 'Behandlungsart Expedite',
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
