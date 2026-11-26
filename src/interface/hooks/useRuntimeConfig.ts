/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  RuntimeConfig,
  RuntimeSecretsStatus,
  resolveRuntimeConfig,
  getRuntimeSecretsStatus,
} from '../../utils/runtimeEnv.ts';

export interface UseRuntimeConfigReturn {
  config: RuntimeConfig;
  secretsStatus: RuntimeSecretsStatus;
  isRenderService: boolean;
  /** @deprecated Kept for compatibility with older UI components; always false on Render. */
  isCloudflareWorker: boolean;
  activeDomain: string;
}

export function useRuntimeConfig(): UseRuntimeConfigReturn {
  const [config, setConfig] = useState<RuntimeConfig>(resolveRuntimeConfig);
  const [secretsStatus, setSecretsStatus] = useState<RuntimeSecretsStatus>(getRuntimeSecretsStatus);

  useEffect(() => {
    fetch('/api/v1/runtime-config', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.config || data?.data) {
          setConfig((previous) => ({ ...previous, ...(data.config || data.data) }));
        }
        if (data?.secrets) {
          setSecretsStatus((previous) => ({ ...previous, ...data.secrets }));
        }
      })
      .catch(() => {
        // The public Store can operate with local public config; Admin checks remain server-protected.
      });
  }, []);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isRenderService = currentHost.endsWith('.onrender.com') || currentHost === 'onrender.com';
  return {
    config,
    secretsStatus,
    isRenderService,
    isCloudflareWorker: false,
    activeDomain: currentHost || config.renderServiceDomain,
  };
}
