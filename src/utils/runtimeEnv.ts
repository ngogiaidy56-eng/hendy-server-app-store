/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cloudflare Pages Functions Runtime Environment & Secrets Binding Engine.
 * Tự động tạo, khai báo, gắn kết (bind) biến môi trường và bí mật (secrets) tại thời điểm thực thi (runtime).
 */

export interface RuntimeConfig {
  appName: string;
  appUrl: string;
  environment: 'production' | 'preview' | 'development';
  releaseChannel: 'stable' | 'beta' | 'nightly';
  cloudflarePagesDomain: string;
  cloudflarePagesUrl: string;
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
  activeBindingsCount: number;
  totalBindingsCount: number;
}

// Global window augmentation for dynamic runtime injection
declare global {
  interface Window {
    __HENDY_RUNTIME_CONFIG__?: Partial<RuntimeConfig>;
    __HENDY_SECRETS_STATUS__?: Partial<RuntimeSecretsStatus>;
  }
}

/**
 * Default fallback configuration for Cloudflare Pages runtime
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  appName: 'Hendy App Store',
  appUrl: 'https://hendy-app-store.pages.dev',
  environment: 'production',
  releaseChannel: 'stable',
  cloudflarePagesDomain: 'hendy-app-store.pages.dev',
  cloudflarePagesUrl: 'https://hendy-app-store.pages.dev',
  r2BucketName: 'hendy-tool-releases',
  version: '3.3.0',
  isAirGapped: false,
  apiBaseUrl: '/api',
};

/**
 * Resolves runtime configuration automatically from multiple tiers:
 * 1. Window injected runtime object (from Cloudflare Pages Functions HTML rewrite)
 * 2. Vite / Build-time environment variables (import.meta.env)
 * 3. Build-time environment variables
 * 4. Default production fallbacks
 */
export function resolveRuntimeConfig(): RuntimeConfig {
  const windowConfig = typeof window !== 'undefined' ? window.__HENDY_RUNTIME_CONFIG__ || {} : {};

  // Resolve from import.meta.env safely
  let metaEnv: Record<string, string> = {};
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      metaEnv = import.meta.env as unknown as Record<string, string>;
    }
  } catch {
    metaEnv = {};
  }

  // Resolve from process.env safely
  let procEnv: Record<string, string | undefined> = {};
  try {
    if (typeof process !== 'undefined' && process.env) {
      procEnv = process.env;
    }
  } catch {
    procEnv = {};
  }

  const appName =
    windowConfig.appName ||
    metaEnv.VITE_APP_NAME ||
    procEnv.APP_NAME ||
    DEFAULT_RUNTIME_CONFIG.appName;

  const appUrl =
    windowConfig.appUrl ||
    metaEnv.VITE_APP_URL ||
    procEnv.APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : DEFAULT_RUNTIME_CONFIG.appUrl);

  const rawEnv =
    windowConfig.environment ||
    metaEnv.VITE_ENVIRONMENT ||
    metaEnv.MODE ||
    procEnv.NODE_ENV ||
    'production';

  const environment: RuntimeConfig['environment'] =
    rawEnv === 'development' || rawEnv === 'dev'
      ? 'development'
      : rawEnv === 'preview' || rawEnv === 'staging'
      ? 'preview'
      : 'production';

  const releaseChannel: RuntimeConfig['releaseChannel'] =
    (windowConfig.releaseChannel as any) ||
    (metaEnv.VITE_RELEASE_CHANNEL as any) ||
    'stable';

  const cloudflarePagesDomain =
    windowConfig.cloudflarePagesDomain ||
    metaEnv.VITE_CLOUDFLARE_PAGES_DOMAIN ||
    DEFAULT_RUNTIME_CONFIG.cloudflarePagesDomain;

  const cloudflarePagesUrl =
    windowConfig.cloudflarePagesUrl ||
    metaEnv.VITE_CLOUDFLARE_PAGES_URL ||
    DEFAULT_RUNTIME_CONFIG.cloudflarePagesUrl;

  const r2BucketName =
    windowConfig.r2BucketName ||
    metaEnv.VITE_R2_BUCKET_NAME ||
    DEFAULT_RUNTIME_CONFIG.r2BucketName;

  const version =
    windowConfig.version ||
    metaEnv.VITE_APP_VERSION ||
    DEFAULT_RUNTIME_CONFIG.version;

  return {
    appName,
    appUrl,
    environment,
    releaseChannel,
    cloudflarePagesDomain,
    cloudflarePagesUrl,
    r2BucketName,
    version,
    isAirGapped: false,
    apiBaseUrl: '/api',
  };
}

/**
 * Checks and inspects runtime secrets binding status without exposing sensitive secret values
 */
export function getRuntimeSecretsStatus(): RuntimeSecretsStatus {
  const windowStatus = typeof window !== 'undefined' ? window.__HENDY_SECRETS_STATUS__ || {} : {};

  // In production browser, check presence of injected or known bindings
  const hasCloudflareApiToken = Boolean(
    windowStatus.hasCloudflareApiToken ?? false // Deployment tokens are never exposed to the browser
  );
  const hasCloudflareAccountId = Boolean(
    windowStatus.hasCloudflareAccountId ?? false
  );
  const hasReleasePublishToken = Boolean(
    windowStatus.hasReleasePublishToken ?? false
  );
  const hasFirebaseConfig = Boolean(windowStatus.hasFirebaseConfig ?? false);
  const hasGoogleDriveScope = Boolean(windowStatus.hasGoogleDriveScope ?? false);
  const hasCfAccessConfig = Boolean(windowStatus.hasCfAccessConfig ?? false);

  const bindings = [
    hasCloudflareApiToken,
    hasCloudflareAccountId,
    hasReleasePublishToken,
    hasFirebaseConfig,
    hasGoogleDriveScope,
    hasCfAccessConfig,
  ];

  const activeBindingsCount = bindings.filter(Boolean).length;

  return {
    hasCloudflareApiToken,
    hasCloudflareAccountId,
    hasReleasePublishToken,
    hasFirebaseConfig,
    hasGoogleDriveScope,
    hasCfAccessConfig,
    activeBindingsCount,
    totalBindingsCount: bindings.length,
  };
}

/**
 * Generates runtime env declarations for Cloudflare Pages Functions
 */
export function generateWranglerVarsBlock(config: Partial<RuntimeConfig> = {}): string {
  const merged = { ...DEFAULT_RUNTIME_CONFIG, ...config };
  return `[vars]
ENVIRONMENT = "${merged.environment}"
APP_NAME = "${merged.appName}"
PUBLIC_BASE_URL = "${merged.appUrl}"
RELEASE_CHANNEL = "${merged.releaseChannel}"
CLOUDFLARE_PAGES_DOMAIN = "${merged.cloudflarePagesDomain}"
R2_BUCKET_NAME = "${merged.r2BucketName}"
`;
}
