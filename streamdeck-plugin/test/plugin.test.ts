import assert from "node:assert/strict";
import { test } from "node:test";

import {
	buildApiUrl,
	describeError,
	FetchError,
	fetchFinanceData,
	fetchPowensStatus,
	isTransient,
	refreshIntervalMs,
	requestPowensRefresh,
} from "../src/api.ts";
import { renderContent, renderMessage } from "../src/render.ts";
import { buildKeyContent, buildPowensContent, type FinanceData, formatEuro, type PowensStatus } from "../src/views.ts";

const data: FinanceData = {
	periode: { mois: 11, annee: 2026 },
	comptes: [
		{ nom: "CCP T", groupe: "Theo", couleur: "#ff0000", solde: 1234.56, revenus_mois: 2000, depenses_mois: 500.5 },
		{ nom: "LEP", groupe: "Theo", couleur: "", solde: 100, revenus_mois: 0, depenses_mois: 0 },
		{ nom: "CCP A", groupe: "Aude", couleur: "", solde: -50, revenus_mois: 10, depenses_mois: 300 },
	],
};

const decode = (uri: string): string => decodeURIComponent(uri.split(",")[1]);

test("formatEuro reste compact et lisible", () => {
	assert.equal(formatEuro(12.5), "12,50 €");
	assert.equal(formatEuro(-999.99), "-999,99 €");
	assert.equal(formatEuro(12345.67), "12 346 €");
	assert.equal(formatEuro(1_250_000), "1,25 M€");
	assert.equal(formatEuro(0), "0,00 €");
});

test("vue solde : compte choisi, insensible à la casse", () => {
	const content = buildKeyContent(data, { view: "balance", account: "ccp t" });
	assert.equal(content?.title, "CCP T");
	assert.equal(content?.value, "1 235 €");
	assert.equal(content?.accent, "#ff0000");
});

test("vue solde : solde négatif signalé, compte disparu détecté", () => {
	assert.equal(buildKeyContent(data, { view: "balance", account: "CCP A" })?.tone, "negative");
	assert.equal(buildKeyContent(data, { view: "balance", account: "Ancien" }), null);
});

test("patrimoine : tous les comptes ou un seul profil", () => {
	assert.equal(buildKeyContent(data, { view: "total" })?.value, "1 285 €");
	assert.equal(buildKeyContent(data, { view: "total", group: "aude" })?.value, "-50,00 €");
});

test("stats du mois", () => {
	assert.equal(buildKeyContent(data, { view: "expenses", group: "Theo" })?.value, "500,50 €");
	assert.equal(buildKeyContent(data, { view: "income" })?.value, "2 010 €");
	const net = buildKeyContent(data, { view: "net", group: "Aude" });
	assert.equal(net?.value, "-290,00 €");
	assert.equal(net?.tone, "negative");
	assert.equal(net?.subtitle, "Nov. · Aude");
});

test("rendu : les textes sont échappés et la couleur est filtrée", () => {
	const svg = decode(
		renderContent({ title: "<script>&", value: "1 €", subtitle: "", tone: "neutral", accent: '"/><script>' }),
	);
	assert.ok(!svg.includes("<script>"));
	assert.ok(svg.includes("&lt;script&gt;&amp;"));
	assert.ok(svg.includes('stroke="#6366f1"'));
});

test("rendu : les noms longs sont tronqués et un état hors ligne est visible", () => {
	const svg = decode(
		renderContent({ title: "Un très long nom de compte", value: "1 €", subtitle: "x", tone: "neutral" }, "Hors ligne"),
	);
	assert.ok(svg.includes("Un très long…"));
	assert.ok(svg.includes("Hors ligne"));
	assert.ok(renderMessage("À configurer", "Serveur").startsWith("data:image/svg+xml"));
});

test("URL : HTTP refusé hors local", () => {
	assert.equal(buildApiUrl("https://api.exemple.fr/").href, "https://api.exemple.fr/api/streamdeck/data");
	assert.equal(buildApiUrl("http://127.0.0.1:8000").href, "http://127.0.0.1:8000/api/streamdeck/data");
	assert.equal(buildApiUrl("http://localhost:8000").protocol, "http:");
	for (const url of ["http://api.exemple.fr", "http://localhost.evil.fr", "http://127.0.0.1.evil.fr"]) {
		assert.throws(() => buildApiUrl(url), (e: FetchError) => e.kind === "insecure", url);
	}
	assert.throws(() => buildApiUrl("pas une url"), (e: FetchError) => e.kind === "config");
});

