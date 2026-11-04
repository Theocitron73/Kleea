import React, { useRef, useState } from 'react';
import { SketchPicker } from 'react-color';
import {
  ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight,
  Circle, RotateCcw, Sparkles, Square, Sun,
} from 'lucide-react';
import {
  angleFromPointer,
  buildGradient,
  CENTER_MAX,
  CENTER_MIN,
  GRADIENT_KEYS,
  readGradient,
} from '../utils/gradient';

const STYLES = [
  { id: 'linear', label: 'Linéaire', icon: ArrowDown },
  { id: 'radial', label: 'Radial', icon: Sun },
  { id: 'conic', label: 'Conique', icon: RotateCcw },
  { id: 'solid', label: 'Uni', icon: Square },
];
const ANGLES = [
  { value: 0, icon: ArrowUp },
  { value: 45, icon: ArrowUpRight },
  { value: 90, icon: ArrowRight },
  { value: 135, icon: ArrowDownRight },
  { value: 180, icon: ArrowDown },
  { value: 225, icon: ArrowDownLeft },
  { value: 270, icon: ArrowLeft },
  { value: 315, icon: ArrowUpLeft },
];
const CENTERS = [
  { label: 'Haut', x: 50, y: -10 },
  { label: 'Centre', x: 50, y: 50 },
  { label: 'Bas', x: 50, y: 110 },
];

const RANGE = CENTER_MAX - CENTER_MIN;
// L'aperçu représente l'écran ; la marge autour permet de placer le centre juste en dehors.
const SCREEN_INSET = `${(-CENTER_MIN / RANGE) * 100}%`;
const toPad = (value) => `${((value - CENTER_MIN) / RANGE) * 100}%`;

const pillClass = (active) =>
  `rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
    active
      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
      : 'bg-black/30 border-white/5 text-white/50 hover:text-white hover:bg-white/5'
  }`;
const labelClass = 'text-[8px] font-black uppercase tracking-wider text-white/50';
const valueClass = 'text-[9px] font-mono font-bold text-[var(--secondary)]';
const sliderClass = 'w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]';

/** Suit un glisser : `onMove` reçoit le pointeur et le rectangle de l'élément. */
function useDrag(onMove) {
  const dragging = useRef(false);
  const report = (e) => onMove(e, e.currentTarget.getBoundingClientRect());
  return {
    onPointerDown: (e) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      report(e);
    },
    onPointerMove: (e) => {
      if (dragging.current) report(e);
    },
    onPointerUp: () => {
      dragging.current = false;
    },
    onPointerCancel: () => {
      dragging.current = false;
    },
  };
}

function AngleDial({ angle, onChange }) {
  const drag = useDrag((e, rect) => {
    onChange(angleFromPointer(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2));
  });

  return (
    <div
      {...drag}
      role="slider"
      tabIndex={0}
      aria-label="Angle du dégradé"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={angle}
      aria-valuetext={`${angle} degrés`}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 15 : 1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onChange((angle + step) % 360);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onChange((angle - step + 360) % 360);
        }
      }}
      className="relative w-20 h-20 shrink-0 rounded-full bg-black/30 border border-white/15 cursor-grab active:cursor-grabbing touch-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      {[0, 90, 180, 270].map((tick) => (
        <span
          key={tick}
          className="absolute left-1/2 top-1/2 w-px h-1.5 bg-white/30"
          style={{ transform: `translate(-50%, -50%) rotate(${tick}deg) translateY(-34px)` }}
        />
      ))}
      <div
        className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <span className="absolute -left-px -top-7 w-0.5 h-7 bg-[var(--primary)] rounded-full" />
        <span className="absolute -left-1.5 -top-8 w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-white shadow-md" />
      </div>
      <span className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 pointer-events-none" />
    </div>
  );
}

function CenterPad({ gradient, background, onChange }) {
  const usesCenter = gradient.style === 'radial' || gradient.style === 'conic';
  const drag = useDrag((e, rect) => {
    const toValue = (position, size) =>
      Math.round(Math.min(CENTER_MAX, Math.max(CENTER_MIN, CENTER_MIN + (position / size) * RANGE)));
    onChange(toValue(e.clientX - rect.left, rect.width), toValue(e.clientY - rect.top, rect.height));
  });

  return (
    <div
      {...(usesCenter ? drag : {})}
      className={`relative w-full aspect-video rounded-xl bg-black/20 border border-white/5 ${
        usesCenter ? 'cursor-crosshair touch-none' : ''
      }`}
    >
      <div
        className="absolute border border-white/25 pointer-events-none overflow-hidden"
        style={{ inset: SCREEN_INSET, background }}
      />
      {usesCenter && (
        <span
          className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)] border-2 border-white shadow-lg pointer-events-none"
          style={{ left: toPad(gradient.x), top: toPad(gradient.y) }}
        />
      )}
    </div>
  );
}

