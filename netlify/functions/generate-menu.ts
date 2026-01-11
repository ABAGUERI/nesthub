// netlify/functions/generate-menu.ts
// Mode Standard : Menu 7 jours + Épicerie + Recettes (7 repas, 1 par jour)

import type { Handler, HandlerEvent } from '@netlify/functions';

interface FamilySettings {
  adults: number;
  children: number;
  restrictions: string[];
  customRestrictions?: string[];
  favoriteIngredients: string[];
  preferredCuisines: string[];
  budgetCAD?: number;
}

interface StandardModeRequest {
  userId: string;
  weekStart: string;
  familySettings: FamilySettings;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

const calculateCost = (usage: TokenUsage): number => {
  const INPUT_COST_PER_MILLION = 3.0;
  const OUTPUT_COST_PER_MILLION = 15.0;
  
  const inputCost = (usage.input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  
  return inputCost + outputCost;
};

export const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuration serveur invalide',
          message: 'Clé API manquante'
        }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Body manquant' }),
      };
    }

    const request: StandardModeRequest = JSON.parse(event.body);

    if (!request.userId || !request.weekStart || !request.familySettings) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Paramètres invalides',
          message: 'userId, weekStart et familySettings requis'
        }),
      };
    }

    const { familySettings } = request;
    const totalPeople = familySettings.adults + familySettings.children;
    
    const prompt = buildStandardPrompt(totalPeople, familySettings);

    console.log('📤 Appel API Anthropic - Mode Standard');
    console.log('User:', request.userId);
    console.log('Famille:', totalPeople, 'personnes');
    console.log('Restrictions:', familySettings.restrictions);
    console.log('Envies:', familySettings.favoriteIngredients);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur API Anthropic:', response.status, errorText);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Erreur API Anthropic',
          status: response.status,
          message: errorText,
        }),
      };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    if (!text) {
      console.error('❌ Réponse vide de Claude');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Réponse API invalide',
          message: 'Aucun contenu généré',
        }),
      };
    }

    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Pas de JSON trouvé dans la réponse');
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      console.error('Texte reçu:', text.substring(0, 500));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Format réponse invalide',
          message: 'Impossible de parser le résultat',
        }),
      };
    }

    if (!result.menu || !result.grocery || !result.recipes) {
      console.error('❌ Structure invalide:', Object.keys(result));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Structure réponse invalide',
          message: 'Menu, épicerie ou recettes manquant',
        }),
      };
    }

    const usage: TokenUsage = {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
    };
    const cost = calculateCost(usage);

    console.log('✅ Menu + Épicerie + Recettes générés:', {
      userId: request.userId,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cost: `$${cost.toFixed(6)}`,
      menuDays: Object.keys(result.menu).length,
      recipesCount: Object.keys(result.recipes).length,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        menu: result.menu,
        grocery: result.grocery,
        recipes: result.recipes,
        usage: {
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          total_tokens: usage.input_tokens + usage.output_tokens,
          estimated_cost_usd: cost,
        },
      }),
    };

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur serveur',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
    };
  }
};

function buildStandardPrompt(totalPeople: number, settings: FamilySettings): string {
  let prompt = `Tu es un chef cuisinier expert qui génère des menus hebdomadaires complets avec recettes et liste d'épicerie.

FAMILLE : ${totalPeople} personnes (${settings.adults} adultes + ${settings.children} enfants)
`;

  // Restrictions
  if (settings.restrictions.length > 0 || settings.customRestrictions?.length) {
    prompt += `\nRESTRICTIONS ALIMENTAIRES :`;
    settings.restrictions.forEach(r => {
      const labels: Record<string, string> = {
        vegetarian: 'Végétarien',
        vegan: 'Végétalien', 
        gluten_free: 'Sans gluten',
        lactose_free: 'Sans lactose',
        no_pork: 'Sans porc',
        halal: 'Halal',
        kosher: 'Casher',
      };
      prompt += `\n- ${labels[r] || r}`;
    });
    if (settings.customRestrictions) {
      settings.customRestrictions.forEach(c => {
        prompt += `\n- ${c}`;
      });
    }
  }

  // Envies (favoriteIngredients utilisé pour stocker les envies semaine)
  if (settings.favoriteIngredients.length > 0) {
    prompt += `\n\nENVIES CETTE SEMAINE : ${settings.favoriteIngredients.join(', ')}`;
  }

  // Cuisines
  if (settings.preferredCuisines.length > 0) {
    prompt += `\n\nCUISINES PRÉFÉRÉES : ${settings.preferredCuisines.join(', ')}`;
  }

  // Budget
  if (settings.budgetCAD) {
    prompt += `\n\nBUDGET : ${settings.budgetCAD} CAD/semaine`;
  }

  prompt += `

TÂCHE : Génère un menu complet pour 7 jours avec recettes détaillées et liste d'épicerie.

CONTRAINTES MENU :
- 1 REPAS par jour (dîner uniquement)
- Recettes adaptées à ${totalPeople} personnes
- Temps préparation 30-45 min max
- Ingrédients courants et accessibles
- Variété de cuisines et saveurs
- Équilibre nutritionnel
- Noms courts (max 24 caractères)

CONTRAINTES RECETTES :
- 3 ingrédients MAXIMUM par recette
- 2 étapes MAXIMUM (très courtes)

CONTRAINTES ÉPICERIE :
- Quantités adaptées pour ${totalPeople} personnes
- Ingrédients groupés par catégories
- Format : "Nom quantité" (ex: "Poulet 1.5kg")
- Couvrir TOUS les ingrédients des 7 recettes

FORMAT DE RÉPONSE (STRICT JSON) :
{
  "menu": {
    "monday": "Spaghetti bolognaise",
    "tuesday": "Poulet au curry",
    "wednesday": "Tacos de bœuf",
    "thursday": "Saumon grillé",
    "friday": "Pizza margherita",
    "saturday": "Bœuf sauté",
    "sunday": "Rôti de porc"
  },
  "grocery": {
    "Viandes & Poissons": ["Bœuf haché 500g", "Poulet 1.5kg", ...],
    "Légumes": ["Tomates 1kg", "Laitue 2 unités", ...],
    "Fruits": ["Pommes 1kg", ...],
    "Féculents": ["Pâtes 500g", "Riz 1kg", ...],
    "Produits laitiers": ["Lait 2L", ...],
    "Épices & condiments": ["Huile olive", ...]
  },
  "recipes": {
    "monday": {
      "name": "Spaghetti bolognaise",
      "time": "30 min",
      "servings": ${totalPeople},
      "ingredients": ["Spaghetti 400g", "Bœuf 300g", "Tomates 500g"],
      "steps": [
        "Cuire pâtes, préparer sauce",
        "Mélanger et servir"
      ]
    },
    "tuesday": {...},
    ...
  }
}

IMPORTANT :
- RETOURNE SEULEMENT LE JSON, aucun texte avant ou après
- 7 recettes complètes (1 par jour)
- MAXIMUM 3 ingrédients et 2 étapes par recette
- Vérifie que TOUS les ingrédients des recettes sont dans l'épicerie
- Respecte STRICTEMENT les restrictions alimentaires
- Prends en compte les envies semaine pour guider tes choix`;

  return prompt;
}
