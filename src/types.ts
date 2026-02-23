export type Reading = {
  id: string;
  ts: string; // ISO-local like "2026-02-21T14:30"
  value: number | null;
  // optional ketone reading in mmol/L (may be null when not checked)
  ketones?: number | null;
};

export type InsulinMed = {
  id: string;
  name: string;
  acting: 'long' | 'intermediate' | 'rapid' | 'short' | 'premix' | string;
  doseUnits?: number;
  // allow multiple administration times per medication (hh:mm)
  // single administration time (hh:mm)
  time?: string;
  // approximate onset time in hours (optional)
  onsetHours?: number;
  durationHours?: number;
  approxDropPerUnit1h?: number;
  // sliding-scale linking
  isSlidingScale?: boolean;
  slidingScaleId?: string;
};

export type Steroid = {
  id: string;
  name: string;
  doseMg?: number;
  // administration time (hh:mm)
  time?: string;
  // potency category: low, moderate, high
  potency?: 'low' | 'moderate' | 'high' | string;
  // short human-readable summary of typical glycaemic effect
  effectSummary?: string;
};

export type SlidingScale = {
  id: string;
  medName: string;
  // rules are inclusive ranges; min/max may be undefined to indicate open-ended
  rules: Array<{ min?: number; max?: number; units: string; note?: string }>;
  notes?: string;
};
