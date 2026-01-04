import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Loader2, Search } from 'lucide-react';
import { locationService, AutocompleteResult } from '@/lib/locationService';
import { cn } from '@/lib/utils';

interface AddressInputProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  onLocationCapture?: () => void;
  placeholder?: string;
  className?: string;
  showLocationButton?: boolean;
  isCapturingLocation?: boolean;
}

export function AddressInput({
  value,
  onChange,
  onLocationCapture,
  placeholder = "Enter address or location",
  className,
  showLocationButton = true,
  isCapturingLocation = false,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (value.length >= 3) {
        setIsLoading(true);
        try {
          const results = await locationService.autocomplete(value, 5);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Autocomplete error:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: AutocompleteResult) => {
    onChange(suggestion.display_name, {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    });
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              className={cn("pl-10 pr-10", className)}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        
        {showLocationButton && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onLocationCapture}
            disabled={isCapturingLocation}
            className="shrink-0"
          >
            {isCapturingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto">
          <CardContent className="p-0">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.place_id}-${index}`}
                ref={index === selectedIndex ? suggestionsRef : undefined}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                  index === selectedIndex && "bg-muted"
                )}
                onClick={() => selectSuggestion(suggestion)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {suggestion.display_name.split(',')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.display_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">
                      {suggestion.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {parseFloat(suggestion.lat).toFixed(4)}, {parseFloat(suggestion.lon).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}