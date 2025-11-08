// Customer Table
export const customerColumns = [
  "Customer Name", "Status", "Address", "City", "Region", "Postal Code", "Country", 
  "Latitude", "Longitude", "Single Source", "Single Source Orders", "Single Source Line Items",
  "Allow Backorders", "Backorder Time Limit", "Backorder Time UOM", "Allow Partial Fill Orders",
  "Allow Partial Fill Line Items", "Allow Direct Ship", "Notes", "Queue Priority"
];

export const customerDataInitial = [
  { "Customer Name": "C1", "Status": "Include", "Address": "", "City": "Boston", "Region": "MA", "Postal Code": "", "Country": "", "Latitude": 42.315002, "Longitude": -71.009623, "Single Source": "", "Single Source Orders": "false", "Single Source Line Items": "false", "Allow Backorders": "true", "Backorder Time Limit": 7, "Backorder Time UOM": "DAY", "Allow Partial Fill Orders": "true", "Allow Partial Fill Line Items": "true", "Allow Direct Ship": "", "Notes": "a", "Queue Priority": "" },
];

// Facility Table
export const facilityColumns = [
  "Facility Name", "Status", "Type", "Facility Status", "Initial State", "Organization",
  "Address", "City", "Region", "Postal Code", "Country", "Latitude", "Longitude", "Fixed Startup Cost"
];

export const facilityDataInitial = [
  { "Facility Name": "DC1", "Status": "Include", "Facility Status": "Open", "Initial State": "Existing", "Type": "DC", "Organization": "Company A", "Address": "123 Main St", "City": "Chicago", "Region": "IL", "Postal Code": "60601", "Country": "USA", "Latitude": 41.506431, "Longitude": -87.596775, "Fixed Startup Cost": 5000 },
  { "Facility Name": "S1", "Status": "Include", "Facility Status": "Open", "Initial State": "Existing", "Type": "Factory", "Organization": "Company A", "Address": "456 Factory Rd", "City": "Saint Louis", "Region": "MO", "Postal Code": "63118", "Country": "USA", "Latitude": 38.591684, "Longitude": -90.231376, "Fixed Startup Cost": 10000 },
  { "Facility Name": "Supplier_1", "Status": "Include", "Facility Status": "Open", "Initial State": "Existing", "Type": "Supplier", "Organization": "Raw Material Co", "Address": "789 Supply Ave", "City": "Kansas City", "Region": "MO", "Postal Code": "64101", "Country": "USA", "Latitude": 39.099727, "Longitude": -94.578567, "Fixed Startup Cost": 0 },
];

// Product Table
export const productColumns = [
  "Product Name", "Status", "Product Type", "Unit Value", "Unit Value UOM", "Unit Price", "Unit Price UOM",
  "Unit Volume", "Unit Volume UOM", "Unit Weight", "Unit Weight UOM"
];

export const productDataInitial = [
  { "Product Name": "Product_1", "Status": "Include", "Product Type": "Finished Goods", "Unit Value": 50, "Unit Value UOM": "EA", "Unit Price": 60, "Unit Price UOM": "EA", "Unit Volume": 1, "Unit Volume UOM": "CFT", "Unit Weight": 1, "Unit Weight UOM": "LB" },
  { "Product Name": "Raw_Material_1", "Status": "Include", "Product Type": "Raw Material", "Unit Value": 20, "Unit Value UOM": "EA", "Unit Price": 25, "Unit Price UOM": "EA", "Unit Volume": 0.5, "Unit Volume UOM": "CFT", "Unit Weight": 0.5, "Unit Weight UOM": "LB" },
  { "Product Name": "Raw_Material_2", "Status": "Include", "Product Type": "Raw Material", "Unit Value": 15, "Unit Value UOM": "EA", "Unit Price": 18, "Unit Price UOM": "EA", "Unit Volume": 0.3, "Unit Volume UOM": "CFT", "Unit Weight": 0.3, "Unit Weight UOM": "LB" },
];

// Customer Fulfillment Policy
export const customerFulfillmentColumns = [
  "Customer Name", "Product Name", "Source Name", "Optimization Policy", "Optimization Policy Value",
  "Simulation Policy", "Simulation Policy Value", "Status", "Unit Cost"
];

export const customerFulfillmentDataInitial = [
  { "Customer Name": "C1", "Product Name": "Product_1", "Source Name": "DC1", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 0.5 },
];

// Replenishment Policies
export const replenishmentColumns = [
  "Facility Name", "Product Name", "Source Name", "Optimization Policy", "Optimization Policy Value",
  "Simulation Policy", "Simulation Policy Value", "Status", "Unit Cost"
];

export const replenishmentDataInitial = [
  { "Facility Name": "DC1", "Product Name": "Product_1", "Source Name": "S1", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 1.0 },
  { "Facility Name": "S1", "Product Name": "Raw_Material_1", "Source Name": "Supplier_1", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 0.5 },
  { "Facility Name": "S1", "Product Name": "Raw_Material_2", "Source Name": "Supplier_1", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 0.3 },
];

// Production Policies
export const productionColumns = [
  "Facility Name", "Product Name", "Production Policy", "Status", "Production Rate",
  "Rate Quantity UOM", "Rate Time UOM", "Unit Cost", "BOM"
];

export const productionDataInitial = [
  { "Facility Name": "S1", "Product Name": "Product_1", "Production Policy": "Make By Demand", "Status": "Include", "Production Rate": 100, "Rate Quantity UOM": "EA", "Rate Time UOM": "DAY", "Unit Cost": 10, "BOM": "BOM_1" },
];

// Inventory Policy
export const inventoryPolicyColumns = [
  "Facility Name", "Product Name", "Simulation Policy", "Simulation Policy Value 1", "Simulation Policy Value 1 UOM",
  "Simulation Policy Value 2", "Simulation Policy Value 2 UOM", "Initial Inventory", "Stocking Site", "Status"
];

export const inventoryPolicyDataInitial = [
  // Finished Goods at Factory
  { "Facility Name": "S1", "Product Name": "Product_1", "Simulation Policy": "(s,S)", "Simulation Policy Value 1": 50, "Simulation Policy Value 1 UOM": "EA", "Simulation Policy Value 2": 200, "Simulation Policy Value 2 UOM": "EA", "Initial Inventory": 100, "Stocking Site": "true", "Status": "Include" },
  
  // Raw Materials at Factory
  { "Facility Name": "S1", "Product Name": "Raw_Material_1", "Simulation Policy": "(s,S)", "Simulation Policy Value 1": 100, "Simulation Policy Value 1 UOM": "EA", "Simulation Policy Value 2": 500, "Simulation Policy Value 2 UOM": "EA", "Initial Inventory": 300, "Stocking Site": "true", "Status": "Include" },
  { "Facility Name": "S1", "Product Name": "Raw_Material_2", "Simulation Policy": "(s,S)", "Simulation Policy Value 1": 80, "Simulation Policy Value 1 UOM": "EA", "Simulation Policy Value 2": 400, "Simulation Policy Value 2 UOM": "EA", "Initial Inventory": 250, "Stocking Site": "true", "Status": "Include" },
  
  // Finished Goods at DC
  { "Facility Name": "DC1", "Product Name": "Product_1", "Simulation Policy": "(s,S)", "Simulation Policy Value 1": 150, "Simulation Policy Value 1 UOM": "EA", "Simulation Policy Value 2": 600, "Simulation Policy Value 2 UOM": "EA", "Initial Inventory": 400, "Stocking Site": "true", "Status": "Include" },
  
  // Raw Materials at Supplier (Unlimited)
  { "Facility Name": "Supplier_1", "Product Name": "Raw_Material_1", "Simulation Policy": "(s,S)", "Simulation Policy Value 1": 0, "Simulation Policy Value 1 UOM": "EA", "Simulation Policy Value 2": 999999, "Simulation Policy Value 2 UOM": "EA", "Initial Inventory": 999999, "Stocking Site": "true", "Status": "Include" },
  { "Facility Name": "Supplier_1", "Product Name": "Raw_Material_2", "Simulation Policy": "(s,S)", "Simulation Policy Value 1": 0, "Simulation Policy Value 1 UOM": "EA", "Simulation Policy Value 2": 999999, "Simulation Policy Value 2 UOM": "EA", "Initial Inventory": 999999, "Stocking Site": "true", "Status": "Include" },
];

// Warehousing Policies
export const warehousingColumns = [
  "Facility Name", "Product Name", "Status", "Inbound Handling Cost", "Inbound Handling Cost UOM",
  "Stocking Unit Cost", "Stocking Unit Cost UOM", "Stocking Process Name", "Destocking Unit Cost",
  "Destocking Unit Cost UOM", "Destocking Process Name", "Outbound Handling Cost"
];

