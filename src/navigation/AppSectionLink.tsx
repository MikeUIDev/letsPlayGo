import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { type AppSectionId, isSectionActive, sectionPath } from './appRoutes';
import { useSectionNavigation } from './useSectionNavigation';

type AppSectionLinkProps = {
  section: AppSectionId;
  children: ReactNode;
  className?: string | ((args: { isActive: boolean }) => string);
};

export function AppSectionLink({ section, children, className }: AppSectionLinkProps) {
  const { goToSection, pathname } = useSectionNavigation();
  const to = sectionPath(section);
  const isActive = isSectionActive(pathname, section);

  return (
    <NavLink
      to={to}
      end={section === 'play'}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? () => className({ isActive }) : className}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        goToSection(section);
      }}
    >
      {children}
    </NavLink>
  );
}
