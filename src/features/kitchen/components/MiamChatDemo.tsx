import React, { useState, useEffect, useRef } from 'react';
import './MiamChatDemo.css';

interface Recipe {
  emoji: string;
  name: string;
}

const RECIPES: Recipe[] = [
  { emoji: '🧆', name: 'Kefta marocaines aux légumes grillés' },
  { emoji: '🥩', name: 'Brochettes de bœuf à la grecque avec salade tiède' },
  { emoji: '🐟', name: 'Saumon en croûte méditerranéenne' },
  { emoji: '🐠', name: 'Morue à la provençale avec pommes de terre' },
];

const USER_MESSAGE =
  'Pour 2 adultes, 2 enfants de 6 ans, propose-moi 4 recettes équilibrées, cuisine méditerranéenne à base de viande rouge et de poisson 🍽️';

type AnimPhase =
  | 'idle'
  | 'open'
  | 'greeting'
  | 'user-typing'
  | 'user-done'
  | 'thinking'
  | 'recipe-0'
  | 'recipe-1'
  | 'recipe-2'
  | 'recipe-3'
  | 'done';

export const MiamChatDemo: React.FC = () => {
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [typedText, setTypedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const schedule = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [phase, typedText]);

  // Start animation on mount
  useEffect(() => {
    schedule(() => {
      setIsVisible(true);
      setPhase('open');
    }, 600);

    return () => clearTimeouts();
  }, []);

  // Animation sequence
  useEffect(() => {
    if (phase === 'open') {
      schedule(() => setPhase('greeting'), 800);
    }

    if (phase === 'greeting') {
      schedule(() => setPhase('user-typing'), 1400);
    }

    if (phase === 'user-typing') {
      // Typewriter effect for user message
      let charIndex = 0;
      const typeNextChar = () => {
        if (charIndex < USER_MESSAGE.length) {
          setTypedText(USER_MESSAGE.slice(0, charIndex + 1));
          charIndex++;
          // Faster for spaces, slower for punctuation
          const ch = USER_MESSAGE[charIndex - 1];
          const delay = ch === ' ' ? 20 : ch === ',' ? 80 : 35;
          schedule(typeNextChar, delay);
        } else {
          schedule(() => setPhase('user-done'), 400);
        }
      };
      schedule(typeNextChar, 300);
    }

    if (phase === 'user-done') {
      schedule(() => setPhase('thinking'), 600);
    }

    if (phase === 'thinking') {
      schedule(() => setPhase('recipe-0'), 1800);
    }

    if (phase === 'recipe-0') {
      schedule(() => setPhase('recipe-1'), 500);
    }
    if (phase === 'recipe-1') {
      schedule(() => setPhase('recipe-2'), 500);
    }
    if (phase === 'recipe-2') {
      schedule(() => setPhase('recipe-3'), 500);
    }
    if (phase === 'recipe-3') {
      schedule(() => setPhase('done'), 600);
    }
  }, [phase]);

  // Compute visible recipe count
  const visibleRecipes =
    phase === 'recipe-0' ? 1
    : phase === 'recipe-1' ? 2
    : phase === 'recipe-2' ? 3
    : phase === 'recipe-3' || phase === 'done' ? 4
    : 0;

  const showGreeting = phase !== 'idle' && phase !== 'open';
  const showUserBubble = ['user-typing', 'user-done', 'thinking', 'recipe-0', 'recipe-1', 'recipe-2', 'recipe-3', 'done'].includes(phase);
  const showThinking = phase === 'thinking';
  const showRecipes = visibleRecipes > 0;

  return (
    <div className={`miam-chat-demo ${isVisible ? 'visible' : ''}`}>
      {/* Chat header */}
      <div className="miam-chat-header">
        <div className="miam-avatar">
          <span className="miam-avatar-emoji">🍳</span>
          <span className="miam-online-dot" />
        </div>
        <div className="miam-header-info">
          <span className="miam-name">mIAm</span>
          <span className="miam-status">Assistant culinaire IA</span>
        </div>
      </div>

      {/* Chat body */}
      <div className="miam-chat-body" ref={chatBodyRef}>
        {/* Greeting from mIAm */}
        {showGreeting && (
          <div className="miam-msg miam-msg-bot fade-in-up">
            <span className="miam-msg-avatar">🍳</span>
            <div className="miam-msg-bubble miam-bubble-bot">
              Bonjour ! Je suis <strong>mIAm</strong> 👋 Dites-moi ce que vous souhaitez cuisiner cette semaine !
            </div>
          </div>
        )}

        {/* User message */}
        {showUserBubble && (
          <div className="miam-msg miam-msg-user fade-in-up">
            <div className="miam-msg-bubble miam-bubble-user">
              {phase === 'user-typing' ? typedText : USER_MESSAGE}
              {phase === 'user-typing' && <span className="typing-cursor">|</span>}
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {showThinking && (
          <div className="miam-msg miam-msg-bot fade-in-up">
            <span className="miam-msg-avatar">🍳</span>
            <div className="miam-msg-bubble miam-bubble-bot miam-thinking">
              <span className="dot-pulse">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

        {/* Recipes response */}
        {showRecipes && (
          <div className="miam-msg miam-msg-bot fade-in-up">
            <span className="miam-msg-avatar">🍳</span>
            <div className="miam-msg-bubble miam-bubble-bot miam-recipes-bubble">
              <div className="miam-recipes-header">
                Voici 4 recettes méditerranéennes pour votre famille 👨‍👩‍👧‍👦
              </div>
              <div className="miam-recipes-list">
                {RECIPES.slice(0, visibleRecipes).map((recipe, i) => (
                  <div
                    key={i}
                    className="miam-recipe-item fade-in-up"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="miam-recipe-emoji">{recipe.emoji}</span>
                    <span className="miam-recipe-name">{recipe.name}</span>
                    <button
                      className="miam-recipe-plus"
                      type="button"
                      title="Voir la recette"
                      tabIndex={-1}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
              {phase === 'done' && (
                <div className="miam-recipes-footer fade-in-up">
                  Appuyez sur <strong>+</strong> pour voir le détail de la recette 🧑‍🍳
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
