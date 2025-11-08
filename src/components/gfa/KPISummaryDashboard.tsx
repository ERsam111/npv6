import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MapPin, DollarSign, Target } from "lucide-react";
import { Customer, DistributionCenter, OptimizationSettings } from "@/types/gfa";

interface KPISummaryDashboardProps {
  dcs: DistributionCenter[];
  customers: Customer[];
  settings: OptimizationSettings;
  costBreakdown?: { totalCost: number; transportationCost: number; facilityCost: number; numSites: number };
}

export function KPISummaryDashboard({
  dcs,
  customers,
  settings,
  costBreakdown,
}: KPISummaryDashboardProps) {
  // Calculate average distance to customer
  const calculateAverageDistance = () => {
    if (customers.length === 0 || dcs.length === 0) return 0;
    
    let totalDistance = 0;
    customers.forEach((customer) => {
      const assignedDC = dcs.find((dc) =>
        dc.assignedCustomers.some((c) => c.id === customer.id)
      );
      if (assignedDC) {
        const distance = getDistance(
          customer.latitude,
          customer.longitude,
          assignedDC.latitude,
          assignedDC.longitude
        );
        totalDistance += distance;
      }
    });
    
    return totalDistance / customers.length;
  };

  // Calculate demand coverage percentage
  const calculateDemandCoverage = () => {
    if (customers.length === 0 || dcs.length === 0) return 0;
    
    let coveredDemand = 0;
    let totalDemand = 0;
    
    customers.forEach((customer) => {
      totalDemand += customer.demand * customer.conversionFactor;
      const assignedDC = dcs.find((dc) =>
        dc.assignedCustomers.some((c) => c.id === customer.id)
      );
      if (assignedDC) {
        const distance = getDistance(
          customer.latitude,
          customer.longitude,
          assignedDC.latitude,
          assignedDC.longitude
        );
        if (distance <= settings.maxRadius) {
          coveredDemand += customer.demand * customer.conversionFactor;
        }
      }
    });
    
    return totalDemand > 0 ? (coveredDemand / totalDemand) * 100 : 0;
  };

  // Calculate cost efficiency
  const calculateCostEfficiency = () => {
    if (!costBreakdown) return { costPerUnit: 0, costPerCustomer: 0, costPerSite: 0 };
    
    const totalDemand = customers.reduce(
      (sum, c) => sum + c.demand * c.conversionFactor,
      0
    );
    
    return {
      costPerUnit: totalDemand > 0 ? costBreakdown.totalCost / totalDemand : 0,
      costPerCustomer: customers.length > 0 ? costBreakdown.totalCost / customers.length : 0,
      costPerSite: costBreakdown.numSites > 0 ? costBreakdown.facilityCost / costBreakdown.numSites : 0,
    };
  };

  // Haversine formula to calculate distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return settings.distanceUnit === 'mile' ? distance * 0.621371 : distance;
  };

  const avgDistance = calculateAverageDistance();
  const demandCoverage = calculateDemandCoverage();
  const costEfficiency = calculateCostEfficiency();

  const kpis = [
    {
      title: "Avg Distance to Customer",
      value: avgDistance > 0 ? `${avgDistance.toFixed(1)} ${settings.distanceUnit}` : "N/A",
      icon: MapPin,
      description: "Average distance from customers to their assigned DC",
      color: "text-blue-500",
    },
    {
      title: "Demand Coverage",
      value: demandCoverage > 0 ? `${demandCoverage.toFixed(1)}%` : "N/A",
      icon: Target,
      description: `Demand within ${settings.maxRadius} ${settings.distanceUnit} radius`,
      color: "text-green-500",
    },
    {
      title: "Cost per Unit",
      value: costBreakdown && costEfficiency.costPerUnit > 0 ? `$${costEfficiency.costPerUnit.toFixed(2)}` : "N/A",
      icon: DollarSign,
      description: "Total cost divided by total demand",
      color: "text-purple-500",
    },
    {
      title: "Cost per Customer",
      value: costBreakdown && costEfficiency.costPerCustomer > 0 ? `$${costEfficiency.costPerCustomer.toFixed(2)}` : "N/A",
      icon: TrendingUp,
      description: "Total cost divided by number of customers",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
