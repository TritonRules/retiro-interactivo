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
import type { MapEventPoint } from '../../types/event';
import type { ParkEvent } from '../../types/event';
import type { Place } from '../../types/place';
import type { ParkService } from '../../types/service';
import type { ParkRoute } from '../../types/route';
import {
  countByCategory,
  filterPlacesByCategory,
  countServicesByGroup,
  filterServicesByCategory,
  filterServicesByGroup,
  parseCategoryParam,
  parseServiceGroupParam,
  servicesVisibleAtZoom,
  type CategoryFilter,
  type ServiceGroupFilter,
} from '../../utils/filterPlaces';
import { setBasemapServicePoisHidden } from '../../utils/basemapPois';
import { getCategoryLabel } from '../../utils/categories';
import { eventDetailPath } from '../../utils/eventLinks';
import { isFatalMapError, loadMaplibre, safeRemoveMap, supportsWebGL2 } from '../../utils/maplibre';
import {
  getServiceLabel,
  SERVICE_ZOOM_TIER_A,
  serviceMarkerPriority,
  serviceMinZoom,
} from '../../utils/serviceTypes';
import {
  applyMarkerZoom,
  applyStopMarkerLayout,
  eventGroupPriority,
  groupEventsByLocation,
  placeMarkerPriority,
  type ZoomableMarker,
  isHiddenAtZoom,
} from '../../utils/markerZoom';
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
import { formatDistance, formatDuration } from '../../utils/routes';
import { CategoryFilters } from './CategoryFilters';
import { ServiceGroupFilters } from './ServiceGroupFilters';
import { createMarkerElement } from './markerFactory';
import { createEventMarkerElement } from './eventMarkerFactory';
import { createServiceMarkerElement, createUserMarkerElement } from './serviceMarkerFactory';
import { NearbyList } from './NearbyList';
import { EventSheet } from '../places/EventSheet';
import { EventGroupSheet } from '../places/EventGroupSheet';
import { PlaceSheet } from '../places/PlaceSheet';
import { VideoBlock } from '../media/VideoBlock';
import { ServiceSheet } from '../places/ServiceSheet';
import { isUsableAsCurrentPlan } from '../../utils/eventFreshness';
import { compareByNextSession } from '../../utils/eventSchedule';
import { useParkClock } from '../../utils/useParkClock';
import { circlePolygon } from '../../utils/guidedWalk';
import { GuidedWalkPanel } from './GuidedWalkPanel';
import { useGuidedWalk } from './useGuidedWalk';

interface Props {
  places: Place[];
  services: ParkService[];
  /** Contorno del parque (OSM): oculta dentro los POI de servicio del mapa base. */
  parkBoundary?: [number, number][][];
  routes: ParkRoute[];
  events?: MapEventPoint[];
  baseUrl: string;
  initialCategory?: string;
  focusSlug?: string;
  initialRouteSlug?: string;
  initialEventSlug?: string;
}

type Selection =
  | { kind: 'place'; id: string }
  | { kind: 'service'; id: string }
  | { kind: 'event'; id: string }
  /** Varios eventos en la misma sede: se abre la lista para elegir uno. */
  | { kind: 'eventGroup'; id: string }
  | null;

const ROUTE_SOURCE = 'active-route';
const ROUTE_LINE = 'active-route-line';
const ACCURACY_SOURCE = 'user-accuracy';

function applyStopMarkerState(
  el: HTMLElement,
  index: number,
  state: { phase: string; index: number; visited: boolean[] },
) {
  const walking = state.phase !== 'idle';
  el.classList.toggle('is-visited', walking && Boolean(state.visited[index]));
  el.classList.toggle('is-next', state.phase === 'active' && state.index === index);
}

const MAP_UNAVAILABLE_MESSAGE =
  'No se puede mostrar el mapa en este navegador. Puedes seguir consultando lugares, rutas y agenda.';

