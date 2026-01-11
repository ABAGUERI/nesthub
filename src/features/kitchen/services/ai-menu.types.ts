// Types pour le système AI Menu

export interface AIMenuRequest {
  familySize: number;
  adults: number;
  children: number;
  budget?: number;
  restrictions: string[]; // "végétarien", "sans gluten", "halal", etc.
  dislikes: string[]; // "brocoli", "poisson", etc.
  preferences: string[]; // "cuisine italienne", "plats rapides", etc.
  weekStart?: string; // Format ISO date
}

export interface Meal {
  name: string;
  description: string;
  prepTime: number; // minutes
  estimatedCost: number; // $CAD
  ingredients: string[];
  difficulty: 'facile' | 'moyen' | 'difficile';
}

export interface DayMenu {
  date: string; // Format ISO
  dayName: string; // "Lundi", "Mardi", etc.
  meals: {
    midi?: Meal;
    soir: Meal;
  };
}

export interface AIGeneratedMenu {
  weekStart: string;
  weekEnd: string;
  days: DayMenu[];
  totalCost: number;
  groceryList: {
    category: string;
    items: Array<{
      name: string;
      quantity: string;
      estimatedCost: number;
    }>;
  }[];
  tips: string[];
}

export interface AIMenuResponse {
  success: boolean;
  menu?: AIGeneratedMenu;
  error?: string;
  cached?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

export interface AIUsageLog {
  id?: string;
  userId: string;
  feature: 'menu_generation' | 'menu_chat' | 'fridge_optimization';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;
  createdAt?: string;
}
