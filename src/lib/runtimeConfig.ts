const rawAppUrl = readEnv('VITE_APP_URL');
const rawBasePath = readEnv('VITE_APP_BASE_PATH');
const normalizedAppUrl = normalizeAppUrl(rawAppUrl);
const configuredBasePath = normalizeBasePath(rawBasePath || getPathnameFromUrl(normalizedAppUrl) || '/');
const keycloakLoginUrl = stripTrailingSlash(readEnv('VITE_KEYCLOAK_LOGIN_URL'));
const keycloakRealm = readEnv('VITE_KEYCLOAK_REALM');

export const CONFIG = {
  APP_URL: normalizedAppUrl,
  APP_BASE_PATH: configuredBasePath,
  API_BASE_URL: stripTrailingSlash(readEnv('VITE_API_BASE_URL')),
  KEYCLOAK_LOGIN_URL: keycloakLoginUrl,
  KEYCLOAK_REALM: keycloakRealm,
  KEYCLOAK_CLIENT_ID: readEnv('VITE_KEYCLOAK_CLIENT_ID'),
  KEYCLOAK_AUTHORITY: keycloakLoginUrl && keycloakRealm ? `${keycloakLoginUrl}/shield/realms/${keycloakRealm}` : '',
  KEYCLOAK_PROFILE_URL: keycloakLoginUrl && keycloakRealm ? `${keycloakLoginUrl}/shield/realms/${keycloakRealm}/account` : '',
  PRODUCT_AUTHORITY_ORIGIN:
    stripTrailingSlash(readEnv('VITE_PRODUCT_AUTHORITY_ORIGIN')) || stripTrailingSlash(readEnv('PRODUCT_AUTHORITY_ORIGIN')),
  PRODUCT_AUTHORITY_REGISTRATION_ID:
    readEnv('VITE_PRODUCT_AUTHORITY_REGISTRATION_ID') || readEnv('PRODUCT_AUTHORITY_REGISTRATION_ID'),
  PRODUCT_AUTHORITY_HOME_PATH:
    readEnv('VITE_PRODUCT_AUTHORITY_HOME_PATH') || readEnv('PRODUCT_AUTHORITY_HOME_PATH') || '/',
};

export function getOrigin() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  if (!CONFIG.APP_URL) {
    return '';
  }

  try {
    return new URL(CONFIG.APP_URL).origin;
  } catch {
    return '';
  }
}

export function getAppUrl() {
  const origin = getOrigin();
  return origin ? `${origin}${buildAppPath('/')}` : CONFIG.APP_URL;
}

export function buildAppPath(path: string) {
  const normalizedPath = path === '/' ? '/' : `/${trimSlashes(path)}`;
  if (CONFIG.APP_BASE_PATH === '/') {
    return normalizedPath;
  }
  if (normalizedPath === '/') {
    return `${CONFIG.APP_BASE_PATH}/`;
  }
  return `${CONFIG.APP_BASE_PATH}${normalizedPath}`;
}

export function stripAppBasePath(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  if (CONFIG.APP_BASE_PATH === '/') {
    return normalizedPathname;
  }
  if (normalizedPathname === CONFIG.APP_BASE_PATH) {
    return '/';
  }
  if (normalizedPathname.startsWith(`${CONFIG.APP_BASE_PATH}/`)) {
    return normalizedPathname.slice(CONFIG.APP_BASE_PATH.length) || '/';
  }
  return normalizedPathname;
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (CONFIG.API_BASE_URL) {
    return `${CONFIG.API_BASE_URL}${normalizedPath}`;
  }
  return normalizedPath;
}

export function buildProductAuthorityHomeUrl() {
  if (!CONFIG.PRODUCT_AUTHORITY_ORIGIN) {
    throw new Error('Product Authority origin is not configured.');
  }

  const path = CONFIG.PRODUCT_AUTHORITY_HOME_PATH || '/';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${CONFIG.PRODUCT_AUTHORITY_ORIGIN}${normalizedPath}`;
}

function readEnv(key: string) {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getPathnameFromUrl(value: string) {
  if (!value) return '';
  try {
    return new URL(value).pathname;
  } catch {
    return '';
  }
}

function normalizeAppUrl(value: string) {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeBasePath(value: string) {
  const trimmed = trimSlashes(value);
  if (!trimmed) {
    return '/';
  }
  return `/${trimmed}`;
}

function normalizePathname(value: string) {
  if (!value || value === '/') {
    return '/';
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function stripTrailingSlash(value: string) {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}
