export type VideoKind = 'infografia' | '3d' | 'ia' | 'visita';

/** Vídeo del canal de YouTube del proyecto asociado a un lugar o una ruta. */
export interface ParkVideo {
  /** Id de YouTube de 11 caracteres (en los datos se admite también la URL completa). */
  youtubeId: string;
  title: string;
  description?: string;
  kind?: VideoKind;
  durationSeconds?: number;
}
