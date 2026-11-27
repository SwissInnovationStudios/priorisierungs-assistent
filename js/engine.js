// Entscheidungslogik, Regelwerk v0.2.
// Basis: Inline-Prototyp «Priorisierungs-Assistent.html» (v0.1). Geändert sind genau fünf Punkte, jeweils mit «v0.2» markiert
// und in docs/REGELWERK.md beschrieben. test/parity.test.mjs prüft, dass sich ausser diesen Punkten nichts verändert hat.
//
// Priorität und Vergleichsreihenfolge werden bewusst getrennt berechnet.

// Aufwandsschwelle in Personentagen: darüber ist der PO einzubeziehen (Workshop-Entscheid). Steuert nur die
// Beschriftung der Aufwandsfrage und den Hinweis «PO einbeziehen» – nicht die Stufe.
export const PO_EFFORT_THRESHOLD_PT = 3;

export const RULESET_VERSION = 'Regelwerk v0.2 · Workshop-Entwurf';

export const Priority = ['Trivial','Minor','Major','Critical','Blocker'];
const impactName = {minimal:'minimal',limited:'begrenzt',material:'wesentlich',severe:'schwerwiegend'};
const unknown = ['unknown','Unklar / nicht bekannt'];

export const questions = [
  {id:'production',title:'Ist ein produktiver Dienst ungeplant beeinträchtigt?',hint:'Unterscheide zwischen einer Einschränkung und einem tatsächlichen Ausfall.', options:[
    ['none','Nein'],['degraded','Ja, der Dienst ist eingeschränkt verfügbar'],['outage','Ja, ein produktiver Dienst ist ausgefallen'],['criticalOutage','Ja, ein kritischer produktiver Dienst ist ausgefallen'],unknown]},
  {id:'impact',title:'Wie gross sind die Auswirkungen?',hint:'Beurteile die Folgen für Betrieb, Nutzende oder vereinbarte Ziele.',options:[
    ['minimal','Minimal'],['limited','Begrenzt'],['material','Wesentlich'],['severe','Schwerwiegend'],unknown]},
  {id:'security',title:'Liegt ein Sicherheits- oder Compliance-Thema vor?',hint:'Ein technischer Schweregrad allein legt die Jira-Priorität nicht fest.',options:[
    ['none','Nein'],['relevant','Ja, aber kein bestätigtes schwerwiegendes Risiko'],['confirmed','Bestätigtes schwerwiegendes Risiko, derzeit planbar'],['urgent','Bestätigtes schwerwiegendes Risiko, zeitnaher Handlungsbedarf'],['incident','Akuter oder gemäss Vorgaben sofort zu meldender Vorfall'],unknown]},
  // v0.2 (Lücke 4): Exposition – nur gefragt, wo sie die Einstufung verändern kann.
  {id:'exposure',title:'Wie exponiert ist das betroffene System?',hint:'Ausnutzbarkeit und Erreichbarkeit zählen, nicht der technische Schweregrad allein.',when:a=>['relevant','confirmed'].includes(a.security),options:[
    ['external','Von aussen erreichbar oder Ausnutzung bereits beobachtet'],['internal','Nur intern erreichbar oder wirksam geschützt, keine bekannte Ausnutzung'],unknown]},
  {id:'workaround',title:'Gibt es eine tragfähige Umgehungslösung?',hint:'Kann der betroffene Betrieb damit vertretbar weiterlaufen?',when:a=>['degraded','outage','criticalOutage'].includes(a.production),options:[
    ['yes','Ja, der Betrieb kann vertretbar weiterlaufen'],['no','Nein, keine tragfähige Lösung'],unknown]},
  {id:'deadline',title:'Gibt es eine relevante, verbindliche Frist?',hint:'Ein internes Zieldatum ohne Folgen ist keine verbindliche Frist im Sinn dieser Frage.',options:[
    ['none','Nein'],['day','Ja, innerhalb von 24 Stunden'],['week','Ja, nach 24 Stunden bis in 7 Tagen'],['later','Ja, ab dem 8. Tag'],unknown]},
  {id:'deadlineImpact',title:'Was passiert, wenn die Frist verpasst wird?',when:a=>['day','week','later'].includes(a.deadline),options:[
    ['limited','Keine oder begrenzte Nachteile'],['material','Erhebliche Nachteile, zum Beispiel ein verpasstes Testfenster'],['severe','Schwerwiegende Folgen, zum Beispiel der Ausfall eines kritischen Dienstes'],unknown]},
  // v0.2 (Lücke 1): «unmittelbar drohend» – nur gefragt, wenn der schwerwiegende Schaden innerhalb von 24 Stunden droht.
  {id:'deadlineWorkaround',title:'Lässt sich der drohende Schaden bis zur Frist anders abfangen?',hint:'Zum Beispiel mit einer Übergangslösung, einer Verlängerung oder einem Fallback, mit dem der Betrieb vertretbar weiterläuft.',when:a=>a.deadline==='day' && a.deadlineImpact==='severe',options:[
    ['yes','Ja, eine tragfähige Übergangslösung ist vorhanden'],['no','Nein, ohne Umsetzung tritt der Schaden ein'],unknown]},
  {id:'dependency',title:'Welche anderen Arbeiten hängen von diesem Vorgang ab?',options:[
    ['none','Keine wesentliche Abhängigkeit'],['material','Mindestens eine wichtige Arbeit ist blockiert'],['multiple','Mehrere Teams warten auf zeitkritische Arbeiten'],['critical','Ein kritischer, zeitnaher Arbeitspfad ist blockiert'],['both','Kritischer, zeitnaher Arbeitspfad und mehrere zeitkritisch abhängige Teams'],unknown]},
  {id:'value',title:'Welchen Nutzen oder welche Risikoreduktion bringt die Umsetzung?',options:[
    ['low','Geringer oder kein zusätzlicher Nutzen'],['medium','Begrenzter Nutzen'],['high','Wesentlicher Nutzen oder hohe Risikoreduktion'],['long','Langfristig wesentlicher Nutzen, ohne akuten Zeitdruck'],unknown]},
  {id:'effort',title:'Wie gross ist der geschätzte Aufwand?',hint:'Der Aufwand beeinflusst allenfalls die Reihenfolge, nicht die Jira-Priorität.',options:[
    ['small','Klein (unter 1 Personentag)'],['medium',`Mittel (1 bis ${PO_EFFORT_THRESHOLD_PT} Personentage)`],['large',`Gross (über ${PO_EFFORT_THRESHOLD_PT} Personentage)`],unknown]},
  {id:'ready',title:'Ist der Vorgang startklar?',hint:'Sind die nötigen Voraussetzungen, Kompetenzen und Kapazitäten verfügbar?',options:[
    ['yes','Ja'],['no','Nein'],unknown]},
  {id:'confidence',title:'Wie belastbar sind deine Angaben?',options:[
    ['high','Hoch – die entscheidenden Angaben sind geklärt'],['medium','Mittel – Annahmen, aber ausreichende Entscheidungsgrundlage'],['low','Niedrig – entscheidende Informationen fehlen']]}
];

