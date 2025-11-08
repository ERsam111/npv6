import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNetwork } from "@/contexts/NetworkContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IntegrityIssue {
  type: 'error' | 'warning';
  message: string;
  table: string;
}

export function DataIntegrityChecker() {
  const { data } = useNetwork();
  
  const checkIntegrity = (): IntegrityIssue[] => {
    const issues: IntegrityIssue[] = [];
    
    // Check customers
    if (data.customers.length === 0) {
      issues.push({
        type: 'error',
        message: 'No customers defined. Add at least one customer with location coordinates.',
        table: 'Customers'
      });
    } else {
      data.customers.filter(c => c.include !== false).forEach(customer => {
        if (!customer.lat || !customer.lng) {
          issues.push({
            type: 'warning',
            message: `Customer "${customer.name}" is missing location coordinates (lat/lng)`,
            table: 'Customers'
          });
        }
      });
    }
    
    // Check facilities
    if (data.facilities.length === 0) {
      issues.push({
        type: 'error',
        message: 'No facilities defined. Add at least one facility (DC or Factory).',
        table: 'Facilities'
      });
    } else {
      data.facilities.filter(f => f.status === 'Include').forEach(facility => {
        if (!facility.lat || !facility.lng) {
          issues.push({
            type: 'warning',
            message: `Facility "${facility.name}" is missing location coordinates (lat/lng)`,
            table: 'Facilities'
          });
        }
      });
    }
    
    // Check products
    if (data.products.length === 0) {
      issues.push({
        type: 'error',
        message: 'No products defined. Add at least one product.',
        table: 'Products'
      });
    }
    
    // Check vehicle types
    if (data.vehicleTypes.length === 0) {
      issues.push({
        type: 'error',
        message: 'No vehicle types defined. Add at least one vehicle type with capacity.',
        table: 'Vehicle Types'
      });
    } else {
      data.vehicleTypes.forEach(vehicle => {
        if (!vehicle.capacity || vehicle.capacity <= 0) {
          issues.push({
            type: 'error',
            message: `Vehicle type "${vehicle.name}" must have capacity > 0`,
            table: 'Vehicle Types'
          });
        }
      });
    }
    
    // Check paths (lanes)
    if (data.paths.length === 0) {
      issues.push({
        type: 'error',
        message: 'No paths/lanes defined. Add at least one path connecting nodes.',
        table: 'Paths'
      });
    } else {
      const includedPaths = data.paths.filter(p => p.include !== false);
      if (includedPaths.length === 0) {
        issues.push({
          type: 'error',
          message: 'All paths are excluded. Include at least one path.',
          table: 'Paths'
        });
      }
      
      // Check if paths reference valid entities
      includedPaths.forEach(path => {
        const allNodes = [
          ...data.customers.map(c => c.customer_id),
          ...data.facilities.map(f => f.facility_id),
          ...data.suppliers.map(s => s.supplier_id)
        ];
        
        if (!allNodes.includes(path.from_id)) {
          issues.push({
            type: 'error',
            message: `Path references invalid from_id: ${path.from_id}`,
            table: 'Paths'
          });
        }
        if (!allNodes.includes(path.to_id)) {
          issues.push({
            type: 'error',
            message: `Path references invalid to_id: ${path.to_id}`,
            table: 'Paths'
          });
        }
        
        if (!data.vehicleTypes.find(v => v.vehicle_type_id === path.vehicle_type_id)) {
          issues.push({
            type: 'error',
            message: `Path references invalid vehicle_type_id: ${path.vehicle_type_id}`,
            table: 'Paths'
          });
        }
      });
    }
    
    // Check demand
    if (data.demand.length === 0) {
      issues.push({
        type: 'error',
        message: 'No demand defined. Add demand for at least one customer-product-period combination.',
        table: 'Demand'
      });
    } else {
      data.demand.forEach(demand => {
        if (!data.customers.find(c => c.customer_id === demand.customer_id)) {
          issues.push({
            type: 'error',
            message: `Demand references invalid customer_id: ${demand.customer_id}`,
            table: 'Demand'
          });
        }
        if (!data.products.find(p => p.product_id === demand.product_id)) {
          issues.push({
            type: 'error',
            message: `Demand references invalid product_id: ${demand.product_id}`,
            table: 'Demand'
          });
        }
        if (!data.periods.find(p => p.period_id === demand.period_id)) {
          issues.push({
            type: 'error',
            message: `Demand references invalid period_id: ${demand.period_id}`,
            table: 'Demand'
          });
        }
        if (demand.demand_qty <= 0) {
          issues.push({
            type: 'warning',
            message: `Demand quantity for ${demand.customer_id}-${demand.product_id} should be > 0`,
            table: 'Demand'
          });
        }
      });
    }
    
    // Check periods
    if (data.periods.length === 0) {
      issues.push({
        type: 'error',
        message: 'No periods defined. Add at least one time period.',
        table: 'Periods'
      });
    }
    
    // Check production capacity if facilities exist
    const factories = data.facilities.filter(f => f.type === 'Factory' && f.status === 'Include');
    if (factories.length > 0 && data.production.length === 0) {
      issues.push({
        type: 'warning',
        message: 'Factories exist but no production defined. Define production for factories or add supply from suppliers.',
        table: 'Production'
      });
    }
    
    // Check for complete flow path from supply to demand
    const hasSuppliers = data.suppliers.filter(s => s.include !== false).length > 0;
    const hasProduction = data.production.filter(p => p.include !== false).length > 0;
    
    if (!hasSuppliers && !hasProduction) {
      issues.push({
        type: 'error',
        message: 'No supply source defined. Either add suppliers or define production at facilities.',
        table: 'Suppliers/Production'
      });
    }
    
    return issues;
  };
  
  const issues = checkIntegrity();
  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {errors.length === 0 && warnings.length === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : errors.length > 0 ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          Data Integrity Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.length === 0 && warnings.length === 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All data validation checks passed! You can proceed with optimization.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({errors.length})
                </h4>
                <div className="space-y-2 pl-6">
                  {errors.map((issue, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertDescription>
                        <strong>[{issue.table}]</strong> {issue.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
            
            {warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({warnings.length})
                </h4>
                <div className="space-y-2 pl-6">
                  {warnings.map((issue, idx) => (
                    <Alert key={idx} className="border-yellow-500">
                      <AlertDescription>
                        <strong>[{issue.table}]</strong> {issue.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Required for optimization:</strong> Customers, Facilities/Suppliers, Products, 
            Vehicle Types, Paths, Demand, and Periods must all be properly defined with valid references.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
