import React, { createContext, useContext, useState } from 'react';

const ViewModeContext = createContext({
  viewMode: 'simple',
  setViewMode: () => {},
  toggleViewMode: () => {}
});

export function ViewModeProvider({ children }) {
  // Default to 'simple' for instant non-technical comprehension
  const [viewMode, setViewMode] = useState('simple');

  const toggleViewMode = () => {
    setViewMode(prev => (prev === 'simple' ? 'analyst' : 'simple'));
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

