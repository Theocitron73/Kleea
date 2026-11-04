import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	type SendToPluginEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";

import {
	describeError,
	FetchError,
	fetchFinanceData,
	fetchPowensStatus,
	type GlobalSettings,
	isTransient,
	refreshIntervalMs,
} from "../api";
import { renderContent, renderMessage } from "../render";
import { buildKeyContent, buildPowensContent, type FinanceData, type PowensStatus, type ViewSettings } from "../views";

type Settings = ViewSettings & { [key: string]: JsonValue | undefined };

const RETRY_MS = 60_000;

const asFetchError = (error: unknown): FetchError => (error instanceof FetchError ? error : new FetchError("network"));

@action({ UUID: "com.theolebarbier.kleea.view" })
export class FinanceView extends SingletonAction<Settings> {
	private settingsById = new Map<string, Settings>();
	private data: FinanceData | null = null;
	private powens: PowensStatus | null = null;
	private lastSuccess = 0;
	private lastError: FetchError | null = null;
	private powensError: FetchError | null = null;
	private inFlight: Promise<void> | null = null;
	private timer: NodeJS.Timeout | null = null;
	private retryTimer: NodeJS.Timeout | null = null;
	private globals: GlobalSettings | null = null;

	override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
		this.settingsById.set(ev.action.id, ev.payload.settings);
		if (ev.action.isKey()) await this.draw(ev.action, ev.payload.settings);
		const globals = await this.loadGlobals();
		this.schedule(globals);
		const missingPowens = ev.payload.settings.view === "powens" && !this.powens;
		if (missingPowens || Date.now() - this.lastSuccess >= refreshIntervalMs(globals)) await this.refresh();
	}

	override onWillDisappear(ev: WillDisappearEvent<Settings>): void {
		this.settingsById.delete(ev.action.id);
		if (this.settingsById.size > 0) return;
		if (this.timer) clearInterval(this.timer);
		if (this.retryTimer) clearTimeout(this.retryTimer);
		this.timer = null;
		this.retryTimer = null;
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): Promise<void> {
		this.settingsById.set(ev.action.id, ev.payload.settings);
		if (ev.action.isKey()) await this.draw(ev.action, ev.payload.settings);
		if (ev.payload.settings.view === "powens" && !this.powens) await this.refresh();
	}

	/** Un appui force l'actualisation. */
	override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
		await this.refresh();
		const failed = this.lastError || (ev.payload.settings.view === "powens" && this.powensError);
		await (failed ? ev.action.showAlert() : ev.action.showOk());
	}

	/** L'inspecteur demande l'état courant, ou signale que les réglages globaux ont changé. */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, Settings>): Promise<void> {
		const type = (ev.payload as { type?: string } | null)?.type;
		if (type === "globalsChanged") {
			this.data = null;
			this.powens = null;
			this.powensError = null;
			this.lastSuccess = 0;
			this.schedule(await this.loadGlobals(true));
			await this.refresh();
		} else if (type === "ready" && !this.data && !this.lastError) {
			await this.refresh();
		}
		await this.sendStatus();
	}

	private async loadGlobals(force = false): Promise<GlobalSettings> {
		if (force || !this.globals) {
			this.globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		}
		return this.globals;
	}

	private schedule(globals: GlobalSettings): void {
		if (this.timer) clearInterval(this.timer);
		this.timer = setInterval(() => void this.refresh(), refreshIntervalMs(globals));
	}

	private refresh(): Promise<void> {
		// Plusieurs touches apparaissent en même temps : une seule requête part.
		this.inFlight ??= this.fetchAndDraw().finally(() => {
			this.inFlight = null;
		});
		return this.inFlight;
	}

	private async fetchAndDraw(): Promise<void> {
		try {
			this.data = await fetchFinanceData(await this.loadGlobals());
			this.lastSuccess = Date.now();
			this.lastError = null;
		} catch (error) {
			this.lastError = asFetchError(error);
			streamDeck.logger.warn(`Soldes indisponibles : ${this.lastError.message}`);
			if (!isTransient(this.lastError)) {
				this.data = null;
				this.powens = null;
			}
		}
		// Les soldes s'affichent sans attendre Powens, bien plus lent à répondre.
		await this.drawAll();
		await this.sendStatus();
		if (this.wantsPowens()) await this.fetchPowens();
		this.scheduleRetry();
	}

	/** Powens n'est interrogé que si une touche visible l'affiche. */
	private wantsPowens(): boolean {
		return [...this.settingsById.values()].some((settings) => settings.view === "powens");
	}

	private async fetchPowens(): Promise<void> {
		if (this.lastError) {
			this.powensError = this.lastError;
		} else {
			try {
				this.powens = await fetchPowensStatus(await this.loadGlobals());
				this.powensError = null;
			} catch (error) {
				this.powensError = asFetchError(error);
				streamDeck.logger.warn(`Powens indisponible : ${this.powensError.message}`);
				if (!isTransient(this.powensError)) {
					this.lastError = this.powensError;
					this.data = null;
					this.powens = null;
				}
			}
		}
		await this.drawAll();
		await this.sendStatus();
	}

	/** Sans ce nouvel essai, une panne brève laisserait la touche en erreur jusqu'à la prochaine actualisation. */
	private scheduleRetry(): void {
		const failure = this.lastError ?? (this.wantsPowens() ? this.powensError : null);
		if (this.retryTimer) clearTimeout(this.retryTimer);
		this.retryTimer = null;
		if (failure && isTransient(failure) && this.settingsById.size > 0) {
			this.retryTimer = setTimeout(() => void this.refresh(), RETRY_MS);
		}
	}

	private async drawAll(): Promise<void> {
		await Promise.all(
			[...this.actions].map((key) =>
				key.isKey() ? this.draw(key, this.settingsById.get(key.id) ?? {}) : Promise.resolve(),
			),
		);
	}

	private async draw(key: KeyAction<Settings>, settings: Settings): Promise<void> {
		await key.setImage(this.imageFor(settings));
	}

	private imageFor(settings: Settings): string {
		if (settings.view === "powens" && this.data) {
			if (this.powens) {
				if (!this.powens.connecte) return renderMessage("Powens", "Non connecté");
				if (this.powens.erreur) return renderMessage("Powens", "Indisponible");
				const stale = this.powensError ? describeError(this.powensError).stale : undefined;
				return renderContent(buildPowensContent(this.powens, this.data, settings.group), stale);
			}
			if (this.powensError) return renderMessage(...describeError(this.powensError).key);
			return renderMessage("Kleea", "Chargement…", false);
		}
		if (this.data) {
			const content = buildKeyContent(this.data, settings);
			if (!content) return renderMessage("Introuvable", "Choisir un compte");
			return renderContent(content, this.lastError ? describeError(this.lastError).stale : undefined);
		}
		if (this.lastError) return renderMessage(...describeError(this.lastError).key);
		return renderMessage("Kleea", "Chargement…", false);
	}

	private statusMessage(): { ok: boolean; message: string } {
		if (this.lastError) return { ok: false, message: describeError(this.lastError).status };
		if (!this.data) return { ok: false, message: "Connexion…" };
		if (this.wantsPowens() && this.powensError) {
			return { ok: false, message: `Soldes OK. Powens : ${describeError(this.powensError).status}` };
		}
		if (this.wantsPowens() && this.powens?.erreur) {
			return { ok: false, message: "Soldes OK. Powens ne répond pas ou l'accès bancaire a expiré." };
		}
		return { ok: true, message: `Connecté · ${this.data.comptes.length} compte(s)` };
	}

	private async sendStatus(): Promise<void> {
		await streamDeck.ui.sendToPropertyInspector({
			type: "status",
			...this.statusMessage(),
			accounts: (this.data?.comptes ?? []).map((c) => c.nom),
			groups: [...new Set((this.data?.comptes ?? []).map((c) => c.groupe.trim()).filter(Boolean))],
		});
	}
}
