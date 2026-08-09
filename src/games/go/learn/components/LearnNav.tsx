import { type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LEARN_NAV } from '../sections';
import { useLearnSectionNavigation } from '../useLearnSectionScroll';

export function LearnNav() {
  const location = useLocation();
  const { goToSection } = useLearnSectionNavigation();
  const hash = location.hash.replace('#', '');

  const handleSectionClick = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    goToSection(sectionId);
  };

  return (
    <nav className="learn-nav" aria-label="Learn Go sections">
      <ul className="learn-nav__list">
        {LEARN_NAV.map((section) => (
          <li key={section.id} className="learn-nav__group">
            <a
              href={`#${section.id}`}
              className={`learn-nav__link${hash === section.id ? ' learn-nav__link--active' : ''}`}
              aria-current={hash === section.id ? 'location' : undefined}
              onClick={handleSectionClick(section.id)}
            >
              {section.label}
            </a>
            {section.children ? (
              <ul className="learn-nav__sublist">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      className={`learn-nav__sublink${hash === child.id ? ' learn-nav__sublink--active' : ''}`}
                      aria-current={hash === child.id ? 'location' : undefined}
                      onClick={handleSectionClick(child.id)}
                    >
                      {child.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <Link to="/" className="learn-nav__play-link">
        Back to Play
      </Link>
    </nav>
  );
}

export function LearnMobileNav() {
  const location = useLocation();
  const { goToSection } = useLearnSectionNavigation();
  const hash = location.hash.replace('#', '');

  return (
    <label className="learn-mobile-nav">
      <span className="visually-hidden">Jump to section</span>
      <select
        className="learn-mobile-nav__select"
        value={hash}
        onChange={(event) => {
          const value = event.target.value;
          if (value) {
            goToSection(value);
          }
        }}
      >
        <option value="">Choose a section…</option>
        {LEARN_NAV.flatMap((section) => [
          <option key={section.id} value={section.id}>
            {section.label}
          </option>,
          ...(section.children ?? []).map((child) => (
            <option key={child.id} value={child.id}>
              — {child.label}
            </option>
          )),
        ])}
      </select>
    </label>
  );
}
