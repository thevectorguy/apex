import tls from 'node:tls';

let systemTrustEnabled = false;

export function ensureSystemTlsTrust() {
  if (systemTrustEnabled) return;
  systemTrustEnabled = true;

  if (typeof tls.getCACertificates !== 'function' || typeof tls.setDefaultCACertificates !== 'function') {
    return;
  }

  try {
    const certificates = new Set([
      ...tls.getCACertificates('bundled'),
      ...tls.getCACertificates('system'),
      ...tls.getCACertificates('extra'),
    ]);
    tls.setDefaultCACertificates([...certificates]);
  } catch (error) {
    console.warn(
      `[my-coach] could not extend TLS certificate trust with system roots: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

ensureSystemTlsTrust();
