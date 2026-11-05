// Suivi des erreurs du navigateur. Inactif tant que VITE_SENTRY_DSN n'est pas défini :
// aucune donnée ne quitte alors l'application, et le code de Sentry n'est même pas chargé.

let sentry = null;

const sansParametres = (url) => String(url || '').split(/[?#]/)[0];

/** Rien d'identifiant ni de financier ne part vers le service de suivi d'erreurs. */
export function nettoyerEvenement(event) {
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  if (event.request) {
    // Le retour de Powens porte son code et son state dans l'URL.
    event.request = { url: sansParametres(event.request.url) };
  }
  (event.exception?.values || []).forEach((exception) => {
    (exception.stacktrace?.frames || []).forEach((cadre) => {
      if (cadre.filename) cadre.filename = sansParametres(cadre.filename);
      delete cadre.vars;
    });
  });
  return event;
}

export async function demarrerSuiviErreurs(dsn = import.meta.env?.VITE_SENTRY_DSN) {
  if (!dsn) return false;
  try {
    sentry = await import('@sentry/react');
    sentry.init({
      dsn,
      environment: import.meta.env?.MODE,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      maxBreadcrumbs: 0,
      beforeSend: nettoyerEvenement,
    });
    return true;
  } catch (erreur) {
    console.warn('Suivi des erreurs non démarré :', erreur?.name);
    return false;
  }
}

export function signalerErreur(erreur) {
  sentry?.captureException(erreur);
}
