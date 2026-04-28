import { CONFIG, buildAppPath, getAppUrl } from './runtimeConfig';

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  tokenType: string;
  scope: string;
  expiresAt: number;
  refreshExpiresAt: number;
};

type TokenEndpointResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_expires_in?: number;
};

type JwtClaims = Record<string, unknown> & {
  sub?: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  realm_access?: {
    roles?: string[];
  };
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  fullName: string;
  role: string;
  showroom: string;
  avatarUrl: string;
};

export type AuthSession = {
  tokens: StoredTokens;
  user: AuthUser;
};

const TOKEN_STORAGE_KEY = 'dilos:keycloak:tokens';
const AUTH_STATE_STORAGE_KEY = 'dilos:keycloak:state';
const CODE_VERIFIER_STORAGE_KEY = 'dilos:keycloak:code_verifier';
const POST_LOGIN_PATH_STORAGE_KEY = 'dilos:keycloak:post_login_path';

let refreshPromise: Promise<StoredTokens | null> | null = null;

export async function initializeAuth() {
  ensureAuthConfig();

  const callbackTokens = await handleAuthCallback();
  const currentTokens = callbackTokens || readStoredTokens();

  if (!currentTokens) {
    return null;
  }

  const validTokens = await ensureFreshTokens(currentTokens);
  if (!validTokens) {
    clearStoredTokens();
    return null;
  }

  writeStoredTokens(validTokens);
  return {
    tokens: validTokens,
    user: mapClaimsToUser(readJwtClaims(validTokens.accessToken)),
  } satisfies AuthSession;
}

export async function beginLogin() {
  ensureAuthConfig();
  const state = randomUrlSafeString(32);
  const codeVerifier = randomUrlSafeString(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  window.sessionStorage.setItem(AUTH_STATE_STORAGE_KEY, state);
  window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, codeVerifier);
  window.sessionStorage.setItem(POST_LOGIN_PATH_STORAGE_KEY, getCurrentRelativeUrl());

  const authorizeUrl = new URL(`${CONFIG.KEYCLOAK_AUTHORITY}/protocol/openid-connect/auth`);
  authorizeUrl.searchParams.set('client_id', CONFIG.KEYCLOAK_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', getAppUrl());
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid profile email');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(authorizeUrl.toString());
}

export async function getValidAccessToken() {
  const tokens = readStoredTokens();
  if (!tokens) {
    return null;
  }

  const validTokens = await ensureFreshTokens(tokens);
  if (!validTokens) {
    clearStoredTokens();
    return null;
  }

  if (validTokens !== tokens) {
    writeStoredTokens(validTokens);
  }

  return validTokens.accessToken;
}

export function logout() {
  const tokens = readStoredTokens();
  clearStoredTokens();

  const logoutUrl = new URL(`${CONFIG.KEYCLOAK_AUTHORITY}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set('post_logout_redirect_uri', getAppUrl());
  logoutUrl.searchParams.set('client_id', CONFIG.KEYCLOAK_CLIENT_ID);
  if (tokens?.idToken) {
    logoutUrl.searchParams.set('id_token_hint', tokens.idToken);
  }

  window.location.assign(logoutUrl.toString());
}

function readStoredTokens() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

function writeStoredTokens(tokens: StoredTokens) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function clearStoredTokens() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STATE_STORAGE_KEY);
  window.sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
  window.sessionStorage.removeItem(POST_LOGIN_PATH_STORAGE_KEY);
}

async function handleAuthCallback() {
  if (typeof window === 'undefined') {
    return null;
  }

  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get('code');
  const state = currentUrl.searchParams.get('state');
  if (!code || !state) {
    return null;
  }

  const storedState = window.sessionStorage.getItem(AUTH_STATE_STORAGE_KEY);
  const codeVerifier = window.sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY);
  if (!storedState || storedState !== state || !codeVerifier) {
    throw new Error('The sign-in response could not be validated.');
  }

  const response = await fetch(`${CONFIG.KEYCLOAK_AUTHORITY}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CONFIG.KEYCLOAK_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: getAppUrl(),
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response, 'Sign-in could not be completed.'));
  }

  const tokenResponse = (await response.json()) as TokenEndpointResponse;
  const tokens = toStoredTokens(tokenResponse);

  const redirectPath = window.sessionStorage.getItem(POST_LOGIN_PATH_STORAGE_KEY) || buildAppPath('/');
  cleanupCallbackState();
  currentUrl.searchParams.delete('code');
  currentUrl.searchParams.delete('state');
  currentUrl.searchParams.delete('session_state');
  currentUrl.searchParams.delete('iss');
  window.history.replaceState({}, '', redirectPath);

  return tokens;
}

