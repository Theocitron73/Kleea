import { useState, useEffect } from 'react';
import api from '../axios';
import { getCleanCategoryName, setGlobalCustomIconsMap } from '../categoryIcons';
import { toast } from 'sonner';

// Catégories : chargement, modification et visibilité.
export default function useCategories({ masquees, setCategoriesPerso, setEditingCat, setMasquees, setToutesLesCategories, toutesLesCategories, user }) {
  const fetchCategories = async () => {
      if (!user) return;

      // 1. Chargement garanti des catégories, icônes, couleurs et groupes
      try {
        const resCats = await api.get(`/api/categories/${user}`);
        if (resCats.data) {
          setToutesLesCategories(resCats.data.all || []);
          setCategoriesPerso(resCats.data.perso || []);
          setGlobalCustomIconsMap(
            resCats.data.icons_map || {}, 
            resCats.data.colors_map || {}, 
            resCats.data.groups_map || {}
          );
        }
      } catch (err) {
        console.error("Erreur chargement catégories:", err);
      }

      // 2. Chargement des masquages isolément
      try {
        const resMasquees = await api.get(`/api/categories_masquees/${user}`);
        if (resMasquees.data) {
          setMasquees(resMasquees.data || []);
        }
      } catch (err) {
        console.error("Erreur chargement masquées:", err);
      }
    };

    // Effet de chargement au montage
    useEffect(() => {
      if (user) {
        fetchCategories();
      }
    }, [user]);


    const addCategory = async (name, iconName = 'Tag', colorHex = '#818cf8') => {
      const cleanName = getCleanCategoryName(name);
      if (!cleanName) return;

      try {
        await api.post(`/api/categories`, {
          nom: cleanName,
          icone: iconName,
          couleur: colorHex, // 👈 Bien envoyé à l'API
          utilisateur: user
        });

        await fetchCategories(); 
      } catch (err) {
        console.error("Erreur ajout catégorie:", err);
        toast.error("Impossible d'ajouter la catégorie.");
      }
    };

    const handleUpdateCategory = async (name, iconName, colorHex) => {
      try {
        await api.put(`/api/categories`, {
          nom: name,
          icone: iconName,
          couleur: colorHex, // 👈 Bien envoyé à l'API
          utilisateur: user
        });

        await fetchCategories();
        setEditingCat(null);
      } catch (err) {
        console.error("Erreur modification catégorie:", err);
        toast.error("Impossible de modifier la catégorie.");
      }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [catToDelete, setCatToDelete] = useState(null);

    const removeCategory = (catName) => {
      setCatToDelete(catName);
      setShowDeleteConfirm(true);
    };

    const confirmDeletecat = async () => {
      if (!catToDelete) return;

      try {
        const encodedName = encodeURIComponent(catToDelete);
        const response = await api.delete(`/api/categories/${user}/${encodedName}`);

        if (response.data.status === "success" || response.data.status === "deleted") {
          setCategoriesPerso(prev => prev.filter(c => c !== catToDelete));
          setToutesLesCategories(prev => prev.filter(c => c !== catToDelete));
          setShowDeleteConfirm(false);
          setCatToDelete(null);
        }
      } catch (err) {
        console.error("Erreur réseau lors de la suppression:", err);
        toast.error("Erreur lors de la suppression");
        setShowDeleteConfirm(false);
      }
    };


    // --- 2. Ta logique de calcul (Dérivée) ---
    // Cette ligne doit être déclarée à chaque rendu, juste avant le "return"
    const categoriesVisibles = toutesLesCategories.filter(cat => !masquees.includes(cat));

    const toggleVisibility = async (catName) => {
      const nouvelleListe = masquees.includes(catName)
        ? masquees.filter(c => c !== catName)
        : [...masquees, catName];
      
      setMasquees(nouvelleListe); 

      try {
        await api.post(`/api/categories_masquees/${user}`, nouvelleListe);
      } catch (err) {
        console.error("Erreur lors de la sauvegarde SQL:", err);
      }
    };

  return { addCategory, catToDelete, categoriesVisibles, confirmDeletecat, fetchCategories, handleUpdateCategory, removeCategory, setShowDeleteConfirm, showDeleteConfirm, toggleVisibility };
}
