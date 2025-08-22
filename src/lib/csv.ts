// Utility para gerar CSV com BOM UTF-8 para compatibilidade com Excel

export interface CsvColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export const toCsv = (data: Record<string, any>[], columns: CsvColumn[]): string => {
  // Cabeçalho
  const headers = columns.map(col => col.label).join(',');
  
  // Linhas de dados
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formattedValue = col.format ? col.format(value) : value;
      
      // Escape para CSV: aspas duplas e quebras de linha
      if (formattedValue == null) return '';
      
      const stringValue = String(formattedValue);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
};

export const downloadCsv = (content: string, filename: string) => {
  // Adicionar BOM UTF-8 para compatibilidade com Excel
  const csvContent = '\uFEFF' + content;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};