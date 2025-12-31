import { supabase } from '@/shared/utils/supabase';
import type { 
  AIMenuRequest, 
  AIGeneratedMenu, 
  AIMenuResponse,
  AIUsageLog 
} from '../types/ai-menu.types';

// Configuration
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';
const CACHE_DURATION_DAYS = 7;

// Coûts par 1M tokens (décembre 2024)
const COSTS = {
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
  },
};

/**
 * Génère un hash unique pour une requête de menu
 * Même requête = même hash = même cache
 */
const hashRequest = (req: AIMenuRequest): string => {
  const key = `${req.familySize}_${req.budget}_${req.restrictions.sort().join(',')}_${req.dislikes.sort().join(',')}_${req.preferences.sort().join(',')}`;
  return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

/**
 * Récupère un menu depuis le cache
 */
const getFromCache = async (hash: string): Promise<AIGeneratedMenu | null> => {
  try {
    const cacheKey = `hub_ai_menu_${hash}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const expiry = new Date(parsed.expiresAt);
    
    if (expiry < new Date()) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log('✅ Menu trouvé en cache');
    return parsed.menu;
  } catch (err) {
    console.error('Cache read error:', err);
    return null;
  }
};

/**
 * Sauvegarde un menu dans le cache
 */
const saveToCache = (hash: string, menu: AIGeneratedMenu): void => {
  try {
    const cacheKey = `hub_ai_menu_${hash}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_DURATION_DAYS);
    
    localStorage.setItem(cacheKey, JSON.stringify({
      menu,
      expiresAt: expiresAt.toISOString(),
    }));
    
    console.log('💾 Menu sauvegardé en cache');
  } catch (err) {
    console.error('Cache write error:', err);
  }
};

/**
 * Construit le prompt pour Claude
 */
const buildMenuPrompt = (req: AIMenuRequest): string => {
  const weekStart = req.weekStart ? new Date(req.weekStart) : new Date();
  const budget = req.budget || 200;
  
  return `Tu es un assistant culinaire expert pour familles québécoises/canadiennes. Génère un menu hebdomadaire complet.

**CONTEXTE FAMILLE:**
- ${req.adults} adulte(s) + ${req.children} enfant(s) = ${req.familySize} personnes
- Budget: ${budget}$ CAD
${req.restrictions.length > 0 ? `- Restrictions: ${req.restrictions.join(', ')}` : ''}
${req.dislikes.length > 0 ? `- N'aiment pas: ${req.dislikes.join(', ')}` : ''}
${req.preferences.length > 0 ? `- Préférences: ${req.preferences.join(', ')}` : ''}

**CONSIGNES:**
1. Semaine du ${weekStart.toLocaleDateString('fr-CA')} (7 jours)
2. Un repas principal par jour (souper)
3. Plats adaptés aux enfants ET adultes
4. Variété: viandes, poissons, végé
5. Temps préparation réaliste (15-45 min)
6. Coûts réalistes épicerie Québec
7. Génère liste d'épicerie complète par catégories

**FORMAT RÉPONSE (JSON strict):**
\`\`\`json
{
  "weekStart": "2025-12-30",
  "weekEnd": "2026-01-05",
  "days": [
    {
      "date": "2025-12-30",
      "dayName": "Lundi",
      "meals": {
        "soir": {
          "name": "Spaghetti sauce bolognaise",
          "description": "Classique italien, sauce tomate maison avec boeuf haché",
          "prepTime": 30,
          "estimatedCost": 18,
          "ingredients": ["spaghetti 500g", "boeuf haché 500g", "tomates 796ml", "oignon", "ail"],
          "difficulty": "facile"
        }
      }
    }
  ],
  "totalCost": ${budget},
  "groceryList": [
    {
      "category": "Viandes & Poissons",
      "items": [
        {"name": "Boeuf haché", "quantity": "500g", "estimatedCost": 8}
      ]
    }
  ],
  "tips": [
    "Préparer sauce bolognaise en double portion pour congeler",
    "Acheter légumes en spécial cette semaine"
  ]
}
\`\`\`

Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après.`;
};

