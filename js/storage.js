// Lokale Persistenz der Vergleichsliste (nur in diesem Browser). Keine Jira-Anbindung.
// Jeder Fall speichert seine Antworten. Beim Laden wird er mit dem aktuellen Regelwerk neu bewertet,
// damit die Liste nach einer Regeländerung nicht alte und neue Ergebnisse mischt.
import { evaluate } from './engine.js';

const storageKey = 'priorisierungs-assistent-v01';
let works = true;

const valid = x => x && typeof x.name === 'string' && x.result && 'score' in x.result && Array.isArray(x.result.gates);
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function loadCases() {
  try {
    const previous = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(previous)) return [];
    return previous.filter(valid).map(c => ({
      ...c,
      id: c.id || newId(),
      result: c.answers ? evaluate(c.answers) : c.result   // Fälle ohne Antworten (aus v0.1) bleiben, wie sie sind
    }));
  } catch { works = false; return []; }
}

export function saveCases(cases) {
  try { localStorage.setItem(storageKey, JSON.stringify(cases)); works = true; }
  catch { works = false; }
}

export const storageAvailable = () => works;
