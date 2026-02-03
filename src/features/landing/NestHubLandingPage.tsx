import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './NestHubLandingPage.css';

// Feature flag for Alpha mode
// const ALPHA_MODE = import.meta.env.VITE_ALPHA_MODE === 'true';
const ALPHA_MODE =true

const FAQ_ITEMS = [
  {
    question: 'Comment ajouter mes enfants à Cap Famille O ?',
    answer:
      "Après votre inscription, accédez à l'onglet Configuration > Famille. Vous pouvez ajouter jusqu'à 4 membres de famille (enfants ou adultes). Chaque enfant reçoit un avatar personnalisé (abeille, coccinelle, papillon ou chenille) et peut être configuré avec son âge pour adapter les tâches.",
  },
  {
    question: 'Comment fonctionne le système de points et récompenses ?',
    answer:
      "Les enfants gagnent des points en complétant leurs tâches quotidiennes. Ces points s'accumulent pour monter de niveau (Bronze → Argent → Or → Diamant). Chaque niveau débloqué peut donner une récompense en argent de poche. Les points peuvent aussi être convertis automatiquement en dollars selon un taux que vous définissez (ex: 20 points = 1 CAD).",
  },
  {
    question: "Comment gérer le temps d'écran de mes enfants ?",
    answer:
      "Configurez un budget hebdomadaire en minutes pour chaque enfant (ex: 420 min/semaine). Ce budget est divisé en « cœurs » (vies). Quand un enfant utilise du temps d'écran, il consomme des cœurs. Le système se réinitialise automatiquement chaque semaine. L'enfant voit clairement combien de temps il lui reste, ce qui évite les négociations.",
  },
  {
    question: 'Comment fonctionne la tirelire (cochon) ?',
    answer:
      "Chaque enfant peut créer jusqu'à 8 projets d'épargne actifs (ex: « Nouveau vélo », « Console de jeux »). L'argent gagné via les tâches s'accumule automatiquement. L'enfant peut suivre sa progression vers son objectif et apprendre à faire des choix financiers : dépenser maintenant ou économiser pour un projet plus grand ?",
  },
  {
    question: "Comment Cap Famille O génère-t-il les menus de la semaine ?",
    answer:
      "Cap Famille O utilise l'intelligence artificielle pour créer des menus personnalisés. Configurez vos préférences (nombre de personnes, restrictions alimentaires, cuisines préférées, budget) et l'IA génère un menu complet pour 7 jours avec la liste d'épicerie correspondante. Vous pouvez aussi planifier manuellement vos repas.",
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer:
      "Absolument. Vos données sont hébergées de façon sécurisée et isolées par famille grâce à notre système de Row Level Security (RLS). Aucun partenaire n'a accès à vos données familiales. Nous ne vendons jamais vos informations. Cap Famille O est développé au Québec avec les valeurs de confidentialité qui nous tiennent à cœur.",
  },
  {
    question: 'Cap Famille O fonctionne-t-il avec Google Calendar et Google Tasks ?',
    answer:
      "Oui ! Cap Famille O s'intègre avec votre compte Google pour synchroniser votre calendrier familial, vos listes de tâches et même vos photos via Google Drive. Connectez votre compte lors de l'assistant de configuration et choisissez les modules que vous souhaitez activer.",
  },
  {
    question: 'Puis-je utiliser Cap Famille O sur plusieurs appareils ?',
    answer:
      "Oui, Cap Famille O fonctionne sur tous vos appareils via le navigateur web. Idéalement, installez-le sur une tablette dans votre cuisine comme « tableau de bord familial », mais chaque membre peut aussi y accéder depuis son téléphone ou ordinateur.",
  },
];

