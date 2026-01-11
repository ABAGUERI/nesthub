// netlify/functions/generate-quick-recipes.ts
// Mode "Tout ce qui" : 3 recettes avec ingrédients disponibles

import type { Handler, HandlerEvent } from '@netlify/functions';

interface AvailableIngredient {
  name: string;
  quantity: string;
}

interface FamilySettings {
  adults: number;
  children: number;
  restrictions: string[];
  customRestrictions?: string[];
}

interface QuickModeRequest {
  userId: string;
  ingredients: AvailableIngredient[];
  condiments: string[];
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

    const request: QuickModeRequest = JSON.parse(event.body);

    if (!request.userId || !request.ingredients || !request.familySettings) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Paramètres invalides',
          message: 'userId, ingredients et familySettings requis'
        }),
      };
    }

    const { familySettings, ingredients, condiments } = request;
    const totalPeople = familySettings.adults + familySettings.children;
    
    const prompt = buildQuickPrompt(totalPeople, familySettings, ingredients, condiments);

    console.log('📤 Appel API Anthropic - Mode "Tout ce qui"');
    console.log('User:', request.userId);
    console.log('Famille:', totalPeople, 'personnes');
    console.log('Ingrédients:', ingredients.length);
    console.log('Condiments:', condiments.length);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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

    if (!result.recipes || !Array.isArray(result.recipes)) {
      console.error('❌ Structure invalide:', result);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Structure réponse invalide',
          message: 'Recettes manquantes ou format invalide',
        }),
      };
    }

    const usage: TokenUsage = {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
    };
    const cost = calculateCost(usage);

    console.log('✅ Recettes rapides générées:', {
      userId: request.userId,
      recipesCount: result.recipes.length,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cost: `$${cost.toFixed(6)}`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recipes: result.recipes,
        ingredientsLeftover: result.ingredientsLeftover || [],
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

function buildQuickPrompt(
  totalPeople: number, 
  settings: FamilySettings,
  ingredients: AvailableIngredient[],
  condiments: string[]
): string {
  const condimentLabels: Record<string, string> = {
    olive_oil: 'Huile d\'olive',
    salt_pepper: 'Sel, poivre',
    garlic: 'Ail',
    butter: 'Beurre',
    spices: 'Épices courantes (paprika, cumin, etc.)',
    soy_sauce: 'Sauce soja',
    vinegar: 'Vinaigre',
    mustard: 'Moutarde',
    bouillon: 'Bouillon cube',
  };

  let prompt = `Tu es un chef qui aide à cuisiner avec les ingrédients disponibles.

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

  prompt += `\n\nINGRÉDIENTS DISPONIBLES :`;
  ingredients.forEach(ing => {
    prompt += `\n- ${ing.name} ${ing.quantity}`;
  });

  prompt += `\n\nCONDIMENTS DISPONIBLES :`;
  condiments.forEach(c => {
    prompt += `\n- ${condimentLabels[c] || c}`;
  });

  prompt += `

TÂCHE : Propose 3 recettes différentes utilisant UNIQUEMENT les ingrédients et condiments listés.

CONTRAINTES :
- Utiliser UNIQUEMENT les ingrédients disponibles
- 3 recettes variées (pas de répétition)
- Temps préparation < 45 min
- Recettes adaptées à ${totalPeople} personnes
- 3-5 étapes synthétiques par recette
- Si ingrédients insuffisants, le mentionner

FORMAT DE RÉPONSE (STRICT JSON) :
{
  "recipes": [
    {
      "name": "Nom de la recette",
      "time": "25 min",
      "servings": ${totalPeople},
      "difficulty": "Facile",
      "ingredients": ["Poulet 2 poitrines", "Tomates 4 unités", "Oignons 1 unité", "Ail", "Huile"],
      "steps": [
        "Étape 1 claire et concise",
        "Étape 2 claire et concise",
        "Étape 3 claire et concise"
      ],
      "dietary_notes": "Végétarien" (optionnel)
    },
    {
      "name": "Recette 2",
      ...
    },
    {
      "name": "Recette 3",
      ...
    }
  ],
  "ingredientsLeftover": ["Fromage râpé (non utilisé)", "Oignons 1 unité (reste)"]
}

IMPORTANT :
- RETOURNE SEULEMENT LE JSON, aucun texte avant ou après
- Exactement 3 recettes
- Chaque recette utilise UNIQUEMENT les ingrédients disponibles
- 3-5 étapes max par recette
- Indique les ingrédients restants non utilisés`;

  return prompt;
}
