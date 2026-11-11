// Avant React : nettoie le vieux cache et applique le thème tout de suite, sans flash blanc.
// Un fichier plutôt qu'un script dans index.html : la politique de sécurité du site (CSP) refuse les scripts en ligne.
try {
  // Supprime définitivement la vieille clé qui forçait le gris-blanc
  localStorage.removeItem('mycash-theme');

  // L'ancien jeton Powens ne doit plus rester dans le navigateur : seul un indicateur est conservé
  if (localStorage.getItem('powens_user_token')) {
    localStorage.setItem('powens_connecte', 'true');
    localStorage.removeItem('powens_user_token');
  }

  // Récupère le vrai thème actif
  const cached = localStorage.getItem('kleea-theme-cache');
  if (cached) {
    const t = JSON.parse(cached);
    if (t.bg_site) {
      document.documentElement.style.setProperty('--bg-site', t.bg_site);
      document.documentElement.style.backgroundColor = t.bg_site;
    }
    if (t.primary_color) document.documentElement.style.setProperty('--primary', t.primary_color);
    if (t.secondary_color) document.documentElement.style.setProperty('--secondary', t.secondary_color);
    if (t.text_main) document.documentElement.style.setProperty('--text-main', t.text_main);
    if (t.radius) document.documentElement.style.setProperty('--radius', t.radius);
    if (t.glass_blur) document.documentElement.style.setProperty('--glass-blur', t.glass_blur);
    if (t.glass_bg) document.documentElement.style.setProperty('--glass-bg', t.glass_bg);
  }
} catch (e) {}