export function NestHubLandingPage() {
  const piggyAmountRef = useRef<HTMLSpanElement | null>(null);
  const savingsAmountRef = useRef<HTMLSpanElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Savings demo state
  const [savingsTotal, setSavingsTotal] = useState(28);
  const [droneSaved, setDroneSaved] = useState(16);
  const [legoSaved, setLegoSaved] = useState(12);
  const [coinAnimation, setCoinAnimation] = useState<'drone' | 'lego' | null>(null);

  // Progress navigation state
  const [activeSection, setActiveSection] = useState('hero');

  // Matrix typing animation for brand name: "CAP FAMILLE O" → "CAP FAMILLE Organisée"
  const [typedSuffix, setTypedSuffix] = useState('');
  const suffixTarget = 'rganisée';

  useEffect(() => {
    let charIndex = 0;
    let isTyping = true;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (isTyping) {
        charIndex++;
        setTypedSuffix(suffixTarget.slice(0, charIndex));
        if (charIndex >= suffixTarget.length) {
          isTyping = false;
          timeout = setTimeout(tick, 2500); // pause before erasing
        } else {
          timeout = setTimeout(tick, 120); // typing speed
        }
      } else {
        charIndex--;
        setTypedSuffix(suffixTarget.slice(0, charIndex));
        if (charIndex <= 0) {
          isTyping = true;
          timeout = setTimeout(tick, 1200); // pause before retyping
        } else {
          timeout = setTimeout(tick, 60); // erasing speed
        }
      }
    };

    timeout = setTimeout(tick, 1500); // initial delay
    return () => clearTimeout(timeout);
  }, []);

  // Progress sections configuration
  const progressSections = [
    { id: 'hero', label: 'Hub familial', icon: '🏠' },
    { id: 'how-it-works', label: 'Comment ça marche ?', icon: '❓' },
    { id: 'autonomy', label: 'Autonomie développée', icon: '🌱' },
    { id: 'finance', label: 'Futur investisseur', icon: '💰' },
    { id: 'features', label: 'Organisation partagée', icon: '👨‍👩‍👧‍👦' },
    { id: 'kitchen', label: 'Écran Cuisine', icon: '🍽️' },
    { id: 'memories', label: 'Cadre numérique', icon: '🖼️' },
  ];

  // Handle adding money to savings
  const handleAddToSavings = useCallback((project: 'drone' | 'lego') => {
    setCoinAnimation(project);

    setTimeout(() => {
      if (project === 'drone') {
        setDroneSaved((prev) => Math.min(prev + 2, 100));
      } else {
        setLegoSaved((prev) => Math.min(prev + 2, 64));
      }
      setSavingsTotal((prev) => prev + 2);
      setCoinAnimation(null);
    }, 800);
  }, []);

  // Reset savings demo
  const handleResetSavings = useCallback(() => {
    setSavingsTotal(28);
    setDroneSaved(16);
    setLegoSaved(12);
  }, []);

  // Scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = progressSections.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(progressSections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Piggy bank amount animation
  useEffect(() => {
    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let start = 0;
    let from = 28;
    let to = 29;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 900, 1);
      const value = Math.round(from + (to - from) * progress);
      if (piggyAmountRef.current) {
        piggyAmountRef.current.textContent = `${value} CAD`;
      }
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        start = 0;
        [from, to] = [to, from];
        timeoutId = setTimeout(() => requestAnimationFrame(animate), 1800);
      }
    };
    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Savings amount animation for the financial education section
  useEffect(() => {
    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let start = 0;
    let from = 16;
    let to = 17;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 1200, 1);
      const value = Math.round(from + (to - from) * progress);
      if (savingsAmountRef.current) {
        savingsAmountRef.current.textContent = `${value} $`;
      }
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        start = 0;
        [from, to] = [to, from];
        timeoutId = setTimeout(() => requestAnimationFrame(animate), 2500);
      }
    };
    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Sticky header scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        if (window.scrollY > 50) {
          headerRef.current.classList.add('is-scrolled');
        } else {
          headerRef.current.classList.remove('is-scrolled');
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll reveal animations
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.querySelectorAll('.scroll-reveal').forEach((el) => {
        el.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const toggleFaq = useCallback((index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="nesthub-landing">
      <div className="nesthub-landing__glow" aria-hidden="true" />

      {/* Subtle premium "life" layer */}
      <div className="nesthub-landing__stars" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`star star--${(i % 6) + 1}`} />
        ))}
      </div>

      {/* Vertical Progress Navigation */}
      <nav className="progress-nav" aria-label="Navigation de page">
        <div className="progress-nav__line" />
        {progressSections.map((section, index) => (
          <button
            key={section.id}
            type="button"
            className={`progress-nav__item ${activeSection === section.id ? 'is-active' : ''}`}
            onClick={() => scrollToSection(section.id)}
            aria-label={section.label}
            style={{ '--index': index } as React.CSSProperties}
          >
            <span className="progress-nav__dot">{section.icon}</span>
            <span className="progress-nav__label">{section.label}</span>
          </button>
        ))}
      </nav>

      <header ref={headerRef} className="nesthub-landing__header">
        <div className="nesthub-landing__header-inner">
          <div className="nesthub-landing__brand">
            Cap Famille O<span className="brand-matrix">{typedSuffix}</span><span className="brand-cursor">_</span>
          </div>
          <nav className="nesthub-landing__nav">
            {!ALPHA_MODE && (
              <a href="#tarifs" className="nesthub-landing__nav-link">
                Tarifs
              </a>
            )}
            <a href="#faq" className="nesthub-landing__nav-link">
              FAQ
            </a>
            <Link to="/login" className="nesthub-landing__nav-link">
              Se connecter
            </Link>
            <Link to={ALPHA_MODE ? '/alpha' : '/signup'} className="nesthub-landing__nav-cta">
              {ALPHA_MODE ? 'Rejoindre la liste d\'attente' : 'Créer mon espace familial'}
            </Link>
          </nav>
        </div>
      </header>

      <main className="nesthub-landing__main">
        <section id="hero" className="nesthub-landing__hero">
          <div className="nesthub-landing__hero-copy scroll-reveal">
            <p className="nesthub-landing__eyebrow">Projet Cap Famille O – Alpha</p>
            <h1>Le hub familial qui transforme l'organisation en terrain de jeu</h1>
            <p className="nesthub-landing__subtitle">
              Développé à Québec, dans le quartier de Limoilou.
              <br />
              Une solution locale, pensée pour les familles d'ici, avec les réalités
              d'aujourd'hui.
            </p>
            <div className="nesthub-landing__cta">
              <Link to={ALPHA_MODE ? '/alpha' : '/signup'} className="nesthub-landing__cta-primary">
                {ALPHA_MODE ? 'Rejoindre la liste d\'attente' : 'Créer mon espace familial'}
              </Link>
              <Link to="/login" className="nesthub-landing__cta-secondary">
                Se connecter
              </Link>
            </div>
            <div className="nesthub-landing__hero-note">
              Mise en place rapide · Sans carte de crédit · Pensé pour évoluer avec vos
              enfants
            </div>
          </div>

          <div className="nesthub-landing__hero-visual scroll-reveal scroll-reveal--delay-2">
            <div className="device-mockup">
              <div className="device-mockup__inner">
                {/* Dashboard header inside screen */}
                <div className="device-mockup__dash-header">
                  <div className="dm-time-group">
                    <span className="dm-time">08:35</span>
                    <span className="dm-date">Jeu. 29 janv.</span>
                  </div>
                  <div className="dm-header-title">
                    <span className="dm-section-title">Cap Famille O<span className="brand-matrix brand-matrix--sm">{typedSuffix}</span></span>
                  </div>
                  <div className="dm-nav-btns">
                    <span className="dm-nav-btn dm-nav-btn--active">🏠</span>
                    <span className="dm-nav-btn">👨‍👩‍👧‍👦</span>
                    <span className="dm-nav-btn">📅</span>
                    <span className="dm-nav-btn">🍽️</span>
                  </div>
                </div>

                {/* Cycling screen content */}
                <div className="device-mockup__viewport">
                  <div className="device-mockup__track" aria-hidden="true">

                  {/* ── Screen 1: Children / Progress ── */}
                  <article className="dm-screen dm-screen--children">
                    <div className="dm-child-switcher">
                      <button className="dm-pill dm-pill--active" type="button">
                        <span className="dm-pill__icon">👦</span>
                        <span className="dm-pill__name">Charlotte</span>
                      </button>
                      <button className="dm-pill" type="button">
                        <span className="dm-pill__icon">👧</span>
                        <span className="dm-pill__name">Georges</span>
                      </button>
                      <button className="dm-pill" type="button">
                        <span className="dm-pill__icon">🧒</span>
                        <span className="dm-pill__name">Lucas</span>
                      </button>
                    </div>
                    <div className="dm-donut-hearts">
                      <div className="dm-donut-wrapper">
                        <div className="dm-donut-stack">
                          <svg className="dm-donut-chart" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#dmDonutGrad)" strokeWidth="12"
                              strokeDasharray="240 327" strokeLinecap="round"
                              transform="rotate(-90 60 60)" />
                            <defs>
                              <linearGradient id="dmDonutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#22d3ee" />
                                <stop offset="100%" stopColor="#a855f7" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="dm-donut-avatar">👦</div>
                        </div>
                        <div className="dm-progress-track">
                          <div className="dm-progress-label">
                            <span>Progression</span>
                            <span className="dm-progress-value">455 / 1000</span>
                          </div>
                          <div className="dm-progress-bar">
                            <div className="dm-progress-fill" style={{ width: '46%' }} />
                          </div>
                        </div>
                      </div>
                      <div className="dm-hearts-col">
                        <span className="dm-hearts-title">TEMPS D'ÉCRAN</span>
                        <div className="dm-hearts-list">
                          <span className="dm-heart dm-heart--on">❤️</span>
                          <span className="dm-heart dm-heart--on">❤️</span>
                          <span className="dm-heart dm-heart--on">❤️</span>
                          <span className="dm-heart dm-heart--on">❤️</span>
                          <span className="dm-heart dm-heart--losing">❤️</span>
                        </div>
                        <span className="dm-hearts-meta">0 / 420 min</span>
                        <div className="dm-hearts-anim">
                          <span className="dm-minus-badge">-60 min</span>
                          <span className="dm-heart-fly">💔</span>
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* ── Screen 2: Daily Tasks ── */}
                  <article className="dm-screen dm-screen--tasks">
                    <div className="dm-widget-header">
                      <span className="dm-widget-title">Tâches du jour</span>
                      <span className="dm-widget-badge">6 tâches</span>
                    </div>
                    <div className="dm-tasks-grid">
                      <div className="dm-task-card dm-task-card--done dm-tone-blue">
                        <span className="dm-task-icon">📱</span>
                        <span className="dm-task-name">Temps d'écran</span>
                        <span className="dm-task-done-badge">✔ Fait</span>
                      </div>
                      <div className="dm-task-card dm-tone-violet">
                        <span className="dm-task-icon">🧹</span>
                        <span className="dm-task-name">Ranger chambre</span>
                      </div>
                      <div className="dm-task-card dm-tone-green">
                        <span className="dm-task-icon">📖</span>
                        <span className="dm-task-name">Lire 20 min</span>
                      </div>
                      <div className="dm-task-card dm-tone-orange">
                        <span className="dm-task-icon">🎹</span>
                        <span className="dm-task-name">Piano</span>
                      </div>
                      <div className="dm-task-card dm-tone-cyan">
                        <span className="dm-task-icon">🐕</span>
                        <span className="dm-task-name">Promener Max</span>
                      </div>
                      <div className="dm-task-card dm-tone-violet">
                        <span className="dm-task-icon">🎒</span>
                        <span className="dm-task-name">Sac d'école</span>
                      </div>
                    </div>
                    <div className="dm-tasks-nav">
                      <button className="dm-tasks-nav-btn" type="button" disabled>‹</button>
                      <span className="dm-tasks-nav-label">1 / 2</span>
                      <button className="dm-tasks-nav-btn" type="button">›</button>
                    </div>
                  </article>

                  {/* ── Screen 3: Calendar ── */}
                  <article className="dm-screen dm-screen--calendar">
                    <div className="dm-widget-header">
                      <span className="dm-widget-title">Calendrier</span>
                      <span className="dm-widget-badge">3 événements</span>
                    </div>
                    <div className="dm-timeline">
                      <div className="dm-timeline-group">
                        <div className="dm-timeline-day">Aujourd'hui</div>
                        <div className="dm-event-card dm-event--urgent">
                          <div className="dm-event-time-row">
                            <span className="dm-event-time">09:00</span>
                            <span className="dm-event-relative">Dans 25 min</span>
                          </div>
                          <span className="dm-event-title">Dentiste — Charlotte</span>
                        </div>
                        <div className="dm-event-card dm-event--soon">
                          <div className="dm-event-time-row">
                            <span className="dm-event-time">14:30</span>
                            <span className="dm-event-relative">Cet après-midi</span>
                          </div>
                          <span className="dm-event-title">Judo — Georges</span>
                        </div>
                      </div>
                      <div className="dm-timeline-group">
                        <div className="dm-timeline-day">Demain</div>
                        <div className="dm-event-card dm-event--future">
                          <div className="dm-event-time-row">
                            <span className="dm-event-time">10:00</span>
                          </div>
                          <span className="dm-event-title">Réunion parents</span>
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* ── Screen 4: Menu semaine (matches screenshot) ── */}
                  <article className="dm-screen dm-screen--menu">
                    {/* Menu header bar */}
                    <div className="dm-menu-header">
                      <span className="dm-menu-title">Menu de la semaine</span>
                      <div className="dm-menu-header-icons">
                        <span>🍽️</span>
                        <span>🛒</span>
                      </div>
                      <span className="dm-menu-date">12 - 18 janv</span>
                    </div>

                    {/* Day cards grid */}
                    <div className="dm-menu-cards">
                      <div className="dm-menu-card">
                        <span className="dm-menu-card__day">LUN</span>
                        <span className="dm-menu-card__num">12</span>
                        <span className="dm-menu-card__emoji">🍔</span>
                        <span className="dm-menu-card__meal">Hamburgers</span>
                        <button className="dm-menu-card__add" type="button">+ Ajouter</button>
                      </div>
                      <div className="dm-menu-card">
                        <span className="dm-menu-card__day">MAR</span>
                        <span className="dm-menu-card__num">13</span>
                        <div className="dm-menu-card__emojis">
                          <span>🍙</span><span>🍣</span><span>🍱</span>
                        </div>
                        <span className="dm-menu-card__meal">Pokebowl</span>
                        <button className="dm-menu-card__add" type="button">+ Ajouter</button>
                      </div>
                      <div className="dm-menu-card">
                        <span className="dm-menu-card__day">MER</span>
                        <span className="dm-menu-card__num">14</span>
                        <span className="dm-menu-card__emoji">🍲</span>
                        <span className="dm-menu-card__meal">Pâté chinois</span>
                        <button className="dm-menu-card__add" type="button">+ Ajouter</button>
                      </div>
                    </div>

                    {/* mIAm chatbot floating button */}
                    <div className="dm-miam-btn">
                      <span className="dm-miam-icon">🤖</span>
                      <span className="dm-miam-label">mIAm</span>
                    </div>
                  </article>

                  {/* ── Screen 5: Piggy bank ── */}
                  <article className="dm-screen dm-screen--piggy">
                    <div className="dm-widget-header">
                      <span className="dm-widget-title">Tirelire familiale</span>
                      <span className="dm-widget-badge">🪙</span>
                    </div>
                    <div className="dm-piggy-hero">
                      <div className="dm-piggy-icon-wrap">
                        <span className="dm-piggy-coin" aria-hidden="true">🪙</span>
                        <span className="dm-piggy-sparkle" aria-hidden="true">✦</span>
                        <span className="dm-piggy-emoji">🐷</span>
                      </div>
                      <div className="dm-piggy-amount">
                        <span ref={piggyAmountRef}>28 CAD</span>
                      </div>
                      <span className="dm-piggy-meta">Projet long terme</span>
                    </div>
                    <div className="dm-piggy-progress">
                      <div className="dm-progress-label">
                        <span>Objectif: vélo familial</span>
                        <span className="dm-progress-value">42%</span>
                      </div>
                      <div className="dm-progress-bar">
                        <div className="dm-progress-fill dm-progress-fill--orange" style={{ width: '42%' }} />
                      </div>
                    </div>
                  </article>

                  </div>
                </div>
              </div>
              <span className="device-mockup__bezel" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* Comment ça marche - 3 steps */}
        <section id="how-it-works" className="nesthub-landing__section nesthub-landing__how-it-works scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Comment ça marche ?</h2>
            <p>Démarrez en 3 étapes simples</p>
          </div>

          <div className="how-it-works__steps">
            <div className="how-step scroll-reveal scroll-reveal--delay-1">
              <div className="how-step__number">1</div>
              <div className="how-step__icon">👨‍👩‍👧‍👦</div>
              <h3 className="how-step__title">Créez votre espace familial</h3>
              <p className="how-step__desc">
                Inscription en 2 minutes. Ajoutez les membres de votre famille avec leurs avatars personnalisés.
              </p>
              <span className="how-step__time">⏱️ 2 min</span>
            </div>

            <div className="how-step__arrow" aria-hidden="true">→</div>

            <div className="how-step scroll-reveal scroll-reveal--delay-2">
              <div className="how-step__number">2</div>
              <div className="how-step__icon">✅</div>
              <h3 className="how-step__title">Configurez les tâches et règles</h3>
              <p className="how-step__desc">
                Définissez les tâches de chacun, le budget temps d'écran et les objectifs d'épargne.
              </p>
              <span className="how-step__time">⏱️ 5 min</span>
            </div>

            <div className="how-step__arrow" aria-hidden="true">→</div>

            <div className="how-step scroll-reveal scroll-reveal--delay-3">
              <div className="how-step__number">3</div>
              <div className="how-step__icon">📱</div>
              <h3 className="how-step__title">Installez sur votre tablette</h3>
              <p className="how-step__desc">
                Placez Cap Famille O sur une tablette dans la cuisine. Toute la famille y accède facilement.
              </p>
              <span className="how-step__time">⏱️ 1 min</span>
            </div>
          </div>

          <div className="how-it-works__cta scroll-reveal">
            <Link to={ALPHA_MODE ? '/alpha' : '/signup'} className="nesthub-landing__cta-primary">
              {ALPHA_MODE ? 'Rejoindre la liste d\'attente' : 'Commencer maintenant'}
            </Link>
            <span className="how-it-works__note">
              {ALPHA_MODE ? 'Accès prioritaire aux premiers inscrits' : 'Prêt en moins de 10 minutes'}
            </span>
          </div>
        </section>

        {/* Autonomy Journey Section */}
        <section id="autonomy" className="nesthub-landing__section nesthub-landing__autonomy scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Accompagner vers l'autonomie et la responsabilité</h2>
            <p className="autonomy-intro">
              Chaque enfant avance à son rythme. Cap Famille O l'accompagne dans son parcours
              vers l'autonomie, étape par étape.
            </p>
          </div>

          <div className="autonomy-journey">
            <div className="autonomy-step scroll-reveal scroll-reveal--delay-1">
              <div className="autonomy-step__icon">🌱</div>
              <div className="autonomy-step__content">
                <h3>Phase 1 : Découverte</h3>
                <p>L'enfant découvre ses premières tâches simples et comprend le système de récompenses</p>
                <div className="autonomy-step__tasks">
                  <span className="task-chip">🛏️ Faire son lit</span>
                  <span className="task-chip">🦷 Se brosser les dents</span>
                </div>
              </div>
              <div className="autonomy-step__badge">🥉 Bronze</div>
            </div>

            <div className="autonomy-connector" aria-hidden="true">
              <span className="connector-line" />
              <span className="connector-dot" />
            </div>

            <div className="autonomy-step scroll-reveal scroll-reveal--delay-2">
              <div className="autonomy-step__icon">🌿</div>
              <div className="autonomy-step__content">
                <h3>Phase 2 : Responsabilisation</h3>
                <p>Il prend en charge des tâches plus complexes et gère son premier projet d'épargne</p>
                <div className="autonomy-step__tasks">
                  <span className="task-chip">🧹 Ranger sa chambre</span>
                  <span className="task-chip">📚 Devoirs autonomes</span>
                  <span className="task-chip">🐷 Premier projet 25$</span>
                </div>
              </div>
              <div className="autonomy-step__badge">🥈 Argent</div>
            </div>

            <div className="autonomy-connector" aria-hidden="true">
              <span className="connector-line" />
              <span className="connector-dot" />
            </div>

            <div className="autonomy-step scroll-reveal scroll-reveal--delay-3">
              <div className="autonomy-step__icon">🌳</div>
              <div className="autonomy-step__content">
                <h3>Phase 3 : Autonomie</h3>
                <p>Il participe activement à la vie familiale et fait des choix financiers éclairés</p>
                <div className="autonomy-step__tasks">
                  <span className="task-chip">🍽️ Mettre la table</span>
                  <span className="task-chip">🐕 S'occuper de l'animal</span>
                  <span className="task-chip">💰 Épargne long terme</span>
                </div>
              </div>
              <div className="autonomy-step__badge">🥇 Or</div>
            </div>
          </div>

          <div className="autonomy-quote scroll-reveal">
            <blockquote>
              « Lucas a rangé sa chambre sans qu'on le lui demande.
              Il voulait gagner ses points pour son projet drone ! »
            </blockquote>
            <cite>— Une famille Cap Famille O, Québec</cite>
          </div>
        </section>

        <section id="features" className="nesthub-landing__section nesthub-landing__features scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Une progression ludique, inspirée du jeu vidéo</h2>
            <ul className="nesthub-landing__list">
              <li>Phases et niveaux visibles</li>
              <li>Objectifs hebdomadaires clairs</li>
              <li>Récompenses motivantes</li>
              <li>Sentiment d'avancer, semaine après semaine</li>
            </ul>
            <p>
              👉 Plus un enfant devient autonome, plus il progresse.
              <br />
              👉 Et naturellement, il a envie d'aller plus vite.
            </p>
          </div>

          <div className="nesthub-landing__feature-cards">
            <div className="feature-card scroll-reveal scroll-reveal--delay-1">
              <div className="feature-card__mockup">
                <div className="xp-bar">
                  <span style={{ ['--w' as string]: '68%' }} />
                </div>
                <div className="xp-meta">
                  <span>Lvl 4</span>
                  <span>680 / 1000 XP</span>
                </div>
                <div className="xp-reward">Récompense: 🎮 20 min</div>
              </div>
              <div>
                <h3>Progression style jeu vidéo</h3>
                <p>Barre XP, niveaux et bonus visibles par toute la famille.</p>
              </div>
            </div>

            <div className="feature-card scroll-reveal scroll-reveal--delay-2">
              <div className="feature-card__mockup">
                <div className="screen-time">
                  <div className="screen-time__top">
                    <span>Temps d'écran</span>
                    <span className="screen-time__tokens">
                      <span className="token" />
                      <span className="token" />
                      <span className="token-label">2 jetons</span>
                    </span>
                  </div>
                  <div className="screen-time__slider">
                    <span style={{ ['--w' as string]: '55%' }} />
                  </div>
                  <div className="screen-time__rules">
                    <span>✔️ Devoirs faits</span>
                    <span>⏰ 60 min max</span>
                  </div>
                  <div className="screen-time__hearts" aria-label="Vies disponibles">
                    <span className="life is-full is-gain">❤️</span>
                    <span className="life is-full">❤️</span>
                    <span className="life is-warning is-loss">🤍</span>
                    <span className="life-label">vies</span>
                  </div>
                </div>
              </div>
              <div>
                <h3>Temps d'écran démocratique</h3>
                <p>Jetons gagnés et règles claires pour négocier sereinement.</p>
              </div>
            </div>

            <div className="feature-card scroll-reveal scroll-reveal--delay-3">
              <div className="feature-card__mockup">
                <div className="piggy piggy--active">
                  <span className="piggy__coin" aria-hidden="true">🪙</span>
                  <span className="piggy__sparkle" aria-hidden="true">✦</span>
                  <div className="piggy__icon" aria-hidden="true">🐷</div>
                  <div>
                    <div className="piggy__amount">
                      <span>28 CAD</span>
                    </div>
                    <div className="piggy__meta">Projet long terme</div>
                  </div>
                </div>
                <div className="piggy__progress">
                  <span style={{ ['--w' as string]: '42%' }} />
                </div>
                <div className="piggy__goal">Objectif: vélo familial</div>
              </div>
              <div>
                <h3>Cochon & projets</h3>
                <p>Épargne collective et décisions concrètes à la maison.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Financial Education Section - Enhanced */}
        <section id="finance" className="nesthub-landing__section nesthub-landing__finance scroll-reveal">
          <div className="finance-header">
            <div className="finance-header__copy">
              <span className="finance-eyebrow">Éducation financière dès le plus jeune âge</span>
              <h2>Ta tirelire grandit avec toi</h2>
              <p>
                Chaque pièce rapproche l'enfant de son prochain projet.
                <br />
                <strong>Cet argent est réel, dans sa tirelire à la maison.</strong>
              </p>
            </div>
            <div className="finance-header__card">
              <div className="finance-header__piggy">
                <div className={`finance-piggy ${coinAnimation ? 'is-receiving' : ''}`}>
                  <span className="finance-piggy__icon" aria-hidden="true">🐷</span>
                  <span className="finance-piggy__coin finance-piggy__coin--1" aria-hidden="true">🪙</span>
                  <span className="finance-piggy__coin finance-piggy__coin--2" aria-hidden="true">🪙</span>
                  {coinAnimation && (
                    <span className="finance-piggy__coin-fly" aria-hidden="true">🪙</span>
                  )}
                </div>
                <div className="finance-total">
                  <span className={`finance-total__amount ${coinAnimation ? 'is-updating' : ''}`}>
                    {savingsTotal} $
                  </span>
                  <span className="finance-total__label">Épargne totale</span>
                  <div className="finance-total__badges">
                    <span className="finance-badge">+ {savingsTotal - 28 + 6} $ cette semaine</span>
                    <span className="finance-badge finance-badge--orange">2 projets actifs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="finance-projects finance-projects--interactive">
            <div className="finance-projects__header">
              <div className="family-member__avatar family-member__avatar--Charlotte finance-avatar">👧</div>
              <div>
                <h3 className="finance-projects__title">Projets en cours de Charlotte</h3>
                <p className="finance-projects__subtitle">Cliquez sur "Ajouter 2$" pour voir la magie ✨</p>
              </div>
              <button
                type="button"
                className="finance-reset-btn"
                onClick={handleResetSavings}
                aria-label="Réinitialiser la démo"
              >
                🔄
              </button>
            </div>
            <div className="finance-projects__grid">
              <div className={`savings-project savings-project--interactive ${coinAnimation === 'drone' ? 'is-adding' : ''}`}>
                <div className="savings-project__icon">✈️</div>
                <div className="savings-project__info">
                  <div className="savings-project__name">Drone</div>
                  <div className="savings-project__remaining">
                    Encore <strong>{100 - droneSaved} $</strong> pour l'obtenir 🔥
                  </div>
                </div>
                <div className="savings-project__progress">
                  <div className="savings-project__bar">
                    <span style={{ width: `${(droneSaved / 100) * 100}%` }} />
                  </div>
                  <span className="savings-project__percent">{Math.round((droneSaved / 100) * 100)}%</span>
                </div>
                <div className="savings-project__amounts">
                  {droneSaved} $ / 100 $
                </div>
                <button
                  type="button"
                  className="savings-project__add"
                  onClick={() => handleAddToSavings('drone')}
                  disabled={coinAnimation !== null || droneSaved >= 100}
                >
                  {droneSaved >= 100 ? '🎉 Objectif atteint !' : 'Ajouter 2$'}
                </button>
              </div>

              <div className={`savings-project savings-project--interactive ${coinAnimation === 'lego' ? 'is-adding' : ''}`}>
                <div className="savings-project__icon">🌿</div>
                <div className="savings-project__info">
                  <div className="savings-project__name">Lego Bonsai</div>
                  <div className="savings-project__remaining">
                    Encore <strong>{64 - legoSaved} $</strong> pour l'obtenir 🔥
                  </div>
                </div>
                <div className="savings-project__progress">
                  <div className="savings-project__bar">
                    <span style={{ width: `${(legoSaved / 64) * 100}%` }} />
                  </div>
                  <span className="savings-project__percent">{Math.round((legoSaved / 64) * 100)}%</span>
                </div>
                <div className="savings-project__amounts">{legoSaved} $ / 64 $</div>
                <button
                  type="button"
                  className="savings-project__add"
                  onClick={() => handleAddToSavings('lego')}
                  disabled={coinAnimation !== null || legoSaved >= 64}
                >
                  {legoSaved >= 64 ? '🎉 Objectif atteint !' : 'Ajouter 2$'}
                </button>
              </div>

              <div className="savings-project savings-project--new scroll-reveal scroll-reveal--delay-3">
                <div className="savings-project__icon">✨</div>
                <div className="savings-project__info">
                  <div className="savings-project__name">Nouveau projet</div>
                  <div className="savings-project__remaining">
                    Crée un objectif motivant et visible par tous !
                  </div>
                </div>
                <button type="button" className="savings-project__cta">Créer un projet</button>
              </div>
            </div>
          </div>

          <div className="finance-lessons scroll-reveal">
            <h3>Ce que l'enfant apprend</h3>
            <div className="finance-lessons__grid">
              <div className="lesson-card">
                <span className="lesson-card__icon">⚖️</span>
                <span className="lesson-card__text">Faire des choix</span>
                <span className="lesson-card__desc">Acheter maintenant ou économiser ?</span>
              </div>
              <div className="lesson-card">
                <span className="lesson-card__icon">🎯</span>
                <span className="lesson-card__text">Se fixer des objectifs</span>
                <span className="lesson-card__desc">Visualiser et atteindre ses buts</span>
              </div>
              <div className="lesson-card">
                <span className="lesson-card__icon">⏳</span>
                <span className="lesson-card__text">La patience</span>
                <span className="lesson-card__desc">Comprendre la valeur du temps</span>
              </div>
              <div className="lesson-card">
                <span className="lesson-card__icon">💪</span>
                <span className="lesson-card__text">L'effort récompensé</span>
                <span className="lesson-card__desc">Travail = récompense concrète</span>
              </div>
            </div>
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>L'organisation familiale, enfin partagée</h2>
            <p>
              Entre l'école, les devoirs, les écrans, les repas, les paiements, les
              rendez-vous et les activités, l'organisation repose trop souvent sur une
              seule personne. Cap Famille O a été conçu pour redistribuer la charge, et faire
              de l'organisation une responsabilité collective.
            </p>
          </div>
        </section>

        {/* Family Dashboard Preview */}
        <section className="nesthub-landing__section nesthub-landing__dashboard-preview scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Un tableau de bord pour toute la famille</h2>
            <p>Chaque membre a sa vue, ses tâches, ses responsabilités.</p>
          </div>

          <div className="family-preview">
            <div className="family-member scroll-reveal scroll-reveal--delay-1">
              <div className="family-member__avatar family-member__avatar--Charlotte">👧</div>
              <div className="family-member__name">Charlotte</div>
              <div className="family-member__tasks">
                <div className="mini-task">
                  <span className="mini-task__icon">🍽️</span>
                  <span>Mettre la table</span>
                </div>
                <div className="mini-task">
                  <span className="mini-task__icon">👕</span>
                  <span>Faire une brassée</span>
                </div>
              </div>
            </div>

            <div className="family-member scroll-reveal scroll-reveal--delay-2">
              <div className="family-member__avatar family-member__avatar--georges">👦</div>
              <div className="family-member__name">Georges</div>
              <div className="family-member__tasks">
                <div className="mini-task">
                  <span className="mini-task__icon">🐱</span>
                  <span>Changer la litière</span>
                </div>
                <div className="mini-task">
                  <span className="mini-task__icon">🧹</span>
                  <span>Ramasser les jouets</span>
                </div>
              </div>
            </div>

            <div className="family-member scroll-reveal scroll-reveal--delay-3">
              <div className="family-member__avatar family-member__avatar--lucas">👦</div>
              <div className="family-member__name">Lucas</div>
              <div className="family-member__tasks">
                <div className="mini-task">
                  <span className="mini-task__icon">🚿</span>
                  <span>Nettoyer la douche</span>
                </div>
                <div className="mini-task">
                  <span className="mini-task__icon">🗑️</span>
                  <span>Vider les poubelles</span>
                </div>
              </div>
            </div>

            <div className="family-member scroll-reveal scroll-reveal--delay-3">
              <div className="family-member__avatar family-member__avatar--ahmed">👦</div>
              <div className="family-member__name">Ahmed</div>
              <div className="family-member__tasks">
                <div className="mini-task">
                  <span className="mini-task__icon">🐟</span>
                  <span>Nourrir le poisson</span>
                </div>
                <div className="mini-task">
                  <span className="mini-task__icon">🍽️</span>
                  <span>Ramasser après souper</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Kitchen Section with Menu Preview */}
        <section id="kitchen" className="nesthub-landing__section nesthub-landing__kitchen scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>L'écran cuisine : le tableau du frigo… en mieux</h2>
            <p>
              « Papa, on mange quoi ce soir ? » Cette phrase disparaît.
            </p>
          </div>

          <div className="kitchen-preview">
            <div className="menu-week scroll-reveal scroll-reveal--delay-1">
              <div className="menu-week__header">
                <span className="menu-week__title">Menu de la semaine</span>
                <span className="menu-week__dates">5 - 11 janv</span>
              </div>
              <div className="menu-week__grid">
                <div className="menu-day">
                  <span className="menu-day__name">Lun</span>
                  <span className="menu-day__num">5</span>
                  <span className="menu-day__icon">🍗</span>
                  <span className="menu-day__meal">Poitrines de poulet</span>
                </div>
                <div className="menu-day">
                  <span className="menu-day__name">Mar</span>
                  <span className="menu-day__num">6</span>
                  <span className="menu-day__icon">🍝</span>
                  <span className="menu-day__meal">Spaghetti bolognaise</span>
                </div>
                <div className="menu-day">
                  <span className="menu-day__name">Mer</span>
                  <span className="menu-day__num">7</span>
                  <span className="menu-day__icon">🥧</span>
                  <span className="menu-day__meal">Pâté chinois</span>
                </div>
                <div className="menu-day">
                  <span className="menu-day__name">Jeu</span>
                  <span className="menu-day__num">8</span>
                  <span className="menu-day__icon">🍕</span>
                  <span className="menu-day__meal">Lasagnes</span>
                </div>
              </div>
            </div>

            <div className="ai-menu scroll-reveal scroll-reveal--delay-2">
              <div className="ai-menu__header">
                <span className="ai-menu__icon">🤖</span>
                <span className="ai-menu__title">La Boussole des Repas</span>
              </div>
              <ul className="ai-menu__features">
                <li>✨ Menu 7 jours équilibrés</li>
                <li>🛒 Liste épicerie complète</li>
                <li>✏️ Modifiable avant validation</li>
              </ul>
              <button type="button" className="ai-menu__cta">
                ✨ Générer menu et épicerie
              </button>
            </div>
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Les adultes aussi ont leurs tâches</h2>
            <p>Cap Famille O n'est pas réservé aux enfants.</p>
          </div>
          <div className="adult-tasks">
            <div className="adult-task scroll-reveal scroll-reveal--delay-1">
              <span className="adult-task__icon">💳</span>
              <span className="adult-task__text">Payer le service de garde</span>
            </div>
            <div className="adult-task scroll-reveal scroll-reveal--delay-1">
              <span className="adult-task__icon">📋</span>
              <span className="adult-task__text">Déclarer les impôts</span>
            </div>
            <div className="adult-task scroll-reveal scroll-reveal--delay-2">
              <span className="adult-task__icon">🏥</span>
              <span className="adult-task__text">Rappeler le médecin</span>
            </div>
            <div className="adult-task scroll-reveal scroll-reveal--delay-2">
              <span className="adult-task__icon">📄</span>
              <span className="adult-task__text">Renouveler un document</span>
            </div>
            <div className="adult-task scroll-reveal scroll-reveal--delay-3">
              <span className="adult-task__icon">🔔</span>
              <span className="adult-task__text">Ne rien oublier d'important</span>
            </div>
          </div>
          <div className="nesthub-landing__section-copy" style={{ marginTop: '24px' }}>
            <p>
              👉 Tout est visible
              <br />
              👉 Tout est partagé
              <br />
              👉 Tout le monde participe
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Moins de charge mentale pour les parents</h2>
            <ul className="nesthub-landing__list">
              <li>Moins de rappels invisibles</li>
              <li>Moins de stress</li>
              <li>Plus de disponibilité mentale</li>
            </ul>
          </div>
        </section>

        <section id="memories" className="nesthub-landing__section nesthub-landing__section--split scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Un beau cadre numérique pour vos souvenirs</h2>
            <p>
              Cap Famille O, c'est aussi :
              <br />
              - Un espace pour vos photos
              <br />
              - Vos moments importants
              <br />
              - Vos souvenirs familiaux
            </p>
            <p>
              👉 Un cadre numérique vivant
              <br />
              👉 Qui évolue avec votre famille
            </p>
          </div>

          <div className="digital-frame scroll-reveal scroll-reveal--delay-2">
            <div className="digital-frame__inner">
              <div className="digital-frame__photos" aria-hidden="true">
                <div
                  className="digital-frame__photo"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80)' }}
                />
                <div
                  className="digital-frame__photo"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80)' }}
                />
                <div
                  className="digital-frame__photo"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80)' }}
                />
                <div
                  className="digital-frame__photo"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&q=80)' }}
                />
              </div>
              <div className="digital-frame__overlay">
                <div>
                  <div className="digital-frame__caption">Randonnée en famille</div>
                  <div className="digital-frame__date">Dimanche 12 janvier 2025</div>
                </div>
              </div>
            </div>
            <span className="digital-frame__bezel" aria-hidden="true" />
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Une solution familiale, pas une app de contrôle</h2>
            <p>
              Cap Famille O repose sur une conviction simple : Les enfants sont capables de plus
              quand on leur donne les bons outils.
            </p>
          </div>
        </section>

        {/* Pricing Section - Hidden in Alpha mode */}
        {!ALPHA_MODE && (
          <section id="tarifs" className="nesthub-landing__section nesthub-landing__pricing scroll-reveal">
            <h2>Tarifs simples, sans surprise</h2>
            <div className="nesthub-landing__pricing-cards">
              <div className="pricing-card">
                <div className="pricing-card__name">Abonnement mensuel</div>
                <div className="pricing-card__price">
                  4,90 <span>CAD / mois</span>
                </div>
                <div className="pricing-card__desc">
                  Flexibilité totale, résiliez quand vous voulez
                </div>
                <ul className="pricing-card__features">
                  <li>Toutes les fonctionnalités</li>
                  <li>Jusqu'à 4 membres de famille</li>
                  <li>Intégrations Google</li>
                  <li>Génération de menus IA</li>
                  <li>Support prioritaire</li>
                </ul>
                <Link to="/signup" className="pricing-card__cta pricing-card__cta--secondary">
                  Commencer l'essai gratuit
                </Link>
              </div>

              <div className="pricing-card pricing-card--featured">
                <div className="pricing-card__name">Licence à vie</div>
                <div className="pricing-card__price">
                  90 <span>CAD · paiement unique</span>
                </div>
                <div className="pricing-card__desc">
                  Un seul paiement, accès illimité pour toujours
                </div>
                <ul className="pricing-card__features">
                  <li>Toutes les fonctionnalités</li>
                  <li>Composants 100% Cap Famille O inclus</li>
                  <li>Mises à jour à vie</li>
                  <li>Intégrations Google</li>
                  <li>Génération de menus IA</li>
                  <li>Support prioritaire à vie</li>
                </ul>
                <Link to="/signup" className="pricing-card__cta pricing-card__cta--primary">
                  Obtenir ma licence à vie
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section id="faq" className="nesthub-landing__section nesthub-landing__faq scroll-reveal">
          <h2>Questions fréquentes</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className={`faq-item ${openFaqIndex === index ? 'is-open' : ''}`}
              >
                <button
                  className="faq-item__question"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaqIndex === index}
                >
                  {item.question}
                  <span className="faq-item__icon">+</span>
                </button>
                <div className="faq-item__answer">
                  <div className="faq-item__answer-inner">{item.answer}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="nesthub-landing__final scroll-reveal">
          <div className="nesthub-landing__final-card">
            <h2>{ALPHA_MODE ? 'Rejoignez la liste d\'attente Alpha' : 'Créez votre espace Cap Famille O'}</h2>
            <p>
              {ALPHA_MODE ? (
                <>
                  - Accès prioritaire aux premiers inscrits
                  <br />
                  - Pas de spam
                  <br />
                  - Invitation progressive
                </>
              ) : (
                <>
                  - Mise en place rapide
                  <br />
                  - Sans carte de crédit
                  <br />
                  - Pensé pour évoluer avec vos enfants
                </>
              )}
            </p>
            <Link to={ALPHA_MODE ? '/alpha' : '/signup'} className="nesthub-landing__cta-primary">
              {ALPHA_MODE ? 'Rejoindre la liste d\'attente' : 'Créer mon espace familial'}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="nesthub-landing__footer">
        <div className="nesthub-landing__footer-inner">
          <div className="nesthub-landing__footer-top">
            <div className="footer-col">
              <div className="footer-col__title">Produit</div>
              <ul className="footer-col__list">
                {!ALPHA_MODE && (
                  <li>
                    <a href="#tarifs">Tarifs</a>
                  </li>
                )}
                <li>
                  <a href="#faq">FAQ</a>
                </li>
                <li>
                  <Link to={ALPHA_MODE ? '/alpha' : '/signup'}>
                    {ALPHA_MODE ? 'Liste d\'attente' : 'Créer un compte'}
                  </Link>
                </li>
                <li>
                  <Link to="/login">Se connecter</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <div className="footer-col__title">Légal</div>
              <ul className="footer-col__list">
                <li>
                  <a href="/privacy">Politique de confidentialité</a>
                </li>
                <li>
                  <a href="/terms">Conditions d'utilisation</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <div className="footer-col__title">Vos données en sécurité</div>
              <div className="footer-highlight">
                <span className="footer-highlight__icon">🔒</span>
                <span className="footer-highlight__text">
                  Données hébergées de façon sécurisée.
                  <br />
                  <strong>Aucun partenaire n'utilisera vos données.</strong>
                  <br />
                  Nous ne vendons jamais vos informations.
                </span>
              </div>
            </div>
          </div>

          <div className="nesthub-landing__footer-bottom">
            <div className="footer-brand">
              <span className="footer-brand__logo">Cap Famille O</span>
              <span className="footer-brand__location">
                Développé avec ❤️ à Québec, Canada
              </span>
            </div>
            <div className="footer-copy">
              © {new Date().getFullYear()} Cap Famille O. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
