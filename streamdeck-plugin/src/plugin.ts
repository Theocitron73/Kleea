import streamDeck from "@elgato/streamdeck";

import { FinanceView } from "./actions/finance-view";

// Surtout pas de niveau "trace" : il journaliserait les réglages, donc le jeton.
streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new FinanceView());
streamDeck.connect();
