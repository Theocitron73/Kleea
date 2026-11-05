// Détection des doublons à l'import.
const BANQUE_STOP_WORDS = new Set([
    "de", "du", "des", "le", "la", "les", "a", "au", "aux", "en", "un", "une",
    "mme", "mr", "m", "monsieur", "madame", "mlle", "mademoiselle",
    "paiement", "carte", "cb", "fact", "facture", "virement", "vir", "sepa",
    "prlv", "prelevement", "debit", "credit", "retrait", "dab", "gab", "emission",
    "reception", "remise", "cotisation", "frais", "achat", "web", "echeance",
    "operation", "interbancaire", "bancaire", "vers", "pour", "par", "ref", "titre",
    "instantane", "recu", "emis", "motif"
  ]);

  const getSignificantTokens = (label) => {
    if (!label) return [];
    return Array.from(new Set(
      label
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\b\d{2}[\/\.-]\d{2}([\/\.-]\d{2,4})?\b/g, " ")
        .replace(/\b\d{1,2}h\d{2}\b/g, " ")
        .replace(/\b[a-z0-9_-]*\d{4,}[a-z0-9_-]*\b/gi, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 3 && !BANQUE_STOP_WORDS.has(w) && !/^\d+$/.test(w))
    ));
  };

  const areLabelsSimilar = (labelA, labelB) => {
    const tokensA = getSignificantTokens(labelA);
    const tokensB = getSignificantTokens(labelB);

    if (tokensA.length === 0 && tokensB.length === 0) return true;
    if (tokensA.length === 0 || tokensB.length === 0) return false;

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    const intersection = tokensA.filter(t => setB.has(t));
    if (intersection.length === 0) {
      const strA = tokensA.join("");
      const strB = tokensB.join("");
      return strA.length >= 4 && strB.length >= 4 && (strA.includes(strB) || strB.includes(strA));
    }

    const isSubset = tokensA.every(t => setB.has(t)) || tokensB.every(t => setA.has(t));
    if (isSubset && intersection.some(t => t.length >= 3)) {
      return true;
    }

    const union = new Set([...tokensA, ...tokensB]);
    return (intersection.length / union.size) >= 0.4;
  };

  const parseDateOnly = (dStr) => {
    if (!dStr) return null;
    if (dStr instanceof Date) return isNaN(dStr.getTime()) ? null : dStr;
    const s = String(dStr).split('T')[0].split(' ')[0].trim();

    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split(/[-/]/).map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
      const [d, m, y] = s.split(/[-/]/).map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(s)) {
      const [d, m, y] = s.split(/[-/]/).map(Number);
      return new Date(2000 + y, m - 1, d);
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // 🟢 VÉRIFICATION UNIQUE AVEC CONTRAINTE DE DISTANCE DE DATES
  export const findSingleDuplicate = (incomingTx, existingList, claimedIds, maxAllowedDays) => {
    const incMontant = parseFloat(incomingTx.montant) || 0;
    const incDate = parseDateOnly(incomingTx.date);
    if (!incDate) return null;

    const incCompte = (incomingTx.compte || "").trim().toUpperCase();

    for (const exist of existingList) {
      if (claimedIds.has(exist.id)) continue;

      // 1. Montant identique au centime près
      const existMontant = parseFloat(exist.montant) || 0;
      if (Math.abs(Math.abs(incMontant) - Math.abs(existMontant)) > 0.01) continue;
      if ((incMontant > 0) !== (existMontant > 0)) continue;

      // 2. Vérification compte
      const existCompte = (exist.compte || "").trim().toUpperCase();
      if (incCompte && existCompte) {
        const c1 = incCompte.replace(/[^A-Z0-9]/g, '');
        const c2 = existCompte.replace(/[^A-Z0-9]/g, '');
        const isLivret1 = c1.includes('LIVRET') || c1.includes('LEP') || c1.includes('LDDS');
        const isLivret2 = c2.includes('LIVRET') || c2.includes('LEP') || c2.includes('LDDS');
        if (isLivret1 !== isLivret2) continue;
      }

      // 3. Écart de date
      const existDate = parseDateOnly(exist.date);
      if (!existDate) continue;

      const diffDays = Math.abs((incDate.getTime() - existDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > maxAllowedDays) continue;

      // 4. Comparaison du libellé
      if (areLabelsSimilar(incomingTx.nom, exist.nom)) {
        return exist;
      }
    }

    return null;
  };
