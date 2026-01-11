export * from './conversation';

type SnakeToCamel<S extends string> = S extends `${infer H}_${infer T}`
  ? `${H}${Capitalize<SnakeToCamel<T>>}`
  : S;

type Camelize<T> = T extends readonly any[]
  ? { [I in keyof T]: Camelize<T[I]> }
  : T extends object
  ? {
      [K in keyof T as K extends string ? SnakeToCamel<K> : K]: Camelize<T[K]>;
    }
  : T;