export const activeQuestions = a => questions.filter(q=>!q.when || q.when(a));

export const unknownLabels = {production:'Betriebszustand',impact:'Auswirkungen',security:'Sicherheits-/Compliance-Lage',exposure:'Exposition',workaround:'Umgehungslösung',deadline:'Frist',deadlineImpact:'Fristfolgen',deadlineWorkaround:'Übergangslösung bis zur Frist',dependency:'Abhängigkeiten',value:'Nutzen',effort:'Aufwand',ready:'Startklarheit'};

// Kernfragen: «Unklar» macht die Einstufung vorläufig.
const coreKeys = ['production','impact','security','exposure','workaround','deadline','deadlineImpact','deadlineWorkaround','dependency','value'];

export const evaluate = a => {
  const active = new Set(activeQuestions(a).map(q=>q.id));
  const rules = [];
  const add = (level,reason) => rules.push({level,reason});
  const impact = {minimal:0,limited:1,material:2,severe:2}[a.impact];
  if(impact !== undefined) add(impact,'Die Auswirkungen sind '+impactName[a.impact]+'.');
  const incident = a.security==='incident';
  const outage = ['outage','criticalOutage'].includes(a.production);
  const short = ['day','week'].includes(a.deadline);
  const hasDate = active.has('deadlineImpact');
  const deadlineSevere = hasDate && a.deadlineImpact==='severe';
  const deadlineRelevant = hasDate && ['material','severe'].includes(a.deadlineImpact);
  const criticalDep = ['critical','both'].includes(a.dependency);
  const multiDep = ['multiple','both'].includes(a.dependency);
  const blocked = a.production==='criticalOutage' && a.impact==='severe' && a.workaround==='no';
  // v0.2 (Lücke 1): Blocker auch bei unmittelbar drohendem Schaden (Folie 20: «… oder unmittelbar drohende vergleichbare Konsequenz»).
  const imminent = a.deadline==='day' && a.deadlineImpact==='severe' && a.deadlineWorkaround==='no';
  const exposed = a.exposure==='external';
  // v0.2 (Lücke 3): Eine Blockade hebt nur dann auf Critical, wenn die Folgen erheblich sind.
  const consequential = ['material','severe'].includes(a.impact) || (short && deadlineRelevant);

  if(blocked) add(4,'Kritischer produktiver Dienst ausgefallen, schwerwiegende Folgen und keine tragfähige Umgehung.');
  else if(outage) add(3,'Ein produktiver Dienst ist ausgefallen.');
  // v0.2 (Lücke 2): eingeschränkter Dienst ohne tragfähige Umgehung.
  else if(a.production==='degraded' && a.workaround==='no') add(2,'Ein produktiver Dienst ist eingeschränkt, und es gibt keine tragfähige Umgehung.');
  if(imminent) add(4,'Schwerwiegender Schaden droht innerhalb von 24 Stunden, ohne tragfähige Übergangslösung.');
  if(incident) add(3,'Akuter oder sofort meldepflichtiger Sicherheits-/Compliance-Vorfall.');
  else if(a.security==='urgent') add(3,'Bestätigtes schwerwiegendes Risiko mit zeitnahem Handlungsbedarf.');
  // v0.2 (Lücke 4): Exposition hebt bestätigte bzw. relevante Sicherheitsthemen an.
  else if(a.security==='confirmed' && exposed) add(3,'Bestätigtes schwerwiegendes Risiko auf einem exponierten System.');
  else if(a.security==='confirmed') add(2,'Bestätigtes schwerwiegendes Risiko, das nach aktuellen Angaben planbar ist.');
  else if(a.security==='relevant' && exposed) add(2,'Sicherheitsthema auf einem exponierten System.');
  if(deadlineRelevant) add(deadlineSevere && short ? 3 : 2,deadlineSevere && short
    ? 'Schwerwiegende Folgen bei einer kurzfristigen, verbindlichen Frist.'
    : 'Eine verbindliche Frist hat erhebliche oder schwerwiegende Verzögerungsfolgen.');
  if(criticalDep && consequential) add(3,'Ein kritischer, zeitnaher Arbeitspfad ist blockiert, und die Folgen sind erheblich.');
  else if(criticalDep) add(2,'Ein kritischer Arbeitspfad ist blockiert. Das zieht nach vorne, hebt allein aber nicht über Major.');
  else if(multiDep || a.dependency==='material') add(2,'Wichtige oder zeitkritische Arbeiten sind von diesem Vorgang abhängig.');
  if(['high','long'].includes(a.value)) add(2,'Die Umsetzung bringt wesentlichen Nutzen oder reduziert ein relevantes Risiko.');
  if(a.value==='medium') add(1,'Die Umsetzung bringt einen begrenzten Nutzen.');

  const level = rules.length ? Math.max(...rules.map(r=>r.level)) : null;
  const open = Object.entries(unknownLabels).filter(([key])=>active.has(key) && a[key]==='unknown').map(([,label])=>label);
  const coreUnknown = coreKeys.some(key=>active.has(key) && a[key]==='unknown');
  const confidence = a.confidence==='low' || coreUnknown || level===null ? 'Niedrig' :
    (a.confidence==='medium' || open.length ? 'Mittel' : 'Hoch');
  const alerts = [];
  if(outage) alerts.push('Produktiver Dienstausfall: zuständigen Betriebs- oder Incident-Prozess gemäss euren Vorgaben nutzen.');
  if(incident) alerts.push('Akuter oder meldepflichtiger Fall: zuständigen Sicherheits- oder Meldeprozess sofort nutzen.');
  if(imminent) alerts.push('Unmittelbar drohender schwerwiegender Schaden: zuständigen Betriebsprozess jetzt einbeziehen.');
  if(active.has('deadlineWorkaround') && a.deadlineWorkaround==='unknown') alerts.push('Übergangslösung klären: Ohne sie droht innerhalb von 24 Stunden ein schwerwiegender Schaden.');
  if(a.security==='urgent') alerts.push('Schwerwiegendes zeitkritisches Risiko: zuständige Fachstelle zeitnah einbeziehen.');
  if(a.security==='confirmed' && exposed) alerts.push('Exponiertes schwerwiegendes Risiko: zuständige Security-Fachstelle zeitnah einbeziehen.');
  if(a.security==='unknown' || a.production==='unknown') alerts.push('Betriebs- oder Sicherheitslage klären. Bei Verdacht auf einen akuten Fall direkt den zuständigen Prozess nutzen.');
  const expedite = outage || incident;
  // v0.2 (Lücke 7): Fixed Date nur bei einer wirksamen Frist (Folie 17: «nach Überschreitung entstehen signifikante Nachteile»).
  // Sind die Fristfolgen unklar, bleibt Fixed Date – im Zweifel die Frist ernst nehmen.
  const service = expedite ? 'Expedite' : deadlineRelevant || (hasDate && a.deadlineImpact==='unknown') ? 'Fixed Date' :
    a.value==='long' && a.production==='none' && ['none','relevant'].includes(a.security)
      && a.dependency==='none' && a.deadline==='none' ? 'Intangible' : 'Standard';
  const gates = [];
  if(a.ready!=='yes') gates.push(a.ready==='no' ? 'Noch nicht startklar' : 'Startklarheit offen');
  if(confidence==='Niedrig') gates.push('Entscheidungsgrundlage klären');

  const bonuses = {
    expedite:expedite ? 35 : 0,
    deadline:deadlineRelevant ? ({day:24,week:16,later:8}[a.deadline] || 0) : 0,
    dependency:(criticalDep ? 10 : 0)+(multiDep ? 5 : 0),
    effort:a.effort==='small' ? 1 : 0
  };
  const score = gates.length || level===null ? null : 100*level + Object.values(bonuses).reduce((s,n)=>s+n,0);
  const treatment = expedite ? 'Zuständigen Prozess jetzt anstossen. Die Vergleichsliste ersetzt diese Entscheidung nicht.' :
    imminent ? 'Sofort umsetzen und den zuständigen Betriebsprozess einbeziehen. Der Schaden droht innerhalb von 24 Stunden.' :
    a.security==='urgent' || (a.security==='confirmed' && exposed) ? 'Zeitnah fachlich klären und einplanen.' :
    gates.length ? 'Fehlende Angaben oder Voraussetzungen klären, bevor die Aufgabe eingeordnet wird.' :
    service==='Fixed Date' ? 'Bearbeitung vom verbindlichen Termin her planen.' :
    criticalDep ? 'Zeitnah mit den abhängigen Arbeiten abstimmen.' :
    service==='Intangible' ? 'Bewusst einplanen, damit die langfristige Verbesserung nicht liegen bleibt.' :
    'Im Vergleich mit den übrigen startklaren Fällen einplanen.';
  return {priority:level===null ? null : Priority[level],confidence,service,alerts,gates,score,bonuses,treatment,
    open,reasons:rules.sort((x,y)=>y.level-x.level).map(x=>x.reason)};
};

