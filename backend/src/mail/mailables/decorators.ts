import 'reflect-metadata';

/**
 * BullMQ operational config decorators — direct equivalent of Laravel 13's
 * #[Queue], #[Tries], #[Backoff] PHP 8 attributes.
 *
 * Note: BullMQ backoff is { type: 'exponential' | 'fixed', delay: baseMs }.
 * Stepped arrays (Laravel #[Backoff([10, 30, 60])]) are not supported natively.
 */

export const QUEUE_META = Symbol('queue');
export const TRIES_META = Symbol('tries');
export const BACKOFF_META = Symbol('backoff');

export const Queue = (name: string): ClassDecorator =>
  (target) => Reflect.defineMetadata(QUEUE_META, name, target);

export const Tries = (attempts: number): ClassDecorator =>
  (target) => Reflect.defineMetadata(TRIES_META, attempts, target);

export const Backoff = (config: { type: 'exponential' | 'fixed'; delay: number }): ClassDecorator =>
  (target) => Reflect.defineMetadata(BACKOFF_META, config, target);
