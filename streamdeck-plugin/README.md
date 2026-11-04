# Plugin Stream Deck Kleea

Affiche sur une touche : le solde d'un compte, le patrimoine, les dépenses, revenus et bilan du mois, ou le
nombre de transactions Powens à importer (tous les comptes ou un profil). Un appui force l'actualisation.
La touche Powens indique les comptes concernés et signale ces transactions sans les importer : l'import
reste à faire dans Kleea. Les chiffres sont calculés par le backend,
comme sur le dashboard, hors projections et intérêts estimés.

## Installation

1. Lancer le backend, puis dans Kleea : **Profil > Stream Deck > Générer un jeton**.
2. Installer le plugin (Stream Deck 7.1 ou plus récent) :

   ```bash
   npm install
   npm run build
   streamdeck link com.theolebarbier.kleea.sdPlugin
   ```

   Ou, pour un fichier installable en double-clic : `npm run pack`.
3. Glisser l'action **Kleea > Vue financière** sur une touche, puis renseigner l'URL du serveur et le jeton.

## Sécurité

- Le jeton donne seulement accès en lecture à `/api/streamdeck/data` et `/api/streamdeck/powens`. Il se
  révoque depuis le profil.
- Il est stocké dans les réglages globaux du plugin, et non dans ceux de la touche, qui partent dans les
  exports de profil Stream Deck.
- Hors `localhost`, le plugin exige HTTPS et refuse les redirections.

## Développement

```bash
npm test
npm run watch
```
