/** Fait défiler une rangée horizontale pour centrer l'élément, sans jamais faire bouger la page. */
export function centrerDansRangee(rangee, element) {
  if (!rangee || !element) return;
  const cible = element.offsetLeft - rangee.offsetLeft - (rangee.clientWidth - element.offsetWidth) / 2;
  rangee.scrollLeft = Math.max(0, cible);
}
