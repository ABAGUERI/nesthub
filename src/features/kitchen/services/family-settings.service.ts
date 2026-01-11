// src/features/kitchen/services/family-settings.service.ts
// Service pour gérer paramètres famille dans Supabase

import { supabase } from '@/shared/utils/supabase';
import type { FamilySettings } from '../types/ai-menu.types';

/**
 * Récupérer paramètres famille de l'utilisateur
 */
export async function getFamilySettings(userId: string): Promise<FamilySettings> {
  try {
    console.log('📥 Chargement paramètres famille...', userId);

    const { data, error } = await supabase
      .from('ai_family_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Si pas de settings, retourner valeurs par défaut
      if (error.code === 'PGRST116') {
        console.log('ℹ️ Pas de paramètres enregistrés, utilisation valeurs par défaut');
        return {
          adults: 2,
          children: 3,
          restrictions: [],
          customRestrictions: [],
          favoriteIngredients: [],
          preferredCuisines: [],
        };
      }
      throw error;
    }

    console.log('✅ Paramètres chargés');

    return {
      adults: data.adults,
      children: data.children,
      restrictions: data.restrictions || [],
      customRestrictions: [], // TODO: Extraire custom depuis restrictions
      favoriteIngredients: data.favorite_ingredients || [],
      preferredCuisines: data.preferred_cuisines || [],
      budgetCAD: data.budget_cad,
    };

  } catch (error) {
    console.error('❌ Erreur chargement paramètres:', error);
    throw new Error('Impossible de charger les paramètres famille');
  }
}

/**
 * Sauvegarder paramètres famille
 */
export async function saveFamilySettings(
  userId: string,
  settings: FamilySettings
): Promise<void> {
  try {
    console.log('💾 Sauvegarde paramètres famille...', settings);

    // Merger restrictions standard + custom
    const allRestrictions = [
      ...settings.restrictions,
      ...(settings.customRestrictions?.map(c => `custom:${c}`) || []),
    ];

    const { error } = await supabase
      .from('ai_family_settings')
      .upsert({
        user_id: userId,
        adults: settings.adults,
        children: settings.children,
        restrictions: allRestrictions,
        favorite_ingredients: settings.favoriteIngredients,
        preferred_cuisines: settings.preferredCuisines,
        budget_cad: settings.budgetCAD,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      throw error;
    }

    console.log('✅ Paramètres sauvegardés');

  } catch (error) {
    console.error('❌ Erreur sauvegarde paramètres:', error);
    throw new Error('Impossible de sauvegarder les paramètres');
  }
}

/**
 * Supprimer paramètres famille
 */
export async function deleteFamilySettings(userId: string): Promise<void> {
  try {
    console.log('🗑️ Suppression paramètres famille...', userId);

    const { error } = await supabase
      .from('ai_family_settings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log('✅ Paramètres supprimés');

  } catch (error) {
    console.error('❌ Erreur suppression paramètres:', error);
    throw new Error('Impossible de supprimer les paramètres');
  }
}

/**
 * Récupérer paramètres ou créer avec valeurs par défaut
 */
export async function getOrCreateFamilySettings(userId: string): Promise<FamilySettings> {
  try {
    const settings = await getFamilySettings(userId);
    return settings;
  } catch (error) {
    // Si erreur, créer avec valeurs par défaut
    console.log('ℹ️ Création paramètres par défaut...');
    
    const defaultSettings: FamilySettings = {
      adults: 2,
      children: 3,
      restrictions: [],
      customRestrictions: [],
      favoriteIngredients: [],
      preferredCuisines: [],
    };

    await saveFamilySettings(userId, defaultSettings);
    return defaultSettings;
  }
}