// Hinweise, die bereits im Fragenpfad erscheinen.
export const liveAlerts = a => {
  const notes=[];
  if(['outage','criticalOutage'].includes(a.production)) notes.push('Produktiver Dienstausfall: Nutze bei Bedarf sofort den vorgesehenen Incident-Prozess.');
  if(a.security==='incident') notes.push('Akuter oder meldepflichtiger Sicherheitsfall: Nutze sofort den zuständigen Meldeprozess. Warte nicht auf die Auswertung.');
  // v0.2 (Lücke 1)
  if(a.deadline==='day' && a.deadlineImpact==='severe' && a.deadlineWorkaround==='no') notes.push('Unmittelbar drohender schwerwiegender Schaden: Beziehe jetzt den zuständigen Betriebsprozess ein. Warte nicht auf die Auswertung.');
  return notes;
};

// Reihenfolge der Vergleichsliste (unverändert): Score absteigend, bei Gleichstand Speicherreihenfolge.
// Fälle ohne Score (Gates) werden getrennt als «Noch zu klären» geführt.
export const orderCases = cases => {
  const ordered = cases.map((c,i)=>({...c,i})).filter(c=>c.result.score!==null)
    .sort((x,y)=>y.result.score-x.result.score || x.i-y.i);
  const pending = cases.map((c,i)=>({...c,i})).filter(c=>c.result.score===null);
  return {ordered,pending};
};
