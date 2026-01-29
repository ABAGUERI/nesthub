import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './NestHubLandingPage.css';

const FAQ_ITEMS = [
  {
    question: 'Comment ajouter mes enfants à NestHub ?',
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
    question: "Comment NestHub génère-t-il les menus de la semaine ?",
    answer:
      "NestHub utilise l'intelligence artificielle pour créer des menus personnalisés. Configurez vos préférences (nombre de personnes, restrictions alimentaires, cuisines préférées, budget) et l'IA génère un menu complet pour 7 jours avec la liste d'épicerie correspondante. Vous pouvez aussi planifier manuellement vos repas.",
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer:
      "Absolument. Vos données sont hébergées de façon sécurisée et isolées par famille grâce à notre système de Row Level Security (RLS). Aucun partenaire n'a accès à vos données familiales. Nous ne vendons jamais vos informations. NestHub est développé au Québec avec les valeurs de confidentialité qui nous tiennent à cœur.",
  },
  {
    question: 'NestHub fonctionne-t-il avec Google Calendar et Google Tasks ?',
    answer:
      "Oui ! NestHub s'intègre avec votre compte Google pour synchroniser votre calendrier familial, vos listes de tâches et même vos photos via Google Drive. Connectez votre compte lors de l'assistant de configuration et choisissez les modules que vous souhaitez activer.",
  },
  {
    question: 'Puis-je utiliser NestHub sur plusieurs appareils ?',
    answer:
      "Oui, NestHub fonctionne sur tous vos appareils via le navigateur web. Idéalement, installez-le sur une tablette dans votre cuisine comme « tableau de bord familial », mais chaque membre peut aussi y accéder depuis son téléphone ou ordinateur.",
  },
];

