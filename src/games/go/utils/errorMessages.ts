/** Map internal engine error codes to player-friendly messages. */
export function formatEngineError(code: string): string {
  switch (code) {
    case 'illegal_move':
      return "That move isn't allowed.";
    case 'suicide':
      return 'That move would leave the group with no liberties.';
    case 'ko':
      return 'That position is prohibited by the ko rule.';
    case 'occupied':
      return 'That intersection is already occupied.';
    case 'out_of_bounds':
      return 'That intersection is outside the board.';
    case 'game_ended':
      return 'The game is no longer in play.';
    case 'not_in_scoring':
      return 'Scoring is not active.';
    case 'not_in_playing':
      return 'Undo is only available during active play.';
    case 'no_stone':
      return 'There is no stone at that intersection.';
    case 'nothing_to_undo':
      return 'There are no moves to undo.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
