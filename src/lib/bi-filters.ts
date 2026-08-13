import { toLocalISODate } from './utils';
/**
 * Utilities para filtros do BI - garante valores controlados e seguros
 */

// Função para garantir que IDs sejam sempre strings não-vazias
export const toItemValue = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined || id === '') {
    return 'all';
  }
  return String(id);
};

// Opções padrão de período
export const periodOptions = [
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 90 dias', value: '90d' },
  { label: 'Últimos 6 meses', value: '6m' },
  { label: 'Último ano', value: '1y' },
];

// Função para criar opção "Todos"
export const allOption = (label: string) => ({ 
  label: `Todos(as) ${label}`, 
  value: 'all' 
});

// Converter período para datas
export const periodToDates = (period: string) => {
  const now = new Date();
  const endDate = toLocalISODate(now);
  
  const DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '6m': 180, '1y': 365 };
  const days = DAYS[period];
  const startDate = days
    ? toLocalISODate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000))
    : '2024-01-01';
  
  return { startDate, endDate };
};

// Tipos para filtros com index signature
export interface AcademicoFilters {
  period: string;
  classId: string;
  segmentId: string;
  seriesId: string;
  [key: string]: string;
}

export interface FinanceiroFilters {
  period: string;
  status: string;
  [key: string]: string;
}

export interface CRMFilters {
  period: string;
  leadType: string;
  channel: string;
  [key: string]: string;
}

// Filtros padrão para cada página BI
export const defaultFilters = {
  academico: {
    period: '30d',
    classId: 'all',
    segmentId: 'all',
    seriesId: 'all',
  } as AcademicoFilters,
  financeiro: {
    period: '30d',
    status: 'all',
  } as FinanceiroFilters,
  crm: {
    period: '30d',
    leadType: 'all',
    channel: 'all',
  } as CRMFilters,
};

// Converter filtros para query (interpretando 'all' como sem filtro)
export const filtersToQuery = (filters: Record<string, string>) => {
  const query: Record<string, string> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      query[key] = value;
    }
  });
  
  return query;
};