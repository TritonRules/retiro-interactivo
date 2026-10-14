interface Props {
  saved: boolean;
  onToggle: () => void;
  name: string;
}

/** Botón «Guardar» de «Mi visita» (corazón). Se guarda solo en este dispositivo. */
export function FavoriteButton({ saved, onToggle, name }: Props) {
  return (
    <button
      type="button"
      className={`fav-btn${saved ? ' is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${name} de Mi visita` : `Guardar ${name} en Mi visita`}
      onClick={onToggle}
    >
      <span className="fav-btn__icon" aria-hidden="true">
        {saved ? '♥' : '♡'}
      </span>
      {saved ? 'Guardado' : 'Guardar'}
    </button>
  );
}
