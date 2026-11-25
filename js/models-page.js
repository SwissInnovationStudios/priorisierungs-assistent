// Erklärseite «Modelle»: die Zuordnungstabellen kommen aus js/docs.js (gegen die Engine getestet).
import { serviceInfo } from './explain.js';
import { el } from './ui.js';
import { serviceRules, bonusRules, BONUS_MAX } from './docs.js';

const put = (name, node) => document.querySelectorAll(`[data-render="${name}"]`).forEach(s => s.replaceChildren(node.cloneNode(true)));
function table(caption, head, rows) {
  return el('div', { class: 'app-table-wrap', tabindex: '0', role: 'region', 'aria-label': caption }, [
    el('table', { class: 'app-table app-table--compact' }, [
      el('caption', { class: 'app-visually-hidden' }, caption),
      el('thead', {}, [el('tr', {}, head.map(h => el('th', { scope: 'col' }, h)))]),
      el('tbody', {}, rows)
    ])
  ]);
}
const pts = (key, filter = () => true) => bonusRules.filter(r => r.key === key && filter(r)).map(r => '+' + r.points).join(' / ');

put('cos-table', table('Classes of Service im Assistenten', ['Klasse', 'Im Assistenten, wenn …'], serviceRules.map(r => el('tr', {}, [
  el('td', {}, [el('strong', {}, r.service), el('span', { class: 'app-table__sub' }, serviceInfo[r.service])]),
  el('td', {}, r.rule)
]))));

put('cod-table', table('WSJF-Bestandteile im Assistenten', ['WSJF-Bestandteil', 'Im Assistenten'], [
  ['Nutzen', 'Steckt in der Stufe, nicht in einem Zuschlag: wesentlicher Nutzen → Major, begrenzter → Minor.'],
  ['Zeitkritik', `Wirksame Frist ${pts('deadline')} (≤ 24 h / ≤ 7 Tage / später) · Expedite ${pts('expedite')}`],
  ['Risikoreduktion, ermöglichte Chancen', `Abhängige Arbeiten: kritischer Pfad ${pts('dependency', r => r.points === 10)}, mehrere Teams ${pts('dependency', r => r.points === 5)}, beides ${pts('dependency', r => r.points === 15)}`],
  ['Grösse der Arbeit', `Kleiner Aufwand ${pts('effort')} – ein Gleichstandsbrecher, kein Teiler`]
].map(([k, v]) => el('tr', {}, [el('td', {}, [el('strong', {}, k)]), el('td', {}, v)]))));

put('bonus-max', document.createTextNode(String(BONUS_MAX)));
