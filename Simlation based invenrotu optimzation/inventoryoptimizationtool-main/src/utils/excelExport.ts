import * as XLSX from 'xlsx';

// Download template Excel file with actual current table data
export const downloadTemplate = (tables: any[]) => {
  const wb = XLSX.utils.book_new();

  tables.forEach(table => {
    // Use actual current data from the table
    const tableData = [table.columns];
    
    // Add all current rows from the table
    if (table.data && table.data.length > 0) {
      table.data.forEach((row: any) => {
        const rowData = table.columns.map((col: string) => {
          const value = row[col];
          // Ensure empty values are represented as empty strings
          return value !== undefined && value !== null ? String(value) : '';
        });
        tableData.push(rowData);
      });
    } else {
      // If no data, add one placeholder row
      const exampleRow = table.columns.map((col: string) => {
        if (col === 'Status') return 'Include';
        if (col.includes('UOM')) return 'DAY';
        if (col.includes('Quantity UOM')) return 'EA';
        return '';
      });
      tableData.push(exampleRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(tableData);
    
    // Set column widths
    const colWidths = table.columns.map(() => ({ wch: 25 }));
    ws['!cols'] = colWidths;

    // Sanitize sheet name for Excel (max 31 chars, no special chars)
    const sheetName = table.name.substring(0, 31).replace(/[:\\/?*\[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, 'inventory_optimization_template.xlsx');
};

// Import data from Excel file with proper type handling
export const importFromExcel = (
  file: File,
  tables: any[]
): Promise<Record<string, any[]>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const importedData: Record<string, any[]> = {};
        
        // Process each sheet
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false, // Keep values as strings to preserve formatting
            defval: '' // Default value for empty cells
          });
          
          if (jsonData.length > 1) { // At least header + 1 row
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];
            
            // Find matching table by name (handle sanitized names)
            const matchingTable = tables.find(t => {
              const sanitizedName = t.name.substring(0, 31).replace(/[:\\/?*\[\]]/g, '_');
              return t.name === sheetName || sanitizedName === sheetName;
            });
            
            if (matchingTable) {
              // Convert rows to objects with proper type handling
              const tableData = rows
                .filter(row => {
                  // Filter out completely empty rows
                  return row.some(cell => 
                    cell !== null && 
                    cell !== undefined && 
                    cell !== '' && 
                    String(cell).trim() !== ''
                  );
                })
                .map(row => {
                  const obj: any = {};
                  headers.forEach((header, index) => {
                    let value = row[index];
                    
                    // Handle different value types
                    if (value === undefined || value === null) {
                      value = '';
                    } else {
                      // Convert to string and trim
                      value = String(value).trim();
                      
                      // Handle numeric fields - keep as strings but ensure valid format
                      if (header.includes('Cost') || 
                          header.includes('Latitude') || 
                          header.includes('Longitude') ||
                          header.includes('Unit') ||
                          header.includes('Value') ||
                          header.includes('Time') ||
                          header.includes('Level') ||
                          header.includes('Quantity')) {
                        // Remove any non-numeric characters except dots, minus, and scientific notation
                        value = value.replace(/[^0-9.\-eE+]/g, '');
                      }
                      
                      // Handle dropdown values - ensure exact match
                      if (header === 'Status') {
                        // Normalize Status field
                        const statusLower = value.toLowerCase();
                        value = statusLower.includes('incl') ? 'Include' : 'Exclude';
                      }
                      
                      if (header.includes('UOM')) {
                        // Normalize UOM fields
                        value = value.toUpperCase();
                        // Map common variations
                        if (value === 'DAYS' || value === 'D') value = 'DAY';
                        if (value === 'HOURS' || value === 'H' || value === 'HR') value = 'HR';
                        if (value === 'EACH' || value === 'E') value = 'EA';
                        if (value === 'PALLET' || value === 'PALLETS') value = 'PLT';
                      }
                    }
                    
                    obj[header] = value;
                  });
                  return obj;
                });
              
              if (tableData.length > 0) {
                importedData[matchingTable.id] = tableData;
              }
            }
          }
        });
        
        resolve(importedData);
      } catch (error) {
        console.error('Excel import error:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

// Export all simulation results to Excel workbook
export const exportResultsToExcel = (
  simulationResults: any[],
  orderLogResults: any[],
  inventoryData: any[],
  replications: number
) => {
  const wb = XLSX.utils.book_new();

  // 1. Summary Results Sheet
  if (simulationResults.length > 0) {
    const summaryData = [
      ['Simulation Results Summary'],
      [`Total Scenarios: ${simulationResults.length}`, `Replications: ${replications}`],
      [],
      [
        'Sr No',
        'Scenario',
        'Cost Min',
        'Cost Max',
        'Cost Mean',
        'Cost SD',
        'Service Level Min',
        'Service Level Max',
        'Service Level Mean',
        'Service Level SD',
        'ELT SL Min',
        'ELT SL Max',
        'ELT SL Mean',
        'ELT SL SD',
      ],
    ];

    simulationResults.forEach(result => {
      summaryData.push([
        result.srNo,
        result.scenarioDescription,
        result.costMin,
        result.costMax,
        result.costMean,
        result.costSD,
        result.serviceLevelMin,
        result.serviceLevelMax,
        result.serviceLevelMean,
        result.serviceLevelSD,
        result.eltServiceLevelMin || 0,
        result.eltServiceLevelMax || 0,
        result.eltServiceLevelMean || 0,
        result.eltServiceLevelSD || 0,
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }

  // 2. Cost Breakdown Sheet
  if (simulationResults.length > 0 && simulationResults[0].costBreakdown) {
    const costData = [
      ['Cost Breakdown by Scenario'],
      [],
      [
        'Sr No',
        'Scenario',
        'Transportation',
        'Production',
        'Handling',
        'Inventory',
        'Ordering',
        'Total Cost',
      ],
    ];

    simulationResults.forEach(result => {
      if (result.costBreakdown) {
        costData.push([
          result.srNo,
          result.scenarioDescription,
          result.costBreakdown.transportation.toFixed(2),
          result.costBreakdown.production.toFixed(2),
          result.costBreakdown.handling.toFixed(2),
          result.costBreakdown.inventory.toFixed(2),
          result.costBreakdown.ordering.toFixed(2),
          result.costMean,
        ]);
      }
    });

    const wsCost = XLSX.utils.aoa_to_sheet(costData);
    wsCost['!cols'] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCost, 'Cost Breakdown');
  }

  // 3. Transportation Details Sheet
  if (simulationResults.length > 0 && simulationResults[0].transportationDetails) {
    const transData = [
      ['Transportation Cost Details'],
      [],
      [
        'Sr No',
        'Scenario',
        'Fixed Cost/Order',
        'Transport Unit Cost',
        'Repl. Unit Cost',
        'Total Orders',
        'Total Units',
        'Total Transport Cost',
      ],
    ];

    simulationResults.forEach(result => {
      if (result.transportationDetails) {
        transData.push([
          result.srNo,
          result.scenarioDescription,
          result.transportationDetails.fixedCostPerOrder.toFixed(2),
          result.transportationDetails.transportUnitCost.toFixed(2),
          result.transportationDetails.replenishmentUnitCost.toFixed(2),
          result.transportationDetails.totalOrders,
          result.transportationDetails.totalUnits,
          result.costBreakdown?.transportation.toFixed(2) || 0,
        ]);
      }
    });

    const wsTrans = XLSX.utils.aoa_to_sheet(transData);
    wsTrans['!cols'] = Array(8).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, wsTrans, 'Transportation');
  }

  // 4. Order Log Sheet
  if (orderLogResults.length > 0) {
    const orderData = [
      ['Customer Order Log'],
      [],
      [
        'Order ID',
        'Scenario',
        'Replication',
        'Customer',
        'Product',
        'Quantity',
        'Order Date',
        'Delivery Date',
        'Wait Time',
        'On Time',
      ],
    ];

    orderLogResults.forEach(order => {
      orderData.push([
        order.orderId,
        order.scenarioDescription || order.scenario,
        order.replication,
        order.customerName,
        order.productName,
        order.quantity,
        order.orderDate,
        order.deliveryDate || 'Pending',
        order.waitTime,
        order.onTime ? 'Yes' : 'No',
      ]);
    });

    const wsOrders = XLSX.utils.aoa_to_sheet(orderData);
    wsOrders['!cols'] = [
      { wch: 10 },
      { wch: 40 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Order Log');
  }

  // 5. Inventory Data Sheet
  if (inventoryData.length > 0) {
    const invData = [
      ['Inventory Over Time'],
      [],
      ['Day', 'Scenario', 'Replication', 'Site', 'Product', 'Inventory Level'],
    ];

    inventoryData.forEach(inv => {
      invData.push([
        inv.day,
        inv.scenarioDescription || inv.scenario,
        inv.replication,
        inv.site,
        inv.product,
        inv.inventory,
      ]);
    });

    const wsInv = XLSX.utils.aoa_to_sheet(invData);
    wsInv['!cols'] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory Data');
  }

  // Find best solution and add to summary
  if (simulationResults.length > 0) {
    const bestSolution = simulationResults.reduce((best, curr) => {
      const bestScore = best.serviceLevelMean - best.costMean / 10000;
      const currScore = curr.serviceLevelMean - curr.costMean / 10000;
      return currScore > bestScore ? curr : best;
    }, simulationResults[0]);

    const recData = [
      ['Recommended Solution'],
      [],
      ['Best Scenario:', bestSolution.scenarioDescription],
      ['Cost:', `$${bestSolution.costMean.toLocaleString()}`],
      ['Service Level:', `${bestSolution.serviceLevelMean}%`],
      ['ELT Service Level:', `${bestSolution.eltServiceLevelMean}%`],
      [],
      ['Ranking Criteria:', 'Highest Service Level with Lowest Cost'],
    ];

    const wsRec = XLSX.utils.aoa_to_sheet(recData);
    wsRec['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsRec, 'Recommendation');
  }

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `simulation_results_${timestamp}.xlsx`);
};
