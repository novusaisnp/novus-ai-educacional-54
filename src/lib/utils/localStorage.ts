
// Helper para acesso seguro ao localStorage com verificação de window
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn('Erro ao acessar localStorage:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Erro ao salvar no localStorage:', error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Erro ao remover do localStorage:', error);
      return false;
    }
  }
};
