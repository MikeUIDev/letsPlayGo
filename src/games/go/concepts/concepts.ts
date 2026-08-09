import type { GoConcept, GoConceptDefinition } from './types';

export const GO_CONCEPTS: Record<GoConcept, GoConceptDefinition> = {
  atari: {
    id: 'atari',
    name: 'Atari',
    shortDefinition: 'A group with only one liberty remaining.',
  },
  capture: {
    id: 'capture',
    name: 'Capture',
    shortDefinition: 'Removing opposing stones by filling their final liberty.',
  },
  self_atari: {
    id: 'self_atari',
    name: 'Self-atari',
    shortDefinition: 'A move that leaves your own group with only one liberty.',
  },
  connect: {
    id: 'connect',
    name: 'Connect',
    shortDefinition: 'A move that joins separate friendly groups so they share liberties.',
  },
  extend: {
    id: 'extend',
    name: 'Extend',
    shortDefinition: 'A move played next to your stones to expand or strengthen a group.',
  },
  ko: {
    id: 'ko',
    name: 'Ko',
    shortDefinition: 'A repeating capture situation where immediate recapture is forbidden.',
  },
  missed_capture: {
    id: 'missed_capture',
    name: 'Missed capture',
    shortDefinition: 'A chance to capture an opposing group that was not taken.',
  },
  missed_defense: {
    id: 'missed_defense',
    name: 'Missed defense',
    shortDefinition:
      'A vulnerable group was not protected before the opponent could attack or capture it.',
  },
  cut: {
    id: 'cut',
    name: 'Cut',
    shortDefinition: 'A move that separates opposing stones or prevents them from connecting.',
    description:
      'Cutting attacks the connection between nearby enemy groups so they cannot easily act as one group.',
  },
  hane: {
    id: 'hane',
    name: 'Hane',
    shortDefinition: 'A diagonal move that bends around an opposing stone.',
    description:
      'A hane is commonly played diagonally next to an opponent stone while staying connected to your own nearby stone.',
  },
  tigers_mouth: {
    id: 'tigers_mouth',
    name: "Tiger's Mouth",
    shortDefinition: 'A strong three-stone shape surrounding an empty point.',
    description:
      'The empty point inside a tiger\'s mouth is difficult for the opponent to enter because playing there can lead to immediate capture.',
  },
  ladder: {
    id: 'ladder',
    name: 'Ladder',
    shortDefinition:
      'A repeating sequence of ataris that chases a group across the board until it is captured or escapes.',
    description:
      'In a ladder, one side repeatedly puts a group in atari while the group is forced to run in a predictable zig-zag path.',
  },
  net: {
    id: 'net',
    name: 'Net',
    shortDefinition:
      'A move that traps an opposing group so it cannot escape, without needing a continuous series of ataris.',
    description:
      'A net surrounds the escape routes of a group and leaves it unable to get away.',
  },
  snapback: {
    id: 'snapback',
    name: 'Snapback',
    shortDefinition:
      'A tactic where a stone is sacrificed, then the immediate recapture allows a larger capture.',
    description:
      'In a snapback, taking the offered stone looks good at first, but the opponent then recaptures and takes a larger group.',
  },
};

export function getConceptDefinition(concept: GoConcept): GoConceptDefinition {
  return GO_CONCEPTS[concept];
}
