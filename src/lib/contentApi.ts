import { getValidAccessToken } from './auth';
import { buildApiUrl } from './runtimeConfig';

export type ContentSource = 'api' | 'fallback';

export type LoadedContent<T> = {
  items: T[];
  source: ContentSource;
  notice?: string | null;
};

export type LoadedContentItem<T> = {
  item: T;
  source: ContentSource;
  notice?: string | null;
};

export async function requestContentJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return requestContentJsonWithInit<T>(path, {
    signal,
  });
}

export async function requestContentJsonWithInit<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getValidAccessToken();
  const response = await fetch(buildApiUrl(path), {
    method: init?.method,
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    signal: init?.signal,
  });

  if (!response.ok) {
    throw new Error(await readRequestError(response));
  }

  return (await response.json()) as T;
}

export function getCollectionItems<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

export function getRecord(payload: unknown, keys: string[]): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const directRecord = payload as Record<string, unknown>;

  for (const key of keys) {
    const value = directRecord[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

export function getContentSource(payload: unknown): ContentSource {
  if (!payload || typeof payload !== 'object') {
    return 'api';
  }

  const record = payload as Record<string, unknown>;
  const nestedRecords = [record.data, record.result, record.dashboard, record.home].filter(
    (value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value),
  );
  const candidates = [record.source, record.mode, record.dataSource, ...nestedRecords.flatMap((value) => [value.source, value.mode, value.dataSource])];

  return candidates.some((value) => typeof value === 'string' && value.toLowerCase() === 'fallback') ? 'fallback' : 'api';
}

export function getContentNotice(payload: unknown, keys: string[] = ['notice', 'message', 'detail']): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record,
    record.data,
    record.result,
    record.dashboard,
    record.home,
  ].filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value));

  for (const candidate of candidates) {
    for (const key of keys) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function readRequestError(response: Response) {
  let message = `Request failed with status ${response.status}`;
  const payloadText = await response.text();

  if (payloadText) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const payload = JSON.parse(payloadText) as { message?: string; error?: string; detail?: string };
        message = payload.message || payload.error || payload.detail || message;
      } catch {
        message = payloadText.trim() || message;
      }
    } else {
      message = payloadText.trim() || message;
    }
  }

  return message;
}
