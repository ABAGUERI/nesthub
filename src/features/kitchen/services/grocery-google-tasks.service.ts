// src/features/kitchen/services/grocery-google-tasks.service.ts
// Service pour ajouter items épicerie à Google Tasks

import type { GroceryList, GroceryCategory } from '../types/ai-menu.types';
import { createTaskInList } from '@/features/google/google-edge.service';

/**
 * Ajouter items épicerie à Google Tasks
 * Utilise la liste configurée dans GroceryPanel (google_connections)
 */
export async function addGroceryItemsToGoogleTasks(
  userId: string,
  grocery: GroceryList
): Promise<void> {
  try {
    console.log('🛒 Ajout items épicerie à Google Tasks...');

    // Flatten la liste d'épicerie
    const items = flattenGroceryList(grocery);
    
    if (items.length === 0) {
      console.log('ℹ️ Aucun item à ajouter');
      return;
    }

    console.log('📝 Items à ajouter:', items.length);

    // TODO: Implémenter ajout via Google Tasks API
    // Pour l'instant, juste logger
    // Cette fonction doit:
    // 1. Récupérer task list ID depuis google_connections
    // 2. Récupérer access token
    // 3. Appeler Google Tasks API pour chaque item
    
    console.log('Items:', items);
    console.log('⚠️ TODO: Implémenter ajout Google Tasks API');

    // Exemple d'implémentation future:
    // const taskListId = await getGroceryTaskListId(userId);
    // for (const item of items) {
    //   await addTaskToGoogle(taskListId, item);
    // }

    console.log('✅ Items épicerie préparés pour ajout');

  } catch (error) {
    console.error('❌ Erreur ajout épicerie Google Tasks:', error);
    throw new Error('Impossible d\'ajouter les items à Google Tasks');
  }
}

/**
 * Flatten liste épicerie en array simple
 */
function flattenGroceryList(grocery: GroceryList): Array<{
  title: string;
  category: string;
}> {
  const items: Array<{ title: string; category: string }> = [];
  
  (Object.keys(grocery) as GroceryCategory[]).forEach((category) => {
    const categoryItems = grocery[category] || [];
    
    categoryItems.forEach((item) => {
      if (item.name.trim()) {
        items.push({
          title: item.name,
          category,
        });
      }
    });
  });

  return items;
}

/**
 * Récupérer task list ID de la liste épicerie
 * (Cherche dans google_connections)
 */
async function getGroceryTaskListId(userId: string): Promise<string> {
  // TODO: Implémenter récupération depuis Supabase
  // SELECT task_list_id FROM google_connections 
  // WHERE user_id = userId AND connection_type = 'grocery'
  
  throw new Error('TODO: Implémenter getGroceryTaskListId');
}

/**
 * Récupérer Google access token
 */
/**
 * Ajouter une tâche à Google Tasks
 */
async function addTaskToGoogle(
  taskListId: string,
  item: { title: string; category: string }
): Promise<void> {
  await createTaskInList(taskListId, `${item.title} (${item.category})`);

  console.log('✅ Item ajouté:', item.title);
}

// Export pour compatibilité
export { flattenGroceryList };
