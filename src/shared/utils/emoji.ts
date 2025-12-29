/**
 * Utilitaire pour générer des emojis de nourriture stables
 * Utilise un hash pour avoir toujours le même emoji pour le même nom de repas
 */

const FOOD_EMOJIS = [
  '🍝', '🍕', '🍔', '🌭', '🥗', '🍛', '🍜', '🍲', '🥘', '🍱',
  '🍣', '🍤', '🍙', '🥟', '🌮', '🌯', '🥙', '🍖', '🍗', '🥩',
  '🥓', '🍳', '🥞', '🧇', '🧆', '🥯', '🥐', '🍞', '🧀', '🥨',
  '🥖', '🥪', '🌭', '🍟', '🍕', '🌮', '🌯', '🥙', '🥘', '🍲',
  '🍱', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮',
  '🍡', '🥠', '🥡', '🦪', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌',
  '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝',
];

/**
 * Hash simple d'une chaîne en nombre
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Génère un emoji stable pour un nom de repas donné
 * @param mealName Nom du repas (ex: "Lasagnes")
 * @param seed Seed optionnel pour varier (ex: date)
 * @returns Emoji de nourriture
 */
export const getStableFoodEmoji = (mealName: string, seed: string = ''): string => {
  if (!mealName || mealName.trim() === '') {
    return '🍽️'; // Emoji par défaut
  }

  const combined = `${mealName.toLowerCase().trim()}-${seed}`;
  const hash = hashString(combined);
  const index = hash % FOOD_EMOJIS.length;
  
  return FOOD_EMOJIS[index];
};
