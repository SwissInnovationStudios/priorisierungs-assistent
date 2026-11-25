// Gemeinsame Darstellungsbausteine (Assistent und Erklärseiten). Enthält keine Bewertungsregeln.
// ---------- DOM-Helfer ----------
export function el(tag, props = {}, content = '') {
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

// Prioritäts-Icons: eigene Zeichnung in der Bildsprache von Jira (Sperre, Pfeile hoch/runter), keine Atlassian-Assets.
// Farbe über currentColor, damit sie auf jedem Chip-Hintergrund lesbar bleibt. Ohne Text → ändert textContent nicht.
export const PRIO_ICONS = {
  Blocker: '<circle cx="8" cy="8" r="6.25"/><path d="M4.75 8h6.5"/>',
  Critical: '<path d="M4 8.25 8 4.5l4 3.75M4 12 8 8.25 12 12"/>',
  Major: '<path d="M4 10.25 8 6.25l4 4"/>',
  Minor: '<path d="M4 5.75 8 9.75l4-4"/>',
  Trivial: '<path d="M4 4 8 7.75 12 4M4 7.75 8 11.5l4-3.75"/>'
};
export function prioIcon(priority) {
  if (!PRIO_ICONS[priority]) return null;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'app-prio-icon' })) s.setAttribute(k, v);
  s.innerHTML = PRIO_ICONS[priority];
  return s;
}

// Lyne: <sbb-chip-label> – Prioritätsfarben sind app-spezifisch
export const chip = (priority, extra = {}) => el('span', { class: 'sbb-chip-label app-prio app-prio--' + (priority ? priority.toLowerCase() : 'none'), ...extra }, [prioIcon(priority), priority || 'Ohne Einstufung']);
