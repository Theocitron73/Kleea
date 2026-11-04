/** Transforme la réponse de `/api/streamdeck/data` en contenu affichable sur une touche. */

export type Account = {
	nom: string;
	groupe: string;
	couleur: string;
	solde: number;
	revenus_mois: number;
	depenses_mois: number;
};

export type FinanceData = {
	periode: { mois: number; annee: number };
	comptes: Account[];
};

export type PowensStatus = {
	connecte: boolean;
	erreur: boolean;
	count: number;
	/** Nombre de transactions à importer, par nom de compte. */
	comptes: Record<string, number>;
};

export type ViewId = "balance" | "total" | "expenses" | "income" | "net" | "powens";

export type ViewSettings = {
	view?: ViewId;
	/** Nom du compte, pour la vue "balance". */
	account?: string;
	/** Nom du groupe pour les autres vues ; vide = tous les comptes. */
	group?: string;
};

export type Tone = "neutral" | "positive" | "negative" | "warning";

export type KeyContent = {
	title: string;
	value: string;
	subtitle: string;
	tone: Tone;
	accent?: string;
	/** Lignes affichées à la place du sous-titre. `suffix` n'est jamais tronqué. */
	details?: { label: string; suffix?: string }[];
};

const MONTHS = ["Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Format compact pour une touche : centimes sous 1 000 €, millions abrégés au-delà. */
export function formatEuro(amount: number): string {
	const abs = Math.abs(amount);
	let text: string;
	if (abs >= 1_000_000) {
		text = `${(amount / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M€`;
	} else {
		const decimals = abs < 1000 ? 2 : 0;
		const number = amount.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
		text = `${number} €`;
	}
	// Espaces insécables et signe moins typographique : absents de certaines polices de rendu.
	return text.replace(/[  ]/g, " ").replace(/−/g, "-");
}

function signTone(amount: number): Tone {
	if (amount > 0) return "positive";
	return amount < 0 ? "negative" : "neutral";
}

/** Renvoie le contenu de la touche, ou `null` si le compte choisi n'existe plus. */
export function buildKeyContent(data: FinanceData, settings: ViewSettings): KeyContent | null {
	const view = settings.view ?? "balance";
	if (view === "powens") return null; // Voir buildPowensContent.

	if (view === "balance") {
		const account = settings.account
			? data.comptes.find((c) => same(c.nom, settings.account as string))
			: data.comptes[0];
		if (!account) return null;
		return {
			title: account.nom,
			value: formatEuro(account.solde),
			subtitle: account.groupe,
			tone: account.solde < 0 ? "negative" : "neutral",
			accent: account.couleur,
		};
	}

	const group = settings.group?.trim() ?? "";
	const accounts = group ? data.comptes.filter((c) => same(c.groupe, group)) : data.comptes;
	const sum = (read: (c: Account) => number): number => accounts.reduce((acc, c) => acc + read(c), 0);
	const month = `${MONTHS[data.periode.mois - 1] ?? ""}${group ? ` · ${group}` : ""}`;

	switch (view) {
		case "total":
			return { title: "Patrimoine", value: formatEuro(sum((c) => c.solde)), subtitle: group || "Tous", tone: "neutral" };
		case "expenses":
			return { title: "Dépenses", value: formatEuro(sum((c) => c.depenses_mois)), subtitle: month, tone: "negative" };
		case "income":
			return { title: "Revenus", value: formatEuro(sum((c) => c.revenus_mois)), subtitle: month, tone: "positive" };
		case "net": {
			const net = sum((c) => c.revenus_mois - c.depenses_mois);
			return { title: "Bilan", value: formatEuro(net), subtitle: month, tone: signTone(net) };
		}
	}
}

/** Transactions Powens à importer, sur tous les comptes ou ceux d'un profil. */
export function buildPowensContent(status: PowensStatus, data: FinanceData, group?: string): KeyContent {
	const profile = group?.trim();
	const pending = Object.entries(status.comptes)
		.filter(([, n]) => n > 0)
		.filter(([name]) => !profile || data.comptes.some((c) => same(c.nom, name) && same(c.groupe, profile)))
		.sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB, "fr"));
	const count = pending.reduce((total, [, n]) => total + n, 0);

	const content: KeyContent = {
		title: "À importer",
		value: String(count),
		subtitle: "À jour",
		tone: count > 0 ? "warning" : "neutral",
	};
	if (pending.length === 1) {
		content.subtitle = pending[0][0];
	} else if (pending.length > 1) {
		const [first, second, ...others] = pending;
		content.details = [
			{ label: first[0], suffix: ` : ${first[1]}` },
			others.length === 0
				? { label: second[0], suffix: ` : ${second[1]}` }
				: { label: `+${others.length + 1} comptes` },
		];
	}
	return content;
}
