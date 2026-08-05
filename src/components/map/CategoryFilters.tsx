import { FILTER_OPTIONS } from '../../utils/categories';
import type { CategoryFilter } from '../../utils/filterPlaces';

interface Props {
  active: CategoryFilter;
  counts: Record<CategoryFilter, number>;
  onChange: (category: CategoryFilter) => void;
}

export function CategoryFilters({ active, counts, onChange }: Props) {
  return (
    <div
      className="mapa-filters"
      role="toolbar"
      aria-label="Filtrar lugares por categoría"
    >
      {FILTER_OPTIONS.map((option) => {
        const pressed = active === option.id;
        const count = counts[option.id];
        const shapeClass =
          option.id === 'todos'
            ? 'filtro-chip__shape filtro-chip__shape--circle'
            : `filtro-chip__shape filtro-chip__shape--${option.shape}`;

        return (
          <button
            key={option.id}
            type="button"
            className="filtro-chip"
            aria-pressed={pressed}
            onClick={() => onChange(option.id)}
            style={
              pressed
                ? undefined
                : {
                    borderColor: option.color,
                    color: option.color,
                  }
            }
          >
            <span
              className={shapeClass}
              aria-hidden="true"
              style={pressed ? undefined : { color: option.color, background: option.color }}
            />
            <span>
              {option.label}
              {typeof count === 'number' ? ` (${count})` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
