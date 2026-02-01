import { EventEmitter } from 'events';
import { FirestorePermissionError } from './errors';

interface ErrorEvents {
  'permission-error': (error: FirestorePermissionError) => void;
}

class TypedEventEmitter<T extends Record<string, any>> {
  private emitter = new EventEmitter();

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.emitter.emit(event as string, ...args);
  }

  on<K extends keyof T>(event: K, listener: T[K]): void {
    this.emitter.on(event as string, listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]): void {
    this.emitter.off(event as string, listener);
  }
}

export const errorEmitter = new TypedEventEmitter<ErrorEvents>();
