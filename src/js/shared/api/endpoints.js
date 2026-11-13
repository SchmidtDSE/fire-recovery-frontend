/**
 * API endpoint definitions
 */

// Backend per environment. There is no local backend: local development
// talks to dev, whose CORS allows localhost.
const BACKEND_URLS = {
  local: 'https://fire-recovery-backend-dev-113009620257.us-central1.run.app',
  dev: 'https://fire-recovery-backend-dev-113009620257.us-central1.run.app',
  prod: 'https://fire-recovery-backend-prod-113009620257.us-central1.run.app',
};

/**
 * Detect environment based on hostname and URL path
 * - localhost/127.0.0.1 → local
 * - /prod/ in path → prod (the site is served at /fire-recovery-web/prod/...)
 * - otherwise → dev
 */
function detectEnvironment() {
  const { hostname, pathname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local';
  if (pathname.includes('/prod/') || pathname.endsWith('/prod')) return 'prod';
  return 'dev';
}

const BACKEND_URL = BACKEND_URLS[detectEnvironment()];

export const SEVERITY_ENDPOINTS = {
  SUBMIT: `${BACKEND_URL}/v2/severity`,
  STATUS: (jobId) => `${BACKEND_URL}/v2/severity/${encodeURIComponent(jobId)}`,
};
