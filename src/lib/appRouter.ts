import { Screen } from '../types';

const SCREEN_PATHS: Record<Screen, string> = {
  dashboard: '/',
  my_coach: '/my-coach',
  my_coach_recommendations: '/my-coach/recommendations',
  my_coach_recording: '/my-coach/live',
  my_coach_processing: '/my-coach/processing',
  my_coach_reports: '/my-coach/reports',
  my_coach_report_detail: '/my-coach/report',
  my_coach_customers: '/my-coach/customers',
  my_coach_steps: '/my-coach/steps',
  my_coach_transcript: '/my-coach/transcript',
  catalog: '/catalog',
  brochures: '/brochures',
  communications: '/communications',
  pitch_practice: '/pitch-practice',
  live_scenario: '/live-scenario',
  studio_config: '/studio-config',
};

export const ROUTE_QUERY_KEYS = ['threadId', 'sessionId', 'reportId', 'flow', 'stepFocus'] as const;

export type RouteQueryKey = (typeof ROUTE_QUERY_KEYS)[number];

export function getScreenFromLocation(locationLike: Pick<Location, 'pathname'> = window.location): Screen {
  const pathname = normalizePath(locationLike.pathname);

  switch (pathname) {
    case '/':
    case '/dashboard':
      return 'dashboard';
    case '/my-coach':
      return 'my_coach';
    case '/my-coach/recommendations':
      return 'my_coach_recommendations';
    case '/my-coach/live':
      return 'my_coach_recording';
    case '/my-coach/processing':
      return 'my_coach_processing';
    case '/my-coach/reports':
      return 'my_coach_reports';
    case '/my-coach/report':
      return 'my_coach_report_detail';
    case '/my-coach/customers':
      return 'my_coach_customers';
    case '/my-coach/steps':
      return 'my_coach_steps';
    case '/my-coach/transcript':
      return 'my_coach_transcript';
    case '/catalog':
      return 'catalog';
    case '/brochures':
      return 'brochures';
    case '/communications':
      return 'communications';
    case '/pitch-practice':
      return 'pitch_practice';
    case '/live-scenario':
      return 'live_scenario';
    case '/studio-config':
      return 'studio_config';
    default:
      return 'dashboard';
  }
}

export function navigateToScreen(screen: Screen, options?: { replace?: boolean; preserveSearch?: boolean }) {
  if (typeof window === 'undefined') return;

  const replace = options?.replace ?? false;
  const preserveSearch = options?.preserveSearch ?? true;
  const nextUrl = new URL(window.location.href);
  nextUrl.pathname = SCREEN_PATHS[screen];

  if (!preserveSearch) {
    nextUrl.search = '';
  }

  if (replace) {
    window.history.replaceState({}, '', nextUrl);
  } else {
    window.history.pushState({}, '', nextUrl);
  }

  window.dispatchEvent(new Event('app:navigation'));
}

export function readRouteQueryParam(key: RouteQueryKey) {
  return readSearchParam(key);
}

export function readSearchParam(key: string) {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function writeRouteQueryParam(key: RouteQueryKey, value: string | null, options?: { replace?: boolean }) {
  writeSearchParam(key, value, options);
}

export function writeSearchParam(key: string, value: string | null, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return;

  const nextUrl = new URL(window.location.href);
  if (value) nextUrl.searchParams.set(key, value);
  else nextUrl.searchParams.delete(key);

  if (options?.replace ?? true) {
    window.history.replaceState({}, '', nextUrl);
  } else {
    window.history.pushState({}, '', nextUrl);
  }

  window.dispatchEvent(new Event('app:navigation'));
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}