const settings = { serverUrl: "https://api.exemple.fr", token: " secret " };
const respond = (status: number, body: unknown) =>
	(async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
const kind = (expected: string) => (e: FetchError) => e.kind === expected;

test("fetch : jeton en en-tête, jamais dans l'URL, sans redirection", async () => {
	let url = "";
	let init: RequestInit | undefined;
	const spy = (async (input: URL, options: RequestInit) => {
		url = String(input);
		init = options;
		return new Response(JSON.stringify(data));
	}) as unknown as typeof fetch;
	assert.deepEqual(await fetchFinanceData(settings, spy), data);
	assert.ok(!url.includes("secret"));
	assert.equal((init?.headers as Record<string, string>)["X-Streamdeck-Token"], "secret");
	assert.equal(init?.redirect, "error");
});

test("fetch : chaque échec a son type", async () => {
	await assert.rejects(fetchFinanceData({}, respond(200, data)), kind("config"));
	await assert.rejects(fetchFinanceData(settings, respond(401, {})), kind("auth"));
	await assert.rejects(fetchFinanceData(settings, respond(500, {})), (e: FetchError) => e.kind === "server" && e.status === 500);
	await assert.rejects(fetchFinanceData(settings, respond(200, { inattendu: true })), kind("server"));
	const html = (async () => new Response("<html>")) as typeof fetch;
	await assert.rejects(fetchFinanceData(settings, html), kind("server"));
	const slow = (async () => {
		throw new DOMException("trop long", "TimeoutError");
	}) as typeof fetch;
	await assert.rejects(fetchFinanceData(settings, slow), kind("timeout"));
	const redirected = (async () => {
		throw new TypeError("fetch failed", { cause: new Error("unexpected redirect") });
	}) as typeof fetch;
	await assert.rejects(fetchFinanceData(settings, redirected), kind("redirect"));
	const down = (async () => {
		throw new Error("ECONNREFUSED");
	}) as typeof fetch;
	await assert.rejects(fetchFinanceData(settings, down), kind("network"));
});

const powens: PowensStatus = { connecte: true, erreur: false, count: 3, comptes: { "CCP T": 2, "ccp a": 1 } };

test("Powens : un seul compte concerné, son nom s'affiche", () => {
	const content = buildPowensContent({ ...powens, count: 2, comptes: { "CCP T": 2 } }, data);
	assert.deepEqual(
		[content.title, content.value, content.subtitle, content.tone, content.details],
		["À importer", "2", "CCP T", "warning", undefined],
	);
});

test("Powens : deux comptes, détail trié par nombre", () => {
	const content = buildPowensContent(powens, data);
	assert.equal(content.value, "3");
	assert.deepEqual(content.details, [
		{ label: "CCP T", suffix: " : 2" },
		{ label: "ccp a", suffix: " : 1" },
	]);
});

test("Powens : au-delà de deux comptes, les suivants sont résumés", () => {
	const comptes = { A: 1, B: 5, C: 1, D: 1 };
	const content = buildPowensContent({ ...powens, count: 8, comptes }, data);
	assert.equal(content.value, "8");
	assert.deepEqual(content.details, [{ label: "B", suffix: " : 5" }, { label: "+3 comptes" }]);
});

test("Powens : filtre par profil, insensible à la casse", () => {
	const aude = buildPowensContent(powens, data, "aude");
	assert.deepEqual([aude.value, aude.subtitle], ["1", "ccp a"]);
	const theo = buildPowensContent(powens, data, "Theo");
	assert.deepEqual([theo.value, theo.subtitle], ["2", "CCP T"]);
});

test("rendu : contour arrondi, grille de points et noms longs tronqués sans perdre le nombre", () => {
	const svg = decode(
		renderContent({
			title: "À importer",
			value: "3",
			subtitle: "",
			tone: "warning",
			details: [{ label: "Livret Épargne Populaire", suffix: " : 2" }, { label: "+2 comptes" }],
		}),
	);
	assert.match(svg, /<rect [^>]*rx="26"[^>]*fill="none"[^>]*stroke="#fbbf24"/);
	assert.equal(svg.match(/<circle /g)?.length, 100);
	assert.ok(svg.includes("Livret Ép… : 2"));
	assert.ok(svg.includes("+2 comptes"));
});

test("rendu : un chiffre périmé ne montre plus le détail par compte", () => {
	const svg = decode(
		renderContent(
			{ title: "À importer", value: "3", subtitle: "", tone: "warning", details: [{ label: "CCP T", suffix: " : 2" }] },
			"Hors ligne",
		),
	);
	assert.ok(svg.includes("Hors ligne"));
	assert.ok(!svg.includes("CCP T"));
});

test("Powens : rien à importer", () => {
	const content = buildPowensContent({ ...powens, count: 0, comptes: {} }, data);
	assert.deepEqual([content.value, content.subtitle, content.tone], ["0", "À jour", "neutral"]);
	assert.equal(buildKeyContent(data, { view: "powens" }), null);
});

test("fetch Powens : bonne route, réponse vérifiée", async () => {
	let url = "";
	const spy = (async (input: URL) => {
		url = String(input);
		return new Response(JSON.stringify(powens));
	}) as unknown as typeof fetch;
	assert.deepEqual(await fetchPowensStatus(settings, spy), powens);
	assert.equal(url, "https://api.exemple.fr/api/streamdeck/powens");
	await assert.rejects(fetchPowensStatus(settings, respond(200, { inattendu: true })), kind("server"));
	await assert.rejects(fetchPowensStatus(settings, respond(401, {})), kind("auth"));
});

test("actualisation bancaire : POST, jeton en en-tête, réponse vérifiée", async () => {
	const reponse = { ...powens, actualisees: 2, echecs: 0 };
	let url = "";
	let init: RequestInit | undefined;
	const spy = (async (input: URL, options: RequestInit) => {
		url = String(input);
		init = options;
		return new Response(JSON.stringify(reponse));
	}) as unknown as typeof fetch;
	assert.deepEqual(await requestPowensRefresh(settings, spy), reponse);
	assert.equal(url, "https://api.exemple.fr/api/streamdeck/powens/actualiser");
	assert.equal(init?.method, "POST");
	assert.equal((init?.headers as Record<string, string>)["X-Streamdeck-Token"], "secret");
	assert.equal(init?.redirect, "error");
	await assert.rejects(requestPowensRefresh(settings, respond(200, powens)), kind("server"));
	await assert.rejects(requestPowensRefresh(settings, respond(401, {})), kind("auth"));
	await assert.rejects(requestPowensRefresh(settings, respond(429, {})), (e: FetchError) => e.kind === "server" && e.status === 429);
});

test("lecture des soldes : reste un GET", async () => {
	let init: RequestInit | undefined;
	const spy = (async (_input: URL, options: RequestInit) => {
		init = options;
		return new Response(JSON.stringify(data));
	}) as unknown as typeof fetch;
	await fetchFinanceData(settings, spy);
	assert.equal(init?.method, "GET");
});

test("messages : la vraie cause est nommée", () => {
	assert.deepEqual(describeError(new FetchError("server", 429)).key, ["Trop d'appuis", "Patienter 10 min"]);
	assert.deepEqual(describeError(new FetchError("network")).key, ["Hors ligne", "Serveur injoignable"]);
	assert.deepEqual(describeError(new FetchError("server", 500)).key, ["Erreur serveur", "Code 500"]);
	assert.deepEqual(describeError(new FetchError("server", 404)).key, ["Route absente", "Backend à jour ?"]);
	assert.deepEqual(describeError(new FetchError("server")).key, ["Erreur serveur", "Réponse invalide"]);
	assert.deepEqual(describeError(new FetchError("timeout")).key, ["Trop lent", "Délai dépassé"]);
	assert.equal(describeError(new FetchError("server", 503)).stale, "Erreur 503");
});

test("seules les pannes passagères conservent les chiffres", () => {
	for (const k of ["network", "timeout", "server"] as const) assert.ok(isTransient(new FetchError(k)));
	for (const k of ["config", "insecure", "auth", "redirect"] as const) assert.ok(!isTransient(new FetchError(k)));
});

test("intervalle d'actualisation borné", () => {
	assert.equal(refreshIntervalMs({}), 15 * 60_000);
	assert.equal(refreshIntervalMs({ refreshMinutes: "5" }), 5 * 60_000);
	assert.equal(refreshIntervalMs({ refreshMinutes: 0 }), 15 * 60_000);
	assert.equal(refreshIntervalMs({ refreshMinutes: 99999 }), 1440 * 60_000);
});
