import type { ParkService } from '../../types/service';
import {
  SERVICE_ICON_PATHS,
  getServiceLabel,
  serviceColor,
  serviceSubtype,
} from '../../utils/serviceTypes';

interface Props {
  service: Pick<ParkService, 'type' | 'subtype' | 'mapLabel'>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Pictograma SVG del servicio (ver `SERVICE_ICON_PATHS`). */
export function serviceGlyph(service: Pick<ParkService, 'type' | 'subtype'>): SVGSVGElement {
  const icon = SERVICE_ICON_PATHS[serviceSubtype(service)];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute(
    'class',
    'place-marker__glyph place-marker__glyph--svg place-marker__glyph--service',
  );
  svg.setAttribute('aria-hidden', 'true');
  if (icon.stroke) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', icon.stroke);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.7');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  }
  if (icon.fill) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', icon.fill);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
  }
  if (icon.text) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', '8');
    text.setAttribute('y', '11.4');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '8.4');
    text.setAttribute('font-weight', '800');
    text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
    text.setAttribute('fill', 'currentColor');
    text.textContent = icon.text;
    svg.appendChild(text);
  }
  return svg;
}

export function createServiceMarkerElement({
  service,
  label,
  active = false,
  onClick,
}: Props): HTMLButtonElement {
  const subtype = serviceSubtype(service);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `place-marker place-marker--service${active ? ' is-active' : ''}`;
  button.dataset.serviceSubtype = subtype;
  button.style.setProperty('--marker-color', serviceColor(service));
  button.setAttribute('aria-label', `Abrir ficha del servicio ${label}`);
  button.title = `${getServiceLabel(service)} · ${label}`;

  const shape = document.createElement('span');
  shape.className = 'place-marker__shape';
  shape.setAttribute('aria-hidden', 'true');
  shape.appendChild(serviceGlyph(service));
  button.appendChild(shape);
  // Rótulo del nombre propio: solo a zoom alto (ver `data-marker-labels` en markerZoom.ts).
  if (service.mapLabel) {
    const text = document.createElement('span');
    text.className = 'place-marker__label';
    text.setAttribute('aria-hidden', 'true');
    text.textContent = service.mapLabel;
    button.appendChild(text);
  }

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
