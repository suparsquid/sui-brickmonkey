export type PersistedStorageListener<T, K extends keyof T> = (
  key: K,
  value: T[K] | null
) => any;

export abstract class PersistedStorage<T> {
  abstract listen<K extends keyof T>(f: PersistedStorageListener<T, K>): void;
  abstract unlisten<K extends keyof T>(f: PersistedStorageListener<T, K>): void;

  abstract get length(): number;

  abstract getItem<K extends keyof T>(key: K): T[K] | null;
  abstract setItem<K extends keyof T>(key: K, value: T[K]): void;
  abstract removeItem<K extends keyof T>(key: K): void;

  abstract clear(): void;
}

export class MemoryPersistedStorage<T> extends PersistedStorage<T> {
  private listeners = new Set<PersistedStorageListener<T, keyof T>>();
  private storage = new Map<keyof T, T[keyof T]>();

  private static id_ = 0;
  public readonly id;

  constructor() {
    super();

    this.id = MemoryPersistedStorage.id_;
    ++MemoryPersistedStorage.id_;
  }

  listen<K extends keyof T>(f: PersistedStorageListener<T, K>): void {
    this.listeners.add(f);
  }

  unlisten<K extends keyof T>(f: PersistedStorageListener<T, K>): void {
    this.listeners.delete(f);
  }

  get length(): number {
    return this.storage.size;
  }

  getItem<K extends keyof T>(key: K): T[K] | null {
    return (this.storage.get(key) as T[K] | null) ?? null;
  }

  setItem<K extends keyof T>(key: K, value: T[K]): void {
    this.storage.set(key, value);
    for (const f of this.listeners) f(key, value);
  }

  removeItem<K extends keyof T>(key: K): void {
    this.storage.delete(key);
    for (const f of this.listeners) f(key, null);
  }

  clear(): void {
    this.storage.clear();
  }
}

class SessionPersistedStorage extends PersistedStorage<Record<string, string>> {
  private listeners = new Set<
    PersistedStorageListener<Record<string, string>, string>
  >();
  private realSessionStorage = window.sessionStorage;

  listen<K extends string>(
    f: PersistedStorageListener<Record<string, string>, K>
  ): void {
    this.listeners.add(f);
  }

  unlisten<K extends string>(
    f: PersistedStorageListener<Record<string, string>, K>
  ): void {
    this.listeners.delete(f);
  }

  get length(): number {
    return this.realSessionStorage.length;
  }

  getItem(key: string): string | null {
    return this.realSessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.realSessionStorage.setItem(key, value);
    for (const f of this.listeners) f(key, value);
  }

  removeItem(key: string): void {
    this.realSessionStorage.removeItem(key);
    for (const f of this.listeners) f(key, null);
  }

  clear(): void {
    this.realSessionStorage.clear();
  }
}

class LocalPersistedStorage extends PersistedStorage<Record<string, string>> {
  private listeners = new Set<
    PersistedStorageListener<Record<string, string>, string>
  >();
  private realLocalStorage = window.localStorage;

  listen<K extends string>(
    f: PersistedStorageListener<Record<string, string>, K>
  ): void {
    this.listeners.add(f);
  }

  unlisten<K extends string>(
    f: PersistedStorageListener<Record<string, string>, K>
  ): void {
    this.listeners.delete(f);
  }

  get length(): number {
    return this.realLocalStorage.length;
  }

  getItem(key: string): string | null {
    return this.realLocalStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.realLocalStorage.setItem(key, value);
    for (const f of this.listeners) f(key, value);
  }

  removeItem(key: string): void {
    this.realLocalStorage.removeItem(key);
    for (const f of this.listeners) f(key, null);
  }

  clear(): void {
    this.realLocalStorage.clear();
  }
}

export const sessionPersistedStorage = new SessionPersistedStorage();
window.psessionStorage = sessionPersistedStorage;

export const localPersistedStorage = new LocalPersistedStorage();
window.plocalStorage = localPersistedStorage;
