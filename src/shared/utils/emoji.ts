const FOOD_EMOJIS = [
  '🍝',
  '🍕',
  '🥗',
  '🍛',
  '🍜',
  '🌮',
  '🥪',
  '🍗',
  '🐟',
  '🍲',
  '🍳',
  '🥘',
  '🍚',
  '🥑',
  '🍅',
  '🧀',
  '🥙',
  '🥟',
  '🍔',
];

export const getStableFoodEmoji = (mealText: string, seed: string): string => {
  if (!mealText.trim()) return '';

  const hash = Array.from(`${mealText}-${seed}`).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
  return FOOD_EMOJIS[hash % FOOD_EMOJIS.length];
};