/**
 * Parse la réponse de Claude en menu structuré
 */
const parseMenuResponse = (text: string): AIGeneratedMenu => {
  try {
    // Extraire JSON du markdown si présent
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    
    const parsed = JSON.parse(jsonText.trim());
    
    // Validation basique
    if (!parsed.days || !Array.isArray(parsed.days)) {
      throw new Error('Format invalide: jours manquants');
    }
    
    return parsed as AIGeneratedMenu;
  } catch (err) {
    console.error('Parse error:', err);
    throw new Error('Impossible de parser la réponse IA');
  }
};

/**
 * Log l'usage IA dans Supabase
 */
const logAIUsage = async (log: AIUsageLog): Promise<void> => {
  try {
    await supabase.from('ai_usage_logs').insert({
      user_id: log.userId,
      feature: log.feature,
      model: log.model,
      input_tokens: log.inputTokens,
      output_tokens: log.outputTokens,
      cost: log.cost,
      cached: log.cached,
    });
  } catch (err) {
    console.error('Failed to log AI usage:', err);
    // Non-blocking: ne pas fail si le log échoue
  }
};

/**
 * Calcule le coût d'un appel API
 */
const calculateCost = (inputTokens: number, outputTokens: number, model: string): number => {
  const costs = COSTS[model as keyof typeof COSTS];
  if (!costs) return 0;
  
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  
  return inputCost + outputCost;
};

/**
 * FONCTION PRINCIPALE : Génère un menu avec IA
 */
export const generateAIMenu = async (
  userId: string,
  request: AIMenuRequest
): Promise<AIMenuResponse> => {
  console.log('🤖 Génération menu IA...', request);
  
  try {
    // 1. Vérifier le cache
    const hash = hashRequest(request);
    const cached = await getFromCache(hash);
    
    if (cached) {
      // Menu trouvé en cache
      await logAIUsage({
        userId,
        feature: 'menu_generation',
        model: MODEL,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        cached: true,
      });
      
      return {
        success: true,
        menu: cached,
        cached: true,
      };
    }
    
    // 2. Vérifier la clé API
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Clé API Anthropic manquante');
    }
    
    // 3. Appel à l'API Claude
    const prompt = buildMenuPrompt(request);
    
    console.log('📤 Appel API Claude...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      throw new Error(`API Claude erreur: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📥 Réponse reçue:', data.usage);
    
    // 4. Parser la réponse
    const content = data.content[0].text;
    const menu = parseMenuResponse(content);
    
    // 5. Sauvegarder en cache
    saveToCache(hash, menu);
    
    // 6. Logger l'usage
    const cost = calculateCost(
      data.usage.input_tokens,
      data.usage.output_tokens,
      MODEL
    );
    
    await logAIUsage({
      userId,
      feature: 'menu_generation',
      model: MODEL,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      cost,
      cached: false,
    });
    
    console.log('✅ Menu généré:', {
      days: menu.days.length,
      cost: `$${cost.toFixed(4)}`,
      tokens: data.usage.input_tokens + data.usage.output_tokens,
    });
    
    return {
      success: true,
      menu,
      cached: false,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        cost,
      },
    };
    
  } catch (err) {
    console.error('❌ Erreur génération menu:', err);
    
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue',
    };
  }
};

/**
 * Obtenir les statistiques d'usage IA pour un utilisateur
 */
export const getAIUsageStats = async (userId: string): Promise<{
  totalCalls: number;
  totalCost: number;
  cachedCalls: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('cost, cached')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const totalCalls = data.length;
    const totalCost = data.reduce((sum, log) => sum + log.cost, 0);
    const cachedCalls = data.filter(log => log.cached).length;
    
    return { totalCalls, totalCost, cachedCalls };
  } catch (err) {
    console.error('Error fetching AI stats:', err);
    return { totalCalls: 0, totalCost: 0, cachedCalls: 0 };
  }
};
