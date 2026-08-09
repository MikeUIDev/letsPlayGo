import type { LearnCard, LearnNavItem } from './types';

export const LEARN_NAV: LearnNavItem[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    children: [
      { id: 'what-is-go', label: 'What is Go?' },
      { id: 'board-and-stones', label: 'The Board & Stones' },
      { id: 'the-goal', label: 'The Goal' },
      { id: 'how-a-turn-works', label: 'How a Turn Works' },
    ],
  },
  {
    id: 'rules',
    label: 'Rules',
    children: [
      { id: 'liberties', label: 'Liberties' },
      { id: 'atari', label: 'Atari' },
      { id: 'capturing-stones', label: 'Capturing Stones' },
      { id: 'groups', label: 'Groups' },
      { id: 'suicide', label: 'Suicide' },
      { id: 'ko', label: 'Ko' },
      { id: 'passing', label: 'Passing' },
      { id: 'territory', label: 'Territory' },
      { id: 'scoring', label: 'Scoring' },
      { id: 'komi', label: 'Komi' },
      { id: 'ending-the-game', label: 'Ending the Game' },
    ],
  },
  {
    id: 'concepts',
    label: 'Go Concepts',
    children: [
      { id: 'connect', label: 'Connect' },
      { id: 'extend', label: 'Extend' },
      { id: 'cut', label: 'Cut' },
      { id: 'hane', label: 'Hane' },
      { id: 'tigers_mouth', label: "Tiger's Mouth" },
      { id: 'ladder', label: 'Ladder' },
      { id: 'net', label: 'Net' },
      { id: 'snapback', label: 'Snapback' },
      { id: 'self_atari', label: 'Self-atari' },
      { id: 'missed_capture', label: 'Missed Capture' },
      { id: 'missed_defense', label: 'Missed Defense' },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy Basics',
    children: [
      { id: 'corners-sides-center', label: 'Corners, Sides & Center' },
      { id: 'keep-groups-connected', label: 'Keep Groups Connected' },
      { id: 'life-and-death', label: 'Life & Death' },
      { id: 'two-eyes', label: 'Two Eyes' },
      { id: 'sente-gote', label: 'Sente & Gote' },
      { id: 'opening-principles', label: 'Opening Principles' },
    ],
  },
  {
    id: 'about',
    label: 'About Go',
    children: [
      { id: 'history', label: 'History of Go' },
      { id: 'computer-go', label: 'Go & AI' },
      { id: 'board-sizes', label: 'Board Sizes' },
      { id: 'ranking-system', label: 'Ranking System' },
    ],
  },
  {
    id: 'using-app',
    label: "Using Let's Play Go",
    children: [
      { id: 'play-vs-ai', label: 'Play vs AI' },
      { id: 'ai-difficulty', label: 'AI Difficulty' },
      { id: 'local-two-player', label: 'Local Two Player' },
      { id: 'scoring-mode', label: 'Scoring Mode' },
      { id: 'review-mode', label: 'Review Mode' },
      { id: 'coach-mode', label: 'Coach Mode' },
      { id: 'sgf', label: 'SGF Import / Export' },
    ],
  },
  { id: 'glossary', label: 'Glossary' },
];

export const LEARN_LANDING_CARDS: LearnCard[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the objective and basic rules.',
    sectionId: 'getting-started',
  },
  {
    id: 'rules',
    title: 'Rules',
    description: 'Liberties, captures, ko, passing and scoring.',
    sectionId: 'rules',
  },
  {
    id: 'concepts',
    title: 'Go Concepts',
    description: 'Atari, connect, cut, hane and common tactics.',
    sectionId: 'concepts',
  },
  {
    id: 'strategy',
    title: 'Strategy Basics',
    description: 'Simple principles for playing better Go.',
    sectionId: 'strategy',
  },
  {
    id: 'glossary',
    title: 'Go Glossary',
    description: 'Quick definitions of common Go terms.',
    sectionId: 'glossary',
  },
  {
    id: 'history',
    title: 'History of Go',
    description: 'Where the game came from and how it developed.',
    sectionId: 'history',
  },
  {
    id: 'using-app',
    title: "Using Let's Play Go",
    description: 'AI, scoring, review and Coach Mode.',
    sectionId: 'using-app',
  },
];

export function flattenLearnNav(items: LearnNavItem[] = LEARN_NAV): LearnNavItem[] {
  const flat: LearnNavItem[] = [];

  for (const item of items) {
    flat.push(item);
    if (item.children) {
      flat.push(...item.children);
    }
  }

  return flat;
}
