/** Dessine une touche en SVG (144 × 144), sans dépendance : Stream Deck accepte les data URI SVG. */

import type { KeyContent, Tone } from "./views";

const SIZE = 144;
const BACKGROUND = "#0f1117";
const DEFAULT_ACCENT = "#6366f1";
const WARNING = "#fbbf24";
const TONES: Record<Tone, string> = { neutral: "#ffffff", positive: "#4ade80", negative: "#fb7185", warning: WARNING };

const FRAME_INSET = 4;
const FRAME_WIDTH = 4;
const FRAME_RADIUS = 26;
/** Largeur utile pour le texte, à l'intérieur du contour. */
const TEXT_WIDTH = SIZE - 28;
const DETAIL_MAX_CHARS = 14;

/** Points dessinés un à un : le moteur SVG de Stream Deck ne gère pas forcément `<pattern>`. */
function dotGrid(): string {
	const step = 12;
	let dots = "";
	for (let y = 18; y <= SIZE - 18; y += step) {
		for (let x = 18; x <= SIZE - 18; x += step) {
			dots += `<circle cx="${x}" cy="${y}" r="1.1"/>`;
		}
	}
	return `<g fill="#ffffff" fill-opacity="0.09">${dots}</g>`;
}

const DOT_GRID = dotGrid();

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function truncate(text: string, max: number): string {
	const chars = [...text];
	return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
}

/** Taille de police telle que le texte tienne à l'intérieur du contour. */
function fitFontSize(text: string, max: number, charWidth = 0.56): number {
	return Math.min(max, Math.floor(TEXT_WIDTH / ([...text].length * charWidth)));
}

/** Les titres sont en gras, avec souvent des majuscules : leurs lettres sont plus larges. */
const fitTitleSize = (text: string, max: number): number => fitFontSize(text, max, 0.68);

function textLine(content: string, y: number, size: number, color: string, weight: number): string {
	return `<text x="72" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle">${escapeXml(content)}</text>`;
}

function toDataUri(body: string, frameColor: string): string {
	const frameSize = SIZE - 2 * FRAME_INSET;
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
		`<rect width="${SIZE}" height="${SIZE}" fill="${BACKGROUND}"/>` +
		DOT_GRID +
		`<rect x="${FRAME_INSET}" y="${FRAME_INSET}" width="${frameSize}" height="${frameSize}" rx="${FRAME_RADIUS}" ry="${FRAME_RADIUS}" fill="none" stroke="${frameColor}" stroke-width="${FRAME_WIDTH}"/>` +
		body +
		`</svg>`;
	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/** La couleur vient de la base : seul un hexadécimal strict est injecté dans le SVG. */
function isSafeColor(color: string | undefined): color is string {
	return Boolean(color && /^#[0-9a-f]{3,8}$/i.test(color.trim()));
}

/** Couleur du compte si elle existe, sinon celle du chiffre, pour qu'une touche se reconnaisse d'un coup d'œil. */
function frameColorFor(content: KeyContent): string {
	if (isSafeColor(content.accent)) return content.accent.trim();
	return content.tone === "neutral" ? DEFAULT_ACCENT : TONES[content.tone];
}

/** `staleLabel` : le chiffre date de la dernière réussite, et cette mention remplace le sous-titre et le détail. */
export function renderContent(content: KeyContent, staleLabel?: string): string {
	const stale = Boolean(staleLabel);
	const title = truncate(content.title, 13);
	const valueColor = stale ? "#a1a1aa" : TONES[content.tone];
	const details = stale ? [] : (content.details ?? []);

	if (details.length > 0) {
		const lines = details.map(({ label, suffix = "" }) => `${truncate(label, DETAIL_MAX_CHARS - [...suffix].length)}${suffix}`);
		return toDataUri(
			textLine(title, 38, fitTitleSize(title, 18), "#a1a1aa", 700) +
				textLine(content.value, 74, fitFontSize(content.value, 32), valueColor, 700) +
				lines.map((line, i) => textLine(line, 100 + i * 19, fitFontSize(line, 15), "#a1a1aa", 400)).join(""),
			frameColorFor(content),
		);
	}

	const subtitle = truncate(staleLabel || content.subtitle, 16);
	return toDataUri(
		textLine(title, 46, fitTitleSize(title, 19), "#a1a1aa", 700) +
			textLine(content.value, 88, fitFontSize(content.value, 32), valueColor, 700) +
			textLine(subtitle, 118, fitFontSize(subtitle, 15), stale ? WARNING : "#a1a1aa", 400),
		frameColorFor(content),
	);
}

export function renderMessage(title: string, detail: string, warning = true): string {
	return toDataUri(
		textLine(title, 70, fitTitleSize(title, 20), warning ? WARNING : "#a1a1aa", 700) +
			textLine(detail, 94, fitFontSize(detail, 14), "#a1a1aa", 400),
		warning ? WARNING : DEFAULT_ACCENT,
	);
}
