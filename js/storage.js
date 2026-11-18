// Lokale Persistenz der Vergleichsliste (nur in diesem Browser). Keine Jira-Anbindung.
const storageKey = 'priorisierungs-assistent-v01';
let works = true;

const valid = x => x && typeof x.name === 'string' && x.result && 'score' in x.result && Array.isArray(x.result.gates);

export function loadCases() {
  try {
    const previous = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(previous) ? previous.filter(valid) : [];
  } catch { works = false; return []; }
}

export function saveCases(cases) {
  try { localStorage.setItem(storageKey, JSON.stringify(cases)); works = true; }
  catch { works = false; }
}

export const storageAvailable = () => works;