export const warehousingDataInitial = [
  // Factory - Finished Goods
  { "Facility Name": "S1", "Product Name": "Product_1", "Status": "Include", "Inbound Handling Cost": 0.5, "Inbound Handling Cost UOM": "USD/EA", "Stocking Unit Cost": 0.5, "Stocking Unit Cost UOM": "EA/DAY", "Stocking Process Name": "Standard Storage", "Destocking Unit Cost": 0.2, "Destocking Unit Cost UOM": "USD/EA", "Destocking Process Name": "Standard Retrieval", "Outbound Handling Cost": 2 },
  
  // Factory - Raw Materials
  { "Facility Name": "S1", "Product Name": "Raw_Material_1", "Status": "Include", "Inbound Handling Cost": 0.3, "Inbound Handling Cost UOM": "USD/EA", "Stocking Unit Cost": 0.1, "Stocking Unit Cost UOM": "EA/DAY", "Stocking Process Name": "Raw Material Storage", "Destocking Unit Cost": 0.1, "Destocking Unit Cost UOM": "USD/EA", "Destocking Process Name": "Raw Material Retrieval", "Outbound Handling Cost": 0.5 },
  { "Facility Name": "S1", "Product Name": "Raw_Material_2", "Status": "Include", "Inbound Handling Cost": 0.2, "Inbound Handling Cost UOM": "USD/EA", "Stocking Unit Cost": 0.08, "Stocking Unit Cost UOM": "EA/DAY", "Stocking Process Name": "Raw Material Storage", "Destocking Unit Cost": 0.08, "Destocking Unit Cost UOM": "USD/EA", "Destocking Process Name": "Raw Material Retrieval", "Outbound Handling Cost": 0.4 },
  
  // DC - Finished Goods
  { "Facility Name": "DC1", "Product Name": "Product_1", "Status": "Include", "Inbound Handling Cost": 1, "Inbound Handling Cost UOM": "USD/EA", "Stocking Unit Cost": 0.3, "Stocking Unit Cost UOM": "EA/DAY", "Stocking Process Name": "DC Storage", "Destocking Unit Cost": 0.15, "Destocking Unit Cost UOM": "USD/EA", "Destocking Process Name": "DC Picking", "Outbound Handling Cost": 1.5 },
  
  // Supplier - Raw Materials (minimal costs)
  { "Facility Name": "Supplier_1", "Product Name": "Raw_Material_1", "Status": "Include", "Inbound Handling Cost": 0, "Inbound Handling Cost UOM": "USD/EA", "Stocking Unit Cost": 0.01, "Stocking Unit Cost UOM": "EA/DAY", "Stocking Process Name": "Supplier Storage", "Destocking Unit Cost": 0, "Destocking Unit Cost UOM": "USD/EA", "Destocking Process Name": "Supplier Retrieval", "Outbound Handling Cost": 0.3 },
  { "Facility Name": "Supplier_1", "Product Name": "Raw_Material_2", "Status": "Include", "Inbound Handling Cost": 0, "Inbound Handling Cost UOM": "USD/EA", "Stocking Unit Cost": 0.01, "Stocking Unit Cost UOM": "EA/DAY", "Stocking Process Name": "Supplier Storage", "Destocking Unit Cost": 0, "Destocking Unit Cost UOM": "USD/EA", "Destocking Process Name": "Supplier Retrieval", "Outbound Handling Cost": 0.25 },
];

// Order Fulfillment Policies
export const orderFulfillmentColumns = [
  "Facility Name", "Allow Partial Fill Orders", "Allow Partial Fill Line Items", "Review Period First Time",
  "Review Period", "Review Period UOM", "Queueing Priority Logic", "Status", "Notes", "Time In Queue Cost", "Time In Queue Cost UOM"
];

