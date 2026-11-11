// Mentions légales et politique de confidentialité, en pages publiques : /mentions-legales et /confidentialite.
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { EDITEUR, HEBERGEURS } from './legal/editeur';

const A_COMPLETER = <span className="text-amber-300">à compléter</span>;
const valeur = (v) => v || A_COMPLETER;
const MISE_A_JOUR = '11 novembre 2026';

function Page({ titre, children }) {
  return (
    <div className="page-accueil min-h-screen bg-[var(--acc-page)] text-[var(--acc-t1)]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--acc-t2)] hover:text-[var(--acc-t1)]">
          <ChevronLeft size={18} aria-hidden="true" /> Accueil
        </Link>
        <h1 className="mt-8 text-[34px] sm:text-[40px] leading-tight font-semibold tracking-[-0.02em]">{titre}</h1>
        <p className="mt-2 text-[14px] text-[var(--acc-t3)]">Dernière mise à jour : {MISE_A_JOUR}</p>
        <div className="mt-10 space-y-10 text-[16px] leading-7 text-[var(--acc-t2)] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:text-[var(--acc-t1)] [&_h2]:mb-3 [&_strong]:text-[var(--acc-t1)] [&_strong]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[color-mix(in_srgb,var(--primary)_55%,var(--acc-t1))] [&_a]:underline">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MentionsLegales() {
  return (
    <Page titre="Mentions légales">
      <section>
        <h2>Éditeur</h2>
        <p>
          Kleea est édité par <strong>{EDITEUR.nom}</strong>, {EDITEUR.statut.toLowerCase()}.<br />
          SIRET : {valeur(EDITEUR.siret)}<br />
          Adresse : {valeur(EDITEUR.adresse)}<br />
          Contact : {EDITEUR.email ? <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a> : A_COMPLETER}
        </p>
        <p className="mt-3">Directeur de la publication : {EDITEUR.nom}.</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <ul>
          {HEBERGEURS.map((h) => (
            <li key={h.nom}><strong>{h.role}</strong> : {h.nom}, {h.adresse} ({h.site}).</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le nom Kleea, son logo, ses textes, ses visuels et son code sont la propriété de l’éditeur. Toute reproduction sans autorisation est interdite.
          Les captures présentées sur le site utilisent des données d’exemple.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          La façon dont Kleea traite vos données, et vos droits, sont décrits dans la <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>
    </Page>
  );
}

export function PolitiqueConfidentialite() {
  return (
    <Page titre="Politique de confidentialité">
      <section>
        <p>
          Kleea vous aide à suivre vos comptes, vos budgets et vos prévisions. Cette page explique quelles données sont traitées, pourquoi, avec qui,
          combien de temps, et comment exercer vos droits. Kleea n’affiche aucune publicité et ne revend aucune donnée.
        </p>
      </section>

      <section>
        <h2>Responsable du traitement</h2>
        <p>
          {EDITEUR.nom}, {EDITEUR.statut.toLowerCase()}. Contact : {EDITEUR.email ? <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a> : A_COMPLETER}.
        </p>
      </section>

      <section>
        <h2>Données traitées</h2>
        <ul>
          <li><strong>Votre compte</strong> : identifiant, prénom, nom, adresse e-mail et mot de passe, conservé sous forme hachée (jamais en clair).</li>
          <li><strong>Vos finances</strong> : comptes, soldes, opérations, catégories, prévisions, budgets, projets d’épargne, placements et crédits que vous saisissez ou importez. Les IBAN sont chiffrés.</li>
          <li><strong>Votre connexion bancaire</strong>, si vous l’activez : vos identifiants bancaires sont saisis chez Powens, jamais dans Kleea. Kleea ne garde qu’un accès en lecture, chiffré, pour récupérer vos comptes et opérations.</li>
          <li><strong>Le compte commun</strong>, si vous l’utilisez : l’adresse e-mail de la personne invitée et les comptes partagés avec elle.</li>
          <li><strong>La sécurité</strong> : vos appareils connectés (type de navigateur et d’appareil), le journal de sécurité (connexions, échecs, changements sensibles, avec l’adresse IP) et, si vous l’activez, la double authentification.</li>
        </ul>
      </section>

      <section>
        <h2>Pourquoi, et sur quelle base</h2>
        <ul>
          <li><strong>Fournir le service</strong> que vous demandez en créant un compte : afficher, classer et prévoir vos finances, synchroniser votre banque, partager un compte. Base : l’exécution du contrat.</li>
          <li><strong>Protéger votre compte</strong> : journal de sécurité, e-mails d’alerte (nouvel appareil, mot de passe changé, invitation au compte commun), blocage des tentatives répétées. Base : l’intérêt légitime à sécuriser le service.</li>
          <li><strong>Corriger les erreurs techniques</strong> : les rapports d’erreur ne contiennent ni vos opérations ni vos données de compte. Base : l’intérêt légitime.</li>
        </ul>
      </section>

      <section>
        <h2>Avec qui</h2>
        <p>Vos données ne sont transmises qu’aux prestataires nécessaires au service, chacun pour son rôle :</p>
        <ul>
          <li><strong>Vercel</strong> (États-Unis) : héberge le site.</li>
          <li><strong>Render</strong> (États-Unis) : fait tourner le serveur de l’application.</li>
          <li><strong>Neon</strong>, groupe Databricks : héberge la base de données, à Francfort (Union européenne).</li>
          <li><strong>Powens</strong> (Paris, établissement de paiement agréé par l’ACPR) : connexion à votre banque, si vous l’activez.</li>
          <li><strong>Resend</strong> (États-Unis) : envoie les e-mails (codes de connexion, alertes, invitations, réinitialisation du mot de passe).</li>
          <li><strong>Sentry</strong> (États-Unis) : reçoit les rapports d’erreur techniques, sans données personnelles.</li>
          <li><strong>Google Gemini</strong> (États-Unis) : seulement quand vous utilisez l’assistant ou l’analyse d’annonces de logement ; il reçoit votre question, les totaux de dépenses par catégorie, ou le texte de l’annonce.</li>
        </ul>
        <p className="mt-3">
          Les transferts hors de l’Union européenne s’appuient sur les garanties prévues par le RGPD : le cadre de protection des données UE–États-Unis
          ou les clauses contractuelles types de la Commission européenne.
        </p>
      </section>

      <section>
        <h2>Combien de temps</h2>
        <ul>
          <li>Vos données de compte et de finances : tant que votre compte existe. À sa suppression, elles sont toutes effacées et l’accès à votre banque est révoqué.</li>
          <li>Le journal de sécurité et les adresses IP : 90 jours.</li>
          <li>Les sessions de connexion : 7 jours au plus.</li>
          <li>Les copies techniques de la base de données : 6 heures.</li>
        </ul>
      </section>

      <section>
        <h2>Cookies et stockage</h2>
        <p>
          Kleea utilise un seul cookie, <strong>kleea_session</strong>, indispensable pour rester connecté : il n’est pas lisible par les scripts de la page
          et ne sert à aucun suivi. Le navigateur garde aussi quelques préférences (thème, dernier profil affiché). Aucun cookie publicitaire ni de mesure
          d’audience n’est utilisé : aucun consentement n’est donc demandé.
        </p>
      </section>

      <section>
        <h2>Sécurité</h2>
        <p>
          Connexions chiffrées, IBAN et accès bancaires chiffrés sur le serveur, mots de passe hachés, double authentification facultative, journal de
          sécurité et déconnexion des appareils à distance.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez accéder à vos données, les corriger, les effacer, les récupérer, vous opposer à un traitement ou en demander la limitation.
          Dans Kleea, la page Profil permet déjà de télécharger toutes vos données (« Ma sauvegarde ») et de supprimer votre compte.
          Pour toute autre demande, écrivez à {EDITEUR.email ? <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a> : A_COMPLETER} : une réponse vous
          est apportée sous un mois.
        </p>
        <p className="mt-3">
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr</a>.
        </p>
      </section>
    </Page>
  );
}
