export function registerProductAuthorityRoutes(app) {
  app.post('/api/product-authority/start', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
      const productAuthorityConfig = readProductAuthorityConfig();

      if (!productAuthorityConfig.username || !productAuthorityConfig.password) {
        res.status(503).json({
          ok: false,
          error: 'Product Authority credentials are not configured on the server.',
        });
        return;
      }

      const redirectUrl = await createPracticeRedirectUrl(productAuthorityConfig);
      res.json({ ok: true, redirectUrl });
    } catch (error) {
      console.error('[product-authority] failed to create practice redirect', error);
      res.status(502).json({
        ok: false,
        error: 'Unable to start Product Authority practice right now.',
      });
    }
  });
}

async function createPracticeRedirectUrl(productAuthorityConfig) {
  const loginPageResponse = await fetch(buildAuthRedirectUrl(productAuthorityConfig), {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!loginPageResponse.ok) {
    throw new Error(`Product Authority login page returned ${loginPageResponse.status}`);
  }

  const loginPageHtml = await loginPageResponse.text();
  const loginAction = extractLoginFormAction(loginPageHtml);
  const cookieHeader = toCookieHeader(loginPageResponse.headers.getSetCookie?.() ?? []);

  if (!cookieHeader) {
    throw new Error('Product Authority login session was not established.');
  }

  const loginResponse = await fetch(loginAction, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader,
      'user-agent': 'Mozilla/5.0',
    },
    body: new URLSearchParams({
      username: productAuthorityConfig.username,
      password: productAuthorityConfig.password,
      credentialId: '',
      login: 'Sign In',
      rememberMe: 'on',
    }).toString(),
    signal: AbortSignal.timeout(15000),
  });

  const destination = loginResponse.headers.get('location');
  if (destination && loginResponse.status >= 300 && loginResponse.status < 400) {
    return destination;
  }

  const failedLoginHtml = await loginResponse.text();
  const reason = extractLoginFailure(failedLoginHtml);
  throw new Error(reason || `Product Authority login failed with status ${loginResponse.status}.`);
}

function buildAuthRedirectUrl(productAuthorityConfig) {
  const redirectUrl = new URL('/oauth/v1/redirect', productAuthorityConfig.platformOrigin);
  redirectUrl.searchParams.set('registration_id', productAuthorityConfig.registrationId);
  return redirectUrl.toString();
}

function readProductAuthorityConfig() {
  return {
    registrationId: process.env.PRODUCT_AUTHORITY_REGISTRATION_ID || 'keycloak-tvs-qa-prodiq',
    platformOrigin: process.env.PRODUCT_AUTHORITY_ORIGIN || 'https://raise-dev.niit.com',
    username: process.env.PRODUCT_AUTHORITY_USERNAME || '',
    password: process.env.PRODUCT_AUTHORITY_PASSWORD || '',
  };
}

function extractLoginFormAction(html) {
  const match = html.match(/<form id="kc-form-login"[^>]*action="([^"]+)"/i);
  if (!match?.[1]) {
    throw new Error('Product Authority sign-in form action was not found.');
  }

  return match[1].replaceAll('&amp;', '&');
}

function toCookieHeader(setCookieHeaders) {
  const cookies = new Map();

  for (const header of setCookieHeaders) {
    const cookie = header.split(';', 1)[0];
    if (!cookie) continue;

    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex < 0) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();
    if (!name || !value) continue;
    cookies.set(name, value);
  }

  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function extractLoginFailure(html) {
  const alertMatch = html.match(/<span class="kc-feedback-text">([\s\S]*?)<\/span>/i);
  if (!alertMatch?.[1]) return null;

  return alertMatch[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
