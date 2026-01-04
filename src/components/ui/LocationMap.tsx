import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationMapProps {
  lat: number;
  lng: number;
  address?: string;
  className?: string;
  height?: number;
}

export function LocationMap({ lat, lng, address, className, height = 200 }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // Generate static map URL using LocationIQ
  const getStaticMapUrl = () => {
    const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (!LOCATIONIQ_API_KEY) return null;

    const zoom = 15;
    const width = 400;
    const mapHeight = height;
    
    return `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_API_KEY}&center=${lat},${lng}&zoom=${zoom}&size=${width}x${mapHeight}&format=png&markers=icon:large-red-cutout|${lat},${lng}`;
  };

  const openInMaps = () => {
    // Open in Google Maps
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const staticMapUrl = getStaticMapUrl();

  if (!staticMapUrl) {
    // Fallback when no API key
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Location</p>
              <p className="text-xs text-muted-foreground">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
              {address && (
                <p className="text-xs text-muted-foreground mt-1">{address}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={openInMaps}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={staticMapUrl}
            alt="Location map"
            className="w-full rounded-t-lg"
            style={{ height: `${height}px` }}
            onError={(e) => {
              // Hide image on error
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute top-2 right-2">
            <Button variant="secondary" size="sm" onClick={openInMaps}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {address && (
          <div className="p-3 border-t">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm">{address}</p>
                <p className="text-xs text-muted-foreground">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}