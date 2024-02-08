export const mapMaybe = <T, F extends (x: T) => any>(
  x: T | undefined | null,
  f: F
): ReturnType<F> | undefined => {
  if (x === undefined || x === null) return undefined;
  return f(x);
};
