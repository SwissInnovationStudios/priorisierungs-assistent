// Rechtliche Seiten: Lizenztext erst beim Aufklappen laden (ohne JS bleibt der Link zur Datei).
document.querySelectorAll('details pre[data-license]').forEach(pre => {
  pre.closest('details').addEventListener('toggle', async () => {
    if (pre.dataset.loaded) return;
    try {
      const res = await fetch(pre.dataset.license);
      if (!res.ok) return;
      pre.textContent = await res.text();
      pre.dataset.loaded = '1';
    } catch { /* offline: Link bleibt stehen */ }
  });
});
