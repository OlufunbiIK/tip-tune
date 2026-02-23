import React from 'react';
import usePWA from '../hooks/usePWA';

export default function InstallPrompt() {
  const {deferredPrompt, promptInstall, enablePush} = usePWA();

  if (!deferredPrompt) return null;

  return (
    <div style={{position: 'fixed', bottom: 20, left: 20, right: 20, display: 'flex', gap: 8, justifyContent: 'center', zIndex: 9999}}>
      <div style={{background: '#000', color: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.3)'}}>
        <div style={{fontWeight: 600, marginBottom: 6}}>Install TipTune</div>
        <div style={{display: 'flex', gap: 8}}>
          <button onClick={() => promptInstall()} style={{padding: '8px 12px', borderRadius: 6}}>Install</button>
          <button onClick={() => enablePush()} style={{padding: '8px 12px', borderRadius: 6}}>Enable Notifications</button>
        </div>
      </div>
    </div>
  );
}
