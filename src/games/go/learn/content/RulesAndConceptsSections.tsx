import { GoDiagram } from '../components/GoDiagram';
import { GoSequenceDiagram } from '../components/GoSequenceDiagram';
import { ConceptReference } from '../components/ConceptReference';
import { GO_CONCEPTS } from '../../concepts/concepts';
import { getKomiLearnDescription } from '../komiCopy';

export function RulesSection() {
  return (
    <section className="learn-section" id="rules" aria-labelledby="rules-heading">
      <h2 id="rules-heading" className="learn-section__title">
        Rules
      </h2>

      <article className="learn-article" id="liberties">
        <h3>Liberties</h3>
        <p>
          A liberty is an empty intersection directly adjacent to a stone or connected group.
          Diagonal points do not count. Connected stones share liberties.
        </p>
        <GoDiagram
          size={5}
          stones={[{ row: 2, col: 2, color: 'black' }]}
          highlights={[
            { row: 1, col: 2 },
            { row: 3, col: 2 },
            { row: 2, col: 1 },
            { row: 2, col: 3 },
          ]}
          caption="The highlighted empty points are liberties of the black stone."
          ariaLabel="Black stone with four liberties highlighted"
        />
      </article>

      <article className="learn-article" id="atari">
        <h3>Atari</h3>
        <p>{GO_CONCEPTS.atari.shortDefinition}</p>
        <p>A group with exactly one liberty remaining is in atari.</p>
        <GoDiagram
          size={5}
          stones={[
            { row: 2, col: 2, color: 'black' },
            { row: 1, col: 2, color: 'white' },
            { row: 3, col: 2, color: 'white' },
            { row: 2, col: 1, color: 'white' },
          ]}
          highlights={[{ row: 2, col: 3 }]}
          caption="This black group has only one liberty remaining, so it is in atari."
        />
      </article>

      <article className="learn-article" id="capturing-stones">
        <h3>Capturing Stones</h3>
        <p>{GO_CONCEPTS.capture.shortDefinition}</p>
        <GoSequenceDiagram
          ariaLabel="Capture example"
          steps={[
            {
              size: 5,
              stones: [
                { row: 2, col: 2, color: 'black' },
                { row: 1, col: 2, color: 'white' },
                { row: 3, col: 2, color: 'white' },
                { row: 2, col: 1, color: 'white' },
              ],
              highlights: [{ row: 2, col: 3 }],
              title: 'Before: Black has one liberty.',
              caption: 'White can capture by playing at the final liberty.',
            },
            {
              size: 5,
              stones: [
                { row: 1, col: 2, color: 'white' },
                { row: 3, col: 2, color: 'white' },
                { row: 2, col: 1, color: 'white' },
                { row: 2, col: 3, color: 'white' },
              ],
              title: 'After: White fills the liberty and removes Black.',
              caption: 'Captured stones are removed from the board.',
            },
          ]}
        />
      </article>

      <article className="learn-article" id="groups">
        <h3>Groups</h3>
        <p>
          Stones of the same color connected horizontally or vertically form a group. Groups share
          liberties. Diagonal stones are not directly connected.
        </p>
        <GoDiagram
          size={5}
          stones={[
            { row: 2, col: 2, color: 'black' },
            { row: 2, col: 3, color: 'black' },
            { row: 3, col: 2, color: 'black' },
          ]}
          highlights={[
            { row: 1, col: 2 },
            { row: 1, col: 3 },
            { row: 2, col: 1 },
            { row: 2, col: 4 },
            { row: 3, col: 1 },
            { row: 3, col: 3 },
            { row: 4, col: 2 },
          ]}
          caption="These three black stones form one group and share the same liberties."
        />
      </article>

      <article className="learn-article" id="suicide">
        <h3>Suicide</h3>
        <p>
          In Let&apos;s Play Go, you normally cannot play a stone that would leave your own resulting
          group with no liberties, unless the move captures opposing stones and thereby creates
          liberties for your group.
        </p>
      </article>

      <article className="learn-article" id="ko">
        <h3>Ko</h3>
        <p>{GO_CONCEPTS.ko.shortDefinition}</p>
        <p>
          Ko prevents immediate repetition of the same board position. After a single-stone capture,
          the captured point usually cannot be recaptured immediately on the next turn.
        </p>
        <GoSequenceDiagram
          ariaLabel="Ko example"
          steps={[
            {
              size: 5,
              stones: [
                { row: 2, col: 1, color: 'white' },
                { row: 1, col: 2, color: 'black' },
                { row: 3, col: 2, color: 'black' },
              ],
              title: 'White can be captured at the marked point.',
              highlights: [{ row: 2, col: 2 }],
            },
            {
              size: 5,
              stones: [
                { row: 1, col: 2, color: 'black' },
                { row: 3, col: 2, color: 'black' },
                { row: 2, col: 2, color: 'black' },
              ],
              title: 'Black captures one white stone.',
            },
            {
              size: 5,
              stones: [
                { row: 1, col: 2, color: 'black' },
                { row: 3, col: 2, color: 'black' },
                { row: 2, col: 2, color: 'black' },
              ],
              title: 'Immediate recapture at the same point would repeat the position and is forbidden.',
              highlights: [{ row: 2, col: 1 }],
            },
          ]}
        />
      </article>

      <article className="learn-article" id="passing">
        <h3>Passing</h3>
        <p>
          A player may pass instead of placing a stone. When both players pass consecutively, the
          game enters scoring in Let&apos;s Play Go.
        </p>
      </article>

      <article className="learn-article" id="territory">
        <h3>Territory</h3>
        <p>
          Empty intersections surrounded by your stones can count as your territory. Determining
          territory may involve deciding whether groups are alive or dead during scoring.
        </p>
      </article>

      <article className="learn-article" id="scoring">
        <h3>Scoring</h3>
        <p>
          Let&apos;s Play Go uses Chinese area scoring. Each player&apos;s score is the number of
          their stones on the board plus surrounded empty territory. Captured prisoners are not
          added to the score. White also receives komi.
        </p>
      </article>

      <article className="learn-article" id="komi">
        <h3>Komi</h3>
        <p>{getKomiLearnDescription()}</p>
      </article>

      <article className="learn-article" id="ending-the-game">
        <h3>Ending the Game</h3>
        <p>
          After two consecutive passes, Let&apos;s Play Go enters scoring. You can mark dead stones,
          review territory, and confirm the final result.
        </p>
      </article>
    </section>
  );
}

