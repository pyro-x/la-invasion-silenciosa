// Every string of the error screen (LCHP-52, D-068), in one place: this is
// product copy, changed here and nowhere else.
export const ERROR_COPY = {
  error: {
    eyebrow: 'Algo ha fallado',
    title: 'Se nos ha colado un bicho',
    body: 'Este no sale en el catálogo: es un fallo de la app, no tuyo. Prueba otra vez o vuelve al mapa.',
  },
  notFound: {
    eyebrow: 'Página no encontrada',
    title: 'Aquí no hay ninguna criatura',
    body: 'Esta dirección no existe o ha cambiado de sitio. En el mapa sí hay rastro.',
  },
  retry: 'Reintentar',
  backToMap: 'Volver al mapa',
  backToStart: 'Ir al inicio',
} as const