function withBase(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

/** Dibuja (o actualiza) el círculo de precisión de la ubicación del usuario. */
function drawAccuracyCircle(map: Map, location: UserLocation) {
  const radius = Math.min(Math.max(location.accuracy, 15), 120);
  const data = {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [circlePolygon(location.coordinates, radius, 64)],
    },
    properties: {},
  };
  const source = map.getSource(ACCURACY_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(ACCURACY_SOURCE, { type: 'geojson', data });
  map.addLayer({
    id: `${ACCURACY_SOURCE}-fill`,
    type: 'fill',
    source: ACCURACY_SOURCE,
    paint: { 'fill-color': '#2F6F8F', 'fill-opacity': 0.12 },
  });
  map.addLayer({
    id: `${ACCURACY_SOURCE}-line`,
    type: 'line',
    source: ACCURACY_SOURCE,
    paint: { 'line-color': '#2F6F8F', 'line-width': 1.5, 'line-opacity': 0.45 },
  });
}

function removeAccuracyCircle(map: Map | null) {
  if (!map?.getSource(ACCURACY_SOURCE)) return;
  if (map.getLayer(`${ACCURACY_SOURCE}-fill`)) map.removeLayer(`${ACCURACY_SOURCE}-fill`);
  if (map.getLayer(`${ACCURACY_SOURCE}-line`)) map.removeLayer(`${ACCURACY_SOURCE}-line`);
  map.removeSource(ACCURACY_SOURCE);
}

/** Mapas cuyo estilo ya emitió `load`; no se cambia de estilo después. */
const styleLoadedMaps = new WeakSet<Map>();

/**
 * `addSource` y `addLayer` lanzan si el estilo aún no terminó de cargar.
 * Tras el primer `load` basta con eso: `isStyleLoaded()` vuelve a ser falso mientras cargan
 * teselas o se actualiza una fuente GeoJSON (el círculo de precisión del modo paseo) y
 * `load` ya no se emite de nuevo, así que esperar a él dejaría la promesa colgada.
 */
function whenStyleReady(map: Map): Promise<void> {
  if (styleLoadedMaps.has(map) || map.isStyleLoaded()) return Promise.resolve();
  return new Promise((resolve) => {
    map.once('load', () => resolve());
  });
}

/** En build estático Astro no ve `?ruta=`/`?lugar=`; leer en el cliente. */
function readClientMapQuery() {
  if (typeof window === 'undefined') {
    return {
      category: undefined as string | undefined,
      focusSlug: undefined as string | undefined,
      routeSlug: undefined as string | undefined,
      eventSlug: undefined as string | undefined,
      serviceGroup: undefined as string | undefined,
      walk: false,
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    category: params.get('categoria') ?? undefined,
    focusSlug: params.get('lugar') ?? undefined,
    routeSlug: params.get('ruta') ?? undefined,
    eventSlug: params.get('evento') ?? undefined,
    /** `?servicios=aseos`: chip de servicios (solo con `categoria=servicio`). */
    serviceGroup: params.get('servicios') ?? undefined,
    /** `?paseo=1`: viene del botón «Empezar ruta» de la ficha de la ruta. */
    walk: params.get('paseo') === '1',
  };
}

function asParkEvent(event: MapEventPoint): ParkEvent {
  return {
    shortDescription: event.title,
    sourceName: 'Agenda',
    sourceTier: 'A',
    confidence: 1,
    ...event,
  };
}

export default function MapExplorer({
  places,
  services,
  parkBoundary,
  routes,
  events = [],
  baseUrl,
  initialCategory,
  focusSlug,
  initialRouteSlug,
  initialEventSlug,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const zoomableMarkersRef = useRef<ZoomableMarker[]>([]);
  const stopMarkersRef = useRef<Marker[]>([]);
  /** Pide recalcular escala, plegado y separación de marcadores en el próximo frame. */
  const scheduleMarkerLayoutRef = useRef<() => void>(() => {});
  const userMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [queryReady, setQueryReady] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>('todos');
  // Servicios visibles por defecto en «Todos»: aparecen al acercar (ver serviceMinZoom).
  const [showServicesInTodos, setShowServicesInTodos] = useState(true);
  const [serviceGroup, setServiceGroup] = useState<ServiceGroupFilter>('todos');
  /** Zoom al terminar cada movimiento: recuento de puntos visibles y aviso «al acercar». */
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [showEvents, setShowEvents] = useState(false);
  const [activeRouteSlug, setActiveRouteSlug] = useState<string | null>(null);
  const [focusSlugState, setFocusSlugState] = useState<string | undefined>(undefined);
  const [eventSlugState, setEventSlugState] = useState<string | undefined>(undefined);
  const [selection, setSelection] = useState<Selection>(null);
  const [geoState, setGeoState] = useState<GeoPermissionState>('idle');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [pendingWalk, setPendingWalk] = useState(false);
  const [followUser, setFollowUser] = useState(true);

  useEffect(() => {
    const q = readClientMapQuery();
    setCategory(parseCategoryParam(q.category ?? initialCategory));
    setServiceGroup(parseServiceGroupParam(q.serviceGroup));
    setActiveRouteSlug(q.routeSlug ?? initialRouteSlug ?? null);
    setFocusSlugState(q.focusSlug ?? focusSlug);
    setEventSlugState(q.eventSlug ?? initialEventSlug);
    setPendingWalk(q.walk);
    setQueryReady(true);
  }, [initialCategory, initialRouteSlug, focusSlug, initialEventSlug]);

  const activeRoute = useMemo(
    () => routes.find((route) => route.slug === activeRouteSlug) ?? null,
    [routes, activeRouteSlug],
  );

  const walk = useGuidedWalk({
    route: activeRoute,
    places,
    onArrive: (stop) => setSelection({ kind: 'place', id: stop.id }),
  });
  const walking = walk.state.phase !== 'idle';
  const walkRef = useRef(walk.state);
  walkRef.current = walk.state;
  const selectedPlaceId = selection?.kind === 'place' ? selection.id : null;
  const selectionRef = useRef<string | null>(null);
  selectionRef.current = selectedPlaceId;

  const filteredPlaces = useMemo(
    () => filterPlacesByCategory(places, category),
    [places, category],
  );
  const filteredServices = useMemo(
    () =>
      filterServicesByGroup(
        filterServicesByCategory(services, category, showServicesInTodos),
        category === 'servicio' ? serviceGroup : 'todos',
      ),
    [services, category, showServicesInTodos, serviceGroup],
  );
  // En «Todos» los servicios aparecen progresivamente al acercar; con «Servicio», siempre.
  const servicesZoomGated = category === 'todos';
  const serviceGroupCounts = useMemo(() => countServicesByGroup(services), [services]);
  const now = useParkClock();
  const visibleEvents = useMemo(
    () =>
      events
        .filter((item) => isUsableAsCurrentPlan(asParkEvent(item), now))
        .sort((a, b) => compareByNextSession(asParkEvent(a), asParkEvent(b), now)),
    [events, now],
  );
  // Eventos en la misma sede comparten marcador con insignia de número.
  const eventGroups = useMemo(
    () => (showEvents && !activeRoute ? groupEventsByLocation(visibleEvents) : []),
    [showEvents, activeRoute, visibleEvents],
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
  const selectedEvent =
    selection?.kind === 'event'
      ? (events.find((event) => event.id === selection.id) ?? null)
      : null;
  const selectedEventGroup =
    selection?.kind === 'eventGroup'
      ? (eventGroups.find((group) => group.id === selection.id) ?? null)
      : null;

  const nearby = useMemo(() => {
    if (!userLocation || !isInsideRetiro(userLocation.coordinates)) return [];
    return nearestItems(
      userLocation.coordinates,
      places,
      services,
      5,
      (place) => getCategoryLabel(place.category),
      (service) => getServiceLabel(service),
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
    if (!queryReady) return;
    const params = new URLSearchParams(window.location.search);
    if (category === 'todos') params.delete('categoria');
    else params.set('categoria', category);
    if (category === 'servicio' && serviceGroup !== 'todos') params.set('servicios', serviceGroup);
    else params.delete('servicios');
    // `paseo` solo arranca el modo paseo al llegar; no se conserva al compartir o recargar.
    params.delete('paseo');
    if (activeRouteSlug) params.set('ruta', activeRouteSlug);
    else {
      params.delete('ruta');
      params.delete('escenario');
    }
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  }, [category, serviceGroup, activeRouteSlug, queryReady]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      if (!supportsWebGL2()) {
        setMapError(MAP_UNAVAILABLE_MESSAGE);
        return;
      }
      let map: Map | null = null;
      try {
        const maplibre = await loadMaplibre();
        await import('maplibre-gl/dist/maplibre-gl.css');
        if (cancelled || !containerRef.current) return;

        map = new maplibre.Map({
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

        const createdMap = map;
        const onInitError = (event: { error?: unknown }) => {
          if (!isFatalMapError(event.error)) return;
          createdMap.off('error', onInitError);
          if (mapRef.current === createdMap) mapRef.current = null;
          safeRemoveMap(createdMap);
          if (!cancelled) {
            setReady(false);
            setMapError(MAP_UNAVAILABLE_MESSAGE);
          }
        };
        map.on('error', onInitError);
        map.once('load', () => {
          styleLoadedMaps.add(createdMap);
          createdMap.off('error', onInitError);
        });

        mapRef.current = map;
        if (!cancelled) setReady(true);
      } catch {
        safeRemoveMap(map);
        if (!cancelled) setMapError(MAP_UNAVAILABLE_MESSAGE);
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      stopMarkersRef.current.forEach((marker) => marker.remove());
      stopMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      safeRemoveMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    let cancelled = false;

    async function syncMarkers() {
      const maplibre = await loadMaplibre();
      if (cancelled || !mapRef.current) return;
      const currentMap = mapRef.current;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      zoomableMarkersRef.current = [];

      // Con ruta activa, priorizamos paradas; marcadores generales se ocultan para no saturar.
      if (activeRoute) return;

      for (const place of filteredPlaces) {
        const active = selection?.kind === 'place' && selection.id === place.id;
        const el = createMarkerElement({
          category: place.category,
          label: place.name,
          active,
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
        zoomableMarkersRef.current.push({
          id: `place:${place.id}`,
          element: el,
          lngLat: place.coordinates,
          priority: placeMarkerPriority(place.category),
          pinned: active,
          // Con un filtro de categoría activo se ve todo lo filtrado; en «Todos», las
          // piezas menores (estatuas) aparecen por tramos de zoom.
          minZoom: category === 'todos' ? place.mapMinZoom : undefined,
        });
      }

      for (const service of filteredServices) {
        const active = selection?.kind === 'service' && selection.id === service.id;
        const el = createServiceMarkerElement({
          service,
          label: service.name,
          active,
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
        zoomableMarkersRef.current.push({
          id: `service:${service.id}`,
          element: el,
          lngLat: service.coordinates,
          priority: serviceMarkerPriority(service),
          pinned: active,
          minZoom: servicesZoomGated ? serviceMinZoom(service) : undefined,
        });
      }

      for (const group of eventGroups) {
        const single = group.events.length === 1;
        const active =
          (selection?.kind === 'eventGroup' && selection.id === group.id) ||
          (selection?.kind === 'event' && group.events.some((item) => item.id === selection.id));
        const el = createEventMarkerElement({
          label: single ? group.events[0].title : group.events[0].venue,
          count: group.events.length,
          active,
          onClick: () => {
            setSelection(
              single
                ? { kind: 'event', id: group.events[0].id }
                : { kind: 'eventGroup', id: group.id },
            );
            currentMap.easeTo({
              center: group.coordinates,
              zoom: Math.max(currentMap.getZoom(), 16),
              duration: 450,
              essential: true,
            });
          },
        });
        const marker = new maplibre.Marker({ element: el, anchor: 'center' })
          .setLngLat(group.coordinates)
          .addTo(currentMap);
        markersRef.current.push(marker);
        zoomableMarkersRef.current.push({
          id: group.id,
          element: el,
          lngLat: group.coordinates,
          priority: eventGroupPriority(group.events.length),
          pinned: active,
        });
      }

      applyMarkerZoom(currentMap, zoomableMarkersRef.current);
    }

    void syncMarkers();
    return () => {
      cancelled = true;
    };
  }, [
    filteredPlaces,
    filteredServices,
    servicesZoomGated,
    eventGroups,
    ready,
    selection,
    activeRoute,
    category,
  ]);

  // Zoom tras cada movimiento (no en cada frame): recuento visible y aviso de servicios.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const update = () => setMapZoom(Math.round(map.getZoom() * 100) / 100);
    update();
    map.on('zoomend', update);
    return () => {
      map.off('zoomend', update);
    };
  }, [ready]);

  // Dentro del parque, los iconos grises del mapa base (cafés, aseos, fuentes…) ceden el
  // sitio a los servicios de la app; si el usuario oculta los servicios, vuelven.
  const servicesShown =
    !activeRoute && (category === 'servicio' || (category === 'todos' && showServicesInTodos));
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !parkBoundary?.length) return;
    let cancelled = false;
    void whenStyleReady(map).then(() => {
      if (cancelled || mapRef.current !== map) return;
      setBasemapServicePoisHidden(map, parkBoundary, servicesShown);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, parkBoundary, servicesShown]);

  // Iconos, eventos y paradas adaptados al zoom: escala, plegado y separación de
  // paradas se recalculan como mucho una vez por frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (mapRef.current !== map) return;
      applyMarkerZoom(map, zoomableMarkersRef.current);
      const user = userMarkerRef.current?.getLngLat();
      applyStopMarkerLayout(map, stopMarkersRef.current, user ? [user.lng, user.lat] : null);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    scheduleMarkerLayoutRef.current = schedule;
    map.on('zoom', schedule);
    map.on('resize', schedule);
    map.on('rotate', schedule);
    map.on('pitchend', schedule);
    schedule();
    return () => {
      scheduleMarkerLayoutRef.current = () => {};
      map.off('zoom', schedule);
      map.off('resize', schedule);
      map.off('rotate', schedule);
      map.off('pitchend', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    async function syncRoute() {
      const maplibre = await loadMaplibre();
      if (cancelled || !mapRef.current) return;
      const currentMap = mapRef.current;

      await whenStyleReady(currentMap);
      if (cancelled || mapRef.current !== currentMap) return;

      stopMarkersRef.current.forEach((marker) => marker.remove());
      stopMarkersRef.current = [];

      if (currentMap.getLayer(ROUTE_LINE)) currentMap.removeLayer(ROUTE_LINE);
      if (currentMap.getSource(ROUTE_SOURCE)) currentMap.removeSource(ROUTE_SOURCE);

      if (!activeRoute) return;

      currentMap.addSource(ROUTE_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { id: activeRoute.id },
          geometry: activeRoute.geometry,
        },
      });
      currentMap.addLayer({
        id: ROUTE_LINE,
        type: 'line',
        source: ROUTE_SOURCE,
        paint: {
          'line-color': '#c45c26',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });

      activeRoute.stopIds.forEach((stopId, index) => {
        const place = places.find((item) => item.id === stopId);
        if (!place) return;
        // Botón de 44 px (área táctil) con el número dentro; la insignia escala con el zoom.
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'route-stop-marker';
        el.dataset.stopIndex = String(index);
        el.dataset.placeId = place.id;
        applyStopMarkerState(el, index, walkRef.current);
        el.classList.toggle('is-active', selectionRef.current === place.id);
        const badge = document.createElement('span');
        badge.className = 'route-stop-marker__badge';
        badge.textContent = String(index + 1);
        el.appendChild(badge);
        el.setAttribute('aria-label', `Parada ${index + 1}: ${place.name}`);
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          setSelection({ kind: 'place', id: place.id });
          currentMap.easeTo({
            center: place.coordinates,
            zoom: Math.max(currentMap.getZoom(), 16),
            duration: 400,
            essential: true,
          });
        });
        const marker = new maplibre.Marker({ element: el, anchor: 'center' })
          .setLngLat(place.coordinates)
          .addTo(currentMap);
        stopMarkersRef.current.push(marker);
      });
      scheduleMarkerLayoutRef.current();

      const bounds = activeRoute.geometry.coordinates.reduce(
        (acc, coord) => {
          acc[0][0] = Math.min(acc[0][0], coord[0]);
          acc[0][1] = Math.min(acc[0][1], coord[1]);
          acc[1][0] = Math.max(acc[1][0], coord[0]);
          acc[1][1] = Math.max(acc[1][1], coord[1]);
          return acc;
        },
        [
          [Infinity, Infinity],
          [-Infinity, -Infinity],
        ] as [[number, number], [number, number]],
      );
      currentMap.fitBounds(bounds, { padding: 56, duration: 700, maxZoom: 16.5 });
    }

    void syncRoute();
    return () => {
      cancelled = true;
    };
  }, [activeRoute, places, ready]);

  useEffect(() => {
    if ((!ready && !mapError) || !focusSlugState) return;
    const place = places.find((item) => item.slug === focusSlugState);
    if (!place) return;
    setSelection({ kind: 'place', id: place.id });
    mapRef.current?.easeTo({
      center: place.coordinates,
      zoom: 16.5,
      duration: 600,
      essential: true,
    });
  }, [ready, mapError, focusSlugState, places]);

  useEffect(() => {
    if ((!ready && !mapError) || !eventSlugState) return;
    const event = events.find((item) => item.slug === eventSlugState);
    if (!event) return;
    setShowEvents(true);
    setSelection({ kind: 'event', id: event.id });
    mapRef.current?.easeTo({
      center: event.coordinates,
      zoom: 16.5,
      duration: 600,
      essential: true,
    });
  }, [ready, mapError, eventSlugState, events]);

  const clearUserLocation = () => {
    setUserLocation(null);
    setGeoState('idle');
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    scheduleMarkerLayoutRef.current();
    const map = mapRef.current;
    removeAccuracyCircle(map);
    map?.easeTo({
      center: RETIRO_CENTER,
      zoom: DEFAULT_ZOOM,
      bearing: 0,
      pitch: 0,
      duration: 500,
      essential: true,
    });
  };

  /** Coloca (o mueve) el punto azul y su círculo de precisión. */
  const latestUserLocationRef = useRef<UserLocation | null>(null);
  const placeUserMarker = async (map: Map, location: UserLocation) => {
    latestUserLocationRef.current = location;
    const maplibre = await loadMaplibre();
    if (mapRef.current !== map || latestUserLocationRef.current !== location) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(location.coordinates);
    } else {
      const el = createUserMarkerElement();
      userMarkerRef.current = new maplibre.Marker({ element: el, anchor: 'center' })
        .setLngLat(location.coordinates)
        .addTo(map);
    }
    // Las paradas cercanas se apartan del punto para que no tape su número.
    scheduleMarkerLayoutRef.current();
    // Actualizar una fuente existente no exige esperar al estilo.
    if (!map.getSource(ACCURACY_SOURCE)) await whenStyleReady(map);
    if (mapRef.current !== map || !userMarkerRef.current) return;
    drawAccuracyCircle(map, latestUserLocationRef.current ?? location);
  };

  const removeUserMarker = () => {
    latestUserLocationRef.current = null;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    removeAccuracyCircle(mapRef.current);
    scheduleMarkerLayoutRef.current();
  };

  const updateUserOnMap = async (location: UserLocation, inside: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    if (inside) {
      await placeUserMarker(map, location);
      map.easeTo({
        center: location.coordinates,
        zoom: Math.min(Math.max(map.getZoom(), 15.5), 17),
        duration: 500,
        essential: true,
      });
    } else {
      removeUserMarker();
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

  // «Empezar ruta» desde la ficha de la ruta (`?ruta=…&paseo=1`).
  useEffect(() => {
    if (!pendingWalk || !queryReady) return;
    setPendingWalk(false);
    if (activeRoute) {
      setFollowUser(true);
      walk.start();
    }
  }, [pendingWalk, queryReady, activeRoute, walk.start]);

  // Paradas visitadas / siguiente en los marcadores numerados.
  useEffect(() => {
    for (const marker of stopMarkersRef.current) {
      const el = marker.getElement();
      const index = Number(el.dataset.stopIndex);
      if (Number.isFinite(index)) applyStopMarkerState(el, index, walk.state);
    }
    // La siguiente parada va a tamaño completo: recolocar las vecinas.
    scheduleMarkerLayoutRef.current();
  }, [walk.state]);

  // Parada seleccionada: tamaño completo y por encima de las demás.
  useEffect(() => {
    for (const marker of stopMarkersRef.current) {
      const el = marker.getElement();
      el.classList.toggle(
        'is-active',
        selectedPlaceId !== null && el.dataset.placeId === selectedPlaceId,
      );
    }
    scheduleMarkerLayoutRef.current();
  }, [selectedPlaceId]);

  // Posición en vivo durante el paseo: punto + precisión, y seguimiento opcional.
  const walkPosition = walk.position;
  const walkPositionVisible =
    walking &&
    walkPosition !== null &&
    (walk.source === 'demo' || isInsideRetiro(walkPosition.coordinates));
  const followZoomedRef = useRef(false);
  useEffect(() => {
    if (!followUser) followZoomedRef.current = false;
  }, [followUser]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!walkPositionVisible || !walkPosition) {
      if (!userLocation) removeUserMarker();
      return;
    }
    let cancelled = false;
    void placeUserMarker(map, walkPosition).then(() => {
      if (cancelled || !followUser || mapRef.current !== map) return;
      // Deja libre la parte del mapa que tapa la ficha abierta.
      const sheet =
        containerRef.current?.parentElement?.querySelector<HTMLElement>('.ficha--mobile');
      const bottom = sheet
        ? Math.min(sheet.offsetHeight, map.getContainer().clientHeight * 0.6)
        : 0;
      // Al empezar a seguir se acerca el mapa; después se respeta el zoom elegido.
      // (se da por hecho cuando el zoom llega de verdad, por si una animación se interrumpe).
      if (map.getZoom() >= 16.4) followZoomedRef.current = true;
      const zoom = followZoomedRef.current ? map.getZoom() : Math.max(map.getZoom(), 16.5);
      map.easeTo({
        center: walkPosition.coordinates,
        zoom,
        padding: { top: 0, right: 0, left: 0, bottom },
        duration: 600,
        essential: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [walkPosition, walkPositionVisible, followUser, ready, selection]);

  // Si el usuario arrastra el mapa, se deja de seguir su posición hasta pulsar «Centrar».
  const walkingRef = useRef(false);
  walkingRef.current = walking;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const stopFollowing = () => {
      if (walkingRef.current) setFollowUser(false);
    };
    map.on('dragstart', stopFollowing);
    return () => {
      map.off('dragstart', stopFollowing);
    };
  }, [ready]);

  const startWalk = () => {
    setFollowUser(true);
    setSelection(null);
    walk.start();
  };

  const finishWalk = () => {
    walk.finish();
    setSelection(null);
    setFollowUser(true);
  };

  const showWalkStop = (index: number) => {
    const stop = walk.stops[index];
    if (!stop) return;
    setSelection({ kind: 'place', id: stop.id });
    setFollowUser(false);
    mapRef.current?.easeTo({
      center: stop.coordinates,
      zoom: Math.max(mapRef.current.getZoom(), 16.5),
      duration: 400,
      essential: true,
    });
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

  const clearRoute = () => {
    setActiveRouteSlug(null);
    setSelection(null);
    resetView();
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

  const shareActiveRoute = async () => {
    if (!activeRoute) return;
    const url = new URL(window.location.href);
    url.searchParams.set('ruta', activeRoute.slug);
    try {
      if (navigator.share) {
        await navigator.share({ title: activeRoute.name, url: url.toString() });
        return;
      }
    } catch {
      /* cancel */
    }
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      /* ignore */
    }
  };

  const visibleServices = servicesVisibleAtZoom(filteredServices, mapZoom, servicesZoomGated);
  // En «Todos», las estatuas con `mapMinZoom` tampoco cuentan hasta que aparecen.
  const visiblePlaceCount =
    category === 'todos'
      ? filteredPlaces.filter((place) => !isHiddenAtZoom(mapZoom, place.mapMinZoom)).length
      : filteredPlaces.length;
  const visibleCount = activeRoute
    ? activeRoute.stopIds.length
    : visiblePlaceCount + visibleServices.length + (showEvents ? visibleEvents.length : 0);
  const servicesAppearOnZoom =
    !activeRoute &&
    servicesZoomGated &&
    showServicesInTodos &&
    !mapError &&
    mapZoom < SERVICE_ZOOM_TIER_A;

  return (
    <section className="mapa-explorer" aria-label="Mapa del Parque del Retiro">
      <div className="mapa-toolbar">
        <div className="mapa-toolbar__row">
          <p className="mapa-toolbar__count" aria-live="polite">
            {visibleCount} {visibleCount === 1 ? 'punto' : 'puntos'} visibles
            {activeRoute
              ? walking
                ? ' · paseo activo'
                : ' · ruta activa'
              : category !== 'todos'
                ? ' · filtro activo'
                : servicesAppearOnZoom
                  ? ' · acerca para ver servicios'
                  : ''}
          </p>
          {!activeRoute && category === 'todos' ? (
            <label className="mapa-toolbar__toggle">
              <input
                type="checkbox"
                checked={showServicesInTodos}
                onChange={(event) => setShowServicesInTodos(event.target.checked)}
              />
              Mostrar servicios
            </label>
          ) : null}
          {!activeRoute ? (
            <label className="mapa-toolbar__toggle">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={(event) => setShowEvents(event.target.checked)}
              />
              Eventos
            </label>
          ) : null}
        </div>
        {!activeRoute ? (
          <CategoryFilters
            active={category}
            counts={counts}
            onChange={(next) => {
              setCategory(next);
              setSelection(null);
            }}
          />
        ) : null}
        {!activeRoute && category === 'servicio' ? (
          <ServiceGroupFilters
            active={serviceGroup}
            counts={serviceGroupCounts}
            onChange={(next) => {
              setServiceGroup(next);
              setSelection(null);
            }}
          />
        ) : null}
      </div>

      {activeRoute && walking ? (
        <GuidedWalkPanel
          walk={walk}
          routeName={activeRoute.name}
          onFinish={finishWalk}
          onShowStop={showWalkStop}
        />
      ) : null}

      {activeRoute && !walking ? (
        <div className="route-active-card" role="region" aria-label="Ruta activa">
          <div>
            <strong>{activeRoute.name}</strong>
            <p>
              {formatDuration(activeRoute.estimatedDurationMinutes)} ·{' '}
              {formatDistance(activeRoute.approximateDistanceMeters)} · {activeRoute.stopIds.length}{' '}
              paradas
            </p>
            <p className="route-active-card__note">
              Recorrido orientativo. Sin navegación giro a giro. Condiciones del parque pueden
              variar.
            </p>
          </div>
          <div className="route-active-card__actions">
            <button type="button" className="btn btn--primary" onClick={startWalk}>
              Empezar ruta
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => void locateMe()}>
              Usar mi ubicación
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void shareActiveRoute()}
            >
              Compartir
            </button>
            <button type="button" className="btn btn--secondary" onClick={clearRoute}>
              Cerrar ruta
            </button>
          </div>
          <ol className="route-active-card__stops">
            {activeRoute.stopIds.map((stopId, index) => {
              const place = places.find((item) => item.id === stopId);
              if (!place) return null;
              return (
                <li key={`${stopId}-${index}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelection({ kind: 'place', id: place.id });
                      mapRef.current?.easeTo({
                        center: place.coordinates,
                        zoom: 16.5,
                        duration: 400,
                        essential: true,
                      });
                    }}
                  >
                    {index + 1}. {place.name}
                  </button>
                </li>
              );
            })}
          </ol>
          <VideoBlock
            key={activeRoute.id}
            videos={activeRoute.videos}
            collapsible
            readScenarioFromUrl
          />
        </div>
      ) : null}

      <div className="mapa-canvas-wrap">
        {!ready && !mapError ? (
          <div className="mapa-loading" role="status" aria-live="polite">
            <div className="mapa-loading__pulse" aria-hidden="true" />
            <span>Cargando mapa del Retiro…</span>
          </div>
        ) : null}
        {mapError ? (
          <div className="mapa-loading mapa-unavailable" role="alert">
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
          {walking ? (
            walkPositionVisible && !followUser ? (
              <button
                type="button"
                className="mapa-control-btn mapa-control-btn--wide mapa-control-btn--accent"
                onClick={() => setFollowUser(true)}
                aria-label="Centrar en mi posición y seguirla"
                title="Centrar en mi posición"
              >
                ⌖
              </button>
            ) : null
          ) : (
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
          )}
          {userLocation && !walking ? (
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

        {!walking ? (
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
        ) : null}

        {nearby.length > 0 && !activeRoute ? (
          <NearbyList items={nearby} onSelect={focusNearby} />
        ) : null}

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
        {selectedEventGroup ? (
          <EventGroupSheet
            events={selectedEventGroup.events}
            venue={selectedEventGroup.events[0].venue}
            onSelect={(id) => setSelection({ kind: 'event', id })}
            onClose={() => setSelection(null)}
            variant={isDesktop ? 'desktop' : 'mobile'}
          />
        ) : null}
        {selectedEvent ? (
          <EventSheet
            event={selectedEvent}
            eventHref={withBase(baseUrl, eventDetailPath(selectedEvent.slug))}
            onClose={() => setSelection(null)}
            variant={isDesktop ? 'desktop' : 'mobile'}
          />
        ) : null}
      </div>
    </section>
  );
}
