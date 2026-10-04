// src/utils/exportUtils.js
import * as XLSX from 'xlsx';
import { getCleanCategoryName } from '../categoryIcons';

/**
 * Télécharge un Blob binaire dans le navigateur sans package externe
 */
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 📊 1. EXPORT EXCEL PROFESSIONNEL MULTI-ONGLETS (.XLSX)
 */
export const exportToExcel = ({ transactions = [], statsAnnuelles = [], recapMois = [], filename = "Kleea_Export_Comptable" }) => {
  const wb = XLSX.utils.book_new();

  // --- ONGLET 1 : GRAND LIVRE DES TRANSACTIONS ---
  const transactionsRows = transactions.map(t => {
    const montantNum = parseFloat(t.montant) || 0;
    const isTransfert = Boolean(
      t.categorie && (
        t.categorie.includes(" vers ") || 
        t.categorie.startsWith("Virement :") || 
        t.categorie.includes("🔄")
      )
    );

    return {
      "Date": t.date || "",
      "Libellé de l'opération": t.nom || "Sans libellé",
      "Montant (€)": montantNum,
      "Sens": montantNum > 0 ? "Crédit (+)" : "Débit (-)",
      "Catégorie": getCleanCategoryName(t.categorie) || "Autre",
      "Compte Bancaire": t.compte || "",
      "Mois": t.mois || "",
      "Année": t.annee || "",
      "Type de flux": isTransfert ? "Transfert Interne" : (montantNum > 0 ? "Revenu" : "Dépense"),
      "Enveloppe": t.enveloppe || "—"
    };
  });

  const wsTransactions = XLSX.utils.json_to_sheet(transactionsRows);
  // Largeurs automatiques des colonnes
  wsTransactions['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 14 }, { wch: 12 }, 
    { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 8 }, 
    { wch: 18 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTransactions, "Transactions");

  // --- ONGLET 2 : BILAN MENSUEL DE L'ANNÉE ---
  if (recapMois && recapMois.length > 0) {
    const bilanRows = recapMois.map(m => ({
      "Mois": m.nom || "",
      "Total Revenus (€)": Math.round(m.revReel || m.revenus || 0),
      "Total Dépenses (€)": Math.round(m.depReel || m.depenses || 0),
      "Épargne Nette (€)": Math.round(m.epargneReel ?? (m.revenus - m.depenses) ?? 0),
      "Solde Patrimoine Fin de Mois (€)": m.soldeTotal !== null ? Math.round(m.soldeTotal) : "—"
    }));

    const wsBilan = XLSX.utils.json_to_sheet(bilanRows);
    wsBilan['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsBilan, "Bilan Mensuel");
  }

  // --- ONGLET 3 : RÉPARTITION PAR CATÉGORIE ---
  if (statsAnnuelles && statsAnnuelles.length > 0) {
    const categoriesRows = statsAnnuelles.map(c => ({
      "Catégorie": getCleanCategoryName(c.name),
      "Total Dépensé (€)": Math.round(c.value || 0),
      "Part du budget (%)": `${c.percent || 0}%`
    }));

    const wsCategories = XLSX.utils.json_to_sheet(categoriesRows);
    wsCategories['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsCategories, "Répartition Dépenses");
  }

  // Génération du fichier Excel binaire
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  downloadBlob(blob, `${filename}.xlsx`);
};

/**
 * 📄 2. EXPORT CSV STANDARDISÉ COMPATIBLE EXCEL WINDOWS / MAC (.CSV)
 */
export const exportToCsv = ({ transactions = [], filename = "Kleea_Transactions" }) => {
  const headers = [
    "Date",
    "Libellé",
    "Montant",
    "Catégorie",
    "Compte",
    "Mois",
    "Année",
    "Type",
    "Enveloppe"
  ];

  const rows = transactions.map(t => {
    const montantNum = parseFloat(t.montant) || 0;
    const isTransfert = Boolean(
      t.categorie && (
        t.categorie.includes(" vers ") || 
        t.categorie.startsWith("Virement :") || 
        t.categorie.includes("🔄")
      )
    );

    return [
      t.date || "",
      `"${(t.nom || "").replace(/"/g, '""')}"`,
      montantNum.toFixed(2).replace('.', ','), // Format monétaire français (virgule)
      `"${getCleanCategoryName(t.categorie || 'Autre').replace(/"/g, '""')}"`,
      `"${(t.compte || "").replace(/"/g, '""')}"`,
      t.mois || "",
      t.annee || "",
      isTransfert ? "Transfert" : (montantNum > 0 ? "Revenu" : "Dépense"),
      `"${(t.enveloppe || "").replace(/"/g, '""')}"`
    ];
  });

  // 🟢 \uFEFF est le BOM UTF-8 indispensable pour qu'Excel ouvre les accents (é, è, à) sans corruption
  const csvContent = "\uFEFF" + [
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};