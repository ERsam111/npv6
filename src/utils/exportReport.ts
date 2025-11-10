import * as XLSX from 'xlsx';
import { Customer, Product, DistributionCenter, OptimizationSettings, CostBreakdown } from '@/types/gfa';
import { haversineDistance } from './geoCalculations';

interface ExportData {
  customers: Customer[];
  products: Product[];
  dcs: DistributionCenter[];
  settings: OptimizationSettings;
  costBreakdown?: CostBreakdown;
  distanceRangeStep?: number;
}

export function exportReport(data: ExportData) {
  const { customers, products, dcs, settings, costBreakdown, distanceRangeStep = 100 } = data;
  
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Green Field Analysis Report'],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Optimization Settings'],
    ['Mode:', settings.mode === 'sites' ? 'Fixed Sites' : settings.mode === 'distance' ? 'Distance Coverage' : 'Cost Optimization'],
    ['Number of Sites:', settings.numDCs],
    ['Max Radius (km):', settings.maxRadius],
    ['Demand Coverage (%):', settings.demandPercentage],
    ['Site Capacity:', `${settings.dcCapacity} ${settings.capacityUnit}`],
    [''],
    ['Results Summary'],
    ['Total Customers:', customers.length],
    ['Total Products:', products.length],
    ['Distribution Centers:', dcs.length],
  ];

  if (costBreakdown) {
    summaryData.push(
      [''],
      ['Cost Breakdown'],
      ['Total Cost:', `$${costBreakdown.totalCost.toLocaleString()}`],
      ['Transportation Cost:', `$${costBreakdown.transportationCost.toLocaleString()}`],
      ['Facility Cost:', `$${costBreakdown.facilityCost.toLocaleString()}`],
      ['Number of Sites:', costBreakdown.numSites]
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Customer Data Sheet
  const customerData = [
    ['Customer Name', 'Product', 'City', 'Country', 'Latitude', 'Longitude', 'Demand', 'Unit', 'Assigned DC']
  ];

  customers.forEach(customer => {
    const assignedDC = dcs.findIndex(dc => 
      dc.assignedCustomers.some(c => c.id === customer.id)
    );
    customerData.push([
      customer.name,
      customer.product,
      customer.city,
      customer.country,
      customer.latitude.toString(),
      customer.longitude.toString(),
      customer.demand.toString(),
      customer.unitOfMeasure,
      assignedDC >= 0 ? `DC ${assignedDC + 1}` : 'Not Assigned'
    ]);
  });

  const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
  XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customers');

  // Distribution Centers Sheet
  if (dcs.length > 0) {
    const dcData = [
      ['DC ID', 'Latitude', 'Longitude', 'Total Demand', 'Number of Customers', 'Customer Names']
    ];

    dcs.forEach((dc, index) => {
      dcData.push([
        `DC ${index + 1}`,
        dc.latitude.toString(),
        dc.longitude.toString(),
        dc.totalDemand.toString(),
        dc.assignedCustomers.length.toString(),
        dc.assignedCustomers.map(c => c.name).join(', ')
      ]);
    });

    const dcSheet = XLSX.utils.aoa_to_sheet(dcData);
    XLSX.utils.book_append_sheet(workbook, dcSheet, 'Distribution Centers');
  }

  // Distance Analysis Sheet
  if (dcs.length > 0) {
    const distanceData = [
      ['Customer', 'Assigned DC', 'Distance (km)', 'Product', 'Demand', 'Unit']
    ];

    customers.forEach(customer => {
      const dcIndex = dcs.findIndex(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (dcIndex >= 0) {
        const dc = dcs[dcIndex];
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          dc.latitude,
          dc.longitude
        );
        
        distanceData.push([
          customer.name,
          `DC ${dcIndex + 1}`,
          distance.toFixed(2),
          customer.product,
          customer.demand.toString(),
          customer.unitOfMeasure
        ]);
      }
    });

    const distanceSheet = XLSX.utils.aoa_to_sheet(distanceData);
    XLSX.utils.book_append_sheet(workbook, distanceSheet, 'Distance Analysis');
  }

  // Profitability Analysis Sheet
  const hasRevenue = products.some(p => p.sellingPrice);
  if (hasRevenue && dcs.length > 0) {
    const profitData = [
      ['Customer', 'Product', 'Demand', 'Unit', 'Revenue', 'Transport Cost', 'Profit', 'Margin %']
    ];

    customers.forEach(customer => {
      const product = products.find(p => p.name === customer.product);
      const revenue = product?.sellingPrice ? customer.demand * product.sellingPrice : 0;
      
      let transportCost = 0;
      const assignedDC = dcs.find(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (assignedDC) {
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          assignedDC.latitude,
          assignedDC.longitude
        );
        const distanceInMiles = settings.distanceUnit === 'km' ? distance * 0.621371 : distance;
        transportCost = distanceInMiles * customer.demand * settings.transportationCostPerMilePerUnit;
      }
      
      const profit = revenue - transportCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      profitData.push([
        customer.name,
        customer.product,
        customer.demand.toString(),
        customer.unitOfMeasure,
        revenue.toFixed(2),
        transportCost.toFixed(2),
        profit.toFixed(2),
        margin.toFixed(2)
      ]);
    });

    const profitSheet = XLSX.utils.aoa_to_sheet(profitData);
    XLSX.utils.book_append_sheet(workbook, profitSheet, 'Profitability');
  }

  // Product Data Sheet
  if (products.length > 0) {
    const productData = [
      ['Product Name', 'Base Unit', 'Selling Price', 'Unit Conversions']
    ];

    products.forEach(product => {
      const conversions = product.unitConversions 
        ? Object.entries(product.unitConversions).map(([unit, factor]) => `${unit}: ${factor}`).join('; ')
        : 'None';
      
      productData.push([
        product.name,
        product.baseUnit,
        product.sellingPrice ? product.sellingPrice.toString() : 'Not set',
        conversions
      ]);
    });

    const productSheet = XLSX.utils.aoa_to_sheet(productData);
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Products');
  }

  // Demand by Product Sheet
  const demandByProduct: Record<string, { demand: number; unit: string; customers: number }> = {};
  customers.forEach(customer => {
    const key = `${customer.product}|${customer.unitOfMeasure}`;
    if (!demandByProduct[key]) {
      demandByProduct[key] = { demand: 0, unit: customer.unitOfMeasure, customers: 0 };
    }
    demandByProduct[key].demand += customer.demand;
    demandByProduct[key].customers += 1;
  });

  const demandProductData = [
    ['Product', 'Unit', 'Total Demand', 'Number of Customers']
  ];
  Object.keys(demandByProduct).forEach(key => {
    const [product, unit] = key.split('|');
    const data = demandByProduct[key];
    demandProductData.push([
      product,
      unit,
      data.demand.toFixed(2),
      data.customers.toString()
    ]);
  });

  const demandProductSheet = XLSX.utils.aoa_to_sheet(demandProductData);
  XLSX.utils.book_append_sheet(workbook, demandProductSheet, 'Demand by Product');

  // Demand by Country Sheet
  const demandByCountry: Record<string, { demand: number; customers: number }> = {};
  customers.forEach(customer => {
    if (!demandByCountry[customer.country]) {
      demandByCountry[customer.country] = { demand: 0, customers: 0 };
    }
    demandByCountry[customer.country].demand += customer.demand * customer.conversionFactor;
    demandByCountry[customer.country].customers += 1;
  });

  const demandCountryData = [
    ['Country', 'Standardized Demand (m³)', 'Number of Customers', 'Percentage']
  ];
  const totalStdDemand = Object.values(demandByCountry).reduce((sum, d) => sum + d.demand, 0);
  Object.keys(demandByCountry).sort().forEach(country => {
    const data = demandByCountry[country];
    const percentage = totalStdDemand > 0 ? (data.demand / totalStdDemand * 100) : 0;
    demandCountryData.push([
      country,
      data.demand.toFixed(2),
      data.customers.toString(),
      percentage.toFixed(2) + '%'
    ]);
  });

  const demandCountrySheet = XLSX.utils.aoa_to_sheet(demandCountryData);
  XLSX.utils.book_append_sheet(workbook, demandCountrySheet, 'Demand by Country');

  // Distance Distribution Sheet
  if (dcs.length > 0) {
    const rangeStep = distanceRangeStep;
    const rangesMap: Record<string, { customers: number; demand: number }> = {};
    
    customers.forEach(customer => {
      const dcIndex = dcs.findIndex(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (dcIndex >= 0) {
        const dc = dcs[dcIndex];
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          dc.latitude,
          dc.longitude
        );
        
        const rangeIndex = Math.floor(distance / rangeStep);
        const rangeStart = rangeIndex * rangeStep;
        const rangeEnd = rangeStart + rangeStep;
        const rangeKey = `${rangeStart}-${rangeEnd}`;
        
        if (!rangesMap[rangeKey]) {
          rangesMap[rangeKey] = { customers: 0, demand: 0 };
        }
        rangesMap[rangeKey].customers += 1;
        rangesMap[rangeKey].demand += customer.demand * customer.conversionFactor;
      }
    });

    const distDistData = [
      ['Distance Range (km)', 'Customers', 'Standardized Demand (m³)', 'Cumulative Customers', 'Cumulative Demand']
    ];

    let cumCustomers = 0;
    let cumDemand = 0;
    Object.keys(rangesMap).sort((a, b) => {
      const aStart = parseInt(a.split('-')[0]);
      const bStart = parseInt(b.split('-')[0]);
      return aStart - bStart;
    }).forEach(rangeKey => {
      const data = rangesMap[rangeKey];
      cumCustomers += data.customers;
      cumDemand += data.demand;
      distDistData.push([
        rangeKey,
        data.customers.toString(),
        data.demand.toFixed(2),
        cumCustomers.toString(),
        cumDemand.toFixed(2)
      ]);
    });

    const distDistSheet = XLSX.utils.aoa_to_sheet(distDistData);
    XLSX.utils.book_append_sheet(workbook, distDistSheet, 'Distance Distribution');
  }

  // Revenue Analysis Sheet
  if (products.some(p => p.sellingPrice)) {
    const revenueByProduct: Record<string, { revenue: number; transportCost: number; customers: number }> = {};
    
    customers.forEach(customer => {
      const product = products.find(p => p.name === customer.product);
      const revenue = product?.sellingPrice ? customer.demand * product.sellingPrice : 0;
      
      let transportCost = 0;
      const assignedDC = dcs.find(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (assignedDC) {
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          assignedDC.latitude,
          assignedDC.longitude
        );
        const distanceInMiles = settings.distanceUnit === 'km' ? distance * 0.621371 : distance;
        transportCost = distanceInMiles * customer.demand * settings.transportationCostPerMilePerUnit;
      }
      
      if (!revenueByProduct[customer.product]) {
        revenueByProduct[customer.product] = { revenue: 0, transportCost: 0, customers: 0 };
      }
      revenueByProduct[customer.product].revenue += revenue;
      revenueByProduct[customer.product].transportCost += transportCost;
      revenueByProduct[customer.product].customers += 1;
    });

    const revenueAnalysisData = [
      ['Product', 'Revenue', 'Transport Cost', 'Gross Profit', 'Margin %', 'Customers']
    ];
    
    Object.keys(revenueByProduct).sort().forEach(product => {
      const data = revenueByProduct[product];
      const profit = data.revenue - data.transportCost;
      const margin = data.revenue > 0 ? (profit / data.revenue * 100) : 0;
      
      revenueAnalysisData.push([
        product,
        data.revenue.toFixed(2),
        data.transportCost.toFixed(2),
        profit.toFixed(2),
        margin.toFixed(2) + '%',
        data.customers.toString()
      ]);
    });

    const revenueSheet = XLSX.utils.aoa_to_sheet(revenueAnalysisData);
    XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Analysis');
  }

  // Cost to Serve by Customer Sheet
  if (dcs.length > 0) {
    const costToServeData = [
      ['Customer', 'Product', 'Demand', 'Revenue', 'Transport Cost', 'Cost to Serve per Unit', 'Profit', 'Margin %']
    ];

    customers.forEach(customer => {
      const product = products.find(p => p.name === customer.product);
      const revenue = product?.sellingPrice ? customer.demand * product.sellingPrice : 0;
      
      let transportCost = 0;
      const assignedDC = dcs.find(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (assignedDC) {
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          assignedDC.latitude,
          assignedDC.longitude
        );
        const distanceInMiles = settings.distanceUnit === 'km' ? distance * 0.621371 : distance;
        transportCost = distanceInMiles * customer.demand * settings.transportationCostPerMilePerUnit;
      }
      
      const costPerUnit = customer.demand > 0 ? transportCost / customer.demand : 0;
      const profit = revenue - transportCost;
      const margin = revenue > 0 ? (profit / revenue * 100) : 0;
      
      costToServeData.push([
        customer.name,
        customer.product,
        customer.demand.toString(),
        revenue.toFixed(2),
        transportCost.toFixed(2),
        costPerUnit.toFixed(2),
        profit.toFixed(2),
        margin.toFixed(2) + '%'
      ]);
    });

    const costToServeSheet = XLSX.utils.aoa_to_sheet(costToServeData);
    XLSX.utils.book_append_sheet(workbook, costToServeSheet, 'Cost to Serve');
  }

  // Generate and download file
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `GFA_Complete_Report_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
