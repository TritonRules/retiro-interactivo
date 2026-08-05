import type { NearbyItem } from '../../utils/nearby';

interface Props {
  items: NearbyItem[];
  onSelect: (item: NearbyItem) => void;
}

export function NearbyList({ items, onSelect }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="nearby-panel" aria-labelledby="nearby-titulo">
      <h2 id="nearby-titulo" className="nearby-panel__title">
        Lo más cercano
      </h2>
      <p className="nearby-panel__note">
        Distancias aproximadas en línea recta; no son rutas peatonales.
      </p>
      <ol className="nearby-panel__list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <button
              type="button"
              className="nearby-panel__item"
              onClick={() => onSelect(item)}
            >
              <span className="nearby-panel__name">{item.name}</span>
              <span className="nearby-panel__meta">
                {item.categoryLabel} · {item.distanceLabel}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
