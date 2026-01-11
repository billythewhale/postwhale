import { camel } from '@tw/utils/module/string';
type AnyFn = (...args: any[]) => any;
type Builtins =
  | Date
  | RegExp
  | Promise<any>
  | Map<any, any>
  | Set<any>
  | WeakMap<any, any>
  | WeakSet<any>
  | AnyFn;

export type ToCamel<S extends string> = S extends `${infer H}_${infer T}`
  ? `${H}${Capitalize<ToCamel<T>>}`
  : S;

export type ToSnake<S extends string> = S extends `${infer H}${infer T}`
  ? T extends Uncapitalize<T>
    ? `${Lowercase<H>}${ToSnake<T>}`
    : `${Lowercase<H>}_${ToSnake<Uncapitalize<T>>}`
  : S;

export type CamelizeObject<T> = T extends Builtins
  ? T
  : T extends object
  ? {
      [K in keyof T as K extends string ? ToCamel<K> : K]: CamelizeObject<T[K]>;
    }
  : T;

export type SnakifyObject<T> = T extends Builtins
  ? T
  : T extends object
  ? {
      [K in keyof T as K extends string ? ToSnake<K> : K]: SnakifyObject<T[K]>;
    }
  : T;

export function camelizeObj<T extends Record<string, any>>(obj: T): CamelizeObject<T> {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date || Array.isArray(obj)) {
    return obj as CamelizeObject<T>;
  }
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    const newKey = typeof key === 'string' ? camel(key) : key;
    const value = obj[key];
    newObj[newKey] = camelizeObj(value);
  }
  return newObj as CamelizeObject<T>;
}

export function snakifyObj<T extends Record<string, any>>(obj: T): SnakifyObject<T> {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date || Array.isArray(obj)) {
    return obj as SnakifyObject<T>;
  }
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    const newKey =
      typeof key === 'string'
        ? key
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .toLowerCase()
            .replace(/^_/, '')
        : key;
    const value = obj[key];
    newObj[newKey] = snakifyObj(value);
  }
  return newObj as SnakifyObject<T>;
}
