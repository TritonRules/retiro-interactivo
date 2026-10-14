import type { Place } from '../types/place';
import type { ParkService } from '../types/service';
import type { ParkRoute } from '../types/route';
import type { FavoriteKind } from './favorites';

export interface VisitPreset {
  id: string;
  label: string;
  description: string;
  items: { kind: FavoriteKind; id: string }[];
}

/** Atajos «por intereses»: rellenan favoritos con selecciones del propio dataset. */
export function buildVisitPresets(
  places: Place[],
  services: ParkService[],
  routes: ParkRoute[],
): VisitPreset[] {
  const inPark = places.filter((p) => p.area !== 'entorno' && p.category !== 'acceso');
  const imprescindible = routes.find((r) => r.id === 'retiro-imprescindible');
  const essentials = (
    imprescindible?.stopIds ?? inPark.filter((p) => p.category === 'iconico').map((p) => p.id)
  ).filter((id) => inPark.some((p) => p.id === id));
  const statues = inPark
    .filter((p) => p.category === 'escultura')
    .sort((a, b) => (a.mapMinZoom ?? 0) - (b.mapMinZoom ?? 0))
    .slice(0, 6)
    .map((p) => p.id);
  const kidsPlaces = inPark.filter((p) => p.audience?.includes('familias')).map((p) => p.id);
  const playgrounds = services
    .filter((s) => s.subtype === 'parque-infantil')
    .slice(0, 2)
    .map((s) => s.id);
  const presets: VisitPreset[] = [
    {
      id: 'imprescindibles',
      label: 'Imprescindibles',
      description: 'Los hitos más reconocibles del parque.',
      items: essentials.map((id) => ({ kind: 'place' as const, id })),
    },
    {
      id: 'estatuas',
      label: 'Estatuas',
      description: 'Esculturas y monumentos para un paseo artístico.',
      items: statues.map((id) => ({ kind: 'place' as const, id })),
    },
    {
      id: 'con-ninos',
      label: 'Con niños',
      description: 'Títeres, naturaleza y zonas infantiles.',
      items: [
        ...kidsPlaces.map((id) => ({ kind: 'place' as const, id })),
        ...playgrounds.map((id) => ({ kind: 'service' as const, id })),
      ],
    },
  ];
  return presets.filter((p) => p.items.length > 0);
}
