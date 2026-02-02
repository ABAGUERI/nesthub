import { useState, useCallback, useEffect, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/shared/utils/supabase';
import './AlphaLandingPage.css';

type FormStatus = 'idle' | 'loading' | 'success' | 'already_exists' | 'error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BENEFITS = [
  {
    icon: '📅',
    title: 'Agenda lisible en un coup d\'oeil',
    description: 'Visualisez les activités de toute la famille sur un seul écran',
  },
  {
    icon: '🎮',
    title: 'Tâches enfants gamifiées',
    description: 'Points XP, niveaux et récompenses pour motiver les petits',
  },
  {
    icon: '🍽️',
    title: 'Écran cuisine : menu + liste d\'épicerie',
    description: 'Planifiez vos repas et générez votre liste de courses automatiquement',
  },
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'Tout le monde participe',
    description: 'Chaque membre voit ses responsabilités et contribue à l\'organisation',
  },
  {
    icon: '💰',
    title: 'Éducation financière intégrée',
    description: 'Tirelire virtuelle et projets d\'épargne pour apprendre la valeur de l\'argent',
  },
];

const STEPS = [
  {
    number: 1,
    title: 'Rejoignez la liste d\'attente',
    description: 'Inscrivez-vous avec votre email. C\'est rapide et sans engagement.',
    icon: '✉️',
  },
  {
    number: 2,
    title: 'Recevez votre invitation',
    description: 'Nous vous contactons dès qu\'une place se libère dans notre phase Alpha.',
    icon: '🎫',
  },
  {
    number: 3,
    title: 'Activez votre espace familial',
    description: 'Configurez votre NestHub en quelques minutes et commencez à organiser votre famille.',
    icon: '🚀',
  },
];

