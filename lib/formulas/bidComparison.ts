/** Weighted bid scoring — pure math, up to 6 vendors. */

export interface VendorInput {
  name: string;
  bidAmount: number;
  completionDays: number;
  qualityScore: number; // 1–10
  experienceScore: number; // 1–10
}

export interface BidWeights {
  price: number;
  quality: number;
  timeline: number;
  experience: number;
}

export interface VendorScore {
  name: string;
  normPrice: number;
  normTimeline: number;
  normQuality: number;
  normExperience: number;
  weightedScore: number;
}

export interface BidComparisonResult {
  vendors: VendorScore[];
  winnerIndex: number;
  lowestBid: number;
  shortestDays: number;
}

function clamp01From10(n: number): number {
  return Math.max(1, Math.min(10, n));
}

export function calculateBidComparison(
  vendors: VendorInput[],
  weights: BidWeights
): BidComparisonResult | null {
  const valid = vendors.filter((v) => v.bidAmount > 0 && v.completionDays > 0);
  if (valid.length < 2) return null;

  const lowestBid = Math.min(...valid.map((v) => v.bidAmount));
  const shortestDays = Math.min(...valid.map((v) => v.completionDays));

  const wSum = weights.price + weights.quality + weights.timeline + weights.experience;
  if (wSum <= 0) return null;

  const vendorsOut: VendorScore[] = valid.map((v) => {
    const normPrice = lowestBid > 0 ? (lowestBid / v.bidAmount) * 100 : 0;
    const normTimeline = shortestDays > 0 ? (shortestDays / v.completionDays) * 100 : 0;
    const q = clamp01From10(v.qualityScore);
    const e = clamp01From10(v.experienceScore);
    const normQuality = q * 10;
    const normExperience = e * 10;

    const weightedScore =
      (normPrice * weights.price +
        normQuality * weights.quality +
        normTimeline * weights.timeline +
        normExperience * weights.experience) /
      wSum;

    return {
      name: v.name || 'Vendor',
      normPrice: parseFloat(normPrice.toFixed(1)),
      normTimeline: parseFloat(normTimeline.toFixed(1)),
      normQuality: parseFloat(normQuality.toFixed(1)),
      normExperience: parseFloat(normExperience.toFixed(1)),
      weightedScore: parseFloat(weightedScore.toFixed(2)),
    };
  });

  let winnerIndex = 0;
  let best = vendorsOut[0]?.weightedScore ?? 0;
  vendorsOut.forEach((v, i) => {
    if (v.weightedScore > best) {
      best = v.weightedScore;
      winnerIndex = i;
    }
  });

  return {
    vendors: vendorsOut,
    winnerIndex,
    lowestBid,
    shortestDays,
  };
}
