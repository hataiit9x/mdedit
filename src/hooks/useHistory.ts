import { useState, useCallback, useRef } from 'react';

interface UseHistoryOptions {
  maxHistory?: number;
  // Edits arriving within this window collapse into one undo step, so
  // Ctrl+Z rewinds a burst of typing (or an AI stream) instead of one
  // character at a time.
  coalesceMs?: number;
}

export function useHistory<T>(initialValue: T, options: UseHistoryOptions = {}) {
  const { maxHistory = 200, coalesceMs = 500 } = options;

  const [value, setValue] = useState<T>(initialValue);
  const historyRef = useRef<T[]>([initialValue]);
  const positionRef = useRef(0);
  const isUndoRedoRef = useRef(false);
  const lastPushAtRef = useRef(0);

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;

        if (isUndoRedoRef.current) {
          isUndoRedoRef.current = false;
          return resolved;
        }

        const now = Date.now();
        if (now - lastPushAtRef.current < coalesceMs) {
          // Still inside a burst: overwrite the top entry instead of pushing.
          historyRef.current[positionRef.current] = resolved;
        } else {
          const newHistory = historyRef.current.slice(0, positionRef.current + 1);
          newHistory.push(resolved);
          if (newHistory.length > maxHistory) {
            newHistory.shift();
          } else {
            positionRef.current++;
          }
          historyRef.current = newHistory;
          lastPushAtRef.current = now;
        }

        return resolved;
      });
    },
    [maxHistory, coalesceMs]
  );

  // Force the next `set` to start a fresh history entry (e.g. right before a
  // document-wide operation like applying a template).
  const beginNewStep = useCallback(() => {
    lastPushAtRef.current = 0;
  }, []);

  const reset = useCallback((nextValue: T) => {
    historyRef.current = [nextValue];
    positionRef.current = 0;
    lastPushAtRef.current = 0;
    isUndoRedoRef.current = false;
    setValue(nextValue);
  }, []);

  const undo = useCallback(() => {
    if (positionRef.current > 0) {
      positionRef.current--;
      isUndoRedoRef.current = true;
      lastPushAtRef.current = 0;
      setValue(historyRef.current[positionRef.current]);
      return true;
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (positionRef.current < historyRef.current.length - 1) {
      positionRef.current++;
      isUndoRedoRef.current = true;
      lastPushAtRef.current = 0;
      setValue(historyRef.current[positionRef.current]);
      return true;
    }
    return false;
  }, []);

  const canUndo = positionRef.current > 0;
  const canRedo = positionRef.current < historyRef.current.length - 1;

  // Read the current committed value without waiting for a re-render
  // (needed right after undo/redo, before React flushes the state update).
  const get = useCallback(() => historyRef.current[positionRef.current], []);

  return { value, set, get, undo, redo, reset, beginNewStep, canUndo, canRedo };
}
