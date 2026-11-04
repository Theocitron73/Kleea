"use strict";

const $ = (id) => document.getElementById(id);

let socket = null;
let uuid = null;
let actionId = null;
let settings = {};
let globals = {};
let accounts = [];
let groups = [];

const send = (event, extra = {}) => socket.send(JSON.stringify({ event, context: uuid, ...extra }));
const sendToPlugin = (type) => send("sendToPlugin", { action: actionId, payload: { type } });

/** Remplit une liste en conservant la valeur enregistrée, même si elle n'est pas (encore) connue. */
function fillSelect(select, values, selected, emptyLabel) {
	const options = [...values];
	if (selected && !options.some((v) => v.toLowerCase() === selected.toLowerCase())) options.push(selected);
	select.replaceChildren();
	if (emptyLabel !== undefined) select.add(new Option(emptyLabel, ""));
	for (const value of options) select.add(new Option(value, value));
	select.value = selected || (emptyLabel !== undefined ? "" : (options[0] ?? ""));
}

function renderAction() {
	const view = settings.view || "balance";
	$("view").value = view;
	$("accountRow").hidden = view !== "balance";
	$("groupRow").hidden = view === "balance";
	fillSelect($("account"), accounts, settings.account || "");
	fillSelect($("group"), groups, settings.group || "", "Tous les comptes");
}

function renderGlobals() {
	$("serverUrl").value = globals.serverUrl || "";
	$("token").value = globals.token || "";
	$("refreshMinutes").value = String(globals.refreshMinutes || 15);
}

function saveAction() {
	settings = {
		view: $("view").value,
		account: $("account").value,
		group: $("group").value,
	};
	send("setSettings", { payload: settings });
	renderAction();
}

function saveGlobals() {
	globals = {
		serverUrl: $("serverUrl").value.trim(),
		token: $("token").value.trim(),
		refreshMinutes: Number($("refreshMinutes").value),
	};
	send("setGlobalSettings", { payload: globals });
	sendToPlugin("globalsChanged");
}

function showStatus({ ok, message }) {
	$("status").textContent = message;
	$("status").className = ok ? "ok" : "error";
}

for (const id of ["view", "account", "group"]) $(id).addEventListener("change", saveAction);
for (const id of ["serverUrl", "token", "refreshMinutes"]) $(id).addEventListener("change", saveGlobals);

// Point d'entrée appelé par Stream Deck.
window.connectElgatoStreamDeckSocket = (port, inUuid, registerEvent, _info, actionInfo) => {
	uuid = inUuid;
	const info = JSON.parse(actionInfo);
	actionId = info.action;
	settings = info.payload?.settings ?? {};
	renderAction();

	socket = new WebSocket(`ws://127.0.0.1:${port}`);
	socket.addEventListener("open", () => {
		socket.send(JSON.stringify({ event: registerEvent, uuid }));
		send("getGlobalSettings");
		sendToPlugin("ready");
	});
	socket.addEventListener("message", ({ data }) => {
		const message = JSON.parse(data);
		if (message.event === "didReceiveGlobalSettings") {
			globals = message.payload?.settings ?? {};
			renderGlobals();
		} else if (message.event === "didReceiveSettings") {
			settings = message.payload?.settings ?? {};
			renderAction();
		} else if (message.event === "sendToPropertyInspector" && message.payload?.type === "status") {
			accounts = message.payload.accounts ?? [];
			groups = message.payload.groups ?? [];
			renderAction();
			showStatus(message.payload);
		}
	});
};