export function AlphaLandingPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [childrenAges, setChildrenAges] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [emailError, setEmailError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Validate email on change
  const validateEmail = useCallback((value: string) => {
    if (!value) {
      setEmailError('');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('Veuillez entrer une adresse email valide');
      return false;
    }
    setEmailError('');
    return true;
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (status === 'error') {
      setStatus('idle');
    }
    validateEmail(value);
  }, [status, validateEmail]);

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    setStatus('loading');

    try {
      const { error } = await supabase
        .from('alpha_waitlist')
        .insert({
          email: email.toLowerCase().trim(),
          first_name: firstName.trim() || null,
          children_ages: childrenAges.trim() || null,
          source: 'landingpage',
        });

      if (error) {
        // Check for unique constraint violation (email already exists)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          setStatus('already_exists');
        } else {
          console.error('Waitlist insert error:', error);
          setStatus('error');
        }
      } else {
        setStatus('success');
      }
    } catch (err) {
      console.error('Waitlist submit error:', err);
      setStatus('error');
    }
  }, [email, firstName, childrenAges, validateEmail]);

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

  const isSubmitDisabled = status === 'loading' || !email || !!emailError;

  return (
    <div className="alpha-landing">
      {/* noindex meta tag */}
      <meta name="robots" content="noindex,nofollow" />

      {/* Background effects */}
      <div className="alpha-landing__glow" aria-hidden="true" />
      <div className="alpha-landing__stars" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={`star star--${(i % 6) + 1}`} />
        ))}
      </div>

      {/* Header */}
      <header ref={headerRef} className="alpha-landing__header">
        <div className="alpha-landing__header-inner">
          <div className="alpha-landing__brand">
            <span className="alpha-landing__logo">NestHub</span>
            <span className="alpha-landing__badge">Alpha</span>
          </div>
          <nav className="alpha-landing__nav">
            <Link to="/login" className="alpha-landing__nav-link">
              Se connecter
            </Link>
          </nav>
        </div>
      </header>

      <main className="alpha-landing__main">
        {/* Hero Section */}
        <section className="alpha-landing__hero">
          <div className="alpha-landing__hero-content scroll-reveal">
            <div className="alpha-landing__badges">
              <span className="alpha-badge alpha-badge--primary">Alpha</span>
              <span className="alpha-badge alpha-badge--secondary">Sur invitation</span>
              <span className="alpha-badge alpha-badge--accent">Québec / Limoilou</span>
            </div>

            <h1 className="alpha-landing__title">
              NestHub — Le hub familial qui rend l'organisation simple et ludique
            </h1>

            <p className="alpha-landing__subtitle">
              Phase Alpha sur invitation. Inscrivez-vous pour recevoir un accès prioritaire.
            </p>

            <div className="alpha-landing__cta-group">
              <button
                type="button"
                className="alpha-landing__cta-primary"
                onClick={scrollToForm}
              >
                Rejoindre la liste d'attente
              </button>
              <Link to="/login" className="alpha-landing__cta-secondary">
                Se connecter
              </Link>
            </div>

            <p className="alpha-landing__reassurance">
              Pas de spam. Accès ouvert progressivement.
            </p>
          </div>

          <div className="alpha-landing__hero-visual scroll-reveal scroll-reveal--delay-2">
            <div className="alpha-landing__mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span /><span /><span />
                </div>
                <span className="mockup-title">NestHub</span>
              </div>
              <div className="mockup-content">
                <div className="mockup-card">
                  <span className="mockup-icon">🏆</span>
                  <span className="mockup-text">Objectif famille</span>
                  <div className="mockup-progress">
                    <span style={{ width: '65%' }} />
                  </div>
                </div>
                <div className="mockup-grid">
                  <div className="mockup-task">
                    <span>🛏️</span>
                    <span>Faire son lit</span>
                  </div>
                  <div className="mockup-task mockup-task--done">
                    <span>🦷</span>
                    <span>Brossage dents</span>
                  </div>
                  <div className="mockup-task">
                    <span>📚</span>
                    <span>Lecture 20 min</span>
                  </div>
                </div>
                <div className="mockup-hearts">
                  <span>❤️</span>
                  <span>❤️</span>
                  <span>❤️</span>
                  <span>🤍</span>
                  <span className="mockup-hearts-label">4 vies restantes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="alpha-landing__benefits scroll-reveal">
          <h2 className="alpha-landing__section-title">Ce qui vous attend</h2>
          <div className="benefits-grid">
            {BENEFITS.map((benefit, index) => (
              <div
                key={benefit.title}
                className={`benefit-card scroll-reveal scroll-reveal--delay-${(index % 3) + 1}`}
              >
                <div className="benefit-card__icon">{benefit.icon}</div>
                <h3 className="benefit-card__title">{benefit.title}</h3>
                <p className="benefit-card__description">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it Works Section */}
        <section className="alpha-landing__steps scroll-reveal">
          <h2 className="alpha-landing__section-title">Comment ça marche ?</h2>
          <div className="steps-container">
            {STEPS.map((step, index) => (
              <div key={step.number} className={`step-card scroll-reveal scroll-reveal--delay-${index + 1}`}>
                <div className="step-card__number">{step.number}</div>
                <div className="step-card__icon">{step.icon}</div>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__description">{step.description}</p>
                {index < STEPS.length - 1 && (
                  <div className="step-card__arrow" aria-hidden="true">→</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Waitlist Form Section */}
        <section ref={formRef} className="alpha-landing__form-section scroll-reveal">
          <div className="waitlist-card">
            <div className="waitlist-card__header">
              <h2 className="waitlist-card__title">Rejoindre la liste d'attente</h2>
              <p className="waitlist-card__subtitle">
                Soyez parmi les premiers à découvrir NestHub et à transformer l'organisation de votre famille.
              </p>
            </div>

            {status === 'success' || status === 'already_exists' ? (
              <div className="waitlist-success">
                <div className="waitlist-success__icon">🎉</div>
                <h3 className="waitlist-success__title">
                  {status === 'already_exists'
                    ? 'Vous êtes déjà sur la liste !'
                    : 'Vous êtes sur la liste !'}
                </h3>
                <p className="waitlist-success__message">
                  On vous contacte dès qu'une place se libère.
                </p>
              </div>
            ) : (
              <form className="waitlist-form" onSubmit={handleSubmit}>
                <div className="waitlist-form__field">
                  <label htmlFor="firstName" className="waitlist-form__label">
                    Prénom <span className="optional">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    className="waitlist-form__input"
                    placeholder="Votre prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={status === 'loading'}
                  />
                </div>

                <div className="waitlist-form__field">
                  <label htmlFor="email" className="waitlist-form__label">
                    Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    className={`waitlist-form__input ${emailError ? 'has-error' : ''}`}
                    placeholder="votre@email.com"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={status === 'loading'}
                    required
                  />
                  {emailError && (
                    <span className="waitlist-form__error">{emailError}</span>
                  )}
                </div>

                <div className="waitlist-form__field">
                  <label htmlFor="childrenAges" className="waitlist-form__label">
                    Âge de vos enfants <span className="optional">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    id="childrenAges"
                    className="waitlist-form__input"
                    placeholder="ex : 5, 8"
                    value={childrenAges}
                    onChange={(e) => setChildrenAges(e.target.value)}
                    disabled={status === 'loading'}
                  />
                </div>

                {status === 'error' && (
                  <div className="waitlist-form__error-message">
                    Oups… impossible d'enregistrer pour l'instant. Réessayez plus tard.
                  </div>
                )}

                <button
                  type="submit"
                  className="waitlist-form__submit"
                  disabled={isSubmitDisabled}
                >
                  {status === 'loading' ? (
                    <>
                      <span className="waitlist-spinner" />
                      Inscription en cours...
                    </>
                  ) : (
                    "S'inscrire à la liste d'attente"
                  )}
                </button>

                <p className="waitlist-form__privacy">
                  En vous inscrivant, vous acceptez de recevoir des communications de NestHub.
                  Vos données restent confidentielles.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="alpha-landing__final scroll-reveal">
          <div className="final-card">
            <h2>Prêt à simplifier votre quotidien familial ?</h2>
            <p>
              Rejoignez les familles qui testent NestHub en avant-première.
            </p>
            <button
              type="button"
              className="alpha-landing__cta-primary"
              onClick={scrollToForm}
            >
              Rejoindre la liste d'attente
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="alpha-landing__footer">
        <div className="alpha-landing__footer-inner">
          <div className="footer-brand">
            <span className="footer-brand__logo">NestHub</span>
            <span className="footer-brand__badge">Alpha</span>
          </div>
          <div className="footer-links">
            <Link to="/login" className="footer-link">Se connecter</Link>
          </div>
          <div className="footer-copy">
            <span className="footer-copy__location">Développé avec ❤️ à Québec, Canada</span>
            <span>© {new Date().getFullYear()} NestHub. Tous droits réservés.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
