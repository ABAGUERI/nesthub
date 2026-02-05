import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MiamChatCarousel.css';

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
  | 'done'
  | 'pause';

export const MiamChatCarousel: React.FC = () => {
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [typedText, setTypedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const resetAnimation = useCallback(() => {
    clearTimeouts();
    setPhase('idle');
    setTypedText('');
    setIsVisible(false);

    schedule(() => {
      setIsVisible(true);
      setPhase('open');
    }, 400);
  }, [clearTimeouts, schedule]);

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
    }, 400);

    return () => clearTimeouts();
  }, []);

  // Animation sequence (faster timings for carousel)
  useEffect(() => {
    if (phase === 'open') {
      schedule(() => setPhase('greeting'), 500);
    }

    if (phase === 'greeting') {
      schedule(() => setPhase('user-typing'), 900);
    }

    // ✅ Typing humain (ralenti + pauses naturelles)
    if (phase === 'user-typing') {
      let charIndex = 0;

      const randomBetween = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1) + min);

      const humanDelay = (ch: string) => {
        // Pauses naturelles
        if (ch === ' ') return randomBetween(60, 140);
        if (ch === ',' || ch === ';' || ch === ':') return randomBetween(160, 260);
        if (ch === '.' || ch === '!' || ch === '?') return randomBetween(220, 360);

        // Vitesse de frappe variable
        let base = randomBetween(35, 110);

        // Micro-pause occasionnelle (effet humain)
        if (Math.random() < 0.03) base += randomBetween(120, 240);

        return base;
      };

      const typeNextChar = () => {
        if (charIndex < USER_MESSAGE.length) {
          setTypedText(USER_MESSAGE.slice(0, charIndex + 1));
          const ch = USER_MESSAGE[charIndex];
          charIndex++;
          schedule(typeNextChar, humanDelay(ch));
        } else {
          schedule(() => setPhase('user-done'), 450);
        }
      };

      // Petit temps avant que l'utilisateur "commence à taper"
      schedule(typeNextChar, 650);
    }

    if (phase === 'user-done') {
      schedule(() => setPhase('thinking'), 400);
    }

    if (phase === 'thinking') {
      schedule(() => setPhase('recipe-0'), 1200);
    }

    if (phase === 'recipe-0') {
      schedule(() => setPhase('recipe-1'), 350);
    }
    if (phase === 'recipe-1') {
      schedule(() => setPhase('recipe-2'), 350);
    }
    if (phase === 'recipe-2') {
      schedule(() => setPhase('recipe-3'), 350);
    }
    if (phase === 'recipe-3') {
      schedule(() => setPhase('done'), 400);
    }

    if (phase === 'done') {
      // Pause then loop
      schedule(() => setPhase('pause'), 4000);
    }

    if (phase === 'pause') {
      resetAnimation();
    }
  }, [phase, resetAnimation, schedule]);

  // Compute visible recipe count
  const visibleRecipes =
    phase === 'recipe-0' ? 1
    : phase === 'recipe-1' ? 2
    : phase === 'recipe-2' ? 3
    : phase === 'recipe-3' || phase === 'done' || phase === 'pause' ? 4
    : 0;

  const showGreeting = phase !== 'idle' && phase !== 'open';
  const showUserBubble = ['user-typing', 'user-done', 'thinking', 'recipe-0', 'recipe-1', 'recipe-2', 'recipe-3', 'done', 'pause'].includes(phase);
  const showThinking = phase === 'thinking';
  const showRecipes = visibleRecipes > 0;

  return (
    <div className={`mcc-chat ${isVisible ? 'mcc-visible' : ''}`}>
      {/* Mini header */}
      <div className="mcc-header">
        <div className="mcc-avatar">
          <span className="mcc-avatar-emoji">🍳</span>
          <span className="mcc-online-dot" />
        </div>
        <div className="mcc-header-info">
          <span className="mcc-name">mIAm</span>
          <span className="mcc-status">Assistant culinaire IA</span>
        </div>
      </div>

      {/* Chat body */}
      <div className="mcc-body" ref={chatBodyRef}>
        {/* Greeting */}
        {showGreeting && (
          <div className="mcc-msg mcc-msg-bot mcc-fade-in">
            <span className="mcc-msg-icon">🍳</span>
            <div className="mcc-bubble mcc-bubble-bot">
              Bonjour ! Je suis <strong>mIAm</strong> 👋 Dites-moi ce que vous souhaitez cuisiner !
            </div>
          </div>
        )}

        {/* User message */}
        {showUserBubble && (
          <div className="mcc-msg mcc-msg-user mcc-fade-in">
            <div className="mcc-bubble mcc-bubble-user">
              {phase === 'user-typing' ? typedText : USER_MESSAGE}
              {phase === 'user-typing' && <span className="mcc-cursor">|</span>}
            </div>
          </div>
        )}

        {/* Thinking */}
        {showThinking && (
          <div className="mcc-msg mcc-msg-bot mcc-fade-in">
            <span className="mcc-msg-icon">🍳</span>
            <div className="mcc-bubble mcc-bubble-bot mcc-thinking">
              <span className="mcc-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

        {/* Recipes */}
        {showRecipes && (
          <div className="mcc-msg mcc-msg-bot mcc-fade-in">
            <span className="mcc-msg-icon">🍳</span>
            <div className="mcc-bubble mcc-bubble-bot mcc-recipes-bubble">
              <div className="mcc-recipes-title">
                Voici 4 recettes pour votre famille 👨‍👩‍👧‍👦
              </div>
              <div className="mcc-recipes-list">
                {RECIPES.slice(0, visibleRecipes).map((recipe, i) => (
                  <div
                    key={i}
                    className="mcc-recipe mcc-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="mcc-recipe-emoji">{recipe.emoji}</span>
                    <span className="mcc-recipe-name">{recipe.name}</span>
                    <button
                      className="mcc-recipe-plus"
                      type="button"
                      title="Voir la recette"
                      tabIndex={-1}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
              {(phase === 'done' || phase === 'pause') && (
                <div className="mcc-footer mcc-fade-in">
                  Appuyez sur <strong>+</strong> pour voir la recette 🧑‍🍳
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
