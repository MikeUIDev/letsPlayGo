import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { getStone } from '../engine/board';
import { isLegalPlay } from '../engine/legalMoves';
import type { BoardSize, GameState, Position } from '../engine/types';
import {
  nearestIntersectionFromClientPoint,
  resolveTouchPlacementTap,
  STONE_PLACEMENT_COOLDOWN_MS,
} from './touchPlacement';

/** Ignore tap if the finger moved farther than this (prevents accidental placement while scrolling). */
const POINTER_DRAG_CANCEL_PX = 14;

const COMMIT_COOLDOWN_MS = STONE_PLACEMENT_COOLDOWN_MS;

export interface UseTouchPlacementOptions {
  enabled: boolean;
  boardSize: BoardSize;
  state: GameState;
  canPlay: boolean;
  allowIllegalPlays: boolean;
  onPlay: (position: Position) => void;
  intersectionsRef: RefObject<HTMLElement | null>;
  /** Reset pending preview when any of these change (move, AI turn, navigation, etc.). */
  resetKey: string;
}

export interface UseTouchPlacementResult {
  pendingPosition: Position | null;
  touchPlacementActive: boolean;
  touchLayerHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  };
}

export function useTouchPlacement({
  enabled,
  boardSize,
  state,
  canPlay,
  allowIllegalPlays,
  onPlay,
  intersectionsRef,
  resetKey,
}: UseTouchPlacementOptions): UseTouchPlacementResult {
  const [pendingPosition, setPendingPosition] = useState<Position | null>(null);
  const activePointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastCommitAtRef = useRef(0);

  useEffect(() => {
    setPendingPosition(null);
    activePointerRef.current = null;
  }, [resetKey, enabled, canPlay, boardSize]);

  const clearActivePointer = useCallback((pointerId: number) => {
    if (activePointerRef.current?.id === pointerId) {
      activePointerRef.current = null;
    }
  }, []);

  const isTouchLayerPointer = (pointerType: string) =>
    pointerType === 'touch' || pointerType === 'pen' || pointerType === 'mouse';

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || !canPlay || !isTouchLayerPointer(event.pointerType)) {
        return;
      }

      activePointerRef.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPlay, enabled],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || !canPlay || !isTouchLayerPointer(event.pointerType)) {
        return;
      }

      const active = activePointerRef.current;
      clearActivePointer(event.pointerId);

      if (!active || active.id !== event.pointerId) {
        return;
      }

      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      if (dx * dx + dy * dy > POINTER_DRAG_CANCEL_PX * POINTER_DRAG_CANCEL_PX) {
        return;
      }

      const intersections = intersectionsRef.current;
      if (!intersections) {
        return;
      }

      const position = nearestIntersectionFromClientPoint(
        event.clientX,
        event.clientY,
        intersections.getBoundingClientRect(),
        boardSize,
      );
      if (!position) {
        return;
      }

      const stone = getStone(state.board, position);
      const legality = isLegalPlay(state, position);
      const isLegalEmpty =
        stone === null && (legality.legal || allowIllegalPlays);

      event.preventDefault();
      event.stopPropagation();

      // Mouse / trackpad on the touch layer: single-click placement (simulator, iPad pointer).
      if (event.pointerType === 'mouse') {
        if (!isLegalEmpty) {
          return;
        }

        const now = Date.now();
        if (now - lastCommitAtRef.current < COMMIT_COOLDOWN_MS) {
          return;
        }
        lastCommitAtRef.current = now;
        setPendingPosition(null);
        onPlay(position);

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }

      const action = resolveTouchPlacementTap(
        pendingPosition,
        position,
        isLegalEmpty,
        stone,
      );

      if (action.type === 'ignore') {
        return;
      }

      if (action.type === 'select') {
        setPendingPosition(action.position);
        return;
      }

      const now = Date.now();
      if (now - lastCommitAtRef.current < COMMIT_COOLDOWN_MS) {
        return;
      }
      lastCommitAtRef.current = now;
      setPendingPosition(null);
      onPlay(action.position);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [
      allowIllegalPlays,
      boardSize,
      canPlay,
      clearActivePointer,
      enabled,
      intersectionsRef,
      onPlay,
      pendingPosition,
      state,
    ],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      clearActivePointer(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [clearActivePointer],
  );

  return {
    pendingPosition,
    touchPlacementActive: enabled && canPlay,
    touchLayerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
