/** Client de l'API Kleea. Le jeton n'est jamais écrit dans les journaux ni placé dans l'URL. */

import type { FinanceData, PowensStatus } from "./views";

export type GlobalSettings = {
	serverUrl?: string;
	token?: string;
	refreshMinutes?: number | string;
};

export type FetchErrorKind = "config" | "insecure" | "auth" | "redirect" | "network" | "timeout" | "server";

export class FetchError extends Error {
	readonly kind: FetchErrorKind;
	/** Code HTTP, pour une réponse en échec. */
	readonly status?: number;

	constructor(kind: FetchErrorKind, status?: number) {
		super(status ? `${kind} ${status}` : kind);
		this.kind = kind;
		this.status = status;
	}
}

/** Panne passagère : les derniers chiffres restent affichés (grisés) et le plugin réessaie seul. */
export function isTransient(error: FetchError): boolean {
	return error.kind === "network" || error.kind === "timeout" || error.kind === "server";
}

export type ErrorText = {
	/** Titre et détail d'une touche sans chiffre à afficher. */
	key: [string, string];
	/** Mention sous un chiffre conservé, pour une panne passagère. */
	stale: string;
	/** Phrase pour l'inspecteur de propriétés. */
	status: string;
};

export function describeError(error: FetchError): ErrorText {
	switch (error.kind) {
		case "config":
			return { key: ["À configurer", "Serveur et jeton"], stale: "", status: "Renseignez l'URL du serveur et le jeton." };
		case "insecure":
			return { key: ["HTTPS requis", "URL du serveur"], stale: "", status: "L'URL doit être en HTTPS (HTTP accepté uniquement en local)." };
		case "auth":
			return { key: ["Jeton refusé", "Voir profil Kleea"], stale: "", status: "Jeton refusé : générez-en un nouveau dans le profil Kleea." };
		case "redirect":
			return { key: ["Redirection", "Vérifier l'URL"], stale: "", status: "Le serveur redirige ailleurs : renseignez son URL exacte, en HTTPS." };
		case "network":
			return { key: ["Hors ligne", "Serveur injoignable"], stale: "Hors ligne", status: "Serveur injoignable : vérifiez qu'il est lancé et son URL." };
		case "timeout":
			return { key: ["Trop lent", "Délai dépassé"], stale: "Délai dépassé", status: "Le serveur a mis trop de temps à répondre." };
		case "server": {
			if (error.status === 404) {
				return { key: ["Route absente", "Backend à jour ?"], stale: "Erreur 404", status: "Route introuvable (404) : mettez à jour et redémarrez le backend." };
			}
			const code = error.status ? `Code ${error.status}` : "Réponse invalide";
			return {
				key: ["Erreur serveur", code],
				stale: error.status ? `Erreur ${error.status}` : "Réponse invalide",
				status: `Erreur du serveur (${code}) : voir les journaux du backend.`,
			};
		}
	}
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TIMEOUT_MS = 30_000; // Large : le serveur peut devoir sortir de veille.
const POWENS_TIMEOUT_MS = 60_000; // Le backend enchaîne deux appels à Powens, de 15 s maximum chacun.

/** HTTP n'est toléré qu'en local : ailleurs, le jeton et les soldes circuleraient en clair. */
export function buildApiUrl(serverUrl: string, path = "/api/streamdeck/data"): URL {
	let base: URL;
	try {
		base = new URL(serverUrl.trim());
	} catch {
		throw new FetchError("config");
	}
	const isSecure = base.protocol === "https:" || (base.protocol === "http:" && LOCAL_HOSTS.has(base.hostname));
	if (!isSecure) throw new FetchError("insecure");
	return new URL(path, base);
}

function classifyFailure(error: unknown): FetchError {
	if (error instanceof Error && error.name === "TimeoutError") return new FetchError("timeout");
	const cause = error instanceof Error ? (error.cause as Error | undefined) : undefined;
	if (cause?.message?.includes("redirect")) return new FetchError("redirect");
	return new FetchError("network");
}

async function getJson<T>(
	settings: GlobalSettings,
	path: string,
	isValid: (body: T) => boolean,
	fetchImpl: typeof fetch,
	timeoutMs: number,
): Promise<T> {
	const token = settings.token?.trim();
	if (!settings.serverUrl?.trim() || !token) throw new FetchError("config");
	const url = buildApiUrl(settings.serverUrl, path);

	let response: Response;
	try {
		response = await fetchImpl(url, {
			headers: { "X-Streamdeck-Token": token, Accept: "application/json" },
			// Pas de redirection suivie : elle pourrait mener vers une adresse non vérifiée ci-dessus.
			redirect: "error",
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (error) {
		throw classifyFailure(error);
	}
	if (response.status === 401) throw new FetchError("auth", 401);
	if (!response.ok) throw new FetchError("server", response.status);

	let body: T;
	try {
		body = (await response.json()) as T;
	} catch (error) {
		// Coupure ou délai pendant la lecture, ou corps qui n'est pas du JSON.
		throw error instanceof SyntaxError ? new FetchError("server") : classifyFailure(error);
	}
	if (!isValid(body)) throw new FetchError("server");
	return body;
}

export function fetchFinanceData(settings: GlobalSettings, fetchImpl: typeof fetch = fetch): Promise<FinanceData> {
	return getJson<FinanceData>(
		settings,
		"/api/streamdeck/data",
		(data) => Array.isArray(data?.comptes) && Boolean(data.periode),
		fetchImpl,
		TIMEOUT_MS,
	);
}

export function fetchPowensStatus(settings: GlobalSettings, fetchImpl: typeof fetch = fetch): Promise<PowensStatus> {
	return getJson<PowensStatus>(
		settings,
		"/api/streamdeck/powens",
		(status) => typeof status?.count === "number" && typeof status.comptes === "object",
		fetchImpl,
		POWENS_TIMEOUT_MS,
	);
}

/** Intervalle borné : au moins 1 minute pour ne pas solliciter le serveur inutilement. */
export function refreshIntervalMs(settings: GlobalSettings): number {
	const minutes = Number(settings.refreshMinutes);
	const bounded = Number.isFinite(minutes) && minutes >= 1 ? Math.min(minutes, 1440) : 15;
	return bounded * 60_000;
}
