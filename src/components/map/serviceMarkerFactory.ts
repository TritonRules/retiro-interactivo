import { SERVICE_TYPE_META } from '../../utils/serviceTypes';
import type { ServiceType } from '../../types/service';

interface Props {
  type: ServiceType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function createServiceMarkerElement({
  type,
  label,
  active = false,
  onClick,
}: Props): HTMLButtonElement {
  const meta = SERVICE_TYPE_META[type];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `place-marker place-marker--service${active ? ' is-active' : ''}`;
  button.style.setProperty('--marker-color', meta.color);
  button.setAttribute('aria-label', `Abrir ficha del servicio ${label}`);
  button.title = label;

  const shape = document.createElement('span');
  shape.className = 'place-marker__shape';
  shape.setAttribute('aria-hidden', 'true');
  const glyph = document.createElement('span');
  glyph.className = 'place-marker__glyph';
  glyph.textContent = meta.glyph.length > 2 ? meta.glyph.slice(0, 2) : meta.glyph;
  shape.appendChild(glyph);
  button.appendChild(shape);

  if (onClick) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
  }

  return button;
}

export function createUserMarkerElement(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'place-marker place-marker--user';
  button.setAttribute('aria-label', 'Tu ubicación aproximada');
  button.title = 'Tu ubicación';
  const shape = document.createElement('span');
  shape.className = 'place-marker__shape';
  shape.setAttribute('aria-hidden', 'true');
  const glyph = document.createElement('span');
  glyph.className = 'place-marker__glyph';
  glyph.textContent = '●';
  shape.appendChild(glyph);
  button.appendChild(shape);
  return button;
}
