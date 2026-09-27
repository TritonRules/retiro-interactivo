import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Place } from '../../types/place';
import type { ParkRoute } from '../../types/route';
import {
  geolocationErrorToState,
  isInsideRetiro,
  isSecureGeolocationContext,
  type GeoPermissionState,
} from '../../utils/geolocation';
import {
  DEMO_TICK_MS,
  buildWalkStops,
  demoPositionAt,
  detectArrival,
  initialWalkState,
  walkReducer,
  type WalkPosition,
  type WalkStop,
} from '../../utils/guidedWalk';

export type WalkSource = 'gps' | 'demo';

interface Options {
  route: ParkRoute | null;
  places: Place[];
  /** Se llama al llegar a una parada (abrir su ficha, anunciarla…). */
  onArrive: (stop: WalkStop, index: number) => void;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 20000,
};

/**
 * Modo paseo: `watchPosition` solo mientras el paseo está activo y la página visible,
 * o un recorrido simulado (modo demostración). Nada sale del dispositivo.
 */
export function useGuidedWalk({ route, places, onArrive }: Options) {
  const [state, dispatch] = useReducer(walkReducer, initialWalkState);
  const [source, setSource] = useState<WalkSource>('gps');
  const [geo, setGeo] = useState<GeoPermissionState>('idle');
  const [position, setPosition] = useState<WalkPosition | null>(null);
  const [visible, setVisible] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  const stops = useMemo<WalkStop[]>(() => {
    if (!route) return [];
    const resolved = route.stopIds
      .map((id) => places.find((place) => place.id === id))
      .filter((place): place is Place => Boolean(place))
      .map((place) => ({ id: place.id, name: place.name, coordinates: place.coordinates }));
    return buildWalkStops(resolved, route.geometry.coordinates);
  }, [route, places]);

  const active = state.phase === 'active';

  // Pausa real en segundo plano: sin página visible no se vigila la posición.
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  // GPS real.
  useEffect(() => {
    if (!active || source !== 'gps' || !visible) return;
    if (!isSecureGeolocationContext() || !('geolocation' in navigator)) {
      setGeo('unavailable');
      return;
    }
    let cleared = false;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (cleared) return;
        const next: WalkPosition = {
          coordinates: [pos.coords.longitude, pos.coords.latitude],
          accuracy: pos.coords.accuracy,
        };
        setPosition(next);
        setGeo(isInsideRetiro(next.coordinates) ? 'inside' : 'outside');
      },
      (error) => {
        if (cleared) return;
        const nextState = geolocationErrorToState(error);
        setGeo(nextState);
        if (nextState === 'denied') {
          cleared = true;
          navigator.geolocation.clearWatch(id);
        }
      },
      WATCH_OPTIONS,
    );
    setGeo((current) => (current === 'inside' || current === 'outside' ? current : 'prompting'));
    return () => {
      cleared = true;
      navigator.geolocation.clearWatch(id);
    };
  }, [active, source, visible, attempt]);

  // Modo demostración: avanza por el trazado a velocidad acelerada.
  const demoElapsedRef = useRef(0);
  useEffect(() => {
    if (!active || source !== 'demo' || !visible || !route) return;
    const line = route.geometry.coordinates;
    const tick = () => {
      const { position: next, done } = demoPositionAt(line, demoElapsedRef.current);
      setPosition(next);
      setGeo('inside');
      if (done) window.clearInterval(timer);
      demoElapsedRef.current += DEMO_TICK_MS;
    };
    const timer = window.setInterval(tick, DEMO_TICK_MS);
    tick();
    return () => window.clearInterval(timer);
  }, [active, source, visible, route]);

  // Llegadas: solo con posición dentro del Retiro.
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (!position || !isInsideRetiro(position.coordinates)) return;
    const index = detectArrival(stateRef.current, stops, position);
    if (index === null) return;
    dispatch({ type: 'arrive', index, now: Date.now() });
    onArriveRef.current(stops[index], index);
  }, [position, stops]);

  // Pantalla encendida mientras se pasea (si el navegador lo permite).
  useEffect(() => {
    if (!active || !visible) return;
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let released = false;
    nav.wakeLock
      .request('screen')
      .then((lock) => {
        if (released) void lock.release().catch(() => undefined);
        else sentinel = lock;
      })
      .catch(() => undefined);
    return () => {
      released = true;
      void sentinel?.release().catch(() => undefined);
    };
  }, [active, visible]);

  const start = useCallback(() => {
    if (!stops.length) return;
    demoElapsedRef.current = 0;
    setPosition(null);
    setSource('gps');
    setGeo(
      isSecureGeolocationContext() && 'geolocation' in navigator ? 'prompting' : 'unavailable',
    );
    dispatch({ type: 'start', total: stops.length, now: Date.now() });
  }, [stops.length]);

  const startDemo = useCallback(() => {
    if (!stops.length) return;
    demoElapsedRef.current = 0;
    setPosition(null);
    setSource('demo');
    setGeo('inside');
    dispatch({ type: 'start', total: stops.length, now: Date.now() });
  }, [stops.length]);

  const retry = useCallback(() => {
    setSource('gps');
    setGeo('prompting');
    setAttempt((value) => value + 1);
  }, []);

  const finish = useCallback(() => {
    dispatch({ type: 'finish' });
    setPosition(null);
    setGeo('idle');
    setSource('gps');
  }, []);

  const skip = useCallback(() => dispatch({ type: 'skip', now: Date.now() }), []);
  const previous = useCallback(() => dispatch({ type: 'previous' }), []);

  // Terminar si cambia o se cierra la ruta.
  useEffect(() => {
    finish();
  }, [route?.id, finish]);

  return { state, stops, source, geo, position, start, startDemo, retry, finish, skip, previous };
}
