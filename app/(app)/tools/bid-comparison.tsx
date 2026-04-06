import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { ToolInputCard } from '@/components/tools/ToolInputCard';
import { ToolResultCard, ToolResultCardTitle, Row } from '@/components/tools/ToolResultCard';
import { FormulaCard } from '@/components/tools/FormulaCard';
import { ToolStickyCalculateBar } from '@/components/tools/ToolStickyCalculateBar';
import { useAuthStore } from '@/store/useAuthStore';
import { currencySymbol } from '@/lib/profile/currency';
import {
  calculateBidComparison,
  type VendorInput,
  type BidWeights,
  type BidComparisonResult,
} from '@/lib/formulas/bidComparison';
import { saveToHistory } from '@/lib/storage/calculatorHistory';

const TOOL_KEY = 'bid-comparison';

type VendorRow = { name: string; bid: string; days: string; q: string; e: string };

const emptyVendor = (): VendorRow => ({
  name: '',
  bid: '',
  days: '',
  q: '5',
  e: '5',
});

export default function BidComparisonScreen() {
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const [vendors, setVendors] = useState<VendorRow[]>([emptyVendor(), emptyVendor()]);
  const [wp, setWp] = useState('40');
  const [wq, setWq] = useState('20');
  const [wt, setWt] = useState('20');
  const [we, setWe] = useState('20');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<BidComparisonResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const updateVendor = (i: number, patch: Partial<VendorRow>) => {
    setVendors((prev) => prev.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  };

  const addVendor = () => {
    if (vendors.length >= 6) return;
    setVendors((v) => [...v, emptyVendor()]);
  };

  const removeVendor = (i: number) => {
    if (vendors.length <= 2) return;
    setVendors((v) => v.filter((_, j) => j !== i));
  };

  const run = useCallback(() => {
    setFormError(null);
    const weights: BidWeights = {
      price: parseFloat(wp) || 0,
      quality: parseFloat(wq) || 0,
      timeline: parseFloat(wt) || 0,
      experience: parseFloat(we) || 0,
    };
    const sum = weights.price + weights.quality + weights.timeline + weights.experience;
    if (Math.abs(sum - 100) > 0.5) {
      setFormError('Weights must sum to 100% (currently ' + sum.toFixed(0) + ').');
      return;
    }

    const inputs: VendorInput[] = vendors
      .map((v) => ({
        name: v.name.trim() || 'Vendor',
        bidAmount: parseFloat(v.bid) || 0,
        completionDays: parseFloat(v.days) || 0,
        qualityScore: parseFloat(v.q) || 5,
        experienceScore: parseFloat(v.e) || 5,
      }))
      .filter((v) => v.bidAmount > 0 && v.completionDays > 0);

    if (inputs.length < 2) {
      setFormError('Enter at least two vendors with bid amount and days.');
      return;
    }

    const out = calculateBidComparison(inputs, weights);
    if (!out) {
      setFormError('Could not calculate scores.');
      return;
    }
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, { vendors: inputs, weights }, out);
  }, [vendors, wp, wq, wt, we]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Bid comparison" level="Mid" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <ToolInputCard title="Weights (must sum to 100%)">
            <View className="mb-2 flex-row flex-wrap gap-2">
              {(
                [
                  ['Price', wp, setWp],
                  ['Quality', wq, setWq],
                  ['Timeline', wt, setWt],
                  ['Experience', we, setWe],
                ] as const
              ).map(([label, val, set]) => (
                <View key={label} className="w-[47%]">
                  <Text className="mb-1 text-xs text-neutral-600">{label}</Text>
                  <TextInput
                    value={val}
                    onChangeText={set}
                    keyboardType="number-pad"
                    className="min-h-[44px] rounded-lg border border-neutral-300 px-2 text-center text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
              ))}
            </View>
          </ToolInputCard>
          <ToolInputCard title="Vendors (min 2, max 6)">
            {vendors.map((v, i) => (
              <View key={i} className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-brand-900">
                    Vendor {i + 1}
                  </Text>
                  {vendors.length > 2 ? (
                    <Pressable onPress={() => removeVendor(i)}>
                      <Text className="text-sm text-danger-600" style={{ fontFamily: 'Inter_500Medium' }}>
                        Remove
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  placeholder="Name"
                  value={v.name}
                  onChangeText={(t) => updateVendor(i, { name: t })}
                  className="mb-2 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-500">Bid ({currencySymbol(currencyCode)})</Text>
                    <TextInput
                      value={v.bid}
                      onChangeText={(t) => updateVendor(i, { bid: t })}
                      keyboardType="decimal-pad"
                      className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-500">Days</Text>
                    <TextInput
                      value={v.days}
                      onChangeText={(t) => updateVendor(i, { days: t })}
                      keyboardType="number-pad"
                      className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    />
                  </View>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-500">Quality 1–10</Text>
                    <TextInput
                      value={v.q}
                      onChangeText={(t) => updateVendor(i, { q: t })}
                      keyboardType="number-pad"
                      className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-500">Experience 1–10</Text>
                    <TextInput
                      value={v.e}
                      onChangeText={(t) => updateVendor(i, { e: t })}
                      keyboardType="number-pad"
                      className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    />
                  </View>
                </View>
              </View>
            ))}
            {vendors.length < 6 ? (
              <Pressable
                onPress={addVendor}
                className="mb-2 min-h-[48px] items-center justify-center rounded-xl border border-dashed border-brand-500"
              >
                <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  + Add vendor
                </Text>
              </Pressable>
            ) : null}
          </ToolInputCard>
          {formError ? (
            <Text className="mb-2 text-center text-sm text-danger-600">{formError}</Text>
          ) : null}
          {showResult && result ? (
            <ToolResultCard>
              <ToolResultCardTitle>Scores</ToolResultCardTitle>
              {result.vendors.map((v, i) => (
                <View
                  key={v.name + String(i)}
                  className={`mb-3 rounded-lg border p-3 ${
                    i === result.winnerIndex ? 'border-success-600 bg-success-100' : 'border-neutral-200'
                  }`}
                >
                  {i === result.winnerIndex ? (
                    <Text
                      className="mb-1 text-xs text-success-600"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      Recommended
                    </Text>
                  ) : null}
                  <Text className="text-base text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                    {v.name}
                  </Text>
                  <Row label="Weighted score" value={String(v.weightedScore)} />
                  <Row label="Price norm" value={String(v.normPrice)} />
                  <Row label="Timeline norm" value={String(v.normTimeline)} />
                </View>
              ))}
            </ToolResultCard>
          ) : null}
          <FormulaCard
            lines={[
              'Price score = (lowest bid / this bid) × 100',
              'Timeline score = (shortest days / this days) × 100',
              'Quality & experience: 1–10 → ×10 for 0–100 scale',
              'Weighted = Σ(norm × weight) / Σ(weights)',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label="Compare bids" onPress={run} />
    </SafeAreaView>
  );
}