async function ensureFreshTokens(tokens: StoredTokens) {
  if (!isExpired(tokens.expiresAt)) {
    return tokens;
  }

  if (!tokens.refreshToken || isExpired(tokens.refreshExpiresAt)) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshTokens(tokens.refreshToken).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function refreshTokens(refreshToken: string) {
  const response = await fetch(`${CONFIG.KEYCLOAK_AUTHORITY}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CONFIG.KEYCLOAK_CLIENT_ID,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    return null;
  }

  const tokenResponse = (await response.json()) as TokenEndpointResponse;
  return toStoredTokens(tokenResponse, refreshToken);
}

function toStoredTokens(payload: TokenEndpointResponse, fallbackRefreshToken = '') {
  const now = Math.floor(Date.now() / 1000);
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || fallbackRefreshToken,
    idToken: payload.id_token || '',
    tokenType: payload.token_type || 'Bearer',
    scope: payload.scope || 'openid profile email',
    expiresAt: now + Number(payload.expires_in || 300),
    refreshExpiresAt: now + Number(payload.refresh_expires_in || 1800),
  } satisfies StoredTokens;
}

function readJwtClaims(token: string) {
  const [, encodedPayload = ''] = token.split('.');
  if (!encodedPayload) {
    return {} as JwtClaims;
  }

  try {
    const json = decodeBase64Url(encodedPayload);
    return JSON.parse(json) as JwtClaims;
  } catch {
    return {} as JwtClaims;
  }
}

function mapClaimsToUser(claims: JwtClaims): AuthUser {
  const fullName = firstDefinedString(claims.name, [claims.given_name, claims.family_name].filter(Boolean).join(' '), claims.preferred_username, claims.email, 'DILOS User');
  const firstName = firstDefinedString(claims.given_name, fullName.split(' ')[0], 'User');
  const roles = Array.isArray(claims.realm_access?.roles) ? claims.realm_access.roles : [];
  const businessRoles = roles.filter((role) => !role.startsWith('default-roles-') && role !== 'offline_access' && role !== 'uma_authorization');

  return {
    id: firstDefinedString(claims.sub, claims.preferred_username, claims.email, fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    username: firstDefinedString(claims.preferred_username, claims.email, fullName),
    email: firstDefinedString(claims.email, ''),
    firstName,
    fullName,
    role: firstDefinedString(
      readClaimString(claims, ['role', 'job_title', 'designation']),
      businessRoles[0]?.replace(/[_-]+/g, ' '),
      'Authenticated User',
    ),
    showroom: firstDefinedString(
      readClaimString(claims, ['showroom', 'dealer_name', 'dealer', 'tenant', 'brand']),
      'DILOS Showroom',
    ),
    avatarUrl: firstDefinedString(
      claims.picture,
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=101825&color=f6f1e7`,
    ),
  };
}

function firstDefinedString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readClaimString(claims: JwtClaims, keys: string[]) {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function getCurrentRelativeUrl() {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

function cleanupCallbackState() {
  window.sessionStorage.removeItem(AUTH_STATE_STORAGE_KEY);
  window.sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
  window.sessionStorage.removeItem(POST_LOGIN_PATH_STORAGE_KEY);
}

function isExpired(expiresAt: number) {
  return expiresAt * 1000 <= Date.now() + 60_000;
}

function ensureAuthConfig() {
  if (!CONFIG.KEYCLOAK_AUTHORITY || !CONFIG.KEYCLOAK_CLIENT_ID) {
    throw new Error('Keycloak configuration is incomplete.');
  }
}

async function sha256Base64Url(value: string) {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

function randomUrlSafeString(length: number) {
  const random = new Uint8Array(length);
  window.crypto.getRandomValues(random);
  return base64UrlEncode(random).slice(0, length);
}

function base64UrlEncode(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(`${normalized}${padding}`);
}

async function readAuthError(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as { error_description?: string; error?: string } | null;
    return payload?.error_description || payload?.error || fallbackMessage;
  }
  return (await response.text().catch(() => fallbackMessage)) || fallbackMessage;
}
