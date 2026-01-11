// src/features/kitchen/utils/recipe.utils.ts
// Utilitaires pour formatage et affichage recettes - FIXED

import type { Recipe } from '../types/ai-menu.types';

/**
 * Formater temps de préparation
 */
export function formatRecipeTime(time?: string): string {
  // FIX: Gérer null/undefined
  if (!time) {
    return '-- min';
  }
  
  // "30 min" → "30 min"
  // "1h30" → "1h30"
  // "45" → "45 min"
  
  if (time.includes('min') || time.includes('h')) {
    return time;
  }
  
  return `${time} min`;
}

/**
 * Obtenir emoji difficulté
 */
export function getDifficultyEmoji(difficulty?: string): string {
  switch (difficulty?.toLowerCase()) {
    case 'facile':
      return '😊';
    case 'moyen':
      return '🤔';
    case 'difficile':
      return '😰';
    default:
      return '👨‍🍳';
  }
}

/**
 * Formater portion (singulier/pluriel)
 */
export function formatServings(servings?: number): string {
  if (!servings) {
    return '-- personnes';
  }
  
  return servings === 1 
    ? '1 personne'
    : `${servings} personnes`;
}

/**
 * Estimer calories (approximatif basé sur ingrédients)
 * TODO: Améliorer avec vraie base de données nutritionnelle
 */
export function estimateCalories(recipe: Recipe): number | null {
  // Pour l'instant, retourner null
  // À implémenter avec vraie logique
  return null;
}

/**
 * Extraire ingrédients principaux (pour preview)
 */
export function getMainIngredients(recipe: Recipe, max: number = 3): string[] {
  if (!recipe?.ingredients) {
    return [];
  }
  return recipe.ingredients.slice(0, max);
}

/**
 * Vérifier si recette est végétarienne/végane
 */
export function isVegetarian(recipe: Recipe): boolean {
  const dietaryNotes = recipe.dietary_notes?.toLowerCase() || '';
  return dietaryNotes.includes('végétarien') || dietaryNotes.includes('végétalien');
}

export function isVegan(recipe: Recipe): boolean {
  const dietaryNotes = recipe.dietary_notes?.toLowerCase() || '';
  return dietaryNotes.includes('végétalien') || dietaryNotes.includes('vegan');
}

/**
 * Obtenir badge restrictions alimentaires
 */
export function getDietaryBadges(recipe: Recipe): string[] {
  const badges: string[] = [];
  const notes = recipe.dietary_notes?.toLowerCase() || '';
  
  if (notes.includes('végétalien') || notes.includes('vegan')) {
    badges.push('🌱 Végétalien');
  } else if (notes.includes('végétarien')) {
    badges.push('🥬 Végétarien');
  }
  
  if (notes.includes('sans gluten')) {
    badges.push('🌾 Sans gluten');
  }
  
  if (notes.includes('sans lactose')) {
    badges.push('🥛 Sans lactose');
  }
  
  if (notes.includes('halal')) {
    badges.push('☪️ Halal');
  }
  
  if (notes.includes('casher') || notes.includes('kosher')) {
    badges.push('✡️ Casher');
  }
  
  return badges;
}

/**
 * Générer texte court pour preview
 */
export function getRecipePreview(recipe: Recipe): string {
  const time = formatRecipeTime(recipe.time);
  const servings = formatServings(recipe.servings);
  const mainIngredients = getMainIngredients(recipe, 2).join(', ');
  
  return `${time} • ${servings} • ${mainIngredients}`;
}

/**
 * Compter ingrédients par catégorie (approximatif)
 */
export function categorizeIngredients(recipe: Recipe): {
  proteins: number;
  vegetables: number;
  carbs: number;
  dairy: number;
  other: number;
} {
  const categories = {
    proteins: 0,
    vegetables: 0,
    carbs: 0,
    dairy: 0,
    other: 0,
  };

  if (!recipe?.ingredients) {
    return categories;
  }

  const proteinKeywords = ['poulet', 'bœuf', 'porc', 'poisson', 'œuf', 'tofu'];
  const veggieKeywords = ['tomate', 'laitue', 'carotte', 'oignon', 'poivron', 'légume'];
  const carbKeywords = ['pâtes', 'riz', 'pain', 'pomme de terre', 'féculent'];
  const dairyKeywords = ['lait', 'fromage', 'yaourt', 'crème', 'beurre'];

  recipe.ingredients.forEach((ingredient) => {
    const ing = ingredient.toLowerCase();
    
    if (proteinKeywords.some(k => ing.includes(k))) {
      categories.proteins++;
    } else if (veggieKeywords.some(k => ing.includes(k))) {
      categories.vegetables++;
    } else if (carbKeywords.some(k => ing.includes(k))) {
      categories.carbs++;
    } else if (dairyKeywords.some(k => ing.includes(k))) {
      categories.dairy++;
    } else {
      categories.other++;
    }
  });

  return categories;
}
