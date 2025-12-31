// src/features/kitchen/types/ai-menu.types.ts
// Types pour génération Menu IA (2 modes : Standard + "Tout ce qui")

import { WeekMenu } from '@/shared/types/kitchen.types';

// ============================================
// MODES DE GÉNÉRATION
// ============================================

export type AIMode = 'standard' | 'quick';

// ============================================
// RECETTES
// ============================================

export interface Recipe {
  name: string;
  time: string; // "25 min"
  servings: number;
  difficulty?: 'Facile' | 'Moyen' | 'Difficile';
  ingredients: string[]; // ["Poulet 2 poitrines", "Tomates 4 unités"]
  steps: string[]; // 3-5 étapes max
  dietary_notes?: string; // "Végétarien, Sans gluten"
}

export type RecipesByDay = Record<string, Recipe[]>; // {monday: [Recipe, Recipe]}

// ============================================
// ÉPICERIE
// ============================================

export type GroceryCategory = 
  | 'Viandes & Poissons'
  | 'Légumes'
  | 'Fruits'
  | 'Féculents'
  | 'Produits laitiers'
  | 'Épices & condiments';

export interface GroceryItem {
  name: string;
  checked: boolean;
}

export type GroceryList = Record<GroceryCategory, GroceryItem[]>;

// ============================================
// PARAMÈTRES FAMILLE
// ============================================

export type DietaryRestriction = 
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'lactose_free'
  | 'no_pork'
  | 'halal'
  | 'kosher'
  | 'custom';

export type CuisineType = 
  | 'french'
  | 'italian'
  | 'asian'
  | 'mediterranean'
  | 'mexican'
  | 'indian'
  | 'middle_eastern'
  | 'american';

export interface FamilySettings {
  adults: number;
  children: number;
  restrictions: DietaryRestriction[];
  customRestrictions?: string[]; // Max 32 caractères chacune
  favoriteIngredients: string[];
  preferredCuisines: CuisineType[];
  budgetCAD?: number;
}

// ============================================
// MODE STANDARD : MENU SEMAINE
// ============================================

export interface StandardModeResult {
  menu: WeekMenu;
  grocery: GroceryList;
  recipes: RecipesByDay;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

export interface StandardModeRequest {
  userId: string;
  weekStart: string;
  familySettings: FamilySettings;
}

export interface StandardModeResponse {
  success: boolean;
  menu: Record<string, string[]>; // {monday: [...], tuesday: [...]}
  grocery: Record<string, string[]>; // {category: [items]}
  recipes: Record<string, Recipe[]>; // {monday: [Recipe, Recipe]}
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

// ============================================
// MODE "TOUT CE QUI" : RECETTES RAPIDES
// ============================================

export interface AvailableIngredient {
  name: string;
  quantity: string; // "2 poitrines", "4 unités", "500g"
}

export type Condiment = 
  | 'olive_oil'
  | 'salt_pepper'
  | 'garlic'
  | 'butter'
  | 'spices'
  | 'soy_sauce'
  | 'vinegar'
  | 'mustard'
  | 'bouillon';

export interface QuickModeRequest {
  userId: string;
  ingredients: AvailableIngredient[];
  condiments: Condiment[];
  familySettings: FamilySettings;
}

export interface QuickModeResult {
  recipes: Recipe[];
  ingredientsLeftover?: string[]; // Ingrédients non utilisés
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

export interface QuickModeResponse {
  success: boolean;
  recipes: Recipe[];
  ingredientsLeftover?: string[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

// ============================================
// HELPERS
// ============================================

// Labels pour l'UI
export const DIETARY_RESTRICTION_LABELS: Record<DietaryRestriction, string> = {
  vegetarian: 'Végétarien',
  vegan: 'Végétalien',
  gluten_free: 'Sans gluten',
  lactose_free: 'Sans lactose',
  no_pork: 'Sans porc',
  halal: 'Halal',
  kosher: 'Casher',
  custom: 'Personnalisé',
};

export const CUISINE_TYPE_LABELS: Record<CuisineType, string> = {
  french: 'Française',
  italian: 'Italienne',
  asian: 'Asiatique',
  mediterranean: 'Méditerranéenne',
  mexican: 'Mexicaine',
  indian: 'Indienne',
  middle_eastern: 'Moyen-orientale',
  american: 'Américaine',
};

export const CONDIMENT_LABELS: Record<Condiment, string> = {
  olive_oil: 'Huile d\'olive',
  salt_pepper: 'Sel, poivre',
  garlic: 'Ail',
  butter: 'Beurre',
  spices: 'Épices courantes',
  soy_sauce: 'Sauce soja',
  vinegar: 'Vinaigre',
  mustard: 'Moutarde',
  bouillon: 'Bouillon cube',
};

// Valeurs par défaut
export const DEFAULT_FAMILY_SETTINGS: FamilySettings = {
  adults: 2,
  children: 3,
  restrictions: [],
  customRestrictions: [],
  favoriteIngredients: [],
  preferredCuisines: [],
};
