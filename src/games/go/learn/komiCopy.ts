import { getDefaultKomi } from '../utils/gameSetup';

export function getKomiLearnDescription(): string {
  const smallBoardKomi = getDefaultKomi(9);
  const largeBoardKomi = getDefaultKomi(19);

  return (
    `Komi is compensation given to White for moving second. Let's Play Go currently ` +
    `defaults to ${smallBoardKomi} komi on 9×9 and 13×13 boards, and ${largeBoardKomi} komi on 19×19 under Chinese area ` +
    `scoring. Komi can be changed before starting a game. Half-points help avoid ties.`
  );
}

export function getKomiGlossaryDefinition(): string {
  const smallBoardKomi = getDefaultKomi(9);
  const largeBoardKomi = getDefaultKomi(19);

  return (
    `Compensation points awarded to White for moving second. Defaults in Let's Play Go: ` +
    `${smallBoardKomi} on 9×9 and 13×13, ${largeBoardKomi} on 19×19.`
  );
}
