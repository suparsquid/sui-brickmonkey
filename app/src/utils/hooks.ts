import * as React from "react";

import useEvent from "@react-hook/event";

import { mapMaybe } from "./index";
import { PersistedStorage, sessionPersistedStorage } from "./persisted";
import { __DEV__ } from "@apollo/client/utilities/globals";

import { useState } from "react";
import { useLocation } from "react-router-dom";

export type UpdaterArg<T> = T | ((old: T) => T);
export type Updater<T> = (x: T | ((old: T) => T)) => void;

declare global {
  interface Window {
    brickmonkey: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useSticky = <T extends (...args: any[]) => unknown>(
  f: T,
  delay = 100
): [(...args: Parameters<T>) => void, (...args: Parameters<T>) => void] => {
  const okayToRun = React.useRef<number | undefined>();
  const timeout = React.useRef<NodeJS.Timeout | undefined>();
  const timeoutF = React.useRef<() => unknown>();

  const stick = React.useCallback(
    (...args: Parameters<T>) => {
      if (timeout.current !== undefined) clearTimeout(timeout.current);

      okayToRun.current = Date.now() + delay;

      f(...args);
    },
    [okayToRun, delay, f]
  );
  const release = React.useCallback(
    (...args: Parameters<T>) => {
      if (okayToRun.current !== undefined) {
        // if not ever stuck, release no matter what
        const dt = okayToRun.current - Date.now();
        if (dt > 0) {
          timeoutF.current = () => f(...args);
          timeout.current = setTimeout(release, dt, ...args);
          return;
        }
      }

      f(...args);
    },
    [okayToRun, f]
  );

  React.useEffect(() => {
    return () => {
      if (timeout.current === undefined) return;
      // there might be a persisted action of some kind scheduled,
      // execute it now since the component is about to unmount and lose all state
      if (timeoutF.current !== undefined) timeoutF.current();
      clearTimeout(timeout.current);
    };
  }, []);

  return [stick, release];
};

export const useStickyButton = <T extends HTMLElement>(
  ref: React.RefObject<T>,
  delay = 100
): boolean => {
  const [isPressed, setIsPressed] = React.useState(false);
  const [stick, release] = useSticky(setIsPressed, delay);

  useEvent(
    ref.current,
    "mousedown",
    React.useCallback(
      (e: MouseEvent) => {
        if (e.button !== 0) return;
        stick(true);
      },
      [stick]
    )
  );
  useEvent(
    document,
    "mouseup",
    React.useCallback(
      (e: MouseEvent) => {
        if (e.button !== 0) return;
        release(false);
      },
      [release]
    )
  );

  return isPressed;
};

export const useTimeout = (delay: number, startTimeout = true): boolean => {
  const [timedout, setTimeoutState] = React.useState(false);
  const timeoutId = React.useRef<NodeJS.Timeout | undefined>();

  React.useEffect(() => {
    if (!startTimeout) {
      if (timeoutId.current !== undefined) clearTimeout(timeoutId.current);
      return;
    }

    const timeoutN = setTimeout(setTimeoutState, delay, true);
    timeoutId.current = timeoutN;
    return () => clearTimeout(timeoutN);
  }, [delay, startTimeout]);

  return timedout;
};

type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
type DropFirstFunction<F extends (...args: any[]) => any> = (
  ...args: DropFirst<Parameters<F>>
) => ReturnType<F>;

export const useCallbackMultiple = <
  F extends (key: any, ...args: any[]) => any
>(
  f: F,
  deps: React.DependencyList
): ((key: Parameters<F>[0]) => DropFirstFunction<F>) => {
  const storeRef = React.useRef<Map<Parameters<F>[0], DropFirstFunction<F>>>(
    new Map()
  );

  React.useEffect(() => {
    storeRef.current = new Map();
  }, deps);

  return React.useCallback(
    (k: Parameters<F>[0]) => {
      const store = storeRef.current;
      const oldF = store.get(k);
      if (oldF !== undefined) return oldF;

      const newF = f.bind(undefined, k);
      store.set(k, newF);
      return newF;
    },
    [f]
  );
};

let didWarnUncontrolledToControlled = false;

export const useControlled = <T>(
  controlled: T | undefined,
  cb: ((x: T) => unknown) | undefined,
  initial: T
): [T, (x: T | ((x: T) => T)) => void] => {
  const { current: isControlled } = React.useRef(controlled !== undefined);

  if (
    !didWarnUncontrolledToControlled &&
    isControlled !== (controlled !== undefined)
  ) {
    didWarnUncontrolledToControlled = true;
    console.error(
      [
        "A component is changing an uncontrolled input to be controlled.",
        "This is likely caused by the value changing from undefined to a defined value, which should not happen.",
        "Decide between using a controlled or uncontrolled input element for the lifetime of the component.",
      ].join(" ")
    );
  }

  const [internalVal, setInternalVal] = React.useState<T>(initial);

  const doSetInternal = React.useCallback(
    (x: UpdaterArg<T>) => {
      if (isControlled) return;

      setInternalVal((v) => {
        const res = x instanceof Function ? x(v) : x;

        if (cb !== undefined) cb(res);
        return res;
      });
    },
    [isControlled, cb]
  );
  const doCallback = React.useCallback(
    (x: UpdaterArg<T>) => {
      if (!isControlled || controlled === undefined) return;
      if (cb === undefined) return;

      if (x instanceof Function) cb(x(controlled));
      else cb(x);
    },
    [isControlled, controlled, cb]
  );

  if (controlled === undefined) return [internalVal, doSetInternal];
  return [controlled, doCallback];
};

export const useIsMounted = (): (() => boolean) => {
  const isMounted = React.useRef<boolean>(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  return React.useCallback(() => isMounted.current, []);
};

export const identity = <T>(x: T): T => x;

const tryUnmarshall =
  <S, K extends keyof S, T = S[K]>(
    key: K,
    def: T,
    unmarshall: (x: S[K]) => T
  ) =>
  (x: S[K]): T | undefined => {
    try {
      return unmarshall(x);
    } catch (error) {
      console.log(`Failed to unmarshall persisted key ${String(key)}`);
      console.log(error);
      console.log(`Using default value ${def}`);
      return;
    }
  };

export const usePersistedStorageStateMarshalled = <
  S,
  K extends keyof S,
  T = S[K]
>(
  storage: PersistedStorage<S>,
  key: K,
  rawDef: T,
  unmarshall: (x: S[K]) => T,
  marshall: (x: T) => S[K]
): [T, (x: T | ((x: T) => T)) => void] => {
  const defRef = React.useRef<[T, boolean]>([rawDef, false]);
  const {
    current: [def, printedDefChangedError],
  } = defRef;
  if (__DEV__) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      if (rawDef === def) return;
      if (
        typeof def === typeof rawDef &&
        ["number", "string", "boolean", "symbol", "undefined"].includes(
          typeof def
        )
      )
        return;
      if (printedDefChangedError) return;

      console.error(
        `usePersistedStorageStateMarshalled non-primitive default value changed ${JSON.stringify(
          def
        )} -> ${JSON.stringify(
          rawDef
        )}. This is very likely to cause a retry loop. Wrap the value in a useConst`
      );
      defRef.current[1] = true;
    }, [def, printedDefChangedError, rawDef]);
  }

  const rawItem = storage.getItem(key);
  const stored = mapMaybe(rawItem, tryUnmarshall(key, def, unmarshall));
  if (rawItem != null && stored == null) storage.removeItem(key);

  const [val, setVal] = React.useState<T>(stored ?? def);

  React.useEffect(() => {
    const cb = (k: keyof S, value: S[K] | null) => {
      if (k !== key) return;

      const val = mapMaybe(value, tryUnmarshall(key, def, unmarshall)) ?? def;
      setVal(val);
    };
    storage.listen(cb);

    return () => storage.unlisten(cb);
  }, [key, storage, unmarshall, def]);

  return [
    val,
    React.useCallback(
      (x) => {
        const val =
          mapMaybe(storage.getItem(key), tryUnmarshall(key, def, unmarshall)) ??
          def;
        const res = x instanceof Function ? x(val) : x;

        storage.setItem(key, marshall(res));
      },
      [key, def, storage, marshall, unmarshall]
    ),
  ];
};

