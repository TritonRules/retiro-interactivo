/**
 * Deben coincidir con las claves de VIDEO_KIND_LABELS / VIDEO_SCENARIO_LABELS en
 * `src/utils/videos.shared.mjs` (lo comprueba `videos.test.ts`).
 */
export type VideoKind = 'infografia' | '3d' | 'ia' | 'visita';
export type VideoScenario =
  | 'soleado'
  | 'lluvia'
  | 'otono'
  | 'primavera'
  | 'viento'
  | 'frio'
  | 'nieve'
  | 'atardecer'
  | 'noche';

/** Vídeo del canal de YouTube del proyecto asociado a un lugar o una ruta. */
export interface ParkVideo {
  /** Id de YouTube de 11 caracteres (en los datos se admite también la URL completa). */
  youtubeId: string;
  title: string;
  description?: string;
  kind?: VideoKind;
  /** Condición del recorrido (lluvia, otoño…). Ausente = general. */
  scenario?: VideoScenario;
  durationSeconds?: number;
}
