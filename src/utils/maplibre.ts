import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let modulePromise: Promise<typeof import('maplibre-gl')> | null = null;

/**
 * MapLibre 6 sirve el worker como fichero aparte y lo resuelve con `import.meta.url`,
 * ruta que el bundler no ve: sin `setWorkerUrl` no se parsea ninguna tesela.
 * `?worker&url` empaqueta también su import hermano `maplibre-gl-shared.mjs`.
 */
export function loadMaplibre(): Promise<typeof import('maplibre-gl')> {
  modulePromise ??= import('maplibre-gl').then((maplibre) => {
    maplibre.setWorkerUrl(workerUrl);
    return maplibre;
  });
  return modulePromise;
}

/**
 * MapLibre 6 exige WebGL2. Sin él, el constructor no lanza: emite un `error` antes de
 * que podamos escucharlo y deja el mapa sin `painter`, que luego rompe en cada frame.
 * Comprobarlo antes en un canvas desechable permite degradar sin errores.
 */
export function supportsWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Errores de MapLibre que dejan el mapa inutilizable (no teselas sueltas). */
export function isFatalMapError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'GPUInitializationError' || /webgl/i.test(error.message);
}

/** `map.remove()` lanza si el mapa nunca tuvo `painter`; la limpieza no debe romper. */
export function safeRemoveMap(map: { remove: () => void } | null | undefined): void {
  if (!map) return;
  try {
    map.remove();
  } catch {
    /* mapa a medio inicializar */
  }
}
