/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ResponsiveLayout } from './interface/layout/ResponsiveLayout.tsx';
import { useScreenFit } from './interface/responsive/useScreenFit.ts';
import { AppStoreView } from './interface/store/AppStoreView.tsx';
import { ServerPlusConsole } from './interface/admin/ServerPlusConsole.tsx';
import { SecurityGate } from './interface/auth/SecurityGate.tsx';
import { GoogleDriveModal } from './interface/drive/GoogleDriveModal.tsx';
import { SAMPLE_PROJECTS } from './utils/sampleProjects.ts';

export const PRIMARY_CLOUDFLARE_PAGES_DOMAIN = 'hendytools.pages.dev';

export default function App() {
  const { fitMode, breakpoint, scaleFactor } = useScreenFit();
  const [currentView, setCurrentView] = useState<'store' | 'admin'>('store');
  const [isSecurityGateOpen, setIsSecurityGateOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [clientIp, setClientIp] = useState('103.149.28.4');

  const handleRequestAdminAccess = () => {
    if (isAdminAuthenticated) {
      setCurrentView('admin');
    } else {
      setIsSecurityGateOpen(true);
    }
  };

  const handleAdminSuccess = () => {
    setIsAdminAuthenticated(true);
    setIsSecurityGateOpen(false);
    setCurrentView('admin');
  };

  return (
    <ResponsiveLayout fitMode={fitMode} breakpoint={breakpoint} scaleFactor={scaleFactor}>
      {/* Notice: ScreenFitBar is purposefully hidden per user specification, while fluid auto-fit engine runs under the hood */}
      {currentView === 'store' ? (
        <AppStoreView
          apps={SAMPLE_PROJECTS}
          onRequestAdminAccess={handleRequestAdminAccess}
        />
      ) : (
        <ServerPlusConsole
          onReturnToStore={() => setCurrentView('store')}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          clientIp={clientIp}
        />
      )}

      {/* Security Gate for Air-Gapped Admin Access */}
      {isSecurityGateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full">
            <SecurityGate
              clientIp={clientIp}
              isAuthorizedIp={clientIp === '103.149.28.4'}
              onGrantAccess={handleAdminSuccess}
              onCancel={() => setIsSecurityGateOpen(false)}
              onSimulateIpChange={(newIp) => setClientIp(newIp)}
            />
          </div>
        </div>
      )}

      {/* Google Drive Workspace Hub - Isolated to Admin Console per specification */}
      {isDriveModalOpen && (
        <GoogleDriveModal
          onClose={() => setIsDriveModalOpen(false)}
        />
      )}
    </ResponsiveLayout>
  );
}
