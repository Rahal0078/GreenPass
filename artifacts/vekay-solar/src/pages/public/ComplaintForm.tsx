import { useState, useRef, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateComplaint } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CheckCircle2, LocateFixed, ShieldCheck, X, ScanLine,
  CalendarDays, AlertCircle,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";

const complaintSchema = z.object({
  customerName:       z.string().min(2, "Name is required"),
  customerPhone:      z.string().min(10, "Valid phone number is required"),
  customerEmail:      z.string().email("Valid email is required"),
  ksebConsumerNumber: z.string().regex(/^\d{13}$/, "KSEB Consumer Number must be exactly 13 digits"),
  placeName:          z.string().min(1, "GPS location is required — tap 'Get My Location'"),
  district:           z.string().min(1, "District is required"),
  pincode:            z.string().optional().default(""),
  address:            z.string().optional().default(""),
  lat:                z.number({ required_error: "GPS location required" }),
  lng:                z.number({ required_error: "GPS location required" }),
  locationSource:     z.string().nullable().optional(),
  complaintType:      z.string().min(1, "Please select a complaint type"),
  description:        z.string().min(10, "Please provide more details").max(500, "Maximum 500 characters"),
  scheduledDate:      z.string().optional().nullable(),
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

const COMPLAINT_TYPES = [
  "Solar Panel Issue",
  "Inverter Fault",
  "DCDB Problem",
  "Wiring Issue",
  "Battery Issue",
  "System Not Working",
  "Other",
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ComplaintForm() {
  const [, setLocation] = useLocation();
  const { toast }       = useToast();
  const createComplaint = useCreateComplaint();
  const [gpsLoading,    setGpsLoading]    = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; district: string; pincode: string } | null>(null);
  const [locationRefined, setLocationRefined] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const geocodeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      customerName:       "",
      customerPhone:      "",
      customerEmail:      "",
      ksebConsumerNumber: "",
      placeName:          "",
      district:           "",
      pincode:            "",
      address:            "",
      complaintType:      "",
      description:        "",
      lat:                undefined as any,
      lng:                undefined as any,
      locationSource:     null,
      scheduledDate:      null,
    },
  });

  const onSubmit = (data: ComplaintFormValues) => {
    createComplaint.mutate(
      {
        data: {
          ...data,
          customerEmail:  data.customerEmail ?? "",
          address:        data.address ?? "",
          locationSource: data.locationSource ?? null,
          scheduledDate:  data.scheduledDate || null,
        } as any,
      },
      {
        onSuccess: (result) => {
          setTicketId(result.ticketId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: (error: any) => {
          toast({
            title: "Error submitting complaint",
            description: error.message || "Please try again later.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const addressValue = useWatch({ control: form.control, name: "address" });

  useEffect(() => {
    if (!selectedPlace || !addressValue || addressValue.length < 4) {
      if (!addressValue || addressValue.length < 4) setLocationRefined(false);
      return;
    }
    if (geocodeRef.current) clearTimeout(geocodeRef.current);
    setLocationRefined(false);
    geocodeRef.current = setTimeout(async () => {
      try {
        const query = `${addressValue}, ${selectedPlace.name}, ${selectedPlace.district}, Kerala, India`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1&countrycodes=in`,
        );
        const results = (await res.json()) as any[];
        if (results && results.length > 0) {
          form.setValue("lat", parseFloat(results[0].lat));
          form.setValue("lng", parseFloat(results[0].lon));
          form.setValue("locationSource", "geocoded");
          setLocationRefined(true);
        }
      } catch { }
    }, 900);
    return () => { if (geocodeRef.current) clearTimeout(geocodeRef.current); };
  }, [addressValue, selectedPlace]);

  const clearLocation = () => {
    form.setValue("placeName", "");
    form.setValue("district", "");
    form.setValue("pincode", "");
    form.setValue("lat", undefined as any);
    form.setValue("lng", undefined as any);
    form.setValue("locationSource", null);
    setSelectedPlace(null);
    setLocationRefined(false);
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`,
    );
    if (!res.ok) throw new Error("Nominatim error");
    return res.json() as Promise<any>;
  };

  const fallbackToNearestPlace = async (latitude: number, longitude: number) => {
    const res = await fetch("/api/places/search?q=");
    const allPlaces: any[] = await res.json();
    let nearest = allPlaces[0];
    let minDist  = Infinity;
    for (const p of allPlaces) {
      if (p.lat && p.lng) {
        const d = haversineKm(latitude, longitude, p.lat, p.lng);
        if (d < minDist) { minDist = d; nearest = p; }
      }
    }
    return nearest;
  };

  const applyLocationFromCoords = async (latitude: number, longitude: number, source: string) => {
    form.setValue("lat", latitude);
    form.setValue("lng", longitude);
    form.setValue("locationSource", source);
    try {
      const geo  = await reverseGeocode(latitude, longitude);
      const addr = geo.address || {};
      const city     = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || addr.municipality || "";
      const district = addr.state_district || addr.county || addr.city_district || city;
      const pincode  = addr.postcode || "";
      const displayName = city || district || geo.display_name?.split(",")[0] || "Your location";
      if (city || district) {
        form.setValue("placeName", displayName);
        form.setValue("district",  district);
        form.setValue("pincode",   pincode);
        form.clearErrors("placeName");
        setSelectedPlace({ name: displayName, district, pincode });
        return { name: displayName, district };
      } else {
        const nearest = await fallbackToNearestPlace(latitude, longitude);
        form.setValue("placeName", nearest.name);
        form.setValue("district",  nearest.district);
        form.setValue("pincode",   nearest.pincode ?? "");
        form.clearErrors("placeName");
        setSelectedPlace({ name: nearest.name, district: nearest.district, pincode: nearest.pincode ?? "" });
        return { name: nearest.name, district: nearest.district };
      }
    } catch {
      const nearest = await fallbackToNearestPlace(latitude, longitude);
      form.setValue("placeName", nearest.name);
      form.setValue("district",  nearest.district);
      form.setValue("pincode",   nearest.pincode ?? "");
      form.clearErrors("placeName");
      setSelectedPlace({ name: nearest.name, district: nearest.district, pincode: nearest.pincode ?? "" });
      return { name: nearest.name, district: nearest.district };
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const accText = accuracy < 50 ? `±${Math.round(accuracy)}m — very accurate` : `±${Math.round(accuracy)}m`;
        try {
          const loc = await applyLocationFromCoords(latitude, longitude, "gps");
          toast({ title: "GPS location captured", description: `${accText} · ${loc.name}${loc.district && loc.district !== loc.name ? ", " + loc.district : ""}` });
        } catch {
          toast({ title: "GPS captured", description: "Location saved." });
        }
        setGpsLoading(false);
      },
      () => {
        toast({ title: "Location access denied", description: "Please allow location access and try again.", variant: "destructive" });
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (ticketId) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="pt-10 pb-10 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complaint Submitted Successfully</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Your complaint has been registered. We will dispatch a technician to you soon.
              </p>
              <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6 inline-block mb-8">
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Your Ticket ID</p>
                <p className="text-3xl font-mono font-bold text-primary tracking-tight">{ticketId}</p>
              </div>
              <div>
                <Button onClick={() => setLocation(`/track/${ticketId}`)} className="w-full sm:w-auto">
                  Track Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Register a Complaint</h1>
          <p className="text-gray-500 mt-2">
            Having issues with your solar installation? Let us know and our technicians will be dispatched to resolve it.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* ── Customer Details ── */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Customer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Ajith Kumar" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl><Input placeholder="+91 9876543210" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="ksebConsumerNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          KSEB Consumer Number
                          <span className="ml-1 text-xs text-gray-400 font-normal">(13 digits)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 1234567890123"
                            maxLength={13}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            {...field}
                            onChange={e => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 13))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* ── Location (GPS only — mandatory) ── */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    Location
                    <span className="ml-2 text-xs font-normal text-red-500">* required</span>
                  </h3>

                  {!selectedPlace ? (
                    <div className="space-y-3">
                      {/* GPS — only option */}
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={gpsLoading}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-left transition-all shadow-sm disabled:opacity-70"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          {gpsLoading
                            ? <Loader2 className="h-6 w-6 animate-spin" />
                            : <LocateFixed className="h-6 w-6" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-base">
                            {gpsLoading ? "Detecting your location…" : "Get My Location"}
                          </p>
                          <p className="text-sm text-white/80">
                            Tap to capture your exact GPS coordinates
                          </p>
                        </div>
                        <span className="ml-auto text-xs font-bold bg-white/25 px-2.5 py-1 rounded-full shrink-0">
                          Required
                        </span>
                      </button>

                      {/* Hint */}
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>
                          GPS location is required so our technician can navigate directly to you.
                          Please allow location access when your browser asks.
                        </span>
                      </div>

                      {form.formState.errors.placeName && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.placeName.message}</p>
                      )}
                    </div>
                  ) : (
                    /* Location confirmed */
                    <div className="flex items-center justify-between gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-900 dark:text-green-200">{selectedPlace.name}</p>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            {selectedPlace.district}{selectedPlace.pincode ? ` — ${selectedPlace.pincode}` : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearLocation}
                        className="text-green-600 hover:text-green-800 p-1 rounded shrink-0"
                        title="Clear location and re-capture"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}

                  {selectedPlace && (
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>House Name / Landmark <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Rose Villa, near SBI ATM, Main Road..." {...field} />
                        </FormControl>
                        {locationRefined && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                            <ScanLine className="h-3.5 w-3.5" />
                            Location pinpointed — technician will navigate directly here
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>

                {/* ── Issue Details ── */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Issue Details</h3>
                  <FormField control={form.control} name="complaintType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problem Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select the type of issue" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMPLAINT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe the Issue</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the problem in detail — what's happening, when it started, what you've noticed..."
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-between items-center mt-1">
                        <FormMessage />
                        <span className="text-xs text-gray-400 ml-auto">{field.value?.length ?? 0}/500</span>
                      </div>
                    </FormItem>
                  )} />
                </div>

                {/* ── Preferred Date (optional) ── */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    Preferred Visit Date
                    <span className="ml-2 text-xs font-normal text-gray-400">(Optional)</span>
                  </h3>
                  <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        Preferred Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={new Date().toISOString().split("T")[0]}
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank if you need service as soon as possible.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={createComplaint.isPending}
                >
                  {createComplaint.isPending
                    ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting…</>
                    : "Submit Complaint"}
                </Button>

              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
