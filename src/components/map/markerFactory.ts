import { CATEGORY_META } from '../../utils/categories';
import type { PlaceCategory } from '../../types/place';

interface Props {
  category: PlaceCategory;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const GLYPH: Record<PlaceCategory, string> = {
  iconico: '★',
  monumento: '▲',
  cultura: '■',
  naturaleza: '●',
  familias: '⬡',
  paseo: '◆',
  servicio: '📍',
  acceso: '⊓',
};

export function createMarkerElement({
  category,
  label,
  active = false,
  onClick,
}: Props): HTMLButtonElement {
  const meta = CATEGORY_META[category];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `place-marker place-marker--${meta.shape}${active ? ' is-active' : ''}`;
  button.style.background = meta.color;
  button.style.setProperty('--marker-color', meta.color);
  button.setAttribute('aria-label', `Abrir ficha de ${label}`);
  button.title = label;

  const glyph = document.createElement('span');
  glyph.className = 'place-marker__glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = GLYPH[category];
  button.appendChild(glyph);

  if (onClick) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
  }

  return button;
}
