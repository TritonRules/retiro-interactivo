const CATEGORY_LABELS: Record<string, string> = {
  Exposiciones: 'Exposiciones',
  ActividadesCalleArteUrbano: 'Arte urbano y calle',
  CuentacuentosTiteresMarionetas: 'Cuentacuentos, títeres y marionetas',
  Musica: 'Música',
  TeatroPerformanceDanza: 'Teatro, performance y danza',
  CineProyeccionesAudiovisuales: 'Cine y audiovisuales',
  ConferenciasColoquios: 'Conferencias y coloquios',
  CursosTalleres: 'Cursos y talleres',
  ExcursionesViajesItinerarios: 'Excursiones e itinerarios',
  Fiestas: 'Fiestas',
  ProgramacionDestacadaAgendaCultura: 'Programación destacada',
  RecitalesPresentacionesActosLiterarios: 'Actos literarios',
  actividad: 'Actividad',
};

export function getEventCategoryLabel(value: string): string {
  if (CATEGORY_LABELS[value]) return CATEGORY_LABELS[value];
  const spaced = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return 'Actividad';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
