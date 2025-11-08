import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, X, MapPin } from "lucide-react";
import { Customer } from "@/types/gfa";
import { toast } from "sonner";
import { getConversionFactor, getAvailableUnits } from "@/utils/unitConversions";
import { supabase } from "@/integrations/supabase/client";

interface CustomerDataFormProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onRemoveCustomer: (id: string) => void;
}

export function CustomerDataForm({
  customers,
  onAddCustomer,
  onRemoveCustomer,
}: CustomerDataFormProps) {
  const [formData, setFormData] = useState({
    product: "",
    name: "",
    postalCode: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    demand: "",
    unitOfMeasure: "m3",
  });

  const [isGeocoding, setIsGeocoding] = useState(false);

  const validatePostalCode = (postalCode: string, country: string): { valid: boolean; message?: string } => {
    const code = postalCode.trim().replace(/\s+/g, '');
    const countryLower = country.toLowerCase();

    // Postal code patterns by country
    const patterns: { [key: string]: { regex: RegExp; format: string } } = {
      'usa': { regex: /^\d{5}(-\d{4})?$/, format: '5 or 9 digits (e.g., 12345 or 12345-6789)' },
      'us': { regex: /^\d{5}(-\d{4})?$/, format: '5 or 9 digits (e.g., 12345 or 12345-6789)' },
      'united states': { regex: /^\d{5}(-\d{4})?$/, format: '5 or 9 digits (e.g., 12345 or 12345-6789)' },
      'canada': { regex: /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/, format: '6 characters (e.g., A1A1A1)' },
      'uk': { regex: /^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/i, format: '5-7 characters (e.g., SW1A1AA)' },
      'united kingdom': { regex: /^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/i, format: '5-7 characters (e.g., SW1A1AA)' },
      'india': { regex: /^\d{6}$/, format: '6 digits (e.g., 110001)' },
      'germany': { regex: /^\d{5}$/, format: '5 digits (e.g., 12345)' },
      'france': { regex: /^\d{5}$/, format: '5 digits (e.g., 75001)' },
      'australia': { regex: /^\d{4}$/, format: '4 digits (e.g., 2000)' },
      'japan': { regex: /^\d{3}-?\d{4}$/, format: '7 digits (e.g., 100-0001)' },
      'china': { regex: /^\d{6}$/, format: '6 digits (e.g., 100000)' },
      'italy': { regex: /^\d{5}$/, format: '5 digits (e.g., 00100)' },
      'spain': { regex: /^\d{5}$/, format: '5 digits (e.g., 28001)' },
      'netherlands': { regex: /^\d{4}[A-Z]{2}$/i, format: '6 characters (e.g., 1234AB)' },
      'belgium': { regex: /^\d{4}$/, format: '4 digits (e.g., 1000)' },
      'switzerland': { regex: /^\d{4}$/, format: '4 digits (e.g., 8000)' },
      'brazil': { regex: /^\d{5}-?\d{3}$/, format: '8 digits (e.g., 01310-100)' },
      'mexico': { regex: /^\d{5}$/, format: '5 digits (e.g., 01000)' },
    };

    // If country is specified, validate against that country's pattern
    if (countryLower && patterns[countryLower]) {
      if (!patterns[countryLower].regex.test(code)) {
        return {
          valid: false,
          message: `Invalid postal code for ${country}. Expected format: ${patterns[countryLower].format}`
        };
      }
    } else if (country) {
      // Country specified but not in our patterns - just check it's 3-9 characters
      if (code.length < 3 || code.length > 9) {
        return {
          valid: false,
          message: 'Postal code should be 3-9 characters'
        };
      }
    } else {
      // No country specified - accept 3-9 characters
      if (code.length < 3 || code.length > 9) {
        return {
          valid: false,
          message: 'Postal code should be 3-9 characters. Consider specifying a country for better validation.'
        };
      }
    }

    return { valid: true };
  };

  const handleGeocodePostal = async () => {
    if (!formData.postalCode.trim()) {
      toast.error("Please enter a postal code");
      return;
    }

    // Validate postal code format
    const validation = validatePostalCode(formData.postalCode, formData.country);
    if (!validation.valid) {
      toast.error(validation.message || "Invalid postal code format");
      return;
    }

    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-postal', {
        body: { 
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim() || undefined
        }
      });

      if (error) throw error;

      if (data.found) {
        setFormData({
          ...formData,
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
          city: data.city || formData.city,
          country: data.country || formData.country,
        });
        toast.success(`Location found: ${data.displayName}`);
      } else {
        toast.error(data.error || "Location not found");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Failed to geocode postal code");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.product || !formData.name || !formData.city || !formData.country) {
      toast.error("Product, customer name, city, and country are required");
      return;
    }

    const demand = parseFloat(formData.demand);

    if (isNaN(demand)) {
      toast.error("Invalid demand value");
      return;
    }

    if (demand <= 0) {
      toast.error("Demand must be greater than 0");
      return;
    }

    let lat: number;
    let lng: number;

    // If postal code is provided but no coordinates, try to geocode
    if (formData.postalCode.trim() && (!formData.latitude || !formData.longitude)) {
      const validation = validatePostalCode(formData.postalCode, formData.country);
      if (!validation.valid) {
        toast.error(validation.message || "Invalid postal code format");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('geocode-postal', {
          body: { 
            postalCode: formData.postalCode.trim(),
            country: formData.country.trim()
          }
        });

        if (error || !data.found) {
          toast.error("Failed to geocode postal code. Please enter coordinates manually.");
          return;
        }

        lat = data.latitude;
        lng = data.longitude;
        
        // Update form with geocoded values
        setFormData({
          ...formData,
          latitude: lat.toString(),
          longitude: lng.toString(),
          city: data.city || formData.city,
        });
      } catch (error) {
        toast.error("Failed to geocode postal code. Please enter coordinates manually.");
        return;
      }
    } else {
      // Use provided coordinates
      lat = parseFloat(formData.latitude);
      lng = parseFloat(formData.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        toast.error("Please provide either a valid postal code or latitude/longitude coordinates");
        return;
      }

      if (lat < -90 || lat > 90) {
        toast.error("Latitude must be between -90 and 90");
        return;
      }

      if (lng < -180 || lng > 180) {
        toast.error("Longitude must be between -180 and 180");
        return;
      }
    }

    const customer: Customer = {
      id: `customer-${Date.now()}-${Math.random()}`,
      product: formData.product.trim(),
      name: formData.name.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
      latitude: lat,
      longitude: lng,
      demand: demand,
      unitOfMeasure: formData.unitOfMeasure,
      conversionFactor: getConversionFactor(formData.unitOfMeasure),
    };

    onAddCustomer(customer);
    
    // Reset form
    setFormData({
      product: "",
      name: "",
      postalCode: "",
      city: "",
      country: "",
      latitude: "",
      longitude: "",
      demand: "",
      unitOfMeasure: "m3",
    });

    toast.success(`Added customer: ${customer.name}`);
  };

  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-2">
      {/* Customer Table */}
      <div className="border rounded-lg max-h-[300px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[120px]">Product</TableHead>
              <TableHead className="w-[150px]">Customer</TableHead>
              <TableHead className="w-[100px]">City</TableHead>
              <TableHead className="w-[80px]">Country</TableHead>
              <TableHead className="w-[90px]">Lat</TableHead>
              <TableHead className="w-[90px]">Lng</TableHead>
              <TableHead className="w-[80px]">Demand</TableHead>
              <TableHead className="w-[70px]">Unit</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="text-xs">{customer.product}</TableCell>
                <TableCell className="text-xs">{customer.name}</TableCell>
                <TableCell className="text-xs">{customer.city}</TableCell>
                <TableCell className="text-xs">{customer.country}</TableCell>
                <TableCell className="text-xs tabular-nums">{customer.latitude.toFixed(4)}</TableCell>
                <TableCell className="text-xs tabular-nums">{customer.longitude.toFixed(4)}</TableCell>
                <TableCell className="text-xs tabular-nums">{customer.demand}</TableCell>
                <TableCell className="text-xs">{customer.unitOfMeasure}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveCustomer(customer.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Row Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full h-7 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        {showAddForm ? "Cancel" : "Add Row"}
      </Button>

      {/* Compact Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="product" className="text-xs">Product *</Label>
              <Input
                id="product"
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                placeholder="Electronics"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Customer *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ABC Store"
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="New York"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="country" className="text-xs">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="postalCode" className="text-xs">Postal Code</Label>
              <div className="flex gap-1">
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="10001"
                  className="h-7 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeocodePostal}
                  disabled={isGeocoding || !formData.postalCode.trim()}
                  className="h-7 w-7 p-0"
                >
                  <MapPin className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label htmlFor="latitude" className="text-xs">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="40.7128"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude" className="text-xs">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="-74.0060"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="demand" className="text-xs">Demand *</Label>
              <Input
                id="demand"
                type="number"
                step="any"
                min="0"
                value={formData.demand}
                onChange={(e) => setFormData({ ...formData, demand: e.target.value })}
                placeholder="1000"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unitOfMeasure" className="text-xs">Unit</Label>
              <Select
                value={formData.unitOfMeasure}
                onValueChange={(value) => setFormData({ ...formData, unitOfMeasure: value })}
              >
                <SelectTrigger id="unitOfMeasure" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableUnits().map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" size="sm" className="w-full h-7 text-xs">
            Add Customer
          </Button>
        </form>
      )}
    </div>
  );
}
