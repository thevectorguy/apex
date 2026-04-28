import { getRecord, requestContentJsonWithInit } from './contentApi';
import type { AppBootstrap, AppMe } from './appTypes';

export async function getMe(options?: { signal?: AbortSignal }) {
  const payload = await requestContentJsonWithInit<unknown>('/api/me', {
    signal: options?.signal,
  });
  const me = getRecord(payload, ['me', 'profile', 'user']);
  if (!me) {
    throw new Error('Profile is unavailable right now.');
  }

  return me as unknown as AppMe;
}

export async function getBootstrap(options?: { signal?: AbortSignal }) {
  const payload = await requestContentJsonWithInit<unknown>('/api/bootstrap', {
    signal: options?.signal,
  });
  const bootstrap = getRecord(payload, ['bootstrap', 'data']);
  if (!bootstrap) {
    throw new Error('App bootstrap is unavailable right now.');
  }

  return bootstrap as unknown as AppBootstrap;
}
