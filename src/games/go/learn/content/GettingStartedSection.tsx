export function GettingStartedSection() {
  return (
    <section className="learn-section" id="getting-started" aria-labelledby="getting-started-heading">
      <h2 id="getting-started-heading" className="learn-section__title">
        Getting Started
      </h2>

      <article className="learn-article" id="what-is-go">
        <h3>What is Go?</h3>
        <p>
          Go is a two-player strategy board game played with black and white stones on a grid of
          intersections. Players alternate placing one stone at a time. Stones normally remain where
          they are played unless they are captured.
        </p>
        <p>
          The goal is to surround more territory than your opponent. You can capture opposing stones
          by filling all of their liberties. Black plays first, and White usually receives komi to
          balance moving second. The game ends after consecutive passes, and the final score
          determines the winner.
        </p>
      </article>

      <article className="learn-article" id="board-and-stones">
        <h3>The Board &amp; Stones</h3>
        <p>
          Stones are placed on the intersections of the board lines, not in the squares. Standard
          full-size Go uses a 19×19 board, while 13×13 and 9×9 boards are common for faster games
          and learning.
        </p>
        <p>
          A 9×9 board is especially useful for learning, quick games, and tactical practice.
          Let&apos;s Play Go supports 9×9, 13×13, and 19×19 for local play.
        </p>
      </article>

      <article className="learn-article" id="the-goal">
        <h3>The Goal</h3>
        <p>
          Each player tries to control more territory than the opponent. Territory comes from empty
          intersections surrounded by your stones, together with the stones you have on the board
          under Chinese area scoring used in this app.
        </p>
      </article>

      <article className="learn-article" id="how-a-turn-works">
        <h3>How a Turn Works</h3>
        <p>
          On your turn you may place a stone on an empty intersection, as long as the move is legal.
          You may also pass. Once both players pass in a row, the game moves toward scoring and
          ending according to the app&apos;s rules.
        </p>
      </article>
    </section>
  );
}
