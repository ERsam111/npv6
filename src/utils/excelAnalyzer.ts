import * as XLSX from 'xlsx';

export interface SheetInfo {
  sheetName: string;
  columns: string[];
  rowCount: number;
  sampleData: any[];
}

export interface ExcelStructure {
  sheets: SheetInfo[];
  relationships: string[];
}

export const analyzeExcelStructure = async (file: File): Promise<ExcelStructure> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const sheets: SheetInfo[] = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const columns = (jsonData[0] as string[]) || [];
          const dataRows = jsonData.slice(1);
          const sampleData = dataRows.slice(0, 3).map((row: any) => {
            const obj: any = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });
          
          return {
            sheetName,
            columns,
            rowCount: dataRows.length,
            sampleData
          };
        });
        
        // Analyze relationships based on common column names
        const relationships: string[] = [];
        const columnMap = new Map<string, string[]>();
        
        sheets.forEach(sheet => {
          sheet.columns.forEach(col => {
            if (!columnMap.has(col)) {
              columnMap.set(col, []);
            }
            columnMap.get(col)?.push(sheet.sheetName);
          });
        });
        
        columnMap.forEach((sheetNames, columnName) => {
          if (sheetNames.length > 1) {
            relationships.push(`Column "${columnName}" links: ${sheetNames.join(', ')}`);
          }
        });
        
        resolve({ sheets, relationships });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const formatStructureReport = (structure: ExcelStructure): string => {
  let report = '# Excel File Structure Analysis\n\n';
  
  report += `## Sheets (${structure.sheets.length})\n\n`;
  
  structure.sheets.forEach((sheet, idx) => {
    report += `### ${idx + 1}. ${sheet.sheetName}\n`;
    report += `- **Columns (${sheet.columns.length})**: ${sheet.columns.join(', ')}\n`;
    report += `- **Row Count**: ${sheet.rowCount}\n`;
    
    if (sheet.sampleData.length > 0) {
      report += `- **Sample Data**:\n`;
      report += '```json\n';
      report += JSON.stringify(sheet.sampleData, null, 2);
      report += '\n```\n';
    }
    report += '\n';
  });
  
  if (structure.relationships.length > 0) {
    report += '## Relationships\n\n';
    structure.relationships.forEach(rel => {
      report += `- ${rel}\n`;
    });
  }
  
  return report;
};
