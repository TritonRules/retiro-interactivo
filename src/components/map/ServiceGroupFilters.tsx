import type { ServiceGroup, ServiceSubtype } from '../../types/service';
import type { ServiceGroupFilter } from '../../utils/filterPlaces';
import { SERVICE_GROUP_META, SERVICE_GROUPS, SERVICE_ICON_PATHS } from '../../utils/serviceTypes';

interface Props {
  active: ServiceGroupFilter;
  counts: Record<ServiceGroupFilter, number>;
  onChange: (group: ServiceGroupFilter) => void;
}

const GROUP_ICON: Record<ServiceGroup, ServiceSubtype> = {
  comer: 'cafe',
  aseos: 'aseo',
  agua: 'agua',
  infantil: 'parque-infantil',
  deporte: 'gimnasio',
  mas: 'informacion',
};

/** Pictograma de servicio en React (mismos trazados que los marcadores del mapa). */
export function ServiceIcon({ subtype, size = 16 }: { subtype: ServiceSubtype; size?: number }) {
  const icon = SERVICE_ICON_PATHS[subtype];
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      {icon.stroke ? (
        <path
          d={icon.stroke}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {icon.fill ? <path d={icon.fill} fill="currentColor" /> : null}
      {icon.text ? (
        <text
          x="8"
          y="11.4"
          textAnchor="middle"
          fontSize="8.4"
          fontWeight="800"
          fill="currentColor"
        >
          {icon.text}
        </text>
      ) : null}
    </svg>
  );
}

/** Chips del filtro «Servicio»: Comer y beber, Aseos, Agua, Parques infantiles… */
export function ServiceGroupFilters({ active, counts, onChange }: Props) {
  return (
    <div
      className="mapa-filters mapa-filters--servicios"
      role="toolbar"
      aria-label="Filtrar servicios"
    >
      <button
        type="button"
        className="filtro-chip filtro-chip--servicio"
        aria-pressed={active === 'todos'}
        onClick={() => onChange('todos')}
      >
        <span>Todos los servicios ({counts.todos})</span>
      </button>
      {SERVICE_GROUPS.filter((group) => counts[group] > 0).map((group) => {
        const meta = SERVICE_GROUP_META[group];
        const pressed = active === group;
        return (
          <button
            key={group}
            type="button"
            className="filtro-chip filtro-chip--servicio"
            aria-pressed={pressed}
            onClick={() => onChange(group)}
          >
            <span className="filtro-chip__icon" style={{ background: meta.color }}>
              <ServiceIcon subtype={GROUP_ICON[group]} size={14} />
            </span>
            <span>
              {meta.label} ({counts[group]})
            </span>
          </button>
        );
      })}
    </div>
  );
}