export default function GradientEditor({ userTheme, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const gradient = readGradient(userTheme);
  const background = buildGradient(gradient);
  const { style, color } = gradient;
  const isSolid = style === 'solid';
  const usesAngle = style === 'linear' || style === 'conic';
  const usesCenter = style === 'radial' || style === 'conic';
  const setCenter = (x, y) => onChange('gradient_center', `${x} ${y}`);

  const reset = () => {
    GRADIENT_KEYS.forEach((key) => {
      const value = { gradient_style: 'radial', gradient_intensity: '50%', gradient_color: 'auto' }[key] ?? '';
      onChange(key, value);
    });
  };

  return (
    <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <label className="text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--secondary)]" />
            <span>Dégradé d'Arrière-Plan de la Page</span>
          </label>
          <p className="text-[7.5px] text-white/40 uppercase font-bold mt-0.5">Forme, angle, centre et fondu</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-[7.5px] font-black uppercase px-2 py-1 rounded-sm bg-white/5 text-white/50 hover:text-white cursor-pointer shrink-0"
        >
          Réinitialiser
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {STYLES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={style === id}
            onClick={() => onChange('gradient_style', id)}
            className={`p-2 flex flex-col items-center gap-1 ${pillClass(style === id)}`}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <CenterPad gradient={gradient} background={background} onChange={setCenter} />
          <p className="text-[7px] text-white/30 uppercase font-bold text-center">
            {usesCenter ? "Fais glisser le point pour placer le centre. Le cadre représente l'écran." : 'Aperçu'}
          </p>
        </div>

        <div className="space-y-3 min-w-0">
          {usesAngle && (
            <div className="flex items-center gap-3">
              <AngleDial angle={gradient.angle} onChange={(value) => onChange('gradient_angle', String(value))} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="flex items-center justify-between gap-2">
                  <span className={labelClass}>Angle</span>
                  <span className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min="0"
                      max="359"
                      value={gradient.angle}
                      onChange={(e) => onChange('gradient_angle', e.target.value)}
                      className={`w-10 bg-black/30 border border-white/10 rounded-sm px-1 py-0.5 text-right outline-none ${valueClass}`}
                    />
                    <span className={valueClass}>°</span>
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {ANGLES.map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      title={`${value}°`}
                      aria-label={`${value} degrés`}
                      onClick={() => onChange('gradient_angle', String(value))}
                      className={`py-1 flex items-center justify-center ${pillClass(gradient.angle === value)}`}
                    >
                      <Icon size={11} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {style === 'radial' && (
            <div className="space-y-1">
              <span className={labelClass}>Forme du halo</span>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  aria-pressed={gradient.shape === 'circle'}
                  onClick={() => onChange('gradient_shape', 'circle')}
                  className={`py-1.5 flex items-center justify-center gap-1 ${pillClass(gradient.shape === 'circle')}`}
                >
                  <Circle size={11} /> Cercle
                </button>
                <button
                  type="button"
                  aria-pressed={gradient.shape === 'ellipse'}
                  onClick={() => onChange('gradient_shape', 'ellipse')}
                  className={`py-1.5 flex items-center justify-center gap-1 ${pillClass(gradient.shape === 'ellipse')}`}
                >
                  <Circle size={11} style={{ transform: 'scaleX(1.5) scaleY(0.75)' }} /> Ellipse
                </button>
              </div>
            </div>
          )}

          {usesCenter && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={labelClass}>Centre</span>
                <span className={valueClass}>
                  {gradient.x}% / {gradient.y}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {CENTERS.map(({ label, x, y }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCenter(x, y)}
                    className={`py-1 ${pillClass(gradient.x === x && gradient.y === y)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isSolid && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={labelClass}>Début du fondu</span>
                <span className={valueClass}>{gradient.spread}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={gradient.spread}
                aria-label="Début du fondu"
                className={sliderClass}
                onChange={(e) => onChange('gradient_spread', e.target.value)}
              />
            </div>
          )}

          {isSolid && (
            <p className="text-[8px] text-white/40 uppercase font-bold leading-relaxed">
              Fond uni : seule la couleur d'arrière-plan du site est utilisée.
            </p>
          )}
        </div>
      </div>

      {!isSolid && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="min-w-0">
            <span className={`${labelClass} block`}>Couleur d'arrivée</span>
            <span className="text-[7px] text-white/30 uppercase">Assombrie automatiquement ou teinte sur-mesure</span>
          </div>

          <div className="flex items-center gap-2">
            {color !== 'auto' && (
              <button
                type="button"
                onClick={() => onChange('gradient_color', 'auto')}
                className="text-[7.5px] font-black uppercase px-2 py-0.5 rounded-sm bg-white/5 text-white/40 hover:text-white cursor-pointer"
              >
                Auto
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen(!pickerOpen)}
                aria-label="Changer la couleur d'arrivée"
                className="w-8 h-4 rounded-full border border-white/20 shadow-inner cursor-pointer hover:scale-110 transition-transform"
                style={{ background: color === 'auto' ? `color-mix(in srgb, var(--bg-site), black ${gradient.intensity}%)` : color }}
              />
              {pickerOpen && (
                <div className="absolute z-50 bottom-6 right-0 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="fixed inset-0" onClick={() => setPickerOpen(false)} />
                  <div className="relative">
                    <SketchPicker
                      color={color === 'auto' ? '#000000' : color}
                      onChange={(c) => onChange('gradient_color', c.hex)}
                      disableAlpha
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {color === 'auto' && (
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between">
                <span className={labelClass}>Assombrissement</span>
                <span className={valueClass}>{gradient.intensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={gradient.intensity}
                aria-label="Assombrissement"
                className={sliderClass}
                onChange={(e) => onChange('gradient_intensity', `${e.target.value}%`)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
