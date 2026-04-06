import { useState, useEffect, useCallback } from 'react';
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
import Slider from '@react-native-community/slider';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { ToolInputCard } from '@/components/tools/ToolInputCard';
import { ToolResultCard, ToolResultCardTitle, Row } from '@/components/tools/ToolResultCard';
import { FormulaCard } from '@/components/tools/FormulaCard';
import { ToolStickyCalculateBar } from '@/components/tools/ToolStickyCalculateBar';
import { HistoryCard } from '@/components/tools/HistoryCard';
import {
  calculateConcrete,
  type ConcreteInputs,
  type ConcreteResult,
} from '@/lib/formulas/concrete';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/profile/currency';

const MIX_CARDS: {
  id: ConcreteInputs['mixRatio'];
  label: string;
  use: string;
}[] = [
  { id: '1:1.5:3', label: '1 : 1.5 : 3', use: 'Columns, heavy loads' },
  { id: '1:2:4', label: '1 : 2 : 4', use: 'Slabs, foundations' },
  { id: '1:3:6', label: '1 : 3 : 6', use: 'Mass fill, blinding' },
  { id: 'custom', label: 'Custom', use: 'Your ratio' },
];

const TOOL_KEY = 'concrete-mix';

export default function ConcreteMixScreen() {
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const [volume, setVolume] = useState('');
  const [mixRatio, setMixRatio] = useState<ConcreteInputs['mixRatio']>('1:2:4');
  const [cementParts, setCementParts] = useState('1');
  const [sandParts, setSandParts] = useState('2');
  const [aggParts, setAggParts] = useState('4');
  const [wastage, setWastage] = useState(10);
  const [cementPrice, setCementPrice] = useState('');
  const [sandPrice, setSandPrice] = useState('');
  const [aggPrice, setAggPrice] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ConcreteResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<ConcreteInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<ConcreteInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const runCalculate = useCallback(() => {
    setFormError(null);
    const vol = parseFloat(volume);
    if (!Number.isFinite(vol) || vol <= 0) {
      setFormError('Enter a valid volume (m³).');
      return;
    }
    let inputs: ConcreteInputs = {
      volumeCubicM: vol,
      mixRatio,
      wastagePercent: wastage,
    };
    if (mixRatio === 'custom') {
      const c = parseFloat(cementParts);
      const s = parseFloat(sandParts);
      const a = parseFloat(aggParts);
      if (![c, s, a].every((n) => Number.isFinite(n) && n > 0)) {
        setFormError('Enter positive cement, sand & aggregate parts.');
        return;
      }
      inputs = { ...inputs, cementParts: c, sandParts: s, aggParts: a };
    }
    const cp = parseFloat(cementPrice);
    const sp = parseFloat(sandPrice);
    const ap = parseFloat(aggPrice);
    if (cementPrice.trim() || sandPrice.trim() || aggPrice.trim()) {
      inputs = {
        ...inputs,
        ...(Number.isFinite(cp) && cp >= 0 ? { cementPricePerBag: cp } : {}),
        ...(Number.isFinite(sp) && sp >= 0 ? { sandPricePerM3: sp } : {}),
        ...(Number.isFinite(ap) && ap >= 0 ? { aggPricePerM3: ap } : {}),
      };
    }
    const out = calculateConcrete(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<ConcreteInputs>(TOOL_KEY).then(setHistory);
  }, [volume, mixRatio, cementParts, sandParts, aggParts, wastage, cementPrice, sandPrice, aggPrice]);

  const applyHistory = (entry: HistoryEntry<ConcreteInputs>) => {
    const i = entry.inputs;
    setVolume(String(i.volumeCubicM));
    setMixRatio(i.mixRatio);
    if (i.mixRatio === 'custom') {
      setCementParts(String(i.cementParts ?? 1));
      setSandParts(String(i.sandParts ?? 2));
      setAggParts(String(i.aggParts ?? 4));
    }
    setWastage(i.wastagePercent);
    setCementPrice(i.cementPricePerBag !== undefined ? String(i.cementPricePerBag) : '');
    setSandPrice(i.sandPricePerM3 !== undefined ? String(i.sandPricePerM3) : '');
    setAggPrice(i.aggPricePerM3 !== undefined ? String(i.aggPricePerM3) : '');
    setResult(entry.result as ConcreteResult);
    setShowResult(true);
  };

  const fmtUsd = (n: number) => formatCurrency(n, normalizedCurrency, { maximumFractionDigits: 0 });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Concrete mix" level="Mid" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<ConcreteInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) =>
              `${e.inputs.volumeCubicM} m³ · ${e.inputs.mixRatio} · ${(e.result as ConcreteResult).cementBags} bags`
            }
          />

          <ToolInputCard title="Mix inputs">
            <Text className="mb-1.5 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              Volume (m³)
            </Text>
            <TextInput
              value={volume}
              onChangeText={setVolume}
              keyboardType="decimal-pad"
              placeholder="e.g. 4.5"
              placeholderTextColor="#9CA3AF"
              className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />

            <Text className="mb-2 mt-6 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              Mix ratio (cement : sand : aggregate)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {MIX_CARDS.map((m) => {
                const sel = mixRatio === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMixRatio(m.id)}
                    className={`w-[47%] rounded-xl border px-2 py-3 ${
                      sel ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                    }`}
                  >
                    <Text
                      className="text-center text-sm text-brand-900"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {m.label}
                    </Text>
                    <Text
                      className="mt-1 text-center text-[10px] text-neutral-500"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={2}
                    >
                      {m.use}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mixRatio === 'custom' ? (
              <View className="mt-4 flex-row gap-2">
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-neutral-600">Cement</Text>
                  <TextInput
                    value={cementParts}
                    onChangeText={setCementParts}
                    keyboardType="decimal-pad"
                    className="min-h-[48px] rounded-lg border border-neutral-300 px-2 text-center text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-neutral-600">Sand</Text>
                  <TextInput
                    value={sandParts}
                    onChangeText={setSandParts}
                    keyboardType="decimal-pad"
                    className="min-h-[48px] rounded-lg border border-neutral-300 px-2 text-center text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-neutral-600">Agg</Text>
                  <TextInput
                    value={aggParts}
                    onChangeText={setAggParts}
                    keyboardType="decimal-pad"
                    className="min-h-[48px] rounded-lg border border-neutral-300 px-2 text-center text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
              </View>
            ) : null}

            <Text className="mb-1 mt-6 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              Wastage: {wastage}%
            </Text>
            <Slider
              minimumValue={5}
              maximumValue={20}
              step={1}
              value={wastage}
              onValueChange={setWastage}
              minimumTrackTintColor={Colors.accent[600]}
              maximumTrackTintColor={Colors.neutral[300]}
              thumbTintColor={Colors.brand[900]}
            />
          </ToolInputCard>

          <ToolInputCard title={`Optional unit prices (${normalizedCurrency})`}>
            <Text className="mb-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              Cement / 50kg bag · Sand / m³ · Aggregate / m³ — leave blank to hide cost estimate
            </Text>
            <TextInput
              value={cementPrice}
              onChangeText={setCementPrice}
              keyboardType="decimal-pad"
              placeholder="Cement / bag"
              placeholderTextColor="#9CA3AF"
              className="mb-2 min-h-[48px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <TextInput
              value={sandPrice}
              onChangeText={setSandPrice}
              keyboardType="decimal-pad"
              placeholder="Sand / m³"
              placeholderTextColor="#9CA3AF"
              className="mb-2 min-h-[48px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <TextInput
              value={aggPrice}
              onChangeText={setAggPrice}
              keyboardType="decimal-pad"
              placeholder="Aggregate / m³"
              placeholderTextColor="#9CA3AF"
              className="min-h-[48px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
          </ToolInputCard>

          {formError ? (
            <Text className="mb-2 text-center text-sm text-danger-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {formError}
            </Text>
          ) : null}

          {showResult && result ? (
            <ToolResultCard>
              <ToolResultCardTitle>Quantities</ToolResultCardTitle>
              <Row
                label="Cement"
                value={`${result.cementBags} bags (${result.cementKg} kg)`}
              />
              <Row label="Sand" value={`${result.sandCubicM} m³`} />
              <Row label="Aggregate" value={`${result.aggCubicM} m³`} />
              <Row label="Water (indicative)" value={`${result.waterLiters} L`} />
              {result.estimatedCost !== undefined ? (
                <Row label="Est. material cost" value={fmtUsd(result.estimatedCost)} emphasize />
              ) : null}
            </ToolResultCard>
          ) : null}

          <FormulaCard
            lines={[
              'Dry volume ≈ wet volume × 1.54 (bulking)',
              'Cement kg ∝ (cement parts / sum parts) × dry vol × 1440 kg/m³ × wastage',
              'Sand & aggregate volumes ∝ their parts / sum parts × dry vol × wastage',
              'Water ≈ cement kg × 0.45 (w/c 0.45 indicative)',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label="Calculate mix" onPress={runCalculate} />
    </SafeAreaView>
  );
}
