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
  isCloudflareWorker: boolean;
  activeDomain: string;
}

export function useRuntimeConfig(): UseRuntimeConfigReturn {
  const [config, setConfig] = useState<RuntimeConfig>(resolveRuntimeConfig);
  const [secretsStatus, setSecretsStatus] = useState<RuntimeSecretsStatus>(getRuntimeSecretsStatus);

  useEffect(() => {
    // Check if edge runtime returned updated runtime-config
    fetch('/api/v1/runtime-config', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config) {
          setConfig((prev) => ({ ...prev, ...data.config }));
        }
        if (data?.secrets) {
          setSecretsStatus((prev) => ({ ...prev, ...data.secrets }));
        }
      })
      .catch(() => {
        // Fallback gracefully to resolved local config
      });
  }, []);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isCloudflareWorker = currentHost.includes('workers.dev');

  return {
    config,
    secretsStatus,
    isCloudflareWorker,
    activeDomain: currentHost || config.cloudflareWorkerDomain,
  };
}
