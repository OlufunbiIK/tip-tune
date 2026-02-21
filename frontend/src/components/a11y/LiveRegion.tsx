import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type AriaLive = 'polite' | 'assertive' | 'off';

interface LiveRegionContextType {
  announce: (message: string, priority?: AriaLive) => void;
  clearAnnouncements: () => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | undefined>(undefined);

export const useLiveRegion = () => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
};

interface LiveRegionProviderProps {
  children: ReactNode;
}

export const LiveRegionProvider: React.FC<LiveRegionProviderProps> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: AriaLive = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  const clearAnnouncements = useCallback(() => {
    setPoliteMessage('');
    setAssertiveMessage('');
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce, clearAnnouncements }}>
      {children}
      <div
        id="a11y-polite-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        id="a11y-assertive-region"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
};

export default LiveRegionProvider;
