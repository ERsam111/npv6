import { useState, useMemo, useEffect } from "react";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { EditableTable } from "../components/EditableTable";
import { Play, Database, BarChart3, Network, TrendingUp, ClipboardList, Download, FileSpreadsheet, Upload } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { NetworkMap } from "../components/NetworkMap";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import { TimeComponentInfo } from "../components/TimeComponentInfo";
import { CostBreakdownAccordion } from "../components/CostBreakdownAccordion";
import { InventoryOverTimeChart } from "../components/InventoryOverTimeChart";
import { Progress } from "../components/ui/progress";
import {
  customerColumns, customerDataInitial,
  facilityColumns, facilityDataInitial,
  productColumns, productDataInitial,
  customerFulfillmentColumns, customerFulfillmentDataInitial,
  replenishmentColumns, replenishmentDataInitial,
  productionColumns, productionDataInitial,
  inventoryPolicyColumns, inventoryPolicyDataInitial,
  warehousingColumns, warehousingDataInitial,
  orderFulfillmentColumns, orderFulfillmentDataInitial,
  transportationColumns, transportationDataInitial,
  transportationModeColumns, transportationModeDataInitial,
  customerOrderColumns, customerOrderDataInitial,
  groupColumns, groupDataInitial,
  unitOfMeasureColumns, unitOfMeasureDataInitial,
  inputFactorsColumns, inputFactorsDataInitial,
  bomColumns, bomDataInitial,
} from "../data/allTables";
import { downloadTemplate, exportResultsToExcel, importFromExcel } from "../utils/excelExport";
import { compressData, decompressData, formatBytes } from "../utils/dataCompression";