export function NestHubLandingPage() {
  const piggyAmountRef = useRef<HTMLSpanElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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

      <header ref={headerRef} className="nesthub-landing__header">
        <div className="nesthub-landing__header-inner">
          <div className="nesthub-landing__brand">NestHub</div>
          <nav className="nesthub-landing__nav">
            <a href="#tarifs" className="nesthub-landing__nav-link">
              Tarifs
            </a>
            <a href="#faq" className="nesthub-landing__nav-link">
              FAQ
            </a>
            <Link to="/login" className="nesthub-landing__nav-link">
              Se connecter
            </Link>
            <Link to="/signup" className="nesthub-landing__nav-cta">
              Créer mon espace familial
            </Link>
          </nav>
        </div>
      </header>

      <main className="nesthub-landing__main">
        <section className="nesthub-landing__hero">
          <div className="nesthub-landing__hero-copy scroll-reveal">
            <p className="nesthub-landing__eyebrow">NestHub</p>
            <h1>Le hub familial qui transforme l'organisation en terrain de jeu</h1>
            <p className="nesthub-landing__subtitle">
              Développé à Québec, dans le quartier de Limoilou.
              <br />
              Une solution locale, pensée pour les familles d'ici, avec les réalités
              d'aujourd'hui.
            </p>
            <div className="nesthub-landing__cta">
              <Link to="/signup" className="nesthub-landing__cta-primary">
                Créer mon espace familial
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
            <div className="nesthub-landing__carousel">
              <div className="nesthub-landing__carousel-track" aria-hidden="true">
                <article className="carousel-slide">
                  <div className="carousel-toolbar">
                    <div className="carousel-time">
                      08 h 35 <span>Jeudi 29 janv.</span>
                    </div>
                    <div className="carousel-title">Nesthub</div>
                    <div className="carousel-icons">
                      <span>🏠</span>
                      <span>👨‍👩‍👧‍👦</span>
                      <span>🍽️</span>
                      <span>💰</span>
                    </div>
                  </div>

                  <div className="carousel-panel">
                    <div className="carousel-highlight">
                      <div>
                        <div className="carousel-label">🏆 Objectif famille</div>
                        <div className="carousel-subtitle">455 pts / 1000</div>
                      </div>
                      <div className="carousel-avatar" />
                    </div>
                    <div className="carousel-progress">
                      <span style={{ ['--w' as string]: '46%' }} />
                    </div>
                    <div className="carousel-progress__meta">Progression · 46%</div>
                    <div className="carousel-hearts">
                      <span className="life is-full is-gain">❤️</span>
                      <span className="life is-full">❤️</span>
                      <span className="life is-warning is-loss">🤍</span>
                    </div>
                  </div>
                </article>

                <article className="carousel-slide carousel-slide--tasks">
                  <div className="carousel-toolbar">
                    <div className="carousel-time">
                      08 h 20 <span>Vue globale</span>
                    </div>
                    <div className="carousel-title">Tâches du jour</div>
                    <div className="carousel-icons">
                      <span>⭐</span>
                      <span>🧹</span>
                      <span>📖</span>
                    </div>
                    <button className="mockup-cta" type="button">
                      🐷 Ma tirelire
                    </button>
                  </div>
                  <div className="carousel-grid">
                    <div className="carousel-task mockup-task mockup-task--complete">
                      <div className="mockup-task__label">Temps d'écran</div>
                      <div className="mockup-task__progress">
                        <span style={{ ['--w' as string]: '72%' }} />
                      </div>
                      <div className="mockup-task__meta">Validée</div>
                      <div className="mockup-task__reward" aria-hidden="true">
                        +20 XP · ❤️ +1
                      </div>
                      <span className="mockup-task__check" aria-hidden="true">
                        ✔
                      </span>
                      <span className="mockup-task__xp" aria-hidden="true">
                        +20 XP
                      </span>
                      <span className="mockup-task__heart" aria-hidden="true">
                        ❤️
                      </span>
                    </div>
                    <div className="carousel-task">
                      <div className="mockup-task__label">Ranger chambre</div>
                      <div className="mockup-task__meta">En cours</div>
                    </div>
                    <div className="carousel-task">
                      <div className="mockup-task__label">Lire 20 min</div>
                      <div className="mockup-task__meta">Bonus</div>
                    </div>
                  </div>
                </article>

                <article className="carousel-slide carousel-slide--piggy">
                  <div className="carousel-toolbar">
                    <div className="carousel-time">
                      08 h 23 <span>Finances</span>
                    </div>
                    <div className="carousel-title">Ta tirelire</div>
                    <div className="carousel-icons">
                      <span>🐷</span>
                      <span>🪙</span>
                      <span>🎯</span>
                    </div>
                  </div>
                  <div className="carousel-panel carousel-panel--piggy">
                    <div className="piggy piggy--active">
                      <span className="piggy__coin" aria-hidden="true">
                        🪙
                      </span>
                      <span className="piggy__sparkle" aria-hidden="true">
                        ✦
                      </span>
                      <div className="piggy__icon" aria-hidden="true">
                        🐷
                      </div>
                      <div>
                        <div className="piggy__amount">
                          <span ref={piggyAmountRef}>28 CAD</span>
                        </div>
                        <div className="piggy__meta">Projet long terme</div>
                      </div>
                    </div>
                    <div className="piggy__progress">
                      <span style={{ ['--w' as string]: '42%' }} />
                    </div>
                    <div className="piggy__goal">Objectif: vélo familial</div>
                  </div>
                </article>

                <article className="carousel-slide carousel-slide--kitchen">
                  <div className="carousel-toolbar">
                    <div className="carousel-time">
                      08 h 39 <span>Cuisine</span>
                    </div>
                    <div className="carousel-title">Menu semaine</div>
                    <div className="carousel-icons">
                      <span>🍲</span>
                      <span>🛒</span>
                      <span>📅</span>
                    </div>
                  </div>
                  <div className="carousel-menu">
                    <div className="carousel-menu__day">
                      <span>Lun</span>
                      <strong>Poulet BBQ</strong>
                    </div>
                    <div className="carousel-menu__day">
                      <span>Mer</span>
                      <strong>Pâtes chinoises</strong>
                    </div>
                    <div className="carousel-menu__day">
                      <span>Ven</span>
                      <strong>Fajitas</strong>
                    </div>
                  </div>
                  <div className="carousel-action">✨ Générer menu & épicerie</div>
                </article>

                <article className="carousel-slide">
                  <div className="carousel-toolbar">
                    <div className="carousel-time">
                      08 h 35 <span>Jeudi 29 janv.</span>
                    </div>
                    <div className="carousel-title">Nesthub</div>
                    <div className="carousel-icons">
                      <span>🏠</span>
                      <span>👨‍👩‍👧‍👦</span>
                      <span>🍽️</span>
                      <span>💰</span>
                    </div>
                  </div>
                  <div className="carousel-panel">
                    <div className="carousel-highlight">
                      <div>
                        <div className="carousel-label">🏆 Objectif famille</div>
                        <div className="carousel-subtitle">455 pts / 1000</div>
                      </div>
                      <div className="carousel-avatar" />
                    </div>
                    <div className="carousel-progress">
                      <span style={{ ['--w' as string]: '46%' }} />
                    </div>
                    <div className="carousel-progress__meta">Progression · 46%</div>
                    <div className="carousel-hearts">
                      <span className="life is-full is-gain">❤️</span>
                      <span className="life is-full">❤️</span>
                      <span className="life is-warning is-loss">🤍</span>
                    </div>
                  </div>
                </article>
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
              seule personne. NestHub a été conçu pour redistribuer la charge, et faire
              de l'organisation une responsabilité collective.
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section nesthub-landing__features scroll-reveal">
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

                    {/* tokens mini-anim */}
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

                  {/* hearts / lives */}
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
                  {/* coin drop */}
                  <span className="piggy__coin" aria-hidden="true">
                    🪙
                  </span>
                  <span className="piggy__sparkle" aria-hidden="true">
                    ✦
                  </span>

                  <div className="piggy__icon" aria-hidden="true">
                    🐷
                  </div>
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

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Les enfants deviennent acteurs de leur propre organisation</h2>
            <ul className="nesthub-landing__list">
              <li>Agenda visible et compréhensible</li>
              <li>Tâches adaptées à l'âge</li>
              <li>Responsabilités claires</li>
            </ul>
            <p>Résultat :</p>
            <ul className="nesthub-landing__list nesthub-landing__list--compact">
              <li>Aucun rendez-vous manqué</li>
              <li>Aucune fête d'amis oubliée</li>
              <li>Moins de rappels</li>
              <li>Plus de fierté et de confiance</li>
            </ul>
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Le temps d'écran, géré de façon démocratique</h2>
            <ul className="nesthub-landing__list">
              <li>Le temps d'écran se gagne</li>
              <li>Il se négocie</li>
              <li>Il se comprend</li>
            </ul>
            <p>
              👉 L'enfant sait pourquoi il y a un oui ou un non.
              <br />
              👉 Le parent n'est plus le contrôleur, mais l'accompagnateur.
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>L'écran cuisine : le tableau du frigo… en mieux</h2>
            <p>
              « Papa, on mange quoi ce soir ? » Cette phrase disparaît.
              <br />
              - Le menu de la semaine est visible par tous
              <br />
              - Les repas sont anticipés
              <br />
              - Chacun sait ce qui s'en vient
            </p>
            <p>
              Vous manquez d'inspiration ?
              <br />
              - Dites à NestHub vos envies du moment
              <br />
              - Vos goûts, préférences, contraintes
              <br />
              - NestHub propose des menus adaptés
              <br />
              - Et génère automatiquement la liste d'épicerie
            </p>
            <p>
              👉 C'est votre tableau du frigo
              <br />
              👉 Mais intelligent, rassembleur et intuitif
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Les adultes aussi ont leurs tâches</h2>
            <p>NestHub n'est pas réservé aux enfants.</p>
            <ul className="nesthub-landing__list">
              <li>Payer le service de garde</li>
              <li>Déclarer les impôts</li>
              <li>Rappeler le médecin</li>
              <li>Renouveler un document</li>
              <li>Ne rien oublier d'important</li>
            </ul>
            <p>
              👉 Tout est visible
              <br />
              👉 Tout est partagé
              <br />
              👉 Tout le monde participe
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section nesthub-landing__section--split scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Apprendre l'argent, concrètement (le cochon 🐷)</h2>
            <p>NestHub introduit l'éducation financière très tôt.</p>
            <ul className="nesthub-landing__list">
              <li>Le cochon pour l'épargne</li>
              <li>Petits projets à 50 CAD</li>
              <li>Projets plus ambitieux à moyen ou long terme</li>
              <li>Choix, priorités, décisions</li>
            </ul>
            <p>
              👉 Acheter maintenant ou attendre ?
              <br />
              👉 Mettre de côté pour un projet plus grand ?
              <br />
              À vous de décider du cadre. Les enfants apprennent par l'expérience.
            </p>
          </div>

          <div className="nesthub-landing__visual-frame">
            <div className="nesthub-landing__frame-grid">
              <div className="frame-card">Projet 50 CAD</div>
              <div className="frame-card">Objectif d'été</div>
              <div className="frame-card">Épargne familiale</div>
              <div className="frame-card">Choix collectif</div>
            </div>
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

        <section className="nesthub-landing__section nesthub-landing__section--split scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Un beau cadre numérique pour vos souvenirs</h2>
            <p>
              NestHub, c'est aussi :
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

          <div className="nesthub-landing__memories">
            <div className="polaroid">
              <div className="polaroid__photo" />
              <span>Tour de vélo</span>
            </div>
            <div className="polaroid">
              <div className="polaroid__photo polaroid__photo--alt" />
              <span>Soirée pizza</span>
            </div>
            <div className="polaroid">
              <div className="polaroid__photo polaroid__photo--third" />
              <span>Cabane à sucre</span>
            </div>
          </div>
        </section>

        <section className="nesthub-landing__section scroll-reveal">
          <div className="nesthub-landing__section-copy">
            <h2>Une solution familiale, pas une app de contrôle</h2>
            <p>
              NestHub repose sur une conviction simple : Les enfants sont capables de plus
              quand on leur donne les bons outils.
            </p>
          </div>
        </section>

        {/* Pricing Section */}
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
                <li>Composants 100% NestHub inclus</li>
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
            <h2>Créez votre NestHub familial</h2>
            <p>
              - Mise en place rapide
              <br />
              - Sans carte de crédit
              <br />
              - Pensé pour évoluer avec vos enfants
            </p>
            <Link to="/signup" className="nesthub-landing__cta-primary">
              Créer mon espace familial
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
                <li>
                  <a href="#tarifs">Tarifs</a>
                </li>
                <li>
                  <a href="#faq">FAQ</a>
                </li>
                <li>
                  <Link to="/signup">Créer un compte</Link>
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
              <span className="footer-brand__logo">NestHub</span>
              <span className="footer-brand__location">
                Développé avec ❤️ à Québec, Canada
              </span>
            </div>
            <div className="footer-copy">
              © {new Date().getFullYear()} NestHub. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
