import { createRoot } from 'react-dom/client';
import StudioWorkspace from './interface/admin/StudioWorkspace.tsx';
import './admin.css';

const root = document.getElementById('root');
if (!root) throw new Error('Admin root element is missing.');

function returnToStore() {
  const host = window.location.hostname.toLowerCase();
  if (/^(admin|studio|serverplus|admin-plus)\./.test(host)) {
    const storeHost = host.replace(/^(admin|studio|serverplus|admin-plus)\./, '');
    window.location.assign(window.location.protocol + '//' + storeHost + '/');
    return;
  }
  window.location.assign('/');
}

createRoot(root).render(<StudioWorkspace onReturnToStore={returnToStore} />);