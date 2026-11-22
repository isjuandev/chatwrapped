export interface FullReportFlags {
  payments: boolean;
  fullReportFree: boolean;
}

export interface FullReportButton {
  label: string;
  enabled: boolean;
  /** open: abre el mazo full; pay: (futuro) flujo de pago; none: botón deshabilitado. */
  action: 'open' | 'pay' | 'none';
}

/**
 * Lógica pura del botón del reporte completo según los flags y las tarjetas disponibles
 * (`fullCards` = largo de `buildDeck(data, 'full')`).
 * - payments → (futuro) flujo de pago; fullReportFree sin pagos → abre directo; ambos false → "Próximamente".
 * - Sin ninguna tarjeta disponible (y con acceso) → "Tu chat es muy corto…" deshabilitado.
 */
export function fullReportButton(flags: FullReportFlags, fullCards: number): FullReportButton {
  if (!flags.payments && !flags.fullReportFree) {
    return { label: 'Reporte completo · Próximamente', enabled: false, action: 'none' };
  }
  if (fullCards <= 0) {
    return { label: 'Tu chat es muy corto para el reporte completo', enabled: false, action: 'none' };
  }
  if (flags.payments) return { label: 'Reporte completo', enabled: true, action: 'pay' };
  return { label: 'Ver reporte completo', enabled: true, action: 'open' };
}
