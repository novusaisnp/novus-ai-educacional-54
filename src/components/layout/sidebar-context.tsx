
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  pinned: boolean;
  hoverOpen: boolean;
  expanded: boolean;
  setCollapsed: (collapsed: boolean) => void;
  setPinned: (pinned: boolean) => void;
  setHoverOpen: (hoverOpen: boolean) => void;
  onEnter: () => void;
  onLeave: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Hook defensivo para localStorage
function useLocalStorage(key: string, initialValue: boolean) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window?.localStorage?.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn('Error reading localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value: boolean) => {
    try {
      setStoredValue(value);
      window?.localStorage?.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed] = useState(true); // Sempre inicia colapsado
  const [pinned, setPinned] = useLocalStorage('novus.sidebar.pinned', false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const closeRef = useRef<number | undefined>(undefined);

  const expanded = pinned || hoverOpen || !collapsed;

  const onEnter = () => {
    if (pinned) return; // Não hover se pinned
    if (closeRef.current) window.clearTimeout(closeRef.current);
    setHoverOpen(true);
  };

  const onLeave = () => {
    if (pinned) return; // Não hover se pinned
    closeRef.current = window.setTimeout(() => setHoverOpen(false), 150);
  };

  const setCollapsed = (newCollapsed: boolean) => {
    // Manter sempre colapsado por padrão
    console.log('setCollapsed called with:', newCollapsed);
  };

  useEffect(() => {
    return () => {
      if (closeRef.current) {
        window.clearTimeout(closeRef.current);
      }
    };
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        pinned,
        hoverOpen,
        expanded,
        setCollapsed,
        setPinned,
        setHoverOpen,
        onEnter,
        onLeave,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// Hook seguro que não quebra quando usado fora do contexto
export function useSidebarContext() {
  const context = useContext(SidebarContext);
  
  if (context === undefined) {
    console.warn('useSidebarContext usado fora do SidebarProvider. Retornando valores padrão.');
    return {
      collapsed: true,
      pinned: false,
      hoverOpen: false,
      expanded: false,
      setCollapsed: () => {},
      setPinned: () => {},
      setHoverOpen: () => {},
      onEnter: () => {},
      onLeave: () => {},
    };
  }
  
  return context;
}
