import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map, Marker } from 'maplibre-gl';
import '../../styles/map.css';
import {
  DEFAULT_ZOOM,
  MAP_ATTRIBUTION,
  MAP_MAX_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
  OPENFREEMAP_STYLE_URL,
  RETIRO_CENTER,
} from '../../config/map';
import type { Place } from '../../types/place';
import type { ParkService } from '../../types/service';
import {
  countByCategory,
  filterPlacesByCategory,
  filterServicesByCategory,
  parseCategoryParam,
  type CategoryFilter,
} from '../../utils/filterPlaces';
import { getCategoryLabel } from '../../utils/categories';
import { getServiceTypeLabel } from '../../utils/serviceTypes';
import {
  GEO_STATUS_LABEL,
  geolocationErrorToState,
  isInsideRetiro,
  isSecureGeolocationContext,
  requestCurrentPosition,
  type GeoPermissionState,
  type UserLocation,
} from '../../utils/geolocation';
import { nearestItems, type NearbyItem } from '../../utils/nearby';
import { CategoryFilters } from './CategoryFilters';
import { createMarkerElement } from './markerFactory';
import {
  createServiceMarkerElement,
  createUserMarkerElement,
} from './serviceMarkerFactory';
import { NearbyList } from './NearbyList';
import { PlaceSheet } from '../places/PlaceSheet';
import { ServiceSheet } from '../places/ServiceSheet';

interface Props {
  places: Place[];
  services: ParkService[];
  baseUrl: string;
  initialCategory?: string;
  focusSlug?: string;
}

type Selection =
  | { kind: 'place'; id: string }
  | { kind: 'service'; id: string }
  | null;

