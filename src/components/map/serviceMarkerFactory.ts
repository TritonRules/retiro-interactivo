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
  button.style.background = meta.color;
  button.setAttribute('aria-label', `Abrir ficha del servicio ${label}`);
  button.title = label;

  const glyph = document.createElement('span');
  glyph.className = 'place-marker__glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = meta.glyph.length > 2 ? meta.glyph.slice(0, 2) : meta.glyph;
  button.appendChild(glyph);

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
  const glyph = document.createElement('span');
  glyph.className = 'place-marker__glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = '●';
  button.appendChild(glyph);
  return button;
}
