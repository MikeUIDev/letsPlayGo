import { AI_DIFFICULTY_OPTIONS } from '../../engine/aiDifficulty';
import { AI_SUPPORTED_BOARD_SIZES, BOARD_SIZE_OPTIONS } from '../../utils/gameSetup';

export function StrategySection() {
  return (
    <section className="learn-section" id="strategy" aria-labelledby="strategy-heading">
      <h2 id="strategy-heading" className="learn-section__title">
        Strategy Basics
      </h2>

      <article className="learn-article" id="corners-sides-center">
        <h3>Corners, Sides &amp; Center</h3>
        <p>
          It takes fewer stones to surround territory near the edge of the board. Corners are
          usually the most efficient, sides come next, and the center often requires the most stones
          to secure territory.
        </p>
        <p>This is a useful principle, not a rule you must follow on every move.</p>
      </article>

      <article className="learn-article" id="keep-groups-connected">
        <h3>Keep Groups Connected</h3>
        <p>
          Beginners often do better when weak stones stay connected, liberties are watched, and too
          many isolated groups are avoided. This ties directly to connect and cut.
        </p>
      </article>

      <article className="learn-article" id="life-and-death">
        <h3>Life &amp; Death</h3>
        <p>
          A group is alive when the opponent cannot capture it even if they move first locally.
          Learning even basic life-and-death ideas helps you protect important groups and attack
          vulnerable ones.
        </p>
      </article>

      <article className="learn-article" id="two-eyes">
        <h3>Two Eyes</h3>
        <p>
          A group with two separate secure internal liberties, called eyes, generally cannot be
          captured. Not every empty point that looks like an eye is a true eye, but two real eyes
          are a strong sign of life.
        </p>
      </article>

      <article className="learn-article" id="sente-gote">
        <h3>Sente &amp; Gote</h3>
        <p>
          <strong>Sente</strong> describes a move that keeps the initiative, often because the
          opponent needs to respond. <strong>Gote</strong> describes a move or sequence after
          which the opponent gains the initiative. These are educational terms in this reference
          section and are not detected automatically by Coach Mode.
        </p>
      </article>

      <article className="learn-article" id="opening-principles">
        <h3>Opening Principles</h3>
        <ul className="learn-list">
          <li>Start with larger areas rather than tiny local moves too early.</li>
          <li>Corners are efficient places to build territory.</li>
          <li>Avoid playing every stone too close together.</li>
          <li>Connect weak groups when possible.</li>
          <li>Attack while strengthening your own position.</li>
          <li>Keep track of liberties.</li>
        </ul>
      </article>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="learn-section" id="about" aria-labelledby="about-heading">
      <h2 id="about-heading" className="learn-section__title">
        About Go
      </h2>

      <article className="learn-article" id="history">
        <h3>History of Go</h3>
        <p>
          Go originated in ancient China more than two thousand years ago and spread to Korea and
          Japan, where it became deeply embedded in culture and professional play. Organized
          professional Go later expanded internationally, and modern Go has strong communities
          throughout East Asia and worldwide.
        </p>
        <p>
          Computer Go advanced dramatically during the 2010s. AlphaGo&apos;s 2016 match with Lee Sedol
          was a major milestone, and modern engines such as KataGo now provide extremely strong
          analysis for players at every level.
        </p>
      </article>

      <article className="learn-article" id="computer-go">
        <h3>Go &amp; Artificial Intelligence</h3>
        <p>
          For decades, Go was especially difficult for computers because of its enormous number of
          possible positions and moves. Modern neural-network and search systems changed that
          dramatically.
        </p>
        <p>
          Let&apos;s Play Go uses KataGo for AI opponents, position analysis, and move recommendations.
          KataGo is an external open-source engine and is not created by this project.
        </p>
      </article>

      <article className="learn-article" id="board-sizes">
        <h3>Board Sizes</h3>
        <ul className="learn-list">
          {BOARD_SIZE_OPTIONS.map((option) => (
            <li key={option.size}>
              <strong>{option.label}</strong> — {option.descriptor}.
            </li>
          ))}
        </ul>
        <p>
          Standard Go supports 9×9, 13×13, and 19×19 boards. Local two-player mode in Let&apos;s Play
          Go supports all three sizes. AI and analysis currently support {AI_SUPPORTED_BOARD_SIZES.join('×')} only.
        </p>
      </article>

      <article className="learn-article" id="ranking-system">
        <h3>Ranking System</h3>
        <p>
          Amateur players often progress from higher kyu ranks toward 1 kyu, then continue to dan
          ranks. Professional dan ranks are a separate professional system and should not be
          directly equated with amateur dan.
        </p>
        <p>
          AI difficulty labels in Let&apos;s Play Go — {AI_DIFFICULTY_OPTIONS.map((option) => option.label).join(', ')} — are product difficulty settings, not official Go ranks.
        </p>
      </article>
    </section>
  );
}

export function UsingAppSection() {
  return (
    <section className="learn-section" id="using-app" aria-labelledby="using-app-heading">
      <h2 id="using-app-heading" className="learn-section__title">
        Using Let&apos;s Play Go
      </h2>

      <article className="learn-article" id="play-vs-ai">
        <h3>Play vs AI</h3>
        <p>
          Choose AI mode during game setup, pick your color, and start a game on a supported board
          size. The AI uses KataGo to choose moves.
        </p>
      </article>

      <article className="learn-article" id="ai-difficulty">
        <h3>AI Difficulty</h3>
        <ul className="learn-list">
          {AI_DIFFICULTY_OPTIONS.map((option) => (
            <li key={option.value}>
              <strong>{option.label}</strong> — {option.description}.
            </li>
          ))}
        </ul>
      </article>

      <article className="learn-article" id="local-two-player">
        <h3>Local Two Player</h3>
        <p>
          Local mode lets two people play on the same device, with support for 9×9, 13×13, and 19×19
          boards and configurable komi.
        </p>
      </article>

      <article className="learn-article" id="scoring-mode">
        <h3>Scoring Mode</h3>
        <p>
          After consecutive passes, the game enters scoring. You can mark dead stones, review
          territory, and confirm the final Chinese area score.
        </p>
      </article>

      <article className="learn-article" id="review-mode">
        <h3>Review Mode</h3>
        <p>
          After a finished game, Review Board lets you move backward and forward through the game,
          inspect historical positions, view KataGo analysis, see candidate moves, and review win
          rate and score lead estimates.
        </p>
      </article>

      <article className="learn-article" id="coach-mode">
        <h3>Coach Mode</h3>
        <p>
          Coach Mode highlights costly moves, better alternatives, and recognizable Go concepts
          such as atari, capture, cut, hane, ladder, net, and snapback. Explanations combine
          deterministic board analysis with KataGo evaluation. Coach Mode does not explain every
          strategic reason behind every move.
        </p>
      </article>

      <article className="learn-article" id="sgf">
        <h3>SGF Import / Export</h3>
        <p>
          Smart Game Format (SGF) is a common file format for storing Go games. Let&apos;s Play Go
          supports importing and exporting finished games as SGF files for review and sharing.
        </p>
      </article>
    </section>
  );
}
