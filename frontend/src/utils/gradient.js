// Dégradé d'arrière-plan : lecture des réglages enregistrés et construction du CSS.

export const GRADIENT_KEYS = [
  'gradient_style',
  'gradient_intensity',
  'gradient_color',
  'gradient_angle',
  'gradient_shape',
  'gradient_center',
  'gradient_spread',
];

// Le centre peut sortir légèrement de l'écran : c'est ce qui donne l'effet de halo venant du haut.
export const CENTER_MIN = -20;
export const CENTER_MAX = 120;

const DEFAULT_ANGLE = { linear: 180, conic: 0 };
const DEFAULT_SPREAD = { linear: 0, radial: 45, conic: 0 };
const DEFAULT_CENTER = { radial: [50, -10], conic: [50, 50] };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function readCenter(stored, style) {
  const [x, y] = String(stored || '').split(' ').map(toNumber);
  if (x === null || y === null || x === undefined || y === undefined) {
    return DEFAULT_CENTER[style] || DEFAULT_CENTER.radial;
  }
  return [clamp(x, CENTER_MIN, CENTER_MAX), clamp(y, CENTER_MIN, CENTER_MAX)];
}

/** Les anciens thèmes ne connaissent que `style` : ils gardent exactement leur rendu. */
export function readGradient(theme) {
  const stored = theme?.gradient_style || 'radial';
  const style = stored === 'diagonal' ? 'linear' : stored;
  const angle = toNumber(theme?.gradient_angle) ?? (stored === 'diagonal' ? 135 : DEFAULT_ANGLE[style] ?? 180);
  const [x, y] = readCenter(theme?.gradient_center, style);
  const color = theme?.gradient_color;

  return {
    style,
    angle: ((Math.round(angle) % 360) + 360) % 360,
    shape: theme?.gradient_shape === 'ellipse' ? 'ellipse' : 'circle',
    x,
    y,
    spread: clamp(toNumber(theme?.gradient_spread) ?? DEFAULT_SPREAD[style] ?? 0, 0, 90),
    intensity: clamp(toNumber(theme?.gradient_intensity) ?? 50, 0, 100),
    color: color && color !== 'auto' ? color : 'auto',
  };
}

export function buildGradient(gradient) {
  const { style, angle, shape, x, y, spread, intensity, color } = gradient;
  const isAuto = color === 'auto';

  if (style === 'solid' || (isAuto && intensity === 0)) return 'var(--bg-site)';

  const end = isAuto ? `color-mix(in srgb, var(--bg-site), black ${intensity}%)` : color;

  if (style === 'linear') {
    return `linear-gradient(${angle}deg, var(--bg-site) ${spread}%, ${end} 100%)`;
  }
  if (style === 'conic') {
    // La couleur revient au point de départ pour éviter une cassure nette sur le tour.
    const hold = spread / 2;
    return `conic-gradient(from ${angle}deg at ${x}% ${y}%, var(--bg-site) ${hold}%, ${end} 50%, var(--bg-site) ${100 - hold}%)`;
  }
  return `radial-gradient(${shape} at ${x}% ${y}%, var(--bg-site) ${spread}%, ${end} 100%)`;
}

export const themeBackground = (theme) => buildGradient(readGradient(theme));

/** Angle CSS (0° vers le haut, sens horaire) du point (dx, dy) par rapport au centre du cadran. */
export function angleFromPointer(dx, dy) {
  return ((Math.round((Math.atan2(dx, -dy) * 180) / Math.PI) % 360) + 360) % 360;
}
