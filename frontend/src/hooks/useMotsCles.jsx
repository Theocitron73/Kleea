import { useState, useEffect, useMemo } from 'react';
import api from '../axios';
import { getCleanCategoryName } from '../categoryIcons';
import { estTransfertInterne } from '../utils/finance';
import { toast } from 'sonner';

// Mots-clés et classement intelligent.
export default function useMotsCles({ comptes, elementsAppris, importCompte, masquees, tempTransactions, toutesLesCategories, user }) {
  const [categoriesConfig, setCategoriesConfig] = useState([]);
  const [signType, setSignType] = useState("both");



  // 2. Définition de la fonction de chargement mise à jour
  // 🟢 Sécurisé contre la déconnexion (si user est null)
  const fetchCategoriesConfig = async () => {
    if (!user) return; // 👈 INDISPENSABLE : s'arrête immédiatement si déconnecté
    try {
      const nomUtilisateur = (typeof user === 'object' && user !== null) ? user.nom : user;
      if (!nomUtilisateur) return;

      const res = await api.get(`/config-categories?utilisateur=${nomUtilisateur}`);
      setCategoriesConfig(res.data);
    } catch (err) {
      console.error("Erreur API Intelligence :", err);
    }
  };

  // 3. Appel au montage OU quand l'utilisateur change
  useEffect(() => {
    fetchCategoriesConfig();
  }, [user]); // Ajoutez 'user' ici pour recharger si la session change



  const handleAddKeyword = async (catName, newKeyword) => {
    const cleanBase = newKeyword.trim().toLowerCase();
    if (!cleanBase) return;

    const cleanKeyword = `${cleanBase}:${signType}`;
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;

    const targetClean = getCleanCategoryName(catName).trim().toLowerCase();
    const targetCat = (categoriesConfig || []).find(c => {
      if (!c || !c.categorie) return false;
      return getCleanCategoryName(c.categorie).trim().toLowerCase() === targetClean;
    });

    const existingKeywords = targetCat ? (targetCat.mots_cles || []) : [];
    if (existingKeywords.includes(cleanKeyword)) return;

    const updatedKeywords = [...existingKeywords, cleanKeyword];

    try {
      await api.put(`/config-categories/update`, {
        categorie: catName,
        keywords: updatedKeywords,
        utilisateur: nomUtilisateur
      });
      
      await fetchCategoriesConfig(); 
      setSignType("both");
      toast.success(`Intelligence apprise : ${catName}`);
    } catch (e) {
      console.error(e);
      toast.error("Erreur de mémorisation");
    }
  };

  const handleRemoveKeyword = async (catName, keywordToRemove) => {
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;
    const targetClean = getCleanCategoryName(catName).trim().toLowerCase();
    const targetCat = (categoriesConfig || []).find(c => {
      if (!c || !c.categorie) return false;
      return getCleanCategoryName(c.categorie).trim().toLowerCase() === targetClean;
    });
    
    if (!targetCat) return;

    const updatedKeywords = (targetCat.mots_cles || []).filter(k => k !== keywordToRemove);

    try {
      await api.put(`/config-categories/update`, {
        categorie: catName,
        keywords: updatedKeywords,
        utilisateur: nomUtilisateur
      });
      await fetchCategoriesConfig();
    } catch (e) { 
      console.error(e); 
    }
  };




  // État pour la catégorie sélectionnée dans l'intelligence
  const [intelSelectedCat, setIntelSelectedCat] = useState("");

  const categoriesPourIntelligence = useMemo(() => {
    const visibles = toutesLesCategories.filter(cat => !masquees.includes(cat));
    const fromImports = tempTransactions ? tempTransactions.map(t => t.categorie) : [];
    const fromConfig = categoriesConfig ? categoriesConfig.map(c => c.categorie) : [];
    
    return [...new Set([...visibles, ...fromConfig, ...fromImports])]
      .filter(Boolean)
      .sort((a, b) => getCleanCategoryName(a).localeCompare(getCleanCategoryName(b)));
  }, [toutesLesCategories, masquees, tempTransactions, categoriesConfig]);

  // On cherche la data (mots-clés) dans la config SQL
  // 💡 Recherche flexible (insensible à la casse et tolérante aux émojis)
  const activeCategoryData = useMemo(() => {
    if (!intelSelectedCat || !categoriesConfig || categoriesConfig.length === 0) return null;

    const targetClean = getCleanCategoryName(intelSelectedCat).trim().toLowerCase();

    return categoriesConfig.find(c => {
      if (!c || !c.categorie) return false;
      if (c.categorie === intelSelectedCat) return true;
      const cClean = getCleanCategoryName(c.categorie).trim().toLowerCase();
      return cClean === targetClean || cClean.includes(targetClean) || targetClean.includes(cClean);
    }) || null;
  }, [categoriesConfig, intelSelectedCat]);



  useEffect(() => {
    // Si on a des catégories et qu'aucune n'est encore sélectionnée
    if (categoriesPourIntelligence.length > 0 && !intelSelectedCat) {
      setIntelSelectedCat(categoriesPourIntelligence[0]);
    }
  }, [categoriesPourIntelligence, intelSelectedCat]);






  // =========================================================================
  // 🟢 1. FONCTION DE MATCHING AVEC FRONTIÈRE DE MOTS ET MULTI-MOTS
  // =========================================================================
  const matchesKeywordBoundary = (keyword, text) => {
    if (!keyword || !text) return false;
    // Nettoyage strict des guillemets et apostrophes résiduels
    const kwClean = String(keyword).trim().toLowerCase().replace(/["']/g, '');
    const txtClean = String(text).toLowerCase();

    // 1. Correspondance exacte de l'expression entière
    const escaped = kwClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexExact = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu');
    if (regexExact.test(txtClean)) return true;

    // 2. Si l'expression contient plusieurs mots (ex: "Jean Dupont"), vérifier que TOUS les mots sont présents
    const words = kwClean.split(/\s+/).filter(w => w.length >= 2);
    if (words.length > 1) {
      const allWordsPresent = words.every(word => {
        const escWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rWord = new RegExp(`(?<![\\p{L}\\p{N}_])${escWord}(?![\\p{L}\\p{N}_])`, 'iu');
        return rWord.test(txtClean);
      });
      if (allWordsPresent) return true;
    }

    return false;
  };

  // =========================================================================
  // 🟢 2. MOTEUR D'INTELLIGENCE DYNAMIQUE (RÉÉVALUATION COMPLÈTE EN DIRECT)
  // =========================================================================
  const appliquerIntelligence = (transactions, config) => {
    if (!transactions || transactions.length === 0) return [];
    if (!config || config.length === 0) return transactions;

    const allRules = [];
    config.forEach(cat => {
      (cat.mots_cles || []).forEach(rawKw => {
        const cleanKw = String(rawKw).replace(/^["']|["']$/g, '').trim();
        if (!cleanKw) return;
        const parts = cleanKw.split(':');
        const kw = parts[0].replace(/["']/g, '').trim().toLowerCase();
        const sign = parts[1] ? parts[1].trim().toLowerCase() : 'both';
        if (kw) {
          allRules.push({ keyword: kw, sign: sign, categorie: cat.categorie });
        }
      });
    });

    allRules.sort((a, b) => b.keyword.length - a.keyword.length);

    const isInternalTransfer = (cat) => estTransfertInterne('', cat);

    return transactions.map(t => {
      if (isInternalTransfer(t.categorie)) {
        return t;
      }

      const nomNettoye = (t.nom || "").toLowerCase().replace(/\s+/g, ' ').trim();
      const montant = parseFloat(t.montant) || 0;

      // 🟢 CONSERVE LA CATÉGORIE POWENS SI AUCUN MOT-CLÉ NE MATCHE
      let nouvelleCategorie = t.categorie || "Autre";

      for (const rule of allRules) {
        if (matchesKeywordBoundary(rule.keyword, nomNettoye)) {
          const matchPositif = (rule.sign === "positive" && montant > 0);
          const matchNegatif = (rule.sign === "negative" && montant < 0);
          const matchDeux = (rule.sign === "both" || rule.sign === "all");

          if (matchPositif || matchNegatif || matchDeux) {
            nouvelleCategorie = rule.categorie;
            break;
          }
        }
      }

      return { ...t, categorie: nouvelleCategorie };
    });
  };

  // =========================================================================
  // 🟢 3. CALCUL DES TRANSACTIONS EN TEMPS RÉEL (RÉACTIF AUX MODIFS DE MOTS-CLÉS)
  // =========================================================================
  const transactionsCalculees = useMemo(() => {
    if (!tempTransactions || tempTransactions.length === 0) return [];
    
    // A. Appliquer l'intelligence des mots-clés
    let tx = appliquerIntelligence(tempTransactions, categoriesConfig);
    
    // B. Appliquer la mémoire (éléments appris manuellement, prioritaires sur les mots-clés)
    tx = tx.map(t => {
      if (estTransfertInterne('', t.categorie)) {
        return t;
      }

      const libelleCsvNettoye = (t.nom || "").toLowerCase().replace(/\s+/g, ' ').trim();
      
      const match = (elementsAppris || []).find(item => {
        const nomApprisNettoye = (item.nom || "").toLowerCase().replace(/\s+/g, ' ').trim();
        return libelleCsvNettoye.includes(nomApprisNettoye);
      });

      if (match) {
        return { ...t, categorie: match.categorie };
      }
      return t;
    });
    
    return tx.map(t => ({ ...t, compte: importCompte || comptes[0]?.compte }));
  }, [tempTransactions, categoriesConfig, elementsAppris, importCompte, comptes]);

  return { activeCategoryData, categoriesPourIntelligence, fetchCategoriesConfig, handleAddKeyword, handleRemoveKeyword, intelSelectedCat, setIntelSelectedCat, setSignType, signType, transactionsCalculees };
}
