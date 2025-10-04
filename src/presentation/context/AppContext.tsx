/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode } from 'react';
import { Container } from '../../config/container';

export const AppContext = createContext<Container | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const container = Container.getInstance();

  return <AppContext.Provider value={container}>{children}</AppContext.Provider>;
}

export function useContainer(): Container {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useContainer must be used within AppProvider');
  }
  return context;
}
