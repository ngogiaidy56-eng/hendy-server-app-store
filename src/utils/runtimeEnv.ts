/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render Node.js runtime configuration. This module only exposes public
 * application metadata; secrets are inspected server-side and never sent
 * to browser bundles.
 */

export interface RuntimeConfig {
  appName: string;
  appUrl: string;
  environment: 'production' | 'preview' | 'development';
  releaseChannel: 'stable' | 'beta' | 'nightly';
  renderServiceDomain: string;
  renderServiceUrl: string;
  deploymentProvider: string;
  databaseProvider: string;
  objectStorageName: string;
  // Legacy UI aliases kept to avoid breaking older Studio modules.
  cloudflarePagesDomain: string;
  cloudflarePagesUrl: string;
  cloudflareWorkerDomain: string;
  r2BucketName: string;
  version: string;
  isAirGapped: boolean;
  apiBaseUrl: string;
}

export interface RuntimeSecretsStatus {
  hasCloudflareApiToken: boolean;
  hasCloudflareAccountId: boolean;
  hasReleasePublishToken: boolean;
  hasFirebaseConfig: boolean;
  hasGoogleDriveScope: boolean;
  hasCfAccessConfig: boolean;
  hasRenderAdminConfig: boolean;
  hasDatabaseUrl: boolean;
  hasCertificateEncryptionKey: boolean;
  activeBindingsCount: number;
  totalBindingsCount: number;
}

declare global {
  interface Window {
    __HENDY_RUNTIME_CONFIG__?: Partial<RuntimeConfig>;
    __HENDY_SECRETS_STATUS__?: Partial<RuntimeSecretsStatus>;
  }
}

const LOCAL_URL = 'http://localhost:10000';

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  appName: 'Hendy App Store',
  appUrl: LOCAL_URL,
  environment: 'production',
  releaseChannel: 'stable',
  renderServiceDomain: 'localhost:10000',
  renderServiceUrl: LOCAL_URL,
  deploymentProvider: 'Render',
  databaseProvider: 'Render PostgreSQL',
  objectStorageName: 'Render PostgreSQL object store',
  cloudflarePagesDomain: 'localhost:10000',
  cloudflarePagesUrl: LOCAL_URL,
  cloudflareWorkerDomain: 'localhost:10000',
  r2BucketName: 'Render PostgreSQL object store',
  version: '3.3.0',
  isAirGapped: false,
  apiBaseUrl: '/api',
};

export function resolveRuntimeConfig(): RuntimeConfig {
  const windowConfig = typeof window !== 'undefined' ? window.__HENDY_RUNTIME_CONFIG__ || {} : {};
  let metaEnv: Record<string, string> = {};
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      metaEnv = import.meta.env as unknown as Record<string, string>;
    }
  } catch {
    metaEnv = {};
  }

  let procEnv: Record<string, string | undefined> = {};
  try {
    if (typeof process !== 'undefined' && process.env) procEnv = process.env;
  } catch {
    procEnv = {};
  }

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : LOCAL_URL;
  const appName = windowConfig.appName || metaEnv.VITE_APP_NAME || procEnv.APP_NAME || DEFAULT_RUNTIME_CONFIG.appName;
  const appUrl = windowConfig.appUrl || metaEnv.VITE_APP_URL || procEnv.PUBLIC_BASE_URL || browserOrigin;
  const rawEnv = windowConfig.environment || metaEnv.VITE_ENVIRONMENT || metaEnv.MODE || procEnv.NODE_ENV || 'production';
  const environment: RuntimeConfig['environment'] =
    rawEnv === 'development' || rawEnv === 'dev' ? 'development' :
    rawEnv === 'preview' || rawEnv === 'staging' ? 'preview' : 'production';
  const channel = windowConfig.releaseChannel || metaEnv.VITE_RELEASE_CHANNEL || 'stable';
  const releaseChannel: RuntimeConfig['releaseChannel'] =
    channel === 'beta' || channel === 'nightly' ? channel : 'stable';

  let serviceDomain = browserOrigin;
  try { serviceDomain = new URL(appUrl).host; } catch {}
  const renderServiceUrl = windowConfig.renderServiceUrl || appUrl;
  const renderServiceDomain = windowConfig.renderServiceDomain || serviceDomain;
  const objectStorageName = windowConfig.objectStorageName || 'Render PostgreSQL object store';
  const version = windowConfig.version || metaEnv.VITE_APP_VERSION || DEFAULT_RUNTIME_CONFIG.version;

  return {
    appName,
    appUrl,
    environment,
    releaseChannel,
    renderServiceDomain,
    renderServiceUrl,
    deploymentProvider: 'Render',
    databaseProvider: 'Render PostgreSQL',
    objectStorageName,
    cloudflarePagesDomain: renderServiceDomain,
    cloudflarePagesUrl: renderServiceUrl,
    cloudflareWorkerDomain: renderServiceDomain,
    r2BucketName: objectStorageName,
    version,
    isAirGapped: false,
    apiBaseUrl: '/api',
  };
}

export function getRuntimeSecretsStatus(): RuntimeSecretsStatus {
  const status = typeof window !== 'undefined' ? window.__HENDY_SECRETS_STATUS__ || {} : {};
  const values = {
    hasCloudflareApiToken: false,
    hasCloudflareAccountId: false,
    hasReleasePublishToken: Boolean(status.hasReleasePublishToken ?? false),
    hasFirebaseConfig: Boolean(status.hasFirebaseConfig ?? false),
    hasGoogleDriveScope: Boolean(status.hasGoogleDriveScope ?? false),
    hasCfAccessConfig: false,
    hasRenderAdminConfig: Boolean(status.hasRenderAdminConfig ?? false),
    hasDatabaseUrl: Boolean(status.hasDatabaseUrl ?? false),
    hasCertificateEncryptionKey: Boolean(status.hasCertificateEncryptionKey ?? false),
  };
  const activeBindingsCount = Object.values(values).filter(Boolean).length;
  return { ...values, activeBindingsCount, totalBindingsCount: Object.keys(values).length };
}

/**
 * Backward-compatible export name. Returns a safe Render environment guide,
 * not Wrangler configuration and never includes secret values.
 */
export function generateRenderEnvironmentGuide(config: Partial<RuntimeConfig> = {}): string {
  const merged = { ...DEFAULT_RUNTIME_CONFIG, ...config };
  return [
    '# Render Dashboard > Web Service > Environment',
    'NODE_ENV=production',
    'APP_NAME=' + merged.appName,
    'ENVIRONMENT=' + merged.environment,
    'RELEASE_CHANNEL=' + merged.releaseChannel,
    'PUBLIC_BASE_URL=' + merged.appUrl,
    'PORT=10000',
    '',
    '# Set these secrets directly in Render; never place values in frontend code:',
    '# ADMIN_USERNAME',
    '# ADMIN_PASSWORD (minimum 20 characters)',
    '# ADMIN_EMAIL',
    '# RELEASE_PUBLISH_TOKEN (minimum 32 random characters)',
    '# CERTIFICATE_ENCRYPTION_KEY (Base64 of exactly 32 random bytes)',
    '# DATABASE_URL is linked from the Render PostgreSQL resource',
    ''
  ].join('\n');
}

/** @deprecated Use generateRenderEnvironmentGuide. */
export function generateWranglerVarsBlock(config: Partial<RuntimeConfig> = {}): string {
  return generateRenderEnvironmentGuide(config);
}