export function ConceptsSection() {
  return (
    <section className="learn-section" id="concepts" aria-labelledby="concepts-heading">
      <h2 id="concepts-heading" className="learn-section__title">
        Go Concepts
      </h2>
      <p className="learn-section__intro">
        These named shapes and tactics appear throughout Go. Definitions below come from the same
        vocabulary used by Coach Mode.
      </p>

      <ConceptReference
        conceptId="connect"
        extra="Connected stones share liberties and function as one group."
        diagram={{
          size: 5,
          stones: [
            { row: 2, col: 1, color: 'black' },
            { row: 2, col: 3, color: 'black' },
            { row: 2, col: 2, color: 'black' },
          ],
          caption: 'A connecting move joins separate friendly groups.',
        }}
      />

      <ConceptReference
        conceptId="extend"
        extra="Extending adds a nearby stone to increase liberties and strengthen a group."
        diagram={{
          size: 5,
          stones: [
            { row: 2, col: 2, color: 'black' },
            { row: 2, col: 3, color: 'black' },
          ],
          caption: 'The new stone extends the black group.',
        }}
      />

      <ConceptReference
        conceptId="cut"
        diagram={{
          size: 5,
          stones: [
            { row: 2, col: 1, color: 'white' },
            { row: 2, col: 3, color: 'white' },
            { row: 2, col: 2, color: 'black' },
          ],
          caption: 'Black cuts between two white groups.',
        }}
      />

      <ConceptReference
        conceptId="hane"
        diagram={{
          size: 5,
          stones: [
            { row: 2, col: 1, color: 'black' },
            { row: 1, col: 1, color: 'white' },
            { row: 2, col: 2, color: 'black' },
          ],
          caption: 'Black bends around the white stone while staying connected.',
        }}
      />

      <ConceptReference
        conceptId="tigers_mouth"
        diagram={{
          size: 5,
          stones: [
            { row: 1, col: 2, color: 'black' },
            { row: 2, col: 1, color: 'black' },
            { row: 2, col: 3, color: 'black' },
          ],
          highlights: [{ row: 2, col: 2 }],
          caption: "The empty mouth point is difficult for White to enter safely.",
        }}
      />

      <ConceptReference
        conceptId="ladder"
        extra="Ladders can fail if the escaping group reaches friendly support in time."
        sequence={[
          {
            size: 7,
            stones: [
              { row: 0, col: 3, color: 'white' },
              { row: 1, col: 3, color: 'black' },
            ],
            title: 'White is in atari along the edge.',
            highlights: [{ row: 0, col: 4 }],
          },
          {
            size: 7,
            stones: [
              { row: 0, col: 3, color: 'white' },
              { row: 0, col: 4, color: 'white' },
              { row: 1, col: 3, color: 'black' },
              { row: 0, col: 5, color: 'black' },
            ],
            title: 'White runs; Black continues the chase.',
          },
          {
            size: 7,
            stones: [
              { row: 0, col: 4, color: 'white' },
              { row: 0, col: 5, color: 'white' },
              { row: 1, col: 3, color: 'black' },
              { row: 0, col: 6, color: 'black' },
              { row: 1, col: 5, color: 'black' },
            ],
            title: 'The forcing atari sequence continues.',
          },
        ]}
      />

      <ConceptReference
        conceptId="net"
        extra="A net traps a group by blocking escape routes rather than chasing with repeated atari."
        diagram={{
          size: 7,
          stones: [
            { row: 3, col: 3, color: 'white' },
            { row: 2, col: 3, color: 'black' },
            { row: 3, col: 2, color: 'black' },
            { row: 4, col: 3, color: 'black' },
            { row: 3, col: 4, color: 'black' },
          ],
          highlights: [
            { row: 2, col: 4 },
            { row: 4, col: 4 },
            { row: 4, col: 2 },
          ],
          caption: 'Black surrounds White with blocked escape routes.',
        }}
      />

      <ConceptReference
        conceptId="snapback"
        sequence={[
          {
            size: 5,
            stones: [{ row: 2, col: 2, color: 'black' }],
            title: '1. Black offers a sacrifice stone.',
          },
          {
            size: 5,
            stones: [
              { row: 1, col: 2, color: 'white' },
              { row: 2, col: 1, color: 'white' },
              { row: 2, col: 3, color: 'white' },
              { row: 2, col: 2, color: 'white' },
            ],
            title: '2. White captures one stone.',
          },
          {
            size: 5,
            stones: [
              { row: 1, col: 2, color: 'white' },
              { row: 2, col: 1, color: 'white' },
              { row: 2, col: 3, color: 'white' },
              { row: 2, col: 2, color: 'black' },
            ],
            title: '3. Black recaptures and takes a larger white group.',
          },
        ]}
      />

      <ConceptReference
        conceptId="self_atari"
        extra="Self-atari is usually a mistake unless it sets up a follow-up tactic such as a snapback."
      />

      <ConceptReference
        conceptId="missed_capture"
        extra="Coach Mode may highlight when you overlook a chance to capture an opposing group."
      />

      <ConceptReference
        conceptId="missed_defense"
        extra="Coach Mode may highlight when a friendly group needed protection before the opponent attacked."
      />
    </section>
  );
}
