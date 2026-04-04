/** Bricks, tiles, paint, sand — quantities for site use. All logic is local. */

export type MaterialMode = 'bricks' | 'tiles' | 'paint' | 'sand';

export interface MaterialInputs {
  mode: MaterialMode;
  wastagePercent: number;
  wallAreaSqm?: number;
  floorAreaSqm?: number;
  tileLengthMm?: number;
  tileWidthMm?: number;
  surfaceAreaSqm?: number;
  coverageSqmPerLiter?: number;
  coats?: number;
  sandVolumeCubicM?: number;
  screedAreaSqm?: number;
  screedThicknessMm?: number;
}

export interface MaterialResult {
  mode: MaterialMode;
  primaryLabel: string;
  primaryValue: number;
  primaryUnit: string;
  secondaryLine?: string;
}

const BRICKS_PER_SQM = 50;

export function calculateMaterial(inputs: MaterialInputs): MaterialResult {
  const w = 1 + inputs.wastagePercent / 100;

  switch (inputs.mode) {
    case 'bricks': {
      const area = inputs.wallAreaSqm ?? 0;
      const count = Math.ceil(area * BRICKS_PER_SQM * w);
      return {
        mode: 'bricks',
        primaryLabel: 'Bricks required (approx.)',
        primaryValue: count,
        primaryUnit: 'nos.',
        secondaryLine: `Based on ~${BRICKS_PER_SQM} bricks/m² wall area (incl. wastage)`,
      };
    }
    case 'tiles': {
      const fa = inputs.floorAreaSqm ?? 0;
      const L = (inputs.tileLengthMm ?? 300) / 1000;
      const W = (inputs.tileWidthMm ?? 300) / 1000;
      const tileArea = L * W;
      const tiles = tileArea > 0 ? Math.ceil((fa / tileArea) * w) : 0;
      return {
        mode: 'tiles',
        primaryLabel: 'Tiles required',
        primaryValue: tiles,
        primaryUnit: 'nos.',
        secondaryLine: `Tile size ${(inputs.tileLengthMm ?? 300)}×${(inputs.tileWidthMm ?? 300)} mm`,
      };
    }
    case 'paint': {
      const sa = inputs.surfaceAreaSqm ?? 0;
      const cov = inputs.coverageSqmPerLiter ?? 10;
      const coats = inputs.coats ?? 2;
      const liters = cov > 0 ? Math.ceil((sa / cov) * coats * w) : 0;
      return {
        mode: 'paint',
        primaryLabel: 'Paint required',
        primaryValue: liters,
        primaryUnit: 'L',
        secondaryLine: `${coats} coat(s), ${cov} m²/L coverage (incl. wastage)`,
      };
    }
    case 'sand': {
      let vol = inputs.sandVolumeCubicM;
      if (inputs.screedAreaSqm && inputs.screedThicknessMm) {
        vol = (inputs.screedAreaSqm * inputs.screedThicknessMm) / 1000;
      }
      const v = (vol ?? 0) * w;
      return {
        mode: 'sand',
        primaryLabel: 'Sand volume',
        primaryValue: parseFloat(v.toFixed(2)),
        primaryUnit: 'm³',
        secondaryLine:
          inputs.screedAreaSqm && inputs.screedThicknessMm
            ? `Screed ${inputs.screedAreaSqm} m² × ${inputs.screedThicknessMm} mm`
            : 'Direct volume (incl. wastage)',
      };
    }
  }
}