function withBase(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

export default function MapExplorer({
  places,
  services,
  baseUrl,
  initialCategory,
  focusSlug,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const accuracySourceId = 'user-accuracy';
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>(() =>
    parseCategoryParam(initialCategory),
  );
  const [showServicesInTodos, setShowServicesInTodos] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [geoState, setGeoState] = useState<GeoPermissionState>('idle');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const filteredPlaces = useMemo(
    () => filterPlacesByCategory(places, category),
    [places, category],
  );
  const filteredServices = useMemo(
    () => filterServicesByCategory(services, category, showServicesInTodos),
    [services, category, showServicesInTodos],
  );
  const counts = useMemo(() => countByCategory(places, services), [places, services]);

  const selectedPlace =
    selection?.kind === 'place'
      ? (places.find((place) => place.id === selection.id) ?? null)
      : null;
  const selectedService =
    selection?.kind === 'service'
      ? (services.find((service) => service.id === selection.id) ?? null)
      : null;

  const nearby = useMemo(() => {
    if (!userLocation || !isInsideRetiro(userLocation.coordinates)) return [];
    return nearestItems(
      userLocation.coordinates,
      places,
      services,
      5,
      (place) => getCategoryLabel(place.category),
      (service) => getServiceTypeLabel(service.type),
      (place) => withBase(baseUrl, `lugares/${place.slug}/`),
    );
  }, [userLocation, places, services, baseUrl]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (category === 'todos') params.delete('categoria');
    else params.set('categoria', category);
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  }, [category]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      try {
        const maplibre = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        if (cancelled || !containerRef.current) return;

        const map = new maplibre.Map({
          container: containerRef.current,
          style: OPENFREEMAP_STYLE_URL,
          center: RETIRO_CENTER,
          zoom: DEFAULT_ZOOM,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          maxBounds: MAP_MAX_BOUNDS,
          attributionControl: false,
        });

        map.addControl(
          new maplibre.AttributionControl({
            compact: true,
            customAttribution: MAP_ATTRIBUTION,
          }),
          'bottom-right',
        );

        mapRef.current = map;
        // Listo para UI en cuanto existe el mapa; los marcadores esperan style/idle.
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setMapError('No se pudo cargar el mapa. Reintenta más tarde.');
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    let cancelled = false;

    async function syncMarkers() {
      const maplibre = await import('maplibre-gl');
      if (cancelled || !mapRef.current) return;
      const currentMap = mapRef.current;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      for (const place of filteredPlaces) {
        const el = createMarkerElement({
          category: place.category,
          label: place.name,
          active: selection?.kind === 'place' && selection.id === place.id,
          onClick: () => {
            setSelection({ kind: 'place', id: place.id });
            currentMap.easeTo({
              center: place.coordinates,
              zoom: Math.max(currentMap.getZoom(), 16),
              duration: 450,
              essential: true,
            });
          },
        });
        const marker = new maplibre.Marker({ element: el, anchor: 'center' })
          .setLngLat(place.coordinates)
          .addTo(currentMap);
        markersRef.current.push(marker);
      }

      for (const service of filteredServices) {
        const el = createServiceMarkerElement({
          type: service.type,
          label: service.name,
          active: selection?.kind === 'service' && selection.id === service.id,
          onClick: () => {
            setSelection({ kind: 'service', id: service.id });
            currentMap.easeTo({
              center: service.coordinates,
              zoom: Math.max(currentMap.getZoom(), 16),
              duration: 450,
              essential: true,
            });
          },
        });
        const marker = new maplibre.Marker({ element: el, anchor: 'center' })
          .setLngLat(service.coordinates)
          .addTo(currentMap);
        markersRef.current.push(marker);
      }
    }

    void syncMarkers();
    return () => {
      cancelled = true;
    };
  }, [filteredPlaces, filteredServices, ready, selection]);

  useEffect(() => {
    if (!ready || !focusSlug) return;
    const place = places.find((item) => item.slug === focusSlug);
    if (!place) return;
    setSelection({ kind: 'place', id: place.id });
    mapRef.current?.easeTo({
      center: place.coordinates,
      zoom: 16.5,
      duration: 600,
      essential: true,
    });
  }, [ready, focusSlug, places]);

  const clearUserLocation = () => {
    setUserLocation(null);
    setGeoState('idle');
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    const map = mapRef.current;
    if (map?.getSource(accuracySourceId)) {
      if (map.getLayer(`${accuracySourceId}-fill`)) map.removeLayer(`${accuracySourceId}-fill`);
      if (map.getLayer(`${accuracySourceId}-line`)) map.removeLayer(`${accuracySourceId}-line`);
      map.removeSource(accuracySourceId);
    }
    map?.easeTo({
      center: RETIRO_CENTER,
      zoom: DEFAULT_ZOOM,
      bearing: 0,
      pitch: 0,
      duration: 500,
      essential: true,
    });
  };

  const updateUserOnMap = async (location: UserLocation, inside: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const maplibre = await import('maplibre-gl');

    userMarkerRef.current?.remove();
    if (inside) {
      const el = createUserMarkerElement();
      userMarkerRef.current = new maplibre.Marker({ element: el, anchor: 'center' })
        .setLngLat(location.coordinates)
        .addTo(map);

      const radius = Math.min(Math.max(location.accuracy, 15), 120);
      const points = 64;
      const [lon, lat] = location.coordinates;
      const coords: [number, number][] = [];
      for (let i = 0; i <= points; i += 1) {
        const angle = (i / points) * Math.PI * 2;
        const dLat = (radius * Math.cos(angle)) / 111320;
        const dLon =
          (radius * Math.sin(angle)) /
          (111320 * Math.cos((lat * Math.PI) / 180));
        coords.push([lon + dLon, lat + dLat]);
      }

      if (map.getSource(accuracySourceId)) {
        (map.getSource(accuracySourceId) as GeoJSONSource).setData({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [coords] },
          properties: {},
        });
      } else {
        map.addSource(accuracySourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [coords] },
            properties: {},
          },
        });
        map.addLayer({
          id: `${accuracySourceId}-fill`,
          type: 'fill',
          source: accuracySourceId,
          paint: { 'fill-color': '#2F6F8F', 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: `${accuracySourceId}-line`,
          type: 'line',
          source: accuracySourceId,
          paint: { 'line-color': '#2F6F8F', 'line-width': 1.5, 'line-opacity': 0.45 },
        });
      }

      map.easeTo({
        center: location.coordinates,
        zoom: Math.min(Math.max(map.getZoom(), 15.5), 17),
        duration: 500,
        essential: true,
      });
    } else {
      userMarkerRef.current = null;
      if (map.getSource(accuracySourceId)) {
        if (map.getLayer(`${accuracySourceId}-fill`)) map.removeLayer(`${accuracySourceId}-fill`);
        if (map.getLayer(`${accuracySourceId}-line`)) map.removeLayer(`${accuracySourceId}-line`);
        map.removeSource(accuracySourceId);
      }
    }
  };

  const locateMe = async () => {
    if (!isSecureGeolocationContext()) {
      setGeoState('unavailable');
      return;
    }
    setGeoState('prompting');
    try {
      const location = await requestCurrentPosition();
      setUserLocation(location);
      const inside = isInsideRetiro(location.coordinates);
      setGeoState(inside ? 'inside' : 'outside');
      await updateUserOnMap(location, inside);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        setGeoState(geolocationErrorToState(error as GeolocationPositionError));
      } else {
        setGeoState('error');
      }
    }
  };

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 200, essential: true });
  };

  const resetView = () => {
    mapRef.current?.easeTo({
      center: RETIRO_CENTER,
      zoom: DEFAULT_ZOOM,
      bearing: 0,
      pitch: 0,
      duration: 500,
      essential: true,
    });
  };

  const focusNearby = (item: NearbyItem) => {
    mapRef.current?.easeTo({
      center: item.coordinates,
      zoom: 16.5,
      duration: 450,
      essential: true,
    });
    if (item.kind === 'place') setSelection({ kind: 'place', id: item.id });
    else setSelection({ kind: 'service', id: item.id });
  };

  const visibleCount = filteredPlaces.length + filteredServices.length;

  return (
    <section className="mapa-explorer" aria-label="Mapa del Parque del Retiro">
      <div className="mapa-toolbar">
        <div className="mapa-toolbar__row">
          <p className="mapa-toolbar__count" aria-live="polite">
            {visibleCount} {visibleCount === 1 ? 'punto' : 'puntos'} visibles
            {category !== 'todos' ? ' · filtro activo' : ''}
          </p>
          {category === 'todos' ? (
            <label className="mapa-toolbar__toggle">
              <input
                type="checkbox"
                checked={showServicesInTodos}
                onChange={(event) => setShowServicesInTodos(event.target.checked)}
              />
              Mostrar servicios
            </label>
          ) : null}
        </div>
        <CategoryFilters
          active={category}
          counts={counts}
          onChange={(next) => {
            setCategory(next);
            setSelection(null);
          }}
        />
      </div>

      <div className="mapa-canvas-wrap">
        {!ready && !mapError ? (
          <div className="mapa-loading" role="status" aria-live="polite">
            <div className="mapa-loading__pulse" aria-hidden="true" />
            <span>Cargando mapa del Retiro…</span>
          </div>
        ) : null}
        {mapError ? (
          <div className="mapa-loading" role="alert">
            <span>{mapError}</span>
          </div>
        ) : null}

        <div
          ref={containerRef}
          className="mapa-canvas"
          role="application"
          aria-label="Mapa interactivo del Parque del Retiro"
        />

        <div className="mapa-controls" role="group" aria-label="Controles del mapa">
          <button
            type="button"
            className="mapa-control-btn"
            onClick={() => zoomBy(1)}
            aria-label="Acercar mapa"
          >
            +
          </button>
          <button
            type="button"
            className="mapa-control-btn"
            onClick={() => zoomBy(-1)}
            aria-label="Alejar mapa"
          >
            −
          </button>
          <button
            type="button"
            className="mapa-control-btn"
            onClick={resetView}
            aria-label="Restablecer vista del Retiro"
            title="Restablecer vista"
          >
            ⌂
          </button>
          <button
            type="button"
            className="mapa-control-btn mapa-control-btn--wide"
            onClick={() => void locateMe()}
            aria-label="Mi ubicación"
            aria-describedby="geo-status"
            disabled={geoState === 'prompting'}
          >
            ◎
          </button>
          {userLocation ? (
            <button
              type="button"
              className="mapa-control-btn mapa-control-btn--wide"
              onClick={clearUserLocation}
              aria-label="Quitar mi ubicación y volver a la vista inicial"
            >
              ✕
            </button>
          ) : null}
        </div>

        <p id="geo-status" className="geo-status" role="status" aria-live="polite">
          {GEO_STATUS_LABEL[geoState]}
          {geoState === 'outside' ? (
            <>
              {' '}
              <button type="button" className="btn btn--secondary" onClick={resetView}>
                Volver al parque
              </button>
            </>
          ) : null}
        </p>

        {nearby.length > 0 ? <NearbyList items={nearby} onSelect={focusNearby} /> : null}

        {selectedPlace ? (
          <PlaceSheet
            place={selectedPlace}
            placeHref={withBase(baseUrl, `lugares/${selectedPlace.slug}/`)}
            onClose={() => setSelection(null)}
            variant={isDesktop ? 'desktop' : 'mobile'}
          />
        ) : null}
        {selectedService ? (
          <ServiceSheet
            service={selectedService}
            onClose={() => setSelection(null)}
            variant={isDesktop ? 'desktop' : 'mobile'}
          />
        ) : null}
      </div>
    </section>
  );
}
