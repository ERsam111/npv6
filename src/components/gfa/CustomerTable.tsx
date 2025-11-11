import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, MapPin } from "lucide-react";
import { CustomerLocation } from "@/types/gfa";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomerTableProps {
  customers: CustomerLocation[];
  onAddCustomer: (customer: CustomerLocation) => void;
  onRemoveCustomer: (id: string) => void;
  onUpdateCustomer: (id: string, updates: Partial<CustomerLocation>) => void;
}

export function CustomerTable({
  customers,
  onAddCustomer,
  onRemoveCustomer,
  onUpdateCustomer,
}: CustomerTableProps) {
  const [formData, setFormData] = useState({
    name: "",
    postalCode: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    included: true,
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleGeocodePostal = async () => {
    if (!formData.postalCode.trim()) {
      toast.error("Please enter a postal code");
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

    if (!formData.name || !formData.city || !formData.country) {
      toast.error("Customer name, city, and country are required");
      return;
    }

    let lat: number;
    let lng: number;

    if (formData.postalCode.trim() && (!formData.latitude || !formData.longitude)) {
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
      } catch (error) {
        toast.error("Failed to geocode postal code. Please enter coordinates manually.");
        return;
      }
    } else {
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

    const customer: CustomerLocation = {
      id: `customer-${Date.now()}-${Math.random()}`,
      name: formData.name.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
      latitude: lat,
      longitude: lng,
      included: formData.included,
    };

    onAddCustomer(customer);
    
    setFormData({
      name: "",
      postalCode: "",
      city: "",
      country: "",
      latitude: "",
      longitude: "",
      included: true,
    });

    toast.success(`Added customer: ${customer.name}`);
  };

  return (
    <div className="space-y-2">
      <div className="border rounded-lg max-h-[300px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[150px]">Customer Name</TableHead>
              <TableHead className="w-[100px]">City</TableHead>
              <TableHead className="w-[80px]">Country</TableHead>
              <TableHead className="w-[90px]">Latitude</TableHead>
              <TableHead className="w-[90px]">Longitude</TableHead>
              <TableHead className="w-[80px]">Include</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="text-xs">{customer.name}</TableCell>
                <TableCell className="text-xs">{customer.city}</TableCell>
                <TableCell className="text-xs">{customer.country}</TableCell>
                <TableCell className="text-xs tabular-nums">{customer.latitude.toFixed(4)}</TableCell>
                <TableCell className="text-xs tabular-nums">{customer.longitude.toFixed(4)}</TableCell>
                <TableCell>
                  <Checkbox
                    checked={customer.included}
                    onCheckedChange={(checked) => 
                      onUpdateCustomer(customer.id, { included: checked as boolean })
                    }
                  />
                </TableCell>
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full h-7 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        {showAddForm ? "Cancel" : "Add Customer"}
      </Button>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Customer Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ABC Store"
                className="h-7 text-xs"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-2">
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

          <div className="grid grid-cols-2 gap-2">
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
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="included"
              checked={formData.included}
              onCheckedChange={(checked) => setFormData({ ...formData, included: checked as boolean })}
            />
            <Label htmlFor="included" className="text-xs">Include in analysis</Label>
          </div>

          <Button type="submit" size="sm" className="w-full h-7 text-xs">
            Add Customer
          </Button>
        </form>
      )}
    </div>
  );
}
