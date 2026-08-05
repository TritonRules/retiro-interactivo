import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  type Map,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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
import {
  countByCategory,
  filterPlacesByCategory,
  parseCategoryParam,
  type CategoryFilter,
} from '../../utils/filterPlaces';
import { CategoryFilters } from './CategoryFilters';
import { createMarkerElement } from './markerFactory';
import { PlaceSheet } from '../places/PlaceSheet';

interface Props {
  places: Place[];
  baseUrl: string;
  initialCategory?: string;
  focusSlug?: string;
}

function withBase(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

export default function MapExplorer({
  places,
  baseUrl,
  initialCategory,
  focusSlug,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>(() =>
    parseCategoryParam(initialCategory),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterPlacesByCategory(places, category),
    [places, category],
  );
  const counts = useMemo(() => countByCategory(places), [places]);
  const selected = places.find((place) => place.id === selectedId) ?? null;

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (category === 'todos') {
      params.delete('categoria');
    } else {
      params.set('categoria', category);
    }
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  }, [category]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: RETIRO_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: MAP_MAX_BOUNDS,
      attributionControl: false,
      locale: {
        'AttributionControl.ToggleAttribution': 'Alternar atribución',
        'NavigationControl.ZoomIn': 'Acercar',
        'NavigationControl.ZoomOut': 'Alejar',
        'NavigationControl.ResetBearing': 'Restablecer orientación',
      },
    });

    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: MAP_ATTRIBUTION,
      }),
      'bottom-right',
    );

    map.on('load', () => setReady(true));
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const place of filtered) {
      const el = createMarkerElement({
        category: place.category,
        label: place.name,
        active: place.id === selectedId,
        onClick: () => {
          setSelectedId(place.id);
          map.easeTo({
            center: place.coordinates,
            zoom: Math.max(map.getZoom(), 16),
            duration: 450,
            essential: true,
          });
        },
      });

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat(place.coordinates)
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [filtered, ready, selectedId]);

  useEffect(() => {
    if (!ready || !focusSlug) return;
    const place = places.find((item) => item.slug === focusSlug);
    if (!place) return;
    setSelectedId(place.id);
    mapRef.current?.easeTo({
      center: place.coordinates,
      zoom: 16.5,
      duration: 600,
      essential: true,
    });
  }, [ready, focusSlug, places]);

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

  return (
    <section className="mapa-explorer" aria-label="Mapa del Parque del Retiro">
      <div className="mapa-toolbar">
        <div className="mapa-toolbar__row">
          <p className="mapa-toolbar__count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'lugar' : 'lugares'} visibles
            {category !== 'todos' ? ' · filtro activo' : ''}
          </p>
        </div>
        <CategoryFilters
          active={category}
          counts={counts}
          onChange={(next) => {
            setCategory(next);
            setSelectedId(null);
          }}
        />
      </div>

      <div className="mapa-canvas-wrap">
        {!ready ? (
          <div className="mapa-loading" role="status" aria-live="polite">
            <div className="mapa-loading__pulse" aria-hidden="true" />
            <span>Cargando mapa del Retiro…</span>
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
        </div>

        {selected ? (
          <PlaceSheet
            place={selected}
            placeHref={withBase(baseUrl, `lugares/${selected.slug}/`)}
            onClose={() => setSelectedId(null)}
            variant={isDesktop ? 'desktop' : 'mobile'}
          />
        ) : null}
      </div>
    </section>
  );
}
