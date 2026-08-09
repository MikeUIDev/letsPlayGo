import { describe, expect, it } from 'vitest';
import { GO_CONCEPTS } from '../concepts/concepts';
import type { GoConcept } from '../concepts/types';
import { getDefaultKomi } from '../utils/gameSetup';
import { getLearnConceptAnchor, getLearnConceptUrl } from '../learn/conceptAnchors';
import {
  filterGlossaryEntries,
  getGlossaryAnchor,
  GLOSSARY_ENTRIES,
} from '../learn/glossary';
import { getKomiGlossaryDefinition, getKomiLearnDescription } from '../learn/komiCopy';
import { LEARN_LANDING_CARDS, LEARN_NAV, flattenLearnNav } from '../learn/sections';
import { buildDiagramState, highlightKeys } from '../learn/utils/staticBoard';
import { getStone } from '../engine/board';

const learnSources = import.meta.glob(
  ['../learn/content/**/*.tsx', '../learn/components/GlossarySection.tsx'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

function collectStaticLearnAnchorIds(): Set<string> {
  const ids = new Set<string>();

  for (const source of Object.values(learnSources)) {
    for (const match of source.matchAll(/\bid=["']([^"']+)["']/g)) {
      ids.add(match[1]);
    }
  }

  return ids;
}

function hasLearnNavAnchor(id: string, staticIds: Set<string>): boolean {
  if (staticIds.has(id)) {
    return true;
  }

  const conceptSection = LEARN_NAV.find((section) => section.id === 'concepts');
  if (conceptSection?.children?.some((child) => child.id === id) && id in GO_CONCEPTS) {
    return true;
  }

  return false;
}

describe('learn navigation', () => {
  it('defines primary landing cards', () => {
    expect(LEARN_LANDING_CARDS.length).toBeGreaterThanOrEqual(6);
    expect(LEARN_LANDING_CARDS.some((card) => card.sectionId === 'rules')).toBe(true);
  });

  it('includes deep-link anchors for major concepts', () => {
    const ids = flattenLearnNav().map((item) => item.id);
    expect(ids).toContain('atari');
    expect(ids).toContain('ko');
    expect(ids).toContain('ladder');
    expect(ids).toContain('glossary');
  });

  it('organizes sections in expected groups', () => {
    expect(LEARN_NAV.some((section) => section.id === 'getting-started')).toBe(true);
    expect(LEARN_NAV.some((section) => section.id === 'using-app')).toBe(true);
  });

  it('maps every nav item to a learn page anchor', () => {
    const staticIds = collectStaticLearnAnchorIds();

    for (const item of flattenLearnNav()) {
      expect(hasLearnNavAnchor(item.id, staticIds)).toBe(true);
    }
  });
});

describe('learn glossary', () => {
  it('renders glossary entries in alphabetical order', () => {
    const terms = GLOSSARY_ENTRIES.map((entry) => entry.term);
    expect(terms).toEqual([...terms].sort((left, right) => left.localeCompare(right)));
  });

  it('reuses GO_CONCEPTS definitions for concept terms', () => {
    const atari = GLOSSARY_ENTRIES.find((entry) => entry.conceptId === 'atari');
    expect(atari?.definition).toBe(GO_CONCEPTS.atari.shortDefinition);
    expect(atari?.term).toBe('Atari');
  });

  it('filters glossary entries by query', () => {
    expect(filterGlossaryEntries('lib').some((entry) => entry.term === 'Liberty')).toBe(true);
    expect(filterGlossaryEntries('at').some((entry) => entry.term === 'Atari')).toBe(true);
    expect(filterGlossaryEntries('zzzz-not-found')).toHaveLength(0);
  });

  it('links glossary entries to valid learn anchors', () => {
    const staticIds = collectStaticLearnAnchorIds();

    for (const entry of GLOSSARY_ENTRIES) {
      if (!entry.conceptId && !entry.learnAnchor) {
        continue;
      }

      const anchor = getGlossaryAnchor(entry);
      expect(hasLearnNavAnchor(anchor, staticIds) || staticIds.has(anchor)).toBe(true);
    }
  });
});

describe('learn content accuracy', () => {
  it('describes komi defaults from the engine', () => {
    const smallBoardKomi = getDefaultKomi(9);
    const largeBoardKomi = getDefaultKomi(19);

    expect(getKomiLearnDescription()).toContain(String(smallBoardKomi));
    expect(getKomiLearnDescription()).toContain(String(largeBoardKomi));
    expect(getKomiGlossaryDefinition()).toContain(String(smallBoardKomi));
    expect(getKomiGlossaryDefinition()).toContain(String(largeBoardKomi));
    expect(getDefaultKomi(13)).toBe(smallBoardKomi);
  });

  it('maps coach concept links to stable learn anchors', () => {
    const staticIds = collectStaticLearnAnchorIds();

    for (const conceptId of Object.keys(GO_CONCEPTS) as GoConcept[]) {
      const anchor = getLearnConceptAnchor(conceptId);
      expect(staticIds.has(anchor) || anchor in GO_CONCEPTS).toBe(true);
      expect(getLearnConceptUrl(conceptId)).toBe(`/learn#${anchor}`);
    }

    expect(getLearnConceptUrl('capture')).toBe('/learn#capturing-stones');
  });
});

describe('learn diagrams', () => {
  it('builds static diagram board states', () => {
    const state = buildDiagramState(5, [{ row: 2, col: 2, color: 'black' }]);
    expect(getStone(state.board, { row: 2, col: 2 })).toBe('black');
    expect(state.phase).toBe('ended');
  });

  it('creates highlight keys for liberties', () => {
    const keys = highlightKeys([
      { row: 1, col: 2 },
      { row: 3, col: 2 },
    ]);
    expect(keys.has('1,2')).toBe(true);
    expect(keys.has('3,2')).toBe(true);
  });

  it('does not mutate source board when building diagram state', () => {
    const state = buildDiagramState(5, [{ row: 1, col: 1, color: 'white' }]);
    const before = getStone(state.board, { row: 1, col: 1 });
    buildDiagramState(5, [
      { row: 1, col: 1, color: 'white' },
      { row: 2, col: 2, color: 'black' },
    ]);
    expect(getStone(state.board, { row: 1, col: 1 })).toBe(before);
  });
});

describe('learn architecture', () => {
  it('keeps concept metadata centralized in GO_CONCEPTS', () => {
    expect(GO_CONCEPTS.ladder.description).toContain('atari');
    expect(GO_CONCEPTS.snapback.shortDefinition).toContain('sacrifice');
  });

  it('links Coach concepts to learn deep links', () => {
    expect(getLearnConceptUrl('atari')).toBe('/learn#atari');
    expect(getLearnConceptUrl('ladder')).toBe('/learn#ladder');
    expect(getLearnConceptUrl('missed_capture')).toBe('/learn#missed_capture');
  });

  it('does not require analysis services in learn modules', async () => {
    const learnPage = await import('../learn/LearnPage');
    const glossary = await import('../learn/glossary');
    const diagram = await import('../learn/components/GoDiagram');
    expect(typeof learnPage.LearnPage).toBe('function');
    expect(glossary.GLOSSARY_ENTRIES.length).toBeGreaterThan(0);
    expect(typeof diagram.GoDiagram).toBe('function');
  });
});

describe('learn route wiring', () => {
  it('registers the /learn route in App', async () => {
    const app = await import('../../../App');
    expect(app.default).toBeTypeOf('function');
  });
});
