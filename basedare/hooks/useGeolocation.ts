'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  coordinates: Coordinates | null;
  loading: boolean;
  error: string | null;
  isSupported: boolean;
  permissionState: PermissionState | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  cacheTimeMs?: number;
}

const DEFAULT_OPTIONS: Required<UseGeolocationOptions> = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1 minute cache
  cacheTimeMs: 60000, // 1 minute
};

// Cache shared across hook instances
let cachedCoords: Coordinates | null = null;
let cacheTimestamp = 0;

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<GeolocationState>({
    coordinates: cachedCoords,
    loading: false,
    error: null,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    permissionState: null,
  });

  const watchIdRef = useRef<number | null>(null);

  // Check permission status on mount
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        setState((prev) => ({ ...prev, permissionState: result.state }));

        result.onchange = () => {
          setState((prev) => ({ ...prev, permissionState: result.state }));
        };
      })
      .catch(() => {
        // Permissions API not available
      });
  }, []);

  // Check if cache is still valid
  const isCacheValid = useCallback(() => {
    if (!cachedCoords) return false;
    return Date.now() - cacheTimestamp < opts.cacheTimeMs;
  }, [opts.cacheTimeMs]);

  const requestLocation = useCallback(() => {
    // Return cached coordinates if still valid
    if (isCacheValid() && cachedCoords) {
      setState((prev) => ({
        ...prev,
        coordinates: cachedCoords,
        loading: false,
        error: null,
      }));
      return;
    }

    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Update cache
        cachedCoords = coords;
        cacheTimestamp = Date.now();

        setState((prev) => ({
          ...prev,
          coordinates: coords,
          loading: false,
          error: null,
        }));
      },
      (error) => {
        let errorMessage: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Unable to determine your location. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please check your connection.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting your location.';
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );
  }, [state.isSupported, isCacheValid, opts]);

  const clearLocation = useCallback(() => {
    cachedCoords = null;
    cacheTimestamp = 0;
    setState((prev) => ({
      ...prev,
      coordinates: null,
      error: null,
    }));
  }, []);

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
}
