import { describe, expect, it } from 'vitest';
import {
  apiMoveToKataGoMove,
  buildAnalysisQuery,
  buildQueryVersionQuery,
  buildSpawnArgs,
  isFinalAnalysisResponse,
  parseJsonLine,
  selectBestMoveFromAnalysis,
  serializeQueryLine,
  splitBufferedLines,
} from '../src/katago/protocol.js';

describe('analysis protocol', () => {
  it('builds spawn arguments for analysis mode', () => {
    expect(buildSpawnArgs('/bin/katago', '/models/net.bin.gz', '/cfg/analysis_example.cfg')).toEqual([
      'analysis',
      '-model',
      '/models/net.bin.gz',
      '-config',
      '/cfg/analysis_example.cfg',
    ]);
  });

  it('serializes single-line JSON queries', () => {
    const line = serializeQueryLine(buildQueryVersionQuery('startup-1'));
    expect(line).toBe('{"id":"startup-1","action":"query_version"}');
    expect(line.includes('\n')).toBe(false);
  });

  it('builds analysis queries from move history', () => {
    const query = buildAnalysisQuery(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'white',
        difficulty: 'casual',
        moves: [{ color: 'black', x: 4, y: 4 }],
      },
      'move-1',
    );

    expect(query).toMatchObject({
      id: 'move-1',
      rules: 'chinese',
      komi: 6.5,
      boardXSize: 9,
      boardYSize: 9,
      analyzeTurns: [1],
      maxVisits: 64,
      moves: [['B', 'E5']],
    });
  });

  it('includes initialPlayer for empty games', () => {
    const query = buildAnalysisQuery(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'beginner',
        moves: [],
      },
      'move-open',
    );

    expect(query.initialPlayer).toBe('B');
    expect(query.analyzeTurns).toEqual([0]);
    expect(query.maxVisits).toBe(24);
  });

  it('converts pass moves for KataGo', () => {
    expect(apiMoveToKataGoMove({ color: 'white', type: 'pass' }, 9)).toEqual(['W', 'pass']);
  });

  it('buffers partial stdout chunks into JSON lines', () => {
    let buffer = '';
    const first = splitBufferedLines(`${buffer}{"id":"1","action":"query_version","version":"1.17"}`);
    buffer = first.remainder;
    expect(first.lines).toEqual([]);

    const second = splitBufferedLines(`${buffer}\n{"id":"2","isDuringSearch":false,"moveInfos":[]}\n`);
    expect(second.lines).toHaveLength(2);
    expect(parseJsonLine(second.lines[0])).toMatchObject({ id: '1', version: '1.17' });
  });

  it('identifies final analysis responses', () => {
    expect(isFinalAnalysisResponse({ id: '1', action: 'query_version' })).toBe(true);
    expect(isFinalAnalysisResponse({ id: '1', isDuringSearch: true, moveInfos: [] })).toBe(false);
    expect(isFinalAnalysisResponse({ id: '1', isDuringSearch: false, moveInfos: [] })).toBe(true);
    expect(isFinalAnalysisResponse({ id: '1', error: 'bad query' })).toBe(true);
  });

  it('selects the strongest move from moveInfos', () => {
    const result = selectBestMoveFromAnalysis(
      {
        id: 'move-1',
        isDuringSearch: false,
        moveInfos: [
          { move: 'D4', order: 1 },
          { move: 'pass', order: 2 },
          { move: 'E5', order: 0 },
        ],
      },
      9,
    );

    expect(result).toEqual({ type: 'play', position: { x: 4, y: 4 } });
  });

  it('parses pass moves from analysis output', () => {
    expect(
      selectBestMoveFromAnalysis(
        {
          id: 'move-2',
          isDuringSearch: false,
          moveInfos: [{ move: 'pass', order: 0 }],
        },
        9,
      ),
    ).toEqual({ type: 'pass' });
  });
});
