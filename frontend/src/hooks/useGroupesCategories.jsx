import { useState } from 'react';
import api from '../axios';

// Groupes de catégories.
export default function useGroupesCategories({ fetchCategories, user }) {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');


    // 🟢 Plus de localStorage : les groupes viennent de la BDD et des groupes par défaut
    const DEFAULT_STARTER_GROUPS = [
      'Logement',
      'Vie courante',
      'Transports',
      'Santé',
      'Loisirs',
      'Revenus',
      'Général'
    ];

    const [userManagedGroups, setUserManagedGroups] = useState(DEFAULT_STARTER_GROUPS);

    // Ajout d'un groupe en mémoire (sera persisté en BDD dès qu'une catégorie y sera assignée)

    // 🟢 INDISPENSABLE : Sauvegarde le nouveau groupe de la catégorie dans la BDD
    const handleAssignGroup = async (catName, targetGroup) => {
      if (!targetGroup) return;
      try {
        await api.put('/api/categories/assign-group', {
          nom: catName,
          groupe: targetGroup,
          utilisateur: user
        });
        // Rafraîchit immédiatement les catégories depuis PostgreSQL
        await fetchCategories();
      } catch (err) {
        console.error("Erreur lors de l'assignation du groupe :", err);
      }
    };

    // 🟢 Suppression instantanée en 1 clic (sans confirmation)
    const handleDeleteGroup = async (groupName) => {
      if (!groupName || groupName.toLowerCase() === 'général' || groupName.toLowerCase() === 'general') {
        return; // Sécurité : protège le groupe par défaut 'Général'
      }

      try {
        // 1. Réassigne en BDD les catégories de ce groupe vers "Général"
        await api.put('/api/categories/delete-group', {
          groupe: groupName,
          utilisateur: user,
          fallback_groupe: 'Général'
        });

        // 2. Retire le groupe de la liste
        setUserManagedGroups(prev => prev.filter(g => g.toLowerCase() !== groupName.toLowerCase()));
        
        // 3. Si le filtre actif était ce groupe, on repasse sur 'all'
        if (selectedGroupFilter.toLowerCase() === groupName.toLowerCase()) {
          setSelectedGroupFilter('all');
        }

        // 4. Rafraîchit les catégories
        await fetchCategories();
      } catch (err) {
        console.error("Erreur lors de la suppression du groupe :", err);
      }
    };

  return { handleAssignGroup, handleDeleteGroup, setUserManagedGroups, userManagedGroups };
}
