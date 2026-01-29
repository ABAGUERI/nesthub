import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './NestHubLandingPage.css';

export function NestHubLandingPage() {
  const piggyAmountRef = useRef<HTMLSpanElement | null>(null);

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

  return (
    <div className="nesthub-landing">
      <div className="nesthub-landing__glow" aria-hidden="true" />

      {/* Subtle premium “life” layer */}
      <div className="nesthub-landing__stars" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`star star--${(i % 6) + 1}`} />
        ))}
      </div>

      <header className="nesthub-landing__header">
        <div className="nesthub-landing__brand">NestHub</div>
        <nav className="nesthub-landing__nav">
          <Link to="/login" className="nesthub-landing__nav-link">
            Se connecter
          </Link>
          <Link to="/signup" className="nesthub-landing__nav-cta">
            Créer mon espace familial
          </Link>
        </nav>
      </header>

      <main className="nesthub-landing__main">
        <section className="nesthub-landing__hero">
          <div className="nesthub-landing__hero-copy">
            <p className="nesthub-landing__eyebrow">NestHub</p>
            <h1>Le hub familial qui transforme l’organisation en terrain de jeu</h1>
            <p className="nesthub-landing__subtitle">
              Développé à Québec, dans le quartier de Limoilou.
              <br />
              Une solution locale, pensée pour les familles d’ici, avec les réalités
              d’aujourd’hui.
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

          <div className="nesthub-landing__hero-visual">
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
                      <span style={{ ['--w' as any]: '46%' }} />
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
                  </div>
                  <div className="carousel-grid">
                    <div className="carousel-task mockup-task mockup-task--complete">
                      <div className="mockup-task__label">Temps d’écran</div>
                      <div className="mockup-task__progress">
                        <span style={{ ['--w' as any]: '72%' }} />
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
                      <span style={{ ['--w' as any]: '42%' }} />
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
                      <span style={{ ['--w' as any]: '46%' }} />
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

        <section className="nesthub-landing__section">
          <div className="nesthub-landing__section-copy">
            <h2>L’organisation familiale, enfin partagée</h2>
            <p>
              Entre l’école, les devoirs, les écrans, les repas, les paiements, les
              rendez-vous et les activités, l’organisation repose trop souvent sur une
              seule personne. NestHub a été conçu pour redistribuer la charge, et faire
              de l’organisation une responsabilité collective.
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section nesthub-landing__features">
          <div className="nesthub-landing__section-copy">
            <h2>Une progression ludique, inspirée du jeu vidéo</h2>
            <ul className="nesthub-landing__list">
              <li>Phases et niveaux visibles</li>
              <li>Objectifs hebdomadaires clairs</li>
              <li>Récompenses motivantes</li>
              <li>Sentiment d’avancer, semaine après semaine</li>
            </ul>
            <p>
              👉 Plus un enfant devient autonome, plus il progresse.
              <br />
              👉 Et naturellement, il a envie d’aller plus vite.
            </p>
          </div>

          <div className="nesthub-landing__feature-cards">
            <div className="feature-card">
              <div className="feature-card__mockup">
                <div className="xp-bar">
                  <span style={{ ['--w' as any]: '68%' }} />
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

            <div className="feature-card">
              <div className="feature-card__mockup">
                <div className="screen-time">
                  <div className="screen-time__top">
                    <span>Temps d’écran</span>

                    {/* tokens mini-anim */}
                    <span className="screen-time__tokens">
                      <span className="token" />
                      <span className="token" />
                      <span className="token-label">2 jetons</span>
                    </span>
                  </div>

                  <div className="screen-time__slider">
                    <span style={{ ['--w' as any]: '55%' }} />
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
                <h3>Temps d’écran démocratique</h3>
                <p>Jetons gagnés et règles claires pour négocier sereinement.</p>
              </div>
            </div>

            <div className="feature-card">
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
                      <span ref={piggyAmountRef}>28 CAD</span>
                    </div>
                    <div className="piggy__meta">Projet long terme</div>
                  </div>
                </div>

                <div className="piggy__progress">
                  <span style={{ ['--w' as any]: '42%' }} />
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

        <section className="nesthub-landing__section">
          <div className="nesthub-landing__section-copy">
            <h2>Les enfants deviennent acteurs de leur propre organisation</h2>
            <ul className="nesthub-landing__list">
              <li>Agenda visible et compréhensible</li>
              <li>Tâches adaptées à l’âge</li>
              <li>Responsabilités claires</li>
            </ul>
            <p>Résultat :</p>
            <ul className="nesthub-landing__list nesthub-landing__list--compact">
              <li>Aucun rendez-vous manqué</li>
              <li>Aucune fête d’amis oubliée</li>
              <li>Moins de rappels</li>
              <li>Plus de fierté et de confiance</li>
            </ul>
          </div>
        </section>

        <section className="nesthub-landing__section">
          <div className="nesthub-landing__section-copy">
            <h2>Le temps d’écran, géré de façon démocratique</h2>
            <ul className="nesthub-landing__list">
              <li>Le temps d’écran se gagne</li>
              <li>Il se négocie</li>
              <li>Il se comprend</li>
            </ul>
            <p>
              👉 L’enfant sait pourquoi il y a un oui ou un non.
              <br />
              👉 Le parent n’est plus le contrôleur, mais l’accompagnateur.
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section">
          <div className="nesthub-landing__section-copy">
            <h2>L’écran cuisine : le tableau du frigo… en mieux</h2>
            <p>
              « Papa, on mange quoi ce soir ? » Cette phrase disparaît.
              <br />
              - Le menu de la semaine est visible par tous
              <br />
              - Les repas sont anticipés
              <br />
              - Chacun sait ce qui s’en vient
            </p>
            <p>
              Vous manquez d’inspiration ?
              <br />
              - Dites à NestHub vos envies du moment
              <br />
              - Vos goûts, préférences, contraintes
              <br />
              - NestHub propose des menus adaptés
              <br />
              - Et génère automatiquement la liste d’épicerie
            </p>
            <p>
              👉 C’est votre tableau du frigo
              <br />
              👉 Mais intelligent, rassembleur et intuitif
            </p>
          </div>
        </section>

        <section className="nesthub-landing__section">
          <div className="nesthub-landing__section-copy">
            <h2>Les adultes aussi ont leurs tâches</h2>
            <p>NestHub n’est pas réservé aux enfants.</p>
            <ul className="nesthub-landing__list">
              <li>Payer le service de garde</li>
              <li>Déclarer les impôts</li>
              <li>Rappeler le médecin</li>
              <li>Renouveler un document</li>
              <li>Ne rien oublier d’important</li>
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

        <section className="nesthub-landing__section nesthub-landing__section--split">
          <div className="nesthub-landing__section-copy">
            <h2>Apprendre l’argent, concrètement (le cochon 🐷)</h2>
            <p>NestHub introduit l’éducation financière très tôt.</p>
            <ul className="nesthub-landing__list">
              <li>Le cochon pour l’épargne</li>
              <li>Petits projets à 50 CAD</li>
              <li>Projets plus ambitieux à moyen ou long terme</li>
              <li>Choix, priorités, décisions</li>
            </ul>
            <p>
              👉 Acheter maintenant ou attendre ?
              <br />
              👉 Mettre de côté pour un projet plus grand ?
              <br />
              À vous de décider du cadre. Les enfants apprennent par l’expérience.
            </p>
          </div>

          <div className="nesthub-landing__visual-frame">
            <div className="nesthub-landing__frame-grid">
              <div className="frame-card">Projet 50 CAD</div>
              <div className="frame-card">Objectif d’été</div>
              <div className="frame-card">Épargne familiale</div>
              <div className="frame-card">Choix collectif</div>
            </div>
          </div>
        </section>

        <section className="nesthub-landing__section">
          <div className="nesthub-landing__section-copy">
            <h2>Moins de charge mentale pour les parents</h2>
            <ul className="nesthub-landing__list">
              <li>Moins de rappels invisibles</li>
              <li>Moins de stress</li>
              <li>Plus de disponibilité mentale</li>
            </ul>
          </div>
        </section>

        <section className="nesthub-landing__section nesthub-landing__section--split">
          <div className="nesthub-landing__section-copy">
            <h2>Un beau cadre numérique pour vos souvenirs</h2>
            <p>
              NestHub, c’est aussi :
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

        <section className="nesthub-landing__section">
          <div className="nesthub-landing__section-copy">
            <h2>Une solution familiale, pas une app de contrôle</h2>
            <p>
              NestHub repose sur une conviction simple : Les enfants sont capables de plus
              quand on leur donne les bons outils.
            </p>
          </div>
        </section>

        <section className="nesthub-landing__final">
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
    </div>
  );
}