export const orderFulfillmentDataInitial = [
  { "Facility Name": "DC1", "Allow Partial Fill Orders": "true", "Allow Partial Fill Line Items": "true", "Review Period First Time": 1, "Review Period": 1, "Review Period UOM": "DAY", "Queueing Priority Logic": "FIFO", "Status": "Include", "Notes": "Distribution Center", "Time In Queue Cost": 5, "Time In Queue Cost UOM": "USD/DAY" },
  { "Facility Name": "S1", "Allow Partial Fill Orders": "true", "Allow Partial Fill Line Items": "true", "Review Period First Time": 1, "Review Period": 1, "Review Period UOM": "DAY", "Queueing Priority Logic": "FIFO", "Status": "Include", "Notes": "Factory", "Time In Queue Cost": 3, "Time In Queue Cost UOM": "USD/DAY" },
  { "Facility Name": "Supplier_1", "Allow Partial Fill Orders": "true", "Allow Partial Fill Line Items": "true", "Review Period First Time": 1, "Review Period": 1, "Review Period UOM": "DAY", "Queueing Priority Logic": "FIFO", "Status": "Include", "Notes": "Raw Material Supplier", "Time In Queue Cost": 1, "Time In Queue Cost UOM": "USD/DAY" },
];

// Transportation Policy
export const transportationColumns = [
  "Origin Name", "Destination Name", "Product Name", "Mode Name", "Optimization Policy", "Optimization Policy Value",
  "Simulation Policy", "Simulation Policy Value", "Status", "Unit Cost", "Unit Cost UOM", "Product UOM", "Fixed Cost", "Fixed Cost UOM",
  "Fixed Cost Rule", "Average Shipment Size", "Average Shipment Size UOM", "Transport Distance",
  "Transport Distance UOM", "Transport Time Distribution", "Transport Time Distribution UOM"
];

export const transportationDataInitial = [
  // Factory to DC (Finished Goods)
  { "Origin Name": "S1", "Destination Name": "DC1", "Product Name": "Product_1", "Mode Name": "Truck", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 0.5, "Unit Cost UOM": "USD", "Product UOM": "EA", "Fixed Cost": 200, "Fixed Cost UOM": "USD", "Fixed Cost Rule": "Per Shipment", "Average Shipment Size": 100, "Average Shipment Size UOM": "EA", "Transport Distance": 286.51, "Transport Distance UOM": "MI", "Transport Time Distribution": "Constant(2)", "Transport Time Distribution UOM": "DAY" },
  
  // DC to Customer (Finished Goods)
  { "Origin Name": "DC1", "Destination Name": "C1", "Product Name": "Product_1", "Mode Name": "Truck", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 0.3, "Unit Cost UOM": "USD", "Product UOM": "EA", "Fixed Cost": 150, "Fixed Cost UOM": "USD", "Fixed Cost Rule": "Per Shipment", "Average Shipment Size": 50, "Average Shipment Size UOM": "EA", "Transport Distance": 900, "Transport Distance UOM": "MI", "Transport Time Distribution": "Constant(3)", "Transport Time Distribution UOM": "DAY" },
  
  // Supplier to Factory (Raw Material 1)
  { "Origin Name": "Supplier_1", "Destination Name": "S1", "Product Name": "Raw_Material_1", "Mode Name": "Truck", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 0.2, "Unit Cost UOM": "USD", "Product UOM": "EA", "Fixed Cost": 100, "Fixed Cost UOM": "USD", "Fixed Cost Rule": "Per Shipment", "Average Shipment Size": 200, "Average Shipment Size UOM": "EA", "Transport Distance": 150, "Transport Distance UOM": "MI", "Transport Time Distribution": "Constant(1)", "Transport Time Distribution UOM": "DAY" },
  
  // Supplier to Factory (Raw Material 2)
  { "Origin Name": "Supplier_1", "Destination Name": "S1", "Product Name": "Raw_Material_2", "Mode Name": "Truck", "Optimization Policy": "Minimize Cost", "Optimization Policy Value": 1, "Simulation Policy": "By Preference", "Simulation Policy Value": 1, "Status": "Include", "Unit Cost": 0.15, "Unit Cost UOM": "USD", "Product UOM": "EA", "Fixed Cost": 100, "Fixed Cost UOM": "USD", "Fixed Cost Rule": "Per Shipment", "Average Shipment Size": 200, "Average Shipment Size UOM": "EA", "Transport Distance": 150, "Transport Distance UOM": "MI", "Transport Time Distribution": "Constant(1)", "Transport Time Distribution UOM": "DAY" },
];

// Transportation Mode
export const transportationModeColumns = [
  "Mode Name", "Behavior Rule", "Vehicle Capacity", "Vehicle Capacity Unit", "Asset Name", "Status"
];

