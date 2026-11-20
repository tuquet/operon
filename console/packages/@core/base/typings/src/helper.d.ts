import type { ComputedRef, MaybeRef } from 'vue';

/**
 * Increment recursion depth counter in type-level recursion
 */
type Increment<A extends unknown[]> = [...A, unknown];
/**
 * Recursively make all properties optional
 */
type DeepPartial<
  T,
  D extends number = 10,
  C extends unknown[] = [],
> = C['length'] extends D
  ? T
  : T extends object
    ? {
        [P in keyof T]?: DeepPartial<T[P], D, Increment<C>>;
      }
    : T;

/**
 * Recursively make all properties readonly
 */
type DeepReadonly<
  T,
  D extends number = 10,
  C extends unknown[] = [],
> = C['length'] extends D
  ? T
  : T extends object
    ? {
        readonly [P in keyof T]: DeepReadonly<T[P], D, Increment<C>>;
      }
    : T;

/**
 * Generic async function type
 */

type AnyPromiseFunction<T extends any[] = any[], R = void> = (
  ...arg: T
) => PromiseLike<R>;

/**
 * Generic normal function type
 */
type AnyNormalFunction<T extends any[] = any[], R = void> = (...arg: T) => R;

/**
 * Generic function type
 */
type AnyFunction<T extends any[] = any[], R = void> =
  | AnyNormalFunction<T, R>
  | AnyPromiseFunction<T, R>;

/**
 * T | null wrapper
 */
type Nullable<T> = null | T;

/**
 * Non-nullable wrapper
 */
type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * String-keyed object record
 */
type Recordable<T> = Record<string, T>;

/**
 * Readonly string-keyed object record
 */
interface ReadonlyRecordable<T = any> {
  readonly [key: string]: T;
}

/**
 * setTimeout return type
 */
type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * setInterval return type
 */
type IntervalHandle = ReturnType<typeof setInterval>;

/**
 * Computed ref or getter function
 *
 */
type MaybeReadonlyRef<T> = (() => T) | ComputedRef<T>;

/**
 * Ref, raw value, or getter function
 *
 */
type MaybeComputedRef<T> = MaybeReadonlyRef<T> | MaybeRef<T>;

type Merge<O extends object, T extends object> = {
  [K in keyof O | keyof T]: K extends keyof T
    ? T[K]
    : K extends keyof O
      ? O[K]
      : never;
};

/**
 * T = [
 *  { name: string; age: number; },
 *  { sex: 'male' | 'female'; age: string }
 * ]
 * =>
 * MergeAll<T> = {
 *  name: string;
 *  sex: 'male' | 'female';
 *  age: string
 * }
 */
type MergeAll<
  T extends object[],
  R extends object = Record<string, any>,
> = T extends [infer F extends object, ...infer Rest extends object[]]
  ? MergeAll<Rest, Merge<R, F>>
  : R;

type EmitType = (name: Name, ...args: any[]) => void;

type MaybePromise<T> = Promise<T> | T;

export type {
  AnyFunction,
  AnyNormalFunction,
  AnyPromiseFunction,
  DeepPartial,
  DeepReadonly,
  EmitType,
  IntervalHandle,
  MaybeComputedRef,
  MaybePromise,
  MaybeReadonlyRef,
  Merge,
  MergeAll,
  NonNullable,
  Nullable,
  ReadonlyRecordable,
  Recordable,
  TimeoutHandle,
};
