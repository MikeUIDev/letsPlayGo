import { describe, expect, it } from 'vitest';
import { KataGoClient } from '../src/katago/KataGoClient.js';
import { MockKataGoProcess } from '../src/katago/KataGoProcess.js';

describe('KataGoClient', () => {
  it('sends an analysis query and returns a play move', async () => {
    const process = new MockKataGoProcess();
    process.setBestMove('D5');
    const client = new KataGoClient(process);

    const result = await client.generateMove(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'white',
        moves: [{ color: 'black', x: 4, y: 4 }],
      },
      5_000,
    );

    expect(result).toEqual({ type: 'play', position: { x: 3, y: 4 } });
    expect(process.queries[0]).toMatchObject({
      rules: 'chinese',
      komi: 6.5,
      boardXSize: 9,
      boardYSize: 9,
      analyzeTurns: [1],
      moves: [['B', 'E5']],
    });
  });

  it('returns pass moves from analysis output', async () => {
    const process = new MockKataGoProcess();
    process.setBestMove('pass');
    const client = new KataGoClient(process);

    const result = await client.generateMove(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        moves: [],
      },
      5_000,
    );

    expect(result).toEqual({ type: 'pass' });
    expect(process.queries[0]).toMatchObject({
      analyzeTurns: [0],
      initialPlayer: 'B',
    });
  });
});

describe('MockKataGoProcess serialization', () => {
  it('executes analysis queries sequentially', async () => {
    const process = new MockKataGoProcess();
    await process.sendQuery({ id: 'one', action: 'query_version' });
    await process.sendQuery({ id: 'two', moves: [] });
    expect(process.queries).toHaveLength(2);
  });
});
