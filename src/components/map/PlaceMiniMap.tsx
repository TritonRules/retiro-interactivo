import { useEffect, useRef, useState } from 'react';
import '../../styles/map.css';
import {
  MAP_ATTRIBUTION,
  MAP_MAX_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
  OPENFREEMAP_STYLE_URL,
} from '../../config/map';
import type { Place } from '../../types/place';
import { loadMaplibre, safeRemoveMap, supportsWebGL2 } from '../../utils/maplibre';
import { createMarkerElement } from './markerFactory';

interface Props {
  place: Place;
}

export default function PlaceMiniMap({ place }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: import('maplibre-gl').Map | null = null;
    let marker: import('maplibre-gl').Marker | null = null;

    async function init() {
      if (!ref.current) return;
      if (!supportsWebGL2()) {
        setUnavailable(true);
        return;
      }
      const maplibre = await loadMaplibre();
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !ref.current) return;

      map = new maplibre.Map({
        container: ref.current,
        style: OPENFREEMAP_STYLE_URL,
        center: place.coordinates,
        zoom: 16.2,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        maxBounds: MAP_MAX_BOUNDS,
        interactive: false,
        attributionControl: false,
      });

      map.addControl(
        new maplibre.AttributionControl({
          compact: true,
          customAttribution: MAP_ATTRIBUTION,
        }),
        'bottom-right',
      );

      marker = new maplibre.Marker({
        element: createMarkerElement({
          category: place.category,
          label: place.name,
          active: true,
        }),
        anchor: 'center',
      })
        .setLngLat(place.coordinates)
        .addTo(map);

      map.on('load', () => {
        if (!cancelled) setReady(true);
      });
      map.once('idle', () => {
        if (!cancelled) setReady(true);
      });
      if (map.loaded() && !cancelled) setReady(true);
    }

    init().catch(() => {
      if (!cancelled) setUnavailable(true);
    });

    return () => {
      cancelled = true;
      marker?.remove();
      safeRemoveMap(map);
    };
  }, [place]);

  return (
    <div className="place-mini-map" aria-label={`Mapa de ${place.name}`}>
      {unavailable ? (
        <div className="mapa-loading mapa-unavailable" role="note">
          <span>No se puede mostrar el mapa en este navegador.</span>
        </div>
      ) : !ready ? (
        <div className="mapa-loading" role="status">
          <div className="mapa-loading__pulse" aria-hidden="true" />
          <span>Cargando mapa…</span>
        </div>
      ) : null}
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