const Index = ({ currentScenario, updateScenario, saveScenarioOutput, saveScenarioInput, loadScenarioOutput }: any) => {
  const [replications, setReplications] = useState(10);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [orderLogResults, setOrderLogResults] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [productionLogResults, setProductionLogResults] = useState<any[]>([]);
  const [productFlowLogResults, setProductFlowLogResults] = useState<any[]>([]);
  const [tripLogResults, setTripLogResults] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("customers");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("input");
  
  // Filters for inventory graph and order log
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedScenario, setSelectedScenario] = useState<string>("all");
  const [selectedReplication, setSelectedReplication] = useState<string>("all");
  const [selectedOrderLogScenario, setSelectedOrderLogScenario] = useState<string>("all");
  const [selectedProductionScenario, setSelectedProductionScenario] = useState<string>("all");
  const [selectedProductFlowScenario, setSelectedProductFlowScenario] = useState<string>("all");
  const [selectedTripScenario, setSelectedTripScenario] = useState<string>("all");

  // Input tables state
  const [customerData, setCustomerData] = useState(customerDataInitial);
  const [facilityData, setFacilityData] = useState(facilityDataInitial);
  const [productData, setProductData] = useState(productDataInitial);
  const [customerFulfillmentData, setCustomerFulfillmentData] = useState(customerFulfillmentDataInitial);
  const [replenishmentData, setReplenishmentData] = useState(replenishmentDataInitial);
  const [productionData, setProductionData] = useState(productionDataInitial);
  const [inventoryPolicyData, setInventoryPolicyData] = useState(inventoryPolicyDataInitial);
  const [warehousingData, setWarehousingData] = useState(warehousingDataInitial);
  const [orderFulfillmentData, setOrderFulfillmentData] = useState(orderFulfillmentDataInitial);
  const [transportationData, setTransportationData] = useState(transportationDataInitial);
  const [transportationModeData, setTransportationModeData] = useState(transportationModeDataInitial);
  const [customerOrderData, setCustomerOrderData] = useState(customerOrderDataInitial);
  const [groupData, setGroupData] = useState(groupDataInitial);
  const [unitOfMeasureData, setUnitOfMeasureData] = useState(unitOfMeasureDataInitial);
  const [inputFactorsData, setInputFactorsData] = useState(inputFactorsDataInitial);
  const [bomData, setBomData] = useState(bomDataInitial);

  // Dropdown value sources
  const customerNames = Array.from(new Set(customerData.map((c: any) => c["Customer Name"])));
  const facilityNames = Array.from(new Set(facilityData.map((f: any) => f["Facility Name"])));
  const productNames = Array.from(new Set(productData.map((p: any) => p["Product Name"])));

  // Load saved scenario data when scenario changes
  useEffect(() => {
    const loadScenarioData = async () => {
      if (currentScenario && loadScenarioOutput) {
        const startLoadTime = performance.now();
        toast.info("Loading saved results...", { duration: 60000 });
        
        try {
          const savedData = await loadScenarioOutput(currentScenario.id);
          
          if (savedData) {
            // Check if data is compressed
            let data = savedData;
            if (savedData.isCompressed && savedData.compressed) {
              const compressedSize = new Blob([savedData.compressed]).size;
              toast.info(`Decompressing data (${formatBytes(compressedSize)})...`);
              
              data = decompressData(savedData.compressed);
              const loadTime = ((performance.now() - startLoadTime) / 1000).toFixed(2);
              toast.success(`Results loaded in ${loadTime}s`);
            }
            
            if (data?.scenarioResults || data?.orderLogs) {
              // Load existing results
              setSimulationResults(data.scenarioResults || []);
              setOrderLogResults(data.orderLogs || []);
              setInventoryData(data.inventoryData || []);
              setProductionLogResults(data.productionLogs || []);
              setProductFlowLogResults(data.productFlowLogs || []);
              setTripLogResults(data.tripLogs || []);
              setSimulationProgress(0);
              setIsSimulating(false);
              setActiveTab("results");
              console.log("Loaded scenario results:", data.scenarioResults?.length || 0);
            } else {
              // Clear results for new scenario
              setSimulationResults([]);
              setOrderLogResults([]);
              setInventoryData([]);
              setProductionLogResults([]);
              setProductFlowLogResults([]);
              setTripLogResults([]);
              setSimulationProgress(0);
              setIsSimulating(false);
              setActiveTab("input");
              console.log("No results for this scenario");
            }
          } else {
            // Clear results for new scenario
            setSimulationResults([]);
            setOrderLogResults([]);
            setInventoryData([]);
            setProductionLogResults([]);
            setProductFlowLogResults([]);
            setTripLogResults([]);
            setSimulationProgress(0);
            setIsSimulating(false);
            setActiveTab("input");
          }
        } catch (error) {
          console.error("Error loading scenario data:", error);
          toast.error("Failed to load results", {
            description: error instanceof Error ? error.message : "Unknown error"
          });
          // Clear on error
          setSimulationResults([]);
          setOrderLogResults([]);
          setInventoryData([]);
          setProductionLogResults([]);
          setProductFlowLogResults([]);
          setTripLogResults([]);
          setSimulationProgress(0);
          setIsSimulating(false);
          setActiveTab("input");
        }
      } else {
        // Clear when no scenario is selected
        setSimulationResults([]);
        setOrderLogResults([]);
        setInventoryData([]);
        setProductionLogResults([]);
        setProductFlowLogResults([]);
        setTripLogResults([]);
        setSimulationProgress(0);
        setIsSimulating(false);
      }
    };
    
    loadScenarioData();
  }, [currentScenario?.id]);

  const tables = [
    { 
      id: "customers", 
      name: "Customer Data", 
      columns: customerColumns, 
      data: customerData, 
      setData: setCustomerData, 
      description: "Customer locations and order configurations",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Backorder Time UOM": ["DAY", "HR"]
      }
    },
    { 
      id: "facilities", 
      name: "Facility Data", 
      columns: facilityColumns, 
      data: facilityData, 
      setData: setFacilityData, 
      description: "Distribution centers and manufacturing facilities",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Type": ["DC", "Factory", "Supplier"]
      }
    },
    { 
      id: "products", 
      name: "Product Data", 
      columns: productColumns, 
      data: productData, 
      setData: setProductData, 
      description: "Product specifications and pricing",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Unit Value UOM": ["USD"],
        "Unit Price UOM": ["USD"],
        "Unit Volume UOM": ["CFT"],
        "Unit Weight UOM": ["LB"]
      }
    },
    { 
      id: "customer-fulfillment", 
      name: "Customer Fulfillment Policy", 
      columns: customerFulfillmentColumns, 
      data: customerFulfillmentData, 
      setData: setCustomerFulfillmentData, 
      description: "Links customers to facilities with preference rankings",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Customer Name": customerNames,
        "Product Name": productNames,
        "Source Name": facilityNames
      }
    },
    { 
      id: "replenishment", 
      name: "Replenishment Policies", 
      columns: replenishmentColumns, 
      data: replenishmentData, 
      setData: setReplenishmentData, 
      description: "How DCs are replenished from manufacturers",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Facility Name": facilityNames,
        "Product Name": [...productNames, "All_Products"],
        "Source Name": facilityNames
      }
    },
    { 
      id: "production", 
      name: "Production Policies", 
      columns: productionColumns, 
      data: productionData, 
      setData: setProductionData, 
      description: "Production rates at manufacturing facilities",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Facility Name": facilityNames.filter(name => {
          const facility = facilityData.find(f => f["Facility Name"] === name);
          return facility?.Type === "Factory";
        }),
        "Product Name": productNames,
        "Production Policy": ["Continuous Production", "Make By Demand"],
        "Simulation Policy": ["Continuous Production", "Make By Demand"],
        "Rate Quantity UOM": ["EA", "PLT"],
        "Rate Time UOM": ["DAY", "HR"]
      }
    },
    { 
      id: "inventory", 
      name: "Inventory Policies", 
      columns: inventoryPolicyColumns, 
      data: inventoryPolicyData, 
      setData: setInventoryPolicyData, 
      description: "(s,S) and (R,Q) inventory control policies",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Facility Name": facilityNames,
        "Product Name": productNames,
        "Simulation Policy": ["(s,S)", "(R,Q)", "Unlimited", "None"],
        "Simulation Policy Value 1 UOM": ["EA", "PLT"],
        "Simulation Policy Value 2 UOM": ["EA", "PLT"]
      }
    },
    { 
      id: "warehousing", 
      name: "Warehousing Policies", 
      columns: warehousingColumns, 
      data: warehousingData, 
      setData: setWarehousingData, 
      description: "Inbound/outbound handling costs",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Facility Name": facilityNames,
        "Product Name": productNames,
        "Inbound Handling Cost UOM": ["USD"],
        "Stocking Unit Cost UOM": ["USD"],
        "Destocking Unit Cost UOM": ["USD"]
      }
    },
    { 
      id: "order-fulfillment", 
      name: "Order Fulfillment Policies", 
      columns: orderFulfillmentColumns, 
      data: orderFulfillmentData, 
      setData: setOrderFulfillmentData, 
      description: "Partial fill and review period settings",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Facility Name": facilityNames,
        "Review Period UOM": ["DAY", "HR"],
        "Time In Queue Cost UOM": ["USD"]
      }
    },
    { 
      id: "transportation", 
      name: "Transportation Policy", 
      columns: transportationColumns, 
      data: transportationData, 
      setData: setTransportationData, 
      description: "Shipping routes, costs, and times with distribution-based lead times",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Origin Name": facilityNames,
        "Destination Name": [...facilityNames, ...customerNames],
        "Product Name": productNames,
        "Unit Cost UOM": ["USD"],
        "Average Shipment Size UOM": ["EA", "PLT"],
        "Transport Distance UOM": ["MI"],
        "Transport Time Distribution": [
          "Constant(value)",
          "Normal(mean, std)",
          "Uniform(min, max)",
          "Triangular(min, mode, max)"
        ],
        "Transport Time Distribution UOM": ["DAY", "HR", "MIN"]
      }
    },
    { 
      id: "transportation-mode", 
      name: "Transportation Mode", 
      columns: transportationModeColumns, 
      data: transportationModeData, 
      setData: setTransportationModeData, 
      description: "Shipping modes (FTL/LTL) with vehicle capacity",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Behavior Rule": ["FTL", "LTL"],
        "Vehicle Capacity Unit": ["EA", "PLT", "LB", "CFT"],
        "Unit Cost UOM": ["USD"]
      }
    },
    { 
      id: "customer-orders", 
      name: "Customer Order Profiles", 
      columns: customerOrderColumns, 
      data: customerOrderData, 
      setData: setCustomerOrderData, 
      description: "Demand patterns and service levels",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Customer Name": customerNames,
        "Product Name": productNames,
        "Quantity": [
          "Normal(mean, std)",
          "Uniform(min, max)",
          "Exponential(lambda)",
          "Poisson(lambda)",
          "Lognormal(mean, std)",
          "Gamma(shape, scale)",
          "Weibull(shape, scale)",
          "Triangular(min, mode, max)",
          "Beta(alpha, beta)",
          "Constant(value)"
        ],
        "Quantity UOM": ["EA", "PLT"],
        "Service Level UOM": ["DAY", "HR"],
        "Time Between Orders": [
          "Normal(mean, std)",
          "Uniform(min, max)",
          "Exponential(lambda)",
          "Poisson(lambda)",
          "Lognormal(mean, std)",
          "Gamma(shape, scale)",
          "Weibull(shape, scale)",
          "Triangular(min, mode, max)",
          "Beta(alpha, beta)",
          "Constant(value)"
        ],
        "Time Between Orders UOM": ["DAY", "HR"]
      }
    },
    { 
      id: "bom", 
      name: "Bill of Materials (BOM)", 
      columns: bomColumns, 
      data: bomData, 
      setData: setBomData, 
      description: "Raw material requirements for finished goods production",
      dropdownOptions: { 
        "End Product": productNames,
        "Raw Material": productNames
      }
    },
    { 
      id: "groups", 
      name: "Groups", 
      columns: groupColumns, 
      data: groupData, 
      setData: setGroupData, 
      description: "Product groupings for policies",
      dropdownOptions: { 
        "Status": ["Include", "Exclude"],
        "Member Name": productNames
      }
    },
    { 
      id: "uom", 
      name: "Unit of Measure", 
      columns: unitOfMeasureColumns, 
      data: unitOfMeasureData, 
      setData: setUnitOfMeasureData, 
      description: "Unit definitions and conversions",
      dropdownOptions: { "Status": ["Include", "Exclude"] }
    },
    { 
      id: "input-factors", 
      name: "Input Factors", 
      columns: inputFactorsColumns, 
      data: inputFactorsData, 
      setData: setInputFactorsData, 
      description: "Simulation configuration: Define ranges for inventory policy parameters",
      dropdownOptions: { 
        "Facility Name": facilityNames,
        "Product": productNames
      },
      inventoryPolicyData: inventoryPolicyData
    },
  ];

  const currentTable = tables.find(t => t.id === selectedTable);

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await importFromExcel(file, tables);
      
      // Update all tables with imported data
      let importCount = 0;
      Object.entries(importedData).forEach(([tableId, data]) => {
        const table = tables.find(t => t.id === tableId);
        if (table && data.length > 0) {
          table.setData(data);
          importCount++;
        }
      });

      if (importCount > 0) {
        toast.success(`Successfully imported data from ${importCount} table(s)!`);
      } else {
        toast.warning('No matching tables found in the Excel file.');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import Excel file. Please check the file format.');
    }
    
    // Reset input
    event.target.value = '';
  };

  // Calculate total scenarios based on input factors
  const totalScenarios = useMemo(() => {
    if (inputFactorsData.length === 0) return 1;
    
    // Group by facility-product to calculate combinations per group
    const factorGroups: Record<string, any> = {};
    
    for (const factor of inputFactorsData) {
      const facilityName = factor["Facility Name"];
      const productName = factor["Product"];
      const parameterSetup = factor["Parameter Setup"];
      
      if (!facilityName || !productName || !parameterSetup) continue;
      
      const key = `${facilityName}|${productName}`;
      
      try {
        const config = JSON.parse(parameterSetup);
        const sCfg = config.find((p: any) => p.name === "s");
        const SCfg = config.find((p: any) => p.name === "S");
        
        if (sCfg && SCfg) {
          const sMin = Number(sCfg.min) || 0;
          const sMax = Number(sCfg.max) || 0;
          const sStep = Number(sCfg.step) || 1;
          const SMin = Number(SCfg.min) || 0;
          const SMax = Number(SCfg.max) || 0;
          const SStep = Number(SCfg.step) || 1;
          
          const sCount = sStep > 0 ? Math.round((sMax - sMin) / sStep) + 1 : 1;
          const SCount = SStep > 0 ? Math.round((SMax - SMin) / SStep) + 1 : 1;
          
          // Valid combinations where s < S
          let validCombos = 0;
          for (let i = 0; i < sCount; i++) {
            const s = sMin + i * sStep;
            for (let j = 0; j < SCount; j++) {
              const S = SMin + j * SStep;
              if (s < S) validCombos++;
            }
          }
          
          factorGroups[key] = validCombos;
        }
      } catch (e) {
        // Invalid JSON, skip this factor
      }
    }
    
    // Calculate Cartesian product across all groups
    const groupCounts = Object.values(factorGroups);
    if (groupCounts.length === 0) return 1;
    
    return groupCounts.reduce((product, count) => product * (count as number), 1);
  }, [inputFactorsData]);

  const handleRunSimulation = async () => {
    if (!currentScenario) {
      toast.error("Please select a scenario first");
      return;
    }

    setIsSimulating(true);
    setSimulationProgress(0);
    toast.info("Simulation started", {
      description: `Running ${totalScenarios} scenarios with ${replications} replications each...`,
    });

    // Update scenario status to running
    if (updateScenario) {
      await updateScenario(currentScenario.id, { status: 'running' });
    }

    // Save input data before running simulation with compression
    if (currentScenario && saveScenarioInput) {
      const startSaveTime = performance.now();
      
      const inputData = {
        customerData,
        facilityData,
        productData,
        customerFulfillmentData,
        replenishmentData,
        productionData,
        inventoryPolicyData,
        warehousingData,
        orderFulfillmentData,
        transportationData,
        customerOrderData,
        inputFactorsData,
        bomData,
        replications,
      };
      
      const originalSize = new Blob([JSON.stringify(inputData)]).size;
      toast.info(`Compressing input data (${formatBytes(originalSize)})...`);
      
      try {
        const compressed = compressData(inputData);
        const compressedSize = new Blob([compressed]).size;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        
        await saveScenarioInput(currentScenario.id, { compressed, isCompressed: true }, true);
        
        const saveTime = ((performance.now() - startSaveTime) / 1000).toFixed(2);
        toast.success(`Input saved: ${formatBytes(compressedSize)} (${ratio}% smaller) in ${saveTime}s`);
      } catch (error) {
        console.error("Input save error:", error);
        toast.warning("Input save failed, continuing simulation");
      }
    }

    try {
      const sim = await import("../lib/simulationEngine");

      if (typeof (sim as any).runSimulationWithLogs === "function") {
        // Preferred: rich API returns summary + order logs + inventory data + production logs + product flow logs + trip logs
        const { scenarioResults, orderLogs, inventoryData: invData, productionLogs, productFlowLogs, tripLogs } = await (sim as any).runSimulationWithLogs(
          {
            customerData,
            facilityData,
            productData,
            customerFulfillmentData,
            replenishmentData,
            productionData,
            inventoryPolicyData,
            warehousingData,
            orderFulfillmentData,
            transportationData,
            customerOrderData,
            inputFactorsData,
            bomData,
          },
          replications,
          (progress: number) => {
            setSimulationProgress(progress);
            console.log(`Simulation progress: ${progress.toFixed(0)}%`);
          }
        );

        console.log("Simulation complete, preparing results...", { scenarioResults: scenarioResults.length });

        // Update UI state first for immediate feedback
        setSimulationResults(scenarioResults);
        setOrderLogResults(orderLogs);
        setInventoryData(invData || []);
        setProductionLogResults(productionLogs || []);
        setProductFlowLogResults(productFlowLogs || []);
        setTripLogResults(tripLogs || []);
        
        // Set default scenario filter to first scenario
        if (scenarioResults.length > 0) {
          setSelectedOrderLogScenario(scenarioResults[0].scenarioDescription || "all");
          setSelectedProductionScenario(scenarioResults[0].scenarioDescription || "all");
          setSelectedProductFlowScenario(scenarioResults[0].scenarioDescription || "all");
          setSelectedTripScenario(scenarioResults[0].scenarioDescription || "all");
        }
        
        // Show completion toast immediately
        toast.success("Simulation completed!", {
          description: `${scenarioResults.length} scenarios analyzed with ${replications} replications each`,
        });
        
        // Auto-navigate to results immediately
        setActiveTab("results");
        setIsSimulating(false);
        setSimulationProgress(0);
        
        // Update scenario status immediately (mark as completed)
        if (currentScenario && updateScenario) {
          updateScenario(currentScenario.id, { status: 'completed' }).catch(console.error);
        }

        // Auto-save output data with compression (non-blocking)
        if (currentScenario && saveScenarioOutput) {
          const startSaveTime = performance.now();
          toast.info("Compressing & saving results...", { duration: 60000 });
          
          setTimeout(async () => {
            try {
              const outputData = {
                scenarioResults,
                orderLogs,
                inventoryData: invData || [],
                productionLogs: productionLogs || [],
                productFlowLogs: productFlowLogs || [],
                tripLogs: tripLogs || [],
                metadata: {
                  totalScenarios: scenarioResults.length,
                  totalOrders: orderLogs.length,
                  totalTrips: tripLogs.length,
                  totalProduction: productionLogs?.length || 0,
                  totalProductFlow: productFlowLogs?.length || 0,
                  replications,
                  completedAt: new Date().toISOString()
                }
              };
              
              const originalSize = new Blob([JSON.stringify(outputData)]).size;
              const compressed = compressData(outputData);
              const compressedSize = new Blob([compressed]).size;
              const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
              
              await saveScenarioOutput(currentScenario.id, { compressed, isCompressed: true }, true);
              
              const saveTime = ((performance.now() - startSaveTime) / 1000).toFixed(2);
              toast.success(`Results saved: ${formatBytes(compressedSize)} (${ratio}% smaller) in ${saveTime}s`);
            } catch (error) {
              console.error("Auto-save error:", error);
              toast.error("Failed to save results", {
                description: error instanceof Error ? error.message : "Unknown error"
              });
            }
          }, 100); // Delay 100ms to not block UI update
        }
      } else {
        // Back-compat fallback — old engine (no order logs)
        const results = await sim.runSimulation(
          {
            customerData,
            facilityData,
            productData,
            customerFulfillmentData,
            replenishmentData,
            productionData,
            inventoryPolicyData,
            warehousingData,
            orderFulfillmentData,
            transportationData,
            customerOrderData,
            inputFactorsData,
            bomData,
          },
          replications,
          (progress: number) => {
            setSimulationProgress(progress);
            console.log(`Simulation progress: ${progress.toFixed(0)}%`);
          }
        );

        // Update UI state first
        setSimulationResults(results);
        setOrderLogResults([]);
        
        // Show completion and navigate immediately
        toast.success("Simulation completed!", {
          description: `${results.length} scenarios analyzed with ${replications} replications each`,
        });
        setActiveTab("results");
        setIsSimulating(false);
        setSimulationProgress(0);
        
        // Update scenario status immediately
        if (currentScenario && updateScenario) {
          updateScenario(currentScenario.id, { status: 'completed' }).catch(console.error);
        }
      }
    } catch (error) {
      console.error("Simulation error:", error);
      toast.error("Simulation failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      if (currentScenario && updateScenario) {
        await updateScenario(currentScenario.id, { status: 'failed' });
      }
    } finally {
      // Only reset if not already reset in success path
      if (isSimulating) {
        setIsSimulating(false);
        setSimulationProgress(0);
      }
    }
  };

  return (
    <div className="h-full bg-background">
      <div className="max-w-[1800px] mx-auto w-full px-4 py-2 h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="input">Input Tables</TabsTrigger>
            <TabsTrigger value="network">Map View</TabsTrigger>
            <TabsTrigger value="simulation">Run Simulation</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* --- Input Tables --- */}
          <TabsContent value="input" className="mt-1">
            <div className="flex gap-4 h-[calc(100vh-250px)]">
              {/* Left Sidebar - Table Names */}
              <Card className="w-80 flex-shrink-0 flex flex-col">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Database className="h-4 w-4" />
                    Input Tables
                  </CardTitle>
                  <CardDescription className="text-xs">Select a table to edit</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                  <div className="p-3 flex gap-2 border-b">
                    <Button 
                      onClick={() => {
                        downloadTemplate(tables);
                        toast.success("Template downloaded successfully!");
                      }}
                      className="flex-1"
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button 
                      onClick={() => document.getElementById('excel-upload')?.click()}
                      className="flex-1"
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                    <input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportExcel}
                      className="hidden"
                    />
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {tables.map((table) => (
                        <button
                          key={table.id}
                          onClick={() => setSelectedTable(table.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${
                            selectedTable === table.id ? "bg-primary/10 text-primary font-medium" : ""
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <ClipboardList className="h-3 w-3" />
                            {table.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            {table.data.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Right Panel - Selected Table */}
              <div className="flex-1 overflow-auto">
                {currentTable && (
                  <EditableTable
                    title={currentTable.name}
                    description={currentTable.description}
                    columns={currentTable.columns}
                    data={currentTable.data}
                    onDataChange={currentTable.setData}
                    dropdownOptions={currentTable.dropdownOptions}
                    inventoryPolicyData={(currentTable as any).inventoryPolicyData}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* --- Network Map --- */}
          <TabsContent value="network" className="mt-6">
            <NetworkMap
              customerData={customerData}
              facilityData={facilityData}
              productData={productData}
              transportationData={transportationData}
            />
          </TabsContent>

          {/* --- Simulation Config --- */}
          <TabsContent value="simulation" className="mt-6 space-y-6">
            <TimeComponentInfo />
            
            <Card className="border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Simulation Configuration</CardTitle>
                <CardDescription>
                  Configure the number of replications to test different parameter combinations defined in Input Factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="replications">Number of Replications</Label>
                  <Input
                    id="replications"
                    type="number"
                    value={replications}
                    onChange={(e) => setReplications(Number(e.target.value))}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Each replication tests a different combination of parameters from the ranges defined in Input Factors
                  </p>
                </div>

                <div className="bg-accent/30 p-6 rounded-lg border border-border">
                  <h3 className="font-semibold text-lg mb-4 text-accent-foreground">Simulation Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Input Factors:</p>
                      <p className="font-semibold text-foreground">{inputFactorsData.length} parameters</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Facilities:</p>
                      <p className="font-semibold text-foreground">{facilityData.length} locations</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Products:</p>
                      <p className="font-semibold text-foreground">{productData.length} SKUs</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Customers:</p>
                      <p className="font-semibold text-foreground">{customerData.length} zones</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Inventory Policies:</p>
                      <p className="font-semibold text-foreground">{inventoryPolicyData.length} policies</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-muted-foreground">Total Scenarios:</p>
                      <p className="font-semibold text-foreground text-lg text-primary">{totalScenarios}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Total simulations: {totalScenarios} scenarios × {replications} replications = {totalScenarios * replications} runs</p>
                  </div>
                </div>


                {isSimulating && (
                  <div className="space-y-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">
                          Running Simulation...
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Processing {totalScenarios} scenarios × {replications} replications = {totalScenarios * replications} total runs
                        </p>
                      </div>
                      <span className="font-semibold text-lg">{simulationProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={simulationProgress} className="h-2" />
                  </div>
                )}

                <Button onClick={handleRunSimulation} size="lg" className="w-full md:w-auto" disabled={isSimulating}>
                  <Play className="mr-2 h-5 w-5" />
                  {isSimulating ? "Running Simulation..." : "Run Simulation"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Results --- */}
          <TabsContent value="results" className="mt-6 space-y-6">
            {simulationResults.length > 0 && (
              <Card className="border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cost vs Service Level Analysis
                  </CardTitle>
                  <CardDescription>
                    Scatter plot showing the tradeoff between cost and service level. Best solution highlighted.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        dataKey="costMean" 
                        name="Cost" 
                        label={{ value: 'Cost Mean ($)', position: 'insideBottom', offset: -10 }}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="serviceLevelMean" 
                        name="Service Level" 
                        unit="%" 
                        label={{ value: 'Service Level Mean (%)', angle: -90, position: 'insideLeft' }}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            
                            // Find highest service level
                            const maxServiceLevel = Math.max(...simulationResults.map(r => r.serviceLevelMean));
                            // Among scenarios with max service level, find lowest cost
                            const bestSolution = simulationResults
                              .filter(r => r.serviceLevelMean === maxServiceLevel)
                              .reduce((best, curr) => curr.costMean < best.costMean ? curr : best);
                            const isBest = data.srNo === bestSolution?.srNo;
                            
                            return (
                              <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                {isBest && <p className="text-xs font-bold text-green-600 mb-1">⭐ BEST SOLUTION</p>}
                                <p className="font-semibold text-sm mb-2">{data.scenarioDescription}</p>
                                <p className="text-xs text-muted-foreground">Service Level: <span className="font-medium text-foreground">{data.serviceLevelMean}%</span></p>
                                <p className="text-xs text-muted-foreground">ELT Service Level: <span className="font-medium text-foreground">{data.eltServiceLevelMean ?? "—"}%</span></p>
                                <p className="text-xs text-muted-foreground">Cost: <span className="font-medium text-foreground">${data.costMean.toLocaleString()}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Scatter 
                        name="Scenarios" 
                        data={simulationResults} 
                        fill="hsl(var(--primary))"
                        shape={(props: any) => {
                          const { cx, cy, payload } = props;
                          
                          // Find highest service level
                          const maxServiceLevel = Math.max(...simulationResults.map(r => r.serviceLevelMean));
                          // Among scenarios with max service level, find lowest cost
                          const bestSolution = simulationResults
                            .filter(r => r.serviceLevelMean === maxServiceLevel)
                            .reduce((best, curr) => curr.costMean < best.costMean ? curr : best);
                          const isBest = payload.srNo === bestSolution?.srNo;
                          
                          // Best solution: green star
                          if (isBest) {
                            return (
                              <path
                                d="M 0,-8 L 2,-2 L 8,-2 L 3,2 L 5,8 L 0,4 L -5,8 L -3,2 L -8,-2 L -2,-2 Z"
                                transform={`translate(${cx},${cy})`}
                                fill="#10b981"
                                stroke="#059669"
                                strokeWidth={2}
                              />
                            );
                          }
                          
                          // All other points: red circle
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={5} 
                              fill="#ef4444" 
                              stroke="#dc2626" 
                              strokeWidth={1.5}
                            />
                          );
                        }}
                      >
                        {simulationResults.map((entry, index) => {
                          // Find highest service level
                          const maxServiceLevel = Math.max(...simulationResults.map(r => r.serviceLevelMean));
                          // Among scenarios with max service level, find lowest cost
                          const bestSolution = simulationResults
                            .filter(r => r.serviceLevelMean === maxServiceLevel)
                            .reduce((best, curr) => curr.costMean < best.costMean ? curr : best);
                          const isBest = entry.srNo === bestSolution?.srNo;
                          
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={isBest ? "#10b981" : "#ef4444"}
                              opacity={1}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            
            <Card className="border-border shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Simulation Results</CardTitle>
                    <CardDescription>
                      {simulationResults.length > 0 
                        ? `Analysis of ${simulationResults.length} scenarios with ${replications} replications each`
                        : "No simulation results yet. Run a simulation to see results here."}
                    </CardDescription>
                  </div>
                   {simulationResults.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          exportResultsToExcel(
                            simulationResults,
                            orderLogResults,
                            inventoryData,
                            replications
                          );
                          toast.success("Results exported to Excel successfully!");
                        }}
                        className="flex items-center gap-2"
                        variant="outline"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export to Excel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {simulationResults.length > 0 ? (
                  <ScrollArea className="w-full">
                    <div className="min-w-[1400px]">
                      <table className="w-full border-collapse border border-border">
                        <thead>
                          <tr className="bg-accent/50">
                            <th className="border border-border px-4 py-2 text-left">Sr No</th>
                            <th className="border border-border px-4 py-2 text-left">Scenario Description</th>
                            <th className="border border-border px-4 py-2 text-center" colSpan={4}>Cost</th>
                            <th className="border border-border px-4 py-2 text-center" colSpan={4}>Service Level (%)</th>
                            <th className="border border-border px-4 py-2 text-center" colSpan={4}>ELT Service Level (%)</th>
                          </tr>
                          <tr className="bg-accent/30">
                            <th className="border border-border px-2 py-1"></th>
                            <th className="border border-border px-2 py-1"></th>
                            <th className="border border-border px-2 py-1 text-xs">Min</th>
                            <th className="border border-border px-2 py-1 text-xs">Max</th>
                            <th className="border border-border px-2 py-1 text-xs">Mean</th>
                            <th className="border border-border px-2 py-1 text-xs">SD</th>
                            <th className="border border-border px-2 py-1 text-xs">Min</th>
                            <th className="border border-border px-2 py-1 text-xs">Max</th>
                            <th className="border border-border px-2 py-1 text-xs">Mean</th>
                            <th className="border border-border px-2 py-1 text-xs">SD</th>
                            <th className="border border-border px-2 py-1 text-xs">Min</th>
                            <th className="border border-border px-2 py-1 text-xs">Max</th>
                            <th className="border border-border px-2 py-1 text-xs">Mean</th>
                            <th className="border border-border px-2 py-1 text-xs">SD</th>
                          </tr>
                        </thead>
                        <tbody>
                      {simulationResults.map((result: any, idx: number) => (
                            <React.Fragment key={result.srNo}>
                              <tr className="hover:bg-accent/20">
                                <td className="border border-border px-4 py-2">{result.srNo}</td>
                                <td className="border border-border px-4 py-2 font-mono text-sm">{result.scenarioDescription}</td>
                                
                                {/* Cost */}
                                <td className="border border-border px-2 py-2 text-right">${result.costMin.toLocaleString()}</td>
                                <td className="border border-border px-2 py-2 text-right">${result.costMax.toLocaleString()}</td>
                                <td className="border border-border px-2 py-2 text-right font-semibold">${result.costMean.toLocaleString()}</td>
                                <td className="border border-border px-2 py-2 text-right">${result.costSD.toLocaleString()}</td>
                                
                                {/* Service Level */}
                                <td className="border border-border px-2 py-2 text-right">{result.serviceLevelMin}%</td>
                                <td className="border border-border px-2 py-2 text-right">{result.serviceLevelMax}%</td>
                                <td className="border border-border px-2 py-2 text-right font-semibold">{result.serviceLevelMean}%</td>
                                <td className="border border-border px-2 py-2 text-right">{result.serviceLevelSD}%</td>

                                {/* ELT Service Level */}
                                <td className="border border-border px-2 py-2 text-right">{result.eltServiceLevelMin ?? "—"}%</td>
                                <td className="border border-border px-2 py-2 text-right">{result.eltServiceLevelMax ?? "—"}%</td>
                                <td className="border border-border px-2 py-2 text-right font-semibold">{result.eltServiceLevelMean ?? "—"}%</td>
                                <td className="border border-border px-2 py-2 text-right">{result.eltServiceLevelSD ?? "—"}%</td>
                              </tr>
                              {idx === 0 && (
                                <tr>
                                  <td colSpan={14} className="border border-border p-2 bg-accent/10">
                                    <CostBreakdownAccordion scenario={result} currency="USD" />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No results to display</p>
                    <p className="text-sm">Configure your simulation and click "Run Simulation" to generate results</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory On Hand Chart */}
            {inventoryData.length > 0 && (
              <InventoryOverTimeChart
                inventoryData={inventoryData}
                selectedSite={selectedSite}
                selectedProduct={selectedProduct}
                selectedScenario={selectedScenario}
                selectedReplication={selectedReplication}
                onSiteChange={setSelectedSite}
                onProductChange={setSelectedProduct}
                onScenarioChange={setSelectedScenario}
                onReplicationChange={setSelectedReplication}
              />
            )}

            {/* NEW: Customer Order Log Table */}
            {orderLogResults.length > 0 && (
              <Card className="border-border shadow-lg">
                <details className="group">
                  <summary className="cursor-pointer p-6 list-none">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      <h3 className="text-xl font-semibold">Customer Order Log</h3>
                      <svg 
                        className="h-5 w-5 ml-auto transition-transform group-open:rotate-180" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Each order's placement, delivery, wait time, and on-time status</p>
                  </summary>
                  <CardContent className="pt-0 space-y-4">
                    {/* Scenario Filter */}
                    <div className="pt-4">
                      <Label>Filter by Scenario</Label>
                      <Select value={selectedOrderLogScenario} onValueChange={setSelectedOrderLogScenario}>
                        <SelectTrigger className="w-full md:w-[400px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Scenarios</SelectItem>
                          {Array.from(new Set(orderLogResults.map((o: any) => o.scenarioDescription || o.scenario))).map((scenario: any) => (
                            <SelectItem key={scenario} value={scenario}>
                              {scenario}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="w-full">
                      <div className="min-w-[1400px]">
                        <table className="w-full border-collapse border border-border">
                          <thead className="bg-accent/50">
                            <tr>
                              <th className="px-3 py-2 text-left border border-border">Scenario</th>
                              <th className="px-3 py-2 text-center border border-border">Replication</th>
                              <th className="px-3 py-2 text-left border border-border">Order ID</th>
                              <th className="px-3 py-2 text-left border border-border">Customer</th>
                              <th className="px-3 py-2 text-left border border-border">Product</th>
                              <th className="px-3 py-2 text-right border border-border">Quantity</th>
                              <th className="px-3 py-2 text-left border border-border">Order Date</th>
                              <th className="px-3 py-2 text-left border border-border">Delivery Date</th>
                              <th className="px-3 py-2 text-right border border-border">Wait (days)</th>
                              <th className="px-3 py-2 text-center border border-border">On Time?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderLogResults
                              .filter((o: any) => {
                                const scenarioDesc = o.scenarioDescription || o.scenario;
                                // Filter by scenario and only show replication 1
                                return (selectedOrderLogScenario === "all" || scenarioDesc === selectedOrderLogScenario) 
                                  && (o.replication === 1 || o.replication === "1");
                              })
                              .map((o: any, i: number) => (
                              <tr key={i} className="hover:bg-accent/20">
                                <td className="px-3 py-2 border border-border font-mono text-xs">{o.scenarioDescription || o.scenario || "—"}</td>
                                <td className="px-3 py-2 border border-border text-center">{o.replication || "—"}</td>
                                <td className="px-3 py-2 border border-border">{o.orderId}</td>
                                <td className="px-3 py-2 border border-border">{o.customerName}</td>
                                <td className="px-3 py-2 border border-border">{o.productName}</td>
                                <td className="px-3 py-2 text-right border border-border">{o.quantity}</td>
                                <td className="px-3 py-2 border border-border">{o.orderDate}</td>
                                <td className="px-3 py-2 border border-border">{o.deliveryDate ?? "Pending"}</td>
                                <td className="px-3 py-2 text-right border border-border">{o.waitTime}</td>
                                <td className="px-3 py-2 text-center border border-border">{o.onTime ? "✅" : "❌"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </details>
              </Card>
            )}

            {/* NEW: Production Flow Table (BOM-based) */}
            {productionLogResults.length > 0 && (
              <Card className="border-border shadow-lg">
                <details className="group">
                  <summary className="cursor-pointer p-6 list-none">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      <h3 className="text-xl font-semibold">Production Flow (BOM-Based)</h3>
                      <svg 
                        className="h-5 w-5 ml-auto transition-transform group-open:rotate-180" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">End product production, raw material consumption by day</p>
                  </summary>
                  <CardContent className="pt-0 space-y-4">
                    <div className="pt-4">
                      <Label>Filter by Scenario</Label>
                      <Select value={selectedProductionScenario} onValueChange={setSelectedProductionScenario}>
                        <SelectTrigger className="w-full md:w-[400px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Scenarios</SelectItem>
                          {Array.from(new Set(productionLogResults.map((p: any) => p.scenarioDescription))).map((scenario: any) => (
                            <SelectItem key={scenario} value={scenario}>
                              {scenario}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="w-full">
                      <div className="min-w-[1200px]">
                        <table className="w-full border-collapse border border-border">
                          <thead className="bg-accent/50">
                            <tr>
                              <th className="px-3 py-2 text-left border border-border">Scenario</th>
                              <th className="px-3 py-2 text-center border border-border">Rep</th>
                              <th className="px-3 py-2 text-center border border-border">Day</th>
                              <th className="px-3 py-2 text-left border border-border">Facility</th>
                              <th className="px-3 py-2 text-left border border-border">BOM ID</th>
                              <th className="px-3 py-2 text-left border border-border">End Product</th>
                              <th className="px-3 py-2 text-right border border-border">Qty Produced</th>
                              <th className="px-3 py-2 text-right border border-border">End Prod Inv</th>
                              <th className="px-3 py-2 text-left border border-border">Raw Materials Consumed</th>
                              <th className="px-3 py-2 text-left border border-border">Raw Material Inventories</th>
                              <th className="px-3 py-2 text-center border border-border">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productionLogResults
                              .filter((p: any) => selectedProductionScenario === "all" || p.scenarioDescription === selectedProductionScenario)
                              .filter((p: any) => p.quantityProduced > 0) // Only show active production
                              .map((p: any, i: number) => {
                                // Find BOM ID for this product
                                const bomEntry = bomData.find((b: any) => b["End Product"] === p.product);
                                const bomId = bomEntry?.["BOM ID"] || "—";
                                
                                return (
                              <tr key={i} className="hover:bg-accent/20">
                                <td className="px-3 py-2 border border-border font-mono text-xs">{p.scenarioDescription || "—"}</td>
                                <td className="px-3 py-2 border border-border text-center">{p.replication}</td>
                                <td className="px-3 py-2 border border-border text-center">{p.day}</td>
                                <td className="px-3 py-2 border border-border">{p.facility}</td>
                                <td className="px-3 py-2 border border-border font-medium text-blue-700 dark:text-blue-400">{bomId}</td>
                                <td className="px-3 py-2 border border-border font-medium text-green-700 dark:text-green-400">{p.product}</td>
                                <td className="px-3 py-2 text-right border border-border font-semibold text-green-700 dark:text-green-400">{p.quantityProduced?.toFixed(0)}</td>
                                <td className="px-3 py-2 text-right border border-border">{p.currentInventory?.toFixed(0) || '—'}</td>
                                <td className="px-3 py-2 border border-border font-medium text-orange-700 dark:text-orange-400">
                                  {p.rawMaterialsUsed || p.rawMaterial ? 
                                    (p.rawMaterialsUsed || `${p.rawMaterial}(${p.rawMaterialConsumed?.toFixed(2) || 0})`) 
                                    : "N/A"}
                                </td>
                                <td className="px-3 py-2 border border-border text-sm">
                                  {p.rawMaterialInventories || (p.rawMaterialInventory !== undefined ? 
                                    `${p.rawMaterial}:${p.rawMaterialInventory.toFixed(0)}` : "N/A")}
                                </td>
                                <td className="px-3 py-2 border border-border text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    p.status === 'active' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  }`}>
                                    {p.status === 'active' ? '✓ Active' : '⏸ Idle'}
                                  </span>
                                </td>
                              </tr>
                            );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                    <p className="text-sm text-muted-foreground">
                      Showing only days with active production. Raw material consumption is based on BOM (Bill of Materials) table.
                    </p>
                  </CardContent>
                </details>
              </Card>
            )}

            {/* NEW: Product Flow Table */}
            {productFlowLogResults.length > 0 && (
              <Card className="border-border shadow-lg">
                <details className="group">
                  <summary className="cursor-pointer p-6 list-none">
                    <div className="flex items-center gap-2">
                      <Network className="h-5 w-5" />
                      <h3 className="text-xl font-semibold">Product Flow</h3>
                      <svg 
                        className="h-5 w-5 ml-auto transition-transform group-open:rotate-180" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Product movement between facilities</p>
                  </summary>
                  <CardContent className="pt-0 space-y-4">
                    <div className="pt-4">
                      <Label>Filter by Scenario</Label>
                      <Select value={selectedProductFlowScenario} onValueChange={setSelectedProductFlowScenario}>
                        <SelectTrigger className="w-full md:w-[400px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Scenarios</SelectItem>
                          {Array.from(new Set(productFlowLogResults.map((f: any) => f.scenarioDescription))).map((scenario: any) => (
                            <SelectItem key={scenario} value={scenario}>
                              {scenario}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="w-full">
                      <div className="min-w-[1000px]">
                        <table className="w-full border-collapse border border-border">
                          <thead className="bg-accent/50">
                            <tr>
                              <th className="px-3 py-2 text-left border border-border">Scenario</th>
                              <th className="px-3 py-2 text-left border border-border">Source</th>
                              <th className="px-3 py-2 text-left border border-border">Destination</th>
                              <th className="px-3 py-2 text-left border border-border">Product</th>
                              <th className="px-3 py-2 text-right border border-border">Quantity</th>
                              <th className="px-3 py-2 text-left border border-border">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productFlowLogResults
                              .filter((f: any) => selectedProductFlowScenario === "all" || f.scenarioDescription === selectedProductFlowScenario)
                              .map((f: any, i: number) => (
                              <tr key={i} className="hover:bg-accent/20">
                                <td className="px-3 py-2 border border-border font-mono text-xs">{f.scenarioDescription || "—"}</td>
                                <td className="px-3 py-2 border border-border">{f.source}</td>
                                <td className="px-3 py-2 border border-border">{f.destination}</td>
                                <td className="px-3 py-2 border border-border">{f.product}</td>
                                <td className="px-3 py-2 text-right border border-border">{f.quantity}</td>
                                <td className="px-3 py-2 border border-border">{f.date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </details>
              </Card>
            )}

            {/* NEW: Trip Log Table */}
            {tripLogResults.length > 0 && (
              <Card className="border-border shadow-lg">
                <details className="group">
                  <summary className="cursor-pointer p-6 list-none">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      <h3 className="text-xl font-semibold">Transportation Trips</h3>
                      <svg 
                        className="h-5 w-5 ml-auto transition-transform group-open:rotate-180" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Number of trips between locations based on vehicle capacity</p>
                  </summary>
                  <CardContent className="pt-0 space-y-4">
                    <div className="pt-4">
                      <Label>Filter by Scenario</Label>
                      <Select value={selectedTripScenario} onValueChange={setSelectedTripScenario}>
                        <SelectTrigger className="w-full md:w-[400px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Scenarios</SelectItem>
                          {Array.from(new Set(tripLogResults.map((t: any) => t.scenarioDescription))).map((scenario: any) => (
                            <SelectItem key={scenario} value={scenario}>
                              {scenario}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="w-full">
                      <div className="min-w-[800px]">
                        <table className="w-full border-collapse border border-border">
                          <thead className="bg-accent/50">
                            <tr>
                              <th className="px-3 py-2 text-left border border-border">Scenario</th>
                              <th className="px-3 py-2 text-left border border-border">From</th>
                              <th className="px-3 py-2 text-left border border-border">To</th>
                              <th className="px-3 py-2 text-left border border-border">Vehicle Type</th>
                              <th className="px-3 py-2 text-right border border-border">Trips</th>
                              <th className="px-3 py-2 text-right border border-border">Total Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tripLogResults
                              .filter((t: any) => selectedTripScenario === "all" || t.scenarioDescription === selectedTripScenario)
                              .map((t: any, i: number) => (
                              <tr key={i} className="hover:bg-accent/20">
                                <td className="px-3 py-2 border border-border font-mono text-xs">{t.scenarioDescription || "—"}</td>
                                <td className="px-3 py-2 border border-border">{t.from}</td>
                                <td className="px-3 py-2 border border-border">{t.to}</td>
                                <td className="px-3 py-2 border border-border">{t.vehicleType}</td>
                                <td className="px-3 py-2 text-right border border-border font-semibold">{t.trips}</td>
                                <td className="px-3 py-2 text-right border border-border">{t.totalQuantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </details>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
