import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GettingStartedSection } from './content/GettingStartedSection';
import { ConceptsSection, RulesSection } from './content/RulesAndConceptsSections';
import { AboutSection, StrategySection, UsingAppSection } from './content/StrategyAboutUsingSections';
import { GlossarySection } from './components/GlossarySection';
import { LearnMobileNav, LearnNav } from './components/LearnNav';
import { LEARN_LANDING_CARDS } from './sections';
import { useLearnSectionNavigation, useLearnSectionScrollOnHash } from './useLearnSectionScroll';
import '../tutorial/tutorial.css';
import './learn.css';

export function LearnPage() {
  useLearnSectionScrollOnHash();
  const { goToSection } = useLearnSectionNavigation();

  useEffect(() => {
    document.documentElement.classList.add('learn-page-active');
    return () => document.documentElement.classList.remove('learn-page-active');
  }, []);

  return (
    <div className="learn-page">
      <div className="go-shell learn-page__inner">
        <header className="learn-hero">
          <p className="learn-hero__eyebrow">Learn Go</p>
          <h1 className="learn-hero__title">Everything you need to start playing Go.</h1>
          <p className="learn-hero__intro">
            A beginner-friendly reference for rules, vocabulary, strategy, and Let&apos;s Play Go
            features. For hands-on lessons, start the interactive tutorial.
          </p>
        </header>

        <Link to="/learn/tutorial" className="tutorial-start-card">
          <h2 className="tutorial-start-card__title">Start Tutorial</h2>
          <p className="tutorial-start-card__description">
            Learn Go step by step with guided board lessons. Works offline — no AI backend required.
          </p>
        </Link>

        <div className="learn-landing">
          {LEARN_LANDING_CARDS.map((card) => (
            <a
              key={card.id}
              href={`#${card.sectionId}`}
              className="learn-card"
              onClick={(event) => {
                event.preventDefault();
                goToSection(card.sectionId);
              }}
            >
              <h2 className="learn-card__title">{card.title}</h2>
              <p className="learn-card__description">{card.description}</p>
            </a>
          ))}
        </div>

        <LearnMobileNav />

        <div className="learn-layout">
          <aside className="learn-layout__nav">
            <LearnNav />
          </aside>

          <main className="learn-layout__content">
            <GettingStartedSection />
            <RulesSection />
            <ConceptsSection />
            <StrategySection />
            <AboutSection />
            <UsingAppSection />
            <GlossarySection />

            <div className="learn-footer-cta">
              <p>Ready to play?</p>
              <Link to="/" className="learn-footer-cta__link">
                Start a game
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
