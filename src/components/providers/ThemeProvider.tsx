'use client'

import { createContext, useContext, useEffect, useState } from 'react';

interface StoreSettings {
  store_name?: string;
  store_description?: string;
  appearance_logo_url?: string;
  appearance_background_color?: string;
  appearance_text_color?: string;
  // Legacy keys for backward compatibility
  logo_url?: string;
  background_color?: string;
  text_color?: string;
}

interface ThemeContextType {
  storeSettings: StoreSettings;
  updateStoreSettings: (settings: Partial<StoreSettings>) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const response = await fetch('/api/settings/store');
        if (response.ok) {
          const settings = await response.json();
          setStoreSettings(settings);
          applyThemeColors(settings);
        } else {
          // Fallback to default settings if API fails
          const defaultSettings: StoreSettings = {
            store_name: 'Store',
            store_description: 'Welcome to our store',
            appearance_logo_url: '',
            appearance_background_color: '#22c55e',
            appearance_text_color: '#ffffff',
            logo_url: '',
            background_color: '#22c55e',
            text_color: '#ffffff'
          };
          setStoreSettings(defaultSettings);
          applyThemeColors(defaultSettings);
        }
      } catch (error) {
        console.error('Error fetching store settings:', error);
        // Fallback to default settings
        const defaultSettings: StoreSettings = {
          store_name: 'Store',
          store_description: 'Welcome to our store',
          appearance_logo_url: '',
          appearance_background_color: '#22c55e',
          appearance_text_color: '#ffffff',
          logo_url: '',
          background_color: '#22c55e',
          text_color: '#ffffff'
        };
        setStoreSettings(defaultSettings);
        applyThemeColors(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStoreSettings();
  }, []);

  const applyThemeColors = (settings: StoreSettings) => {
    const root = document.documentElement;
    
    // Use new appearance keys with fallback to legacy keys
    const backgroundColor = settings.appearance_background_color || settings.background_color;
    const textColor = settings.appearance_text_color || settings.text_color;
    
    if (backgroundColor) {
      // Convert hex to HSL for CSS variables
      const bgColor = hexToHsl(backgroundColor);
      if (bgColor) {
        root.style.setProperty('--primary', bgColor);
        root.style.setProperty('--primary-light', adjustLightness(bgColor, 10));
        // Update the gradient-primary CSS variable
        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${bgColor}), hsl(${adjustLightness(bgColor, 10)}))`);
      }
    }
    
    if (textColor) {
      const textColorHsl = hexToHsl(textColor);
      if (textColorHsl) {
        root.style.setProperty('--primary-foreground', textColorHsl);
      }
    }
  };

  const updateStoreSettings = (newSettings: Partial<StoreSettings>) => {
    const updated = { ...storeSettings, ...newSettings };
    setStoreSettings(updated);
    applyThemeColors(updated);
  };

  return (
    <ThemeContext.Provider value={{ storeSettings, updateStoreSettings, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Helper function to convert hex to HSL
function hexToHsl(hex: string): string | null {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch (error) {
    console.error('Error converting hex to HSL:', error);
    return null;
  }
}

// Helper function to adjust lightness
function adjustLightness(hsl: string, adjustment: number): string {
  const matches = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!matches) return hsl;
  
  const h = matches[1];
  const s = matches[2];
  const l = Math.min(100, Math.max(0, parseInt(matches[3]) + adjustment));
  
  return `${h} ${s}% ${l}%`;
}