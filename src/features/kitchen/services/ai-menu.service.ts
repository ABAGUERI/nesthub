// src/features/kitchen/services/ai-menu.service.ts
// Service pour générer menu + épicerie via Netlify Function

import { WeekMenu } from '@/shared/types/kitchen.types';
import type { 
  MenuAndGroceryResult, 
  GroceryList, 
  GroceryItem,
  GroceryCategory,
  AIGenerationResponse 
} from '../types/ai-menu.types';

/**
 * Génère un menu hebdomadaire + liste épicerie via API Claude
 */
export async function generateMenuAndGrocery(
  userId: string,
  weekStart: string,
  familySize: number = 5
): Promise<MenuAndGroceryResult> {
  console.log('🤖 Génération menu + épicerie via Netlify Function...');
  console.log('User:', userId);
  console.log('Week:', weekStart);
  console.log('Famille:', familySize, 'personnes');

  try {
    // URL fonction Netlify
    const functionUrl = getFunctionUrl();
    console.log('📡 Appel fonction:', functionUrl);

    // Timeout 30 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Appeler fonction
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        weekStart,
        familySize,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Vérifier statut
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Erreur serveur',
        message: `Status ${response.status}`,
      }));
      
      console.error('❌ Erreur Netlify Function:', error);
      throw new Error(error.message || 'Erreur génération');
    }

    // Parser réponse
    const data: AIGenerationResponse = await response.json();

    if (!data.success || !data.menu || !data.grocery) {
      console.error('❌ Réponse invalide:', data);
      throw new Error('Format réponse invalide');
    }

    console.log('✅ Menu + Épicerie générés avec succès');
    console.log('Tokens:', data.usage);
    console.log('Coût:', `$${data.usage.estimated_cost_usd.toFixed(6)}`);

    // Convertir formats
    const menu = convertMenuFormat(data.menu, weekStart);
    const grocery = convertGroceryFormat(data.grocery);

    return {
      menu,
      grocery,
      usage: data.usage,
    };

  } catch (error) {
    console.error('❌ Erreur génération:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout: Génération trop longue (>30s)');
      }
      throw error;
    }
    
    throw new Error('Erreur inconnue lors de la génération');
  }
}

/**
 * Obtenir URL fonction Netlify
 */
function getFunctionUrl(): string {
  // Développement local
  if (import.meta.env.DEV) {
    return 'http://localhost:8888/.netlify/functions/generate-menu';
  }
  
  // Production Netlify
  return '/.netlify/functions/generate-menu';
}

/**
 * Convertir format jour nommé (monday) vers date ISO
 */
function convertMenuFormat(
  menuByDay: Record<string, string[]>,
  weekStart: string
): WeekMenu {
  const menu: WeekMenu = {};
  
  const dayNames = [
    'monday',
    'tuesday', 
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  dayNames.forEach((dayName, index) => {
    const meals = menuByDay[dayName] || [];
    
    // Calculer date ISO
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const dateKey = date.toISOString();
    
    // Nettoyer repas (max 24 caractères)
    menu[dateKey] = meals
      .map((meal) => meal.trim().substring(0, 24))
      .filter(Boolean);
  });

  return menu;
}

/**
 * Convertir format épicerie avec items cochables
 */
function convertGroceryFormat(
  groceryByCategory: Record<string, string[]>
): GroceryList {
  const grocery: Partial<GroceryList> = {};
  
  const categories: GroceryCategory[] = [
    'Viandes & Poissons',
    'Légumes',
    'Fruits',
    'Féculents',
    'Produits laitiers',
    'Épices & condiments',
  ];

  categories.forEach((category) => {
    const items = groceryByCategory[category] || [];
    
    // Convertir en items cochables
    grocery[category] = items
      .filter(Boolean)
      .map((name): GroceryItem => ({
        name: name.trim(),
        checked: false,
      }));
  });

  return grocery as GroceryList;
}

/**
 * Tester connexion Netlify Function
 */
export async function testFunctionConnection(): Promise<boolean> {
  try {
    const functionUrl = getFunctionUrl();
    const response = await fetch(functionUrl, {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch (error) {
    console.error('❌ Test connexion échoué:', error);
    return false;
  }
}