export const usePersistedStorageState = <S, K extends keyof S>(
  storage: PersistedStorage<S>,
  key: K,
  def: S[K]
): [S[K], (x: S[K] | ((x: S[K]) => S[K])) => void] =>
  usePersistedStorageStateMarshalled<S, K, S[K]>(
    storage,
    key,
    def,
    identity,
    identity
  );

export const useSessionStorageState = <T>(
  key: string,
  def: T,
  unmarshall: (x: string) => T = JSON.parse,
  marshall: (x: T) => string = JSON.stringify
): [T, (x: T | ((x: T) => T)) => void] =>
  usePersistedStorageStateMarshalled(
    sessionPersistedStorage,
    key,
    def,
    unmarshall,
    marshall
  );

// https://usehooks-typescript.com/react-hook/use-interval
export const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = React.useRef(callback);

  // Remember the latest callback if it changes.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  React.useEffect(() => {
    // Don't schedule if no delay is specified.
    if (delay === null) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
};

// https://usehooks-ts.com/react-hook/use-debounce
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const useFlag = (
  def = false
): [
  boolean,
  {
    t: () => void;
    f: () => void;
    set: Updater<boolean>;
    toggle: () => void;
  }
] => {
  const [x, setX] = React.useState(def);

  const setFalse = React.useCallback(() => {
    setX(false);
  }, [setX]);
  const setTrue = React.useCallback(() => {
    setX(true);
  }, [setX]);

  const toggle = React.useCallback(() => {
    setX((val) => !val);
  }, []);

  return [
    x,
    {
      t: setTrue,
      f: setFalse,
      set: setX,
      toggle,
    },
  ];
};

export const useQuery = () => {
  const { search } = useLocation();

  return React.useMemo(() => new URLSearchParams(search), [search]);
};
