import { RETIRO_PLACE_BOUNDS } from '../config/map';

export type GeoPermissionState =
  | 'idle'
  | 'prompting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error'
  | 'outside'
  | 'inside';

export interface UserLocation {
  coordinates: [number, number];
  accuracy: number;
}

export function isSecureGeolocationContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
}

export function isInsideRetiro(coordinates: [number, number]): boolean {
  const [lon, lat] = coordinates;
  return (
    lon >= RETIRO_PLACE_BOUNDS.minLon &&
    lon <= RETIRO_PLACE_BOUNDS.maxLon &&
    lat >= RETIRO_PLACE_BOUNDS.minLat &&
    lat <= RETIRO_PLACE_BOUNDS.maxLat
  );
}

export function geolocationErrorToState(
  error: GeolocationPositionError,
): Extract<GeoPermissionState, 'denied' | 'timeout' | 'unavailable' | 'error'> {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'denied';
    case error.POSITION_UNAVAILABLE:
      return 'unavailable';
    case error.TIMEOUT:
      return 'timeout';
    default:
      return 'error';
  }
}

export const GEO_STATUS_LABEL: Record<GeoPermissionState, string> = {
  idle: 'Ubicación no activada',
  prompting: 'Solicitando permiso de ubicación…',
  granted: 'Permiso concedido',
  denied: 'Permiso de ubicación denegado',
  unavailable: 'Ubicación no disponible',
  timeout: 'Tiempo de espera agotado al localizar',
  error: 'No se pudo obtener la ubicación',
  outside: 'Parece que estás fuera del Retiro',
  inside: 'Ubicación dentro del Retiro',
};

export function requestCurrentPosition(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!isSecureGeolocationContext() || !navigator.geolocation) {
      reject(Object.assign(new Error('unavailable'), { code: 2 }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coordinates: [pos.coords.longitude, pos.coords.latitude],
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  });
}
