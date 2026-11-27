// Dokumentation der Bewertungslogik für bewertungslogik.html – enthält KEINE Regeln.
// Jede Zeile hat ein Beispiel (Antworten). test/docs.test.mjs rechnet jedes Beispiel mit der Engine nach:
// Stufe, Begründungstext, Bearbeitungsart, Zuschlag, Hinweis und Belastbarkeit müssen exakt stimmen.
// So kann die Erklärung nicht still von der Engine abweichen.

// Ausgangslage, die selbst keine Regel ausser «Auswirkungen minimal» (Trivial) auslöst.
export const NEUTRAL = { production: 'none', impact: 'minimal', security: 'none', deadline: 'none', dependency: 'none', value: 'low', effort: 'medium', ready: 'yes', confidence: 'high' };

// Fragen: wann sie erscheinen und worauf sie wirken.
export const questionMeta = {
  production: { when: 'immer', affects: ['Stufe', 'Bearbeitungsart', 'Hinweise'] },
  impact: { when: 'immer', affects: ['Stufe'] },
  security: { when: 'immer', affects: ['Stufe', 'Bearbeitungsart', 'Hinweise'] },
  exposure: { when: 'Sicherheit = «relevant» oder «bestätigt, planbar»', affects: ['Stufe', 'Hinweise'], v02: true },
  workaround: { when: 'ein Dienst ist eingeschränkt oder ausgefallen', affects: ['Stufe'] },
  deadline: { when: 'immer', affects: ['Stufe', 'Bearbeitungsart', 'Reihenfolge'] },
  deadlineImpact: { when: 'es gibt eine Frist', affects: ['Stufe', 'Bearbeitungsart', 'Reihenfolge'] },
  deadlineWorkaround: { when: 'Frist ≤ 24 h und schwerwiegende Folgen', affects: ['Stufe', 'Hinweise'], v02: true },
  dependency: { when: 'immer', affects: ['Stufe', 'Reihenfolge'] },
  value: { when: 'immer', affects: ['Stufe', 'Bearbeitungsart'] },
  effort: { when: 'immer', affects: ['Reihenfolge'] },
  ready: { when: 'immer', affects: ['Startklar'] },
  confidence: { when: 'immer', affects: ['Belastbarkeit'] }
};

// Stufenregeln. reason = Begründungstext, den die Auswertung zeigt (wörtlich aus der Engine).
export const levelRules = [
  { level: 4, rule: 'Kritischer produktiver Dienst ausgefallen, Auswirkungen schwerwiegend und keine tragfähige Umgehungslösung', reason: 'Kritischer produktiver Dienst ausgefallen, schwerwiegende Folgen und keine tragfähige Umgehung.', ex: { production: 'criticalOutage', impact: 'severe', workaround: 'no' } },
  { level: 4, rule: 'Schwerwiegender Schaden droht innerhalb von 24 Stunden, und es gibt keine Übergangslösung', reason: 'Schwerwiegender Schaden droht innerhalb von 24 Stunden, ohne tragfähige Übergangslösung.', ex: { deadline: 'day', deadlineImpact: 'severe', deadlineWorkaround: 'no' }, v02: true },
  { level: 3, rule: 'Ein produktiver Dienst ist ausgefallen (ohne alle Blocker-Bedingungen)', reason: 'Ein produktiver Dienst ist ausgefallen.', ex: { production: 'outage', workaround: 'yes' } },
  { level: 3, rule: 'Akuter oder meldepflichtiger Sicherheits- oder Compliance-Vorfall', reason: 'Akuter oder sofort meldepflichtiger Sicherheits-/Compliance-Vorfall.', ex: { security: 'incident' } },
  { level: 3, rule: 'Bestätigtes schwerwiegendes Risiko mit zeitnahem Handlungsbedarf', reason: 'Bestätigtes schwerwiegendes Risiko mit zeitnahem Handlungsbedarf.', ex: { security: 'urgent' } },
  { level: 3, rule: 'Bestätigtes schwerwiegendes Risiko auf einem exponierten System', reason: 'Bestätigtes schwerwiegendes Risiko auf einem exponierten System.', ex: { security: 'confirmed', exposure: 'external' }, v02: true },
  { level: 3, rule: 'Verbindliche Frist innerhalb von 7 Tagen mit schwerwiegenden Folgen', reason: 'Schwerwiegende Folgen bei einer kurzfristigen, verbindlichen Frist.', ex: { deadline: 'week', deadlineImpact: 'severe' } },
  { level: 3, rule: 'Kritischer Arbeitspfad blockiert, und die Folgen sind erheblich (Auswirkungen wesentlich oder schwerwiegend, oder Frist ≤ 7 Tage mit erheblichen Folgen)', reason: 'Ein kritischer, zeitnaher Arbeitspfad ist blockiert, und die Folgen sind erheblich.', ex: { dependency: 'critical', impact: 'material' }, v02: true },
  { level: 2, rule: 'Auswirkungen wesentlich', reason: 'Die Auswirkungen sind wesentlich.', ex: { impact: 'material' } },
  { level: 2, rule: 'Auswirkungen schwerwiegend', reason: 'Die Auswirkungen sind schwerwiegend.', ex: { impact: 'severe' } },
  { level: 2, rule: 'Dienst eingeschränkt, und es gibt keine tragfähige Umgehungslösung', reason: 'Ein produktiver Dienst ist eingeschränkt, und es gibt keine tragfähige Umgehung.', ex: { production: 'degraded', workaround: 'no' }, v02: true },
  { level: 2, rule: 'Bestätigtes schwerwiegendes Risiko, planbar und nicht exponiert', reason: 'Bestätigtes schwerwiegendes Risiko, das nach aktuellen Angaben planbar ist.', ex: { security: 'confirmed', exposure: 'internal' } },
  { level: 2, rule: 'Sicherheitsthema (nicht bestätigt) auf einem exponierten System', reason: 'Sicherheitsthema auf einem exponierten System.', ex: { security: 'relevant', exposure: 'external' }, v02: true },
  { level: 2, rule: 'Verbindliche Frist mit erheblichen Folgen – oder mit schwerwiegenden Folgen ab dem 8. Tag', reason: 'Eine verbindliche Frist hat erhebliche oder schwerwiegende Verzögerungsfolgen.', ex: { deadline: 'later', deadlineImpact: 'severe' } },
  { level: 2, rule: 'Kritischer Arbeitspfad blockiert, die Folgen sind aber nicht erheblich', reason: 'Ein kritischer Arbeitspfad ist blockiert. Das zieht nach vorne, hebt allein aber nicht über Major.', ex: { dependency: 'critical' }, v02: true },
  { level: 2, rule: 'Mindestens eine wichtige Arbeit ist blockiert, oder mehrere Teams warten', reason: 'Wichtige oder zeitkritische Arbeiten sind von diesem Vorgang abhängig.', ex: { dependency: 'multiple' } },
  { level: 2, rule: 'Wesentlicher oder langfristig wesentlicher Nutzen, hohe Risikoreduktion', reason: 'Die Umsetzung bringt wesentlichen Nutzen oder reduziert ein relevantes Risiko.', ex: { value: 'high' } },
  { level: 1, rule: 'Auswirkungen begrenzt', reason: 'Die Auswirkungen sind begrenzt.', ex: { impact: 'limited' } },
  { level: 1, rule: 'Nutzen begrenzt', reason: 'Die Umsetzung bringt einen begrenzten Nutzen.', ex: { value: 'medium' } },
  { level: 0, rule: 'Auswirkungen minimal (und keine andere Regel greift)', reason: 'Die Auswirkungen sind minimal.', ex: {} }
];

// Bearbeitungsart: die erste zutreffende gilt.
export const serviceRules = [
  { service: 'Expedite', rule: 'Ein produktiver Dienst ist ausgefallen, oder es liegt ein akuter bzw. meldepflichtiger Sicherheitsvorfall vor.', ex: { production: 'outage', workaround: 'yes' } },
  { service: 'Fixed Date', rule: 'Es gibt eine verbindliche Frist mit erheblichen oder schwerwiegenden Folgen – oder die Folgen sind noch unklar (im Zweifel zählt die Frist).', ex: { deadline: 'week', deadlineImpact: 'material' }, v02: true },
  { service: 'Intangible', rule: 'Langfristig wesentlicher Nutzen – und kein gestörter Dienst, kein bestätigtes Risiko, keine Abhängigkeit, keine Frist.', ex: { value: 'long' } },
  { service: 'Standard', rule: 'Alles andere. Auch eine Frist ohne erhebliche Folgen bleibt Standard.', ex: { deadline: 'day', deadlineImpact: 'limited' } }
];

// Zuschläge für die Reihenfolge innerhalb einer Stufe.
export const bonusRules = [
  { key: 'expedite', points: 35, rule: 'Bearbeitungsart Sofort (Dienst ausgefallen oder akuter Vorfall)', ex: { production: 'outage', workaround: 'yes' } },
  { key: 'deadline', points: 24, rule: 'Wirksame Frist innerhalb von 24 Stunden', ex: { deadline: 'day', deadlineImpact: 'material' } },
  { key: 'deadline', points: 16, rule: 'Wirksame Frist nach 24 Stunden bis in 7 Tagen', ex: { deadline: 'week', deadlineImpact: 'material' } },
  { key: 'deadline', points: 8, rule: 'Wirksame Frist ab dem 8. Tag', ex: { deadline: 'later', deadlineImpact: 'material' } },
  { key: 'dependency', points: 10, rule: 'Kritischer, zeitnaher Arbeitspfad blockiert', ex: { dependency: 'critical' } },
  { key: 'dependency', points: 5, rule: 'Mehrere Teams warten auf zeitkritische Arbeiten', ex: { dependency: 'multiple' } },
  { key: 'dependency', points: 15, rule: 'Beides zusammen', ex: { dependency: 'both' } },
  { key: 'effort', points: 1, rule: 'Kleiner Aufwand', ex: { effort: 'small' } }
];
export const BONUS_MAX = 35 + 24 + 15 + 1;

// Belastbarkeit.
export const confidenceRules = [
  { value: 'Niedrig', rule: 'Du gibst «Niedrig» an, eine Kernfrage ist «Unklar», oder keine Regel greift. Die Stufe gilt dann als vorläufig, und der Fall bekommt keinen Platz in der Reihenfolge.', ex: { impact: 'unknown' } },
  { value: 'Mittel', rule: 'Du gibst «Mittel» an, oder nur Aufwand bzw. Startklarheit sind «Unklar».', ex: { effort: 'unknown' } },
  { value: 'Hoch', rule: 'Sonst.', ex: {} }
];

// Startklar-Prüfung (Gates).
export const gateRules = [
  { gate: 'Noch nicht startklar', rule: 'Startklar = «Nein»', ex: { ready: 'no' } },
  { gate: 'Startklarheit offen', rule: 'Startklar = «Unklar»', ex: { ready: 'unknown' } },
  { gate: 'Entscheidungsgrundlage klären', rule: 'Belastbarkeit «Niedrig»', ex: { confidence: 'low' } }
];

// Hinweise. prefix = Anfang des Hinweistextes in der Auswertung; live = erscheint schon im Fragenpfad.
export const alertRules = [
  { when: 'Ein produktiver Dienst ist ausgefallen', prefix: 'Produktiver Dienstausfall', live: true, ex: { production: 'outage', workaround: 'yes' } },
  { when: 'Akuter oder meldepflichtiger Sicherheitsvorfall', prefix: 'Akuter oder meldepflichtiger Fall', live: true, ex: { security: 'incident' } },
  { when: 'Schwerwiegender Schaden droht in 24 h, ohne Übergangslösung', prefix: 'Unmittelbar drohender', live: true, ex: { deadline: 'day', deadlineImpact: 'severe', deadlineWorkaround: 'no' } },
  { when: 'Schaden droht in 24 h, Übergangslösung unklar', prefix: 'Übergangslösung klären', live: false, ex: { deadline: 'day', deadlineImpact: 'severe', deadlineWorkaround: 'unknown' } },
  { when: 'Bestätigtes Risiko mit zeitnahem Handlungsbedarf', prefix: 'Schwerwiegendes zeitkritisches', live: false, ex: { security: 'urgent' } },
  { when: 'Bestätigtes Risiko auf einem exponierten System', prefix: 'Exponiertes schwerwiegendes', live: false, ex: { security: 'confirmed', exposure: 'external' } },
  { when: 'Betriebs- oder Sicherheitslage «Unklar»', prefix: 'Betriebs- oder Sicherheitslage klären', live: false, ex: { security: 'unknown' } }
];

// PO einbeziehen? (Hybridmodell: Team entscheidet selbst, PO bei Sofort, Fester Termin, Langfristig und grossem Aufwand).
export const poRules = [
  { service: 'Expedite', flag: 'Ja', when: 'immer', ex: { production: 'outage', workaround: 'yes' } },
  { service: 'Fixed Date', flag: 'Ja', when: 'immer', ex: { deadline: 'week', deadlineImpact: 'material' } },
  { service: 'Intangible', flag: 'Ja', when: 'immer – der PO führt das übergeordnete Thema', ex: { value: 'long' } },
  { service: 'Standard', flag: 'Ja', when: 'Aufwand gross (über der Schwelle)', ex: { effort: 'large' } },
  { service: 'Standard', flag: 'Klären', when: 'Aufwand unklar', ex: { effort: 'unknown' } },
  { service: 'Standard', flag: 'Nein', when: 'sonst – Ausnahme: Leistungsabgrenzung unklar (Team meldet)', ex: {} }
];

// Durchgerechnete Beispiele (werden auf der Seite live mit der Engine berechnet).
export const examples = [
  { title: 'Kritischer Dienst steht', ex: { production: 'criticalOutage', impact: 'severe', workaround: 'no', dependency: 'multiple', value: 'high' }, note: 'Alle drei Blocker-Bedingungen sind erfüllt. Expedite und die wartenden Teams ziehen zusätzlich nach vorne.' },
  { title: 'Sicherheitsvorfall, Lage noch unklar', ex: { security: 'incident', impact: 'unknown', confidence: 'low' }, note: 'Der Hinweis erscheint sofort. Die Stufe ist vorläufig, deshalb steht der Fall unter «Noch zu klären» statt in der Reihenfolge.' },
  { title: 'Zertifikat läuft in 5 Tagen ab', ex: { impact: 'limited', deadline: 'week', deadlineImpact: 'material', value: 'medium', effort: 'small' }, note: 'Die Frist hat erhebliche Folgen (Testfenster) – das hebt auf Major und macht daraus Fixed Date.' },
  { title: 'Schnittstelle, zwei Teams warten', ex: { impact: 'limited', dependency: 'multiple', value: 'high' }, note: 'Gleiche Stufe wie das Zertifikat. Die wirksame Frist (+16) wiegt in der Reihenfolge mehr als die Abhängigkeit (+5).' },
  { title: 'Frist morgen, kaum Nachteile', ex: { impact: 'limited', deadline: 'day', deadlineImpact: 'limited', value: 'medium' }, note: 'Die «Fristfalle»: Ein nahes Datum allein hebt nicht an, wenn ein Verpassen kaum Folgen hat.' },
  { title: 'Technische Schulden abbauen', ex: { value: 'long', effort: 'large' }, note: 'Langfristig wichtig, aber ohne Zeitdruck: Intangible. So bleibt es sichtbar, statt liegen zu bleiben.' }
];
