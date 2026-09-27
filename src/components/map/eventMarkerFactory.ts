/** Color de los eventos en el mapa: ciruela, distinto de todas las categorías de lugar. */
export const EVENT_MARKER_COLOR = '#7a3e7f';

interface Props {
  /** Título del evento (uno) o sede (grupo). */
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Icono de calendario dibujado en SVG: no depende de que la fuente tenga el glifo. */
function calendarGlyph(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('class', 'place-marker__glyph place-marker__glyph--svg');
  svg.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS(SVG_NS, 'rect');
  body.setAttribute('x', '2');
  body.setAttribute('y', '3.5');
  body.setAttribute('width', '12');
  body.setAttribute('height', '10.5');
  body.setAttribute('rx', '1.5');
  body.setAttribute('fill', 'none');
  body.setAttribute('stroke', 'currentColor');
  body.setAttribute('stroke-width', '1.8');
  const bar = document.createElementNS(SVG_NS, 'path');
  bar.setAttribute('d', 'M2 7h12M5.5 2v3M10.5 2v3');
  bar.setAttribute('stroke', 'currentColor');
  bar.setAttribute('stroke-width', '1.8');
  bar.setAttribute('stroke-linecap', 'round');
  svg.append(body, bar);
  return svg;
}

/**
 * Marcador DOM de un evento o de varios eventos en la misma sede (con insignia de
 * número). Comparte estructura con los iconos de lugar (`.place-marker`): botón de
 * 44 px como área táctil, forma escalable por zoom y plegado a punto con `.is-dot`.
 */
export function createEventMarkerElement({
  label,
  count,
  active = false,
  onClick,
}: Props): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `place-marker place-marker--event${active ? ' is-active' : ''}`;
  button.style.setProperty('--marker-color', EVENT_MARKER_COLOR);
  button.dataset.eventCount = String(count);
  const name = count > 1 ? `Ver ${count} eventos en ${label}` : `Abrir evento ${label}`;
  button.setAttribute('aria-label', name);
  button.title = count > 1 ? `${count} eventos · ${label}` : label;

  const shape = document.createElement('span');
  shape.className = 'place-marker__shape';
  shape.setAttribute('aria-hidden', 'true');
  shape.appendChild(calendarGlyph());
  button.appendChild(shape);

  if (count > 1) {
    const badge = document.createElement('span');
    badge.className = 'place-marker__count';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = count > 9 ? '9+' : String(count);
    button.appendChild(badge);
  }

  if (onClick) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
  }

  return button;
}