export const transportationModeDataInitial = [
  { "Mode Name": "Truck", "Behavior Rule": "FTL", "Vehicle Capacity": 1000, "Vehicle Capacity Unit": "EA", "Asset Name": "Standard Truck Fleet", "Status": "Include" },
  { "Mode Name": "LTL Truck", "Behavior Rule": "LTL", "Vehicle Capacity": 500, "Vehicle Capacity Unit": "EA", "Asset Name": "LTL Fleet", "Status": "Include" },
];

// BOM (Bill of Materials)
export const bomColumns = [
  "BOM ID", "End Product", "End Product Quantity", "Raw Materials"
];

export const bomDataInitial = [
  { "BOM ID": "BOM_1", "End Product": "Product_1", "End Product Quantity": 1, "Raw Materials": "Raw_Material_1(2), Raw_Material_2(1)" },
];

// Customer Order Profiles
export const customerOrderColumns = [
  "Order ID", "Customer Name", "Product Name", "Status", "Quantity", "Quantity UOM",
  "Service Level", "Service Level UOM", "Start Date", "Time Between Orders", "Time Between Orders UOM", "End Date", "Notes"
];

export const customerOrderDataInitial = [
  { "Order ID": 1, "Customer Name": "C1", "Product Name": "Product_1", "Status": "Include", "Quantity": "Uniform(100, 200)", "Quantity UOM": "EA", "Service Level": 14, "Service Level UOM": "DAY", "Start Date": "01/02/2021 00:00:00", "Time Between Orders": "Constant(7)", "Time Between Orders UOM": "DAY", "End Date": "12/31/2021 23:59:59", "Notes": "Weekly orders from main customer" },
];

// Groups
export const groupColumns = ["Group Name", "Group Type", "Member Name", "Status", "Notes"];

export const groupDataInitial = [
  { "Group Name": "All_Products", "Group Type": "Products", "Member Name": "Product_1", "Status": "Include", "Notes": "Finished goods group" },
  { "Group Name": "All_Raw_Materials", "Group Type": "Products", "Member Name": "Raw_Material_1", "Status": "Include", "Notes": "Raw materials group" },
  { "Group Name": "All_Raw_Materials", "Group Type": "Products", "Member Name": "Raw_Material_2", "Status": "Include", "Notes": "Raw materials group" },
  { "Group Name": "All_Facilities", "Group Type": "Facilities", "Member Name": "DC1", "Status": "Include", "Notes": "All facilities group" },
  { "Group Name": "All_Facilities", "Group Type": "Facilities", "Member Name": "S1", "Status": "Include", "Notes": "All facilities group" },
  { "Group Name": "All_Facilities", "Group Type": "Facilities", "Member Name": "Supplier_1", "Status": "Include", "Notes": "All facilities group" },
];

// Unit of Measure
export const unitOfMeasureColumns = ["Unit of Measure Name", "Type", "Symbol", "Ratio", "Notes"];

export const unitOfMeasureDataInitial = [
  { "Unit of Measure Name": "Each", "Type": "Quantity", "Symbol": "EA", "Ratio": 1, "Notes": "" },
  { "Unit of Measure Name": "Pallet", "Type": "Quantity", "Symbol": "PLT", "Ratio": 50, "Notes": "" },
  { "Unit of Measure Name": "Pound", "Type": "Weight", "Symbol": "LB", "Ratio": 1, "Notes": "" },
  { "Unit of Measure Name": "Day", "Type": "Time", "Symbol": "DAY", "Ratio": 24, "Notes": "" },
  { "Unit of Measure Name": "Hour", "Type": "Time", "Symbol": "HR", "Ratio": 1, "Notes": "" },
  { "Unit of Measure Name": "Cubic Foot", "Type": "Volume", "Symbol": "CFT", "Ratio": 1, "Notes": "" },
  { "Unit of Measure Name": "Mile", "Type": "Distance", "Symbol": "MI", "Ratio": 1, "Notes": "" },
];

// Input Factors (Model Settings)
export const inputFactorsColumns = [
  "Facility Name", "Product", "Simulation Policy", "Parameter Setup"
];

export const inputFactorsDataInitial = [
  { 
    "Facility Name": "DC1", 
    "Product": "Product_1", 
    "Simulation Policy": "(s,S)", 
    "Parameter Setup": JSON.stringify([
      { name: "s", min: 100, max: 200, step: 50 },
      { name: "S", min: 500, max: 800, step: 100 }
    ])
  },
];

