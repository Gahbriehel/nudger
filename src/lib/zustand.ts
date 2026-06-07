import { useSyncExternalStore } from "react";

export type SetState<T> = (
  nextStateOrFn: Partial<T> | ((state: T) => Partial<T>),
  replace?: boolean
) => void;

export type GetState<T> = () => T;

export type CreateState<T> = (set: SetState<T>, get: GetState<T>) => T;

export function create<T>(createState: CreateState<T>) {
  let state: T;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState: SetState<T> = (nextStateOrFn) => {
    const nextState =
      typeof nextStateOrFn === "function"
        ? (nextStateOrFn as any)(state)
        : nextStateOrFn;

    if (nextState !== state) {
      state = Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener());
    }
  };

  state = createState(setState, getState);

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useStore = <U>(selector: (state: T) => U = (s) => s as any): U => {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );
  };

  Object.assign(useStore, { getState, setState, subscribe });

  return useStore as {
    (): T;
    <U>(selector: (state: T) => U): U;
    getState: () => T;
    setState: SetState<T>;
    subscribe: (listener: () => void) => () => void;
  };
}
