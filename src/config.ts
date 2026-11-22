/** Dominio que aparece en las tarjetas. Cámbialo aquí. */
export const SITE_DOMAIN = 'wrapped.isjuandev.com';

/** Flags de funcionalidades que todavía no entran al MVP. */
export const FEATURES = {
  /** Reporte completo de pago (Wompi/Nequi). Deshabilitado en el MVP. */
  payments: false,
  /** Mientras no haya pagos, el reporte completo se abre gratis. */
  fullReportFree: true,
} as const;
