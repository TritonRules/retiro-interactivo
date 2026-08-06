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
