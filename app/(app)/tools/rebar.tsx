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
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { ToolInputCard } from '@/components/tools/ToolInputCard';
import { ToolResultCard, ToolResultCardTitle, Row } from '@/components/tools/ToolResultCard';
import { FormulaCard } from '@/components/tools/FormulaCard';
import { ToolStickyCalculateBar } from '@/components/tools/ToolStickyCalculateBar';
import { HistoryCard } from '@/components/tools/HistoryCard';
import { calculateRebar, type RebarInputs, type RebarResult } from '@/lib/formulas/rebar';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';
import { useAuthStore } from '@/store/useAuthStore';
import { normalizeCurrencyCode, formatCurrency } from '@/lib/profile/currency';
import { useI18n } from '@/hooks/useI18n';

const MEMBER_IDS: RebarInputs['memberType'][] = ['slab', 'beam', 'column', 'footing'];

const DIAMETERS: RebarInputs['diameterMm'][] = [8, 10, 12, 16, 20, 25, 32];

const TOOL_KEY = 'rebar';

export default function RebarScreen() {
  const { t } = useI18n();
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const [memberType, setMemberType] = useState<RebarInputs['memberType']>('slab');
  const [lengthM, setLengthM] = useState('');
  const [widthM, setWidthM] = useState('');
  const [diameterMm, setDiameterMm] = useState<RebarInputs['diameterMm']>(12);
  const [spacingMm, setSpacingMm] = useState('150');
  const [layers, setLayers] = useState('1');
  const [steelPrice, setSteelPrice] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<RebarResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<RebarInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<RebarInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const runCalculate = useCallback(() => {
    setFormError(null);
    const L = parseFloat(lengthM);
    const W = parseFloat(widthM);
    const sp = parseFloat(spacingMm);
    const lay = parseInt(layers, 10);
    if (!Number.isFinite(L) || L <= 0) {
      setFormError(t('tools.rebar.error.length'));
      return;
    }
    if (!Number.isFinite(W) || W <= 0) {
      setFormError(t('tools.rebar.error.width'));
      return;
    }
    if (!Number.isFinite(sp) || sp <= 0) {
      setFormError(t('tools.rebar.error.spacing'));
      return;
    }
    if (!Number.isFinite(lay) || lay < 1) {
      setFormError(t('tools.rebar.error.layers'));
      return;
    }
    const inputs: RebarInputs = {
      memberType,
      lengthM: L,
      widthM: W,
      diameterMm,
      spacingMm: sp,
      layers: lay,
    };
    const p = parseFloat(steelPrice);
    if (steelPrice.trim() && Number.isFinite(p) && p >= 0) {
      inputs.steelPricePerKg = p;
    }
    const out = calculateRebar(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<RebarInputs>(TOOL_KEY).then(setHistory);
  }, [memberType, lengthM, widthM, diameterMm, spacingMm, layers, steelPrice, t]);

  const applyHistory = (entry: HistoryEntry<RebarInputs>) => {
    const i = entry.inputs;
    setMemberType(i.memberType);
    setLengthM(String(i.lengthM));
    setWidthM(String(i.widthM));
    setDiameterMm(i.diameterMm);
    setSpacingMm(String(i.spacingMm));
    setLayers(String(i.layers));
    setSteelPrice(i.steelPricePerKg !== undefined ? String(i.steelPricePerKg) : '');
    setResult(entry.result as RebarResult);
    setShowResult(true);
  };

  const fmtUsd = (n: number) => formatCurrency(n, normalizedCurrency, { maximumFractionDigits: 0 });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Rebar calculator" level="Mid" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<RebarInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) => {
              const r = e.result as RebarResult;
              const member = t(`tools.rebar.member.${e.inputs.memberType}`);
              return t('tools.rebar.historySummary')
                .replace('{member}', member)
                .replace('{diameter}', String(e.inputs.diameterMm))
                .replace('{weight}', String(r.totalWeightKg));
            }}
          />

          <ToolInputCard title="Member & layout">
            <Text className="mb-2 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('tools.rebar.memberType')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {MEMBER_IDS.map((id) => {
                const sel = memberType === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setMemberType(id)}
                    className={`rounded-xl border px-4 py-2 ${
                      sel ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                    }`}
                  >
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {t(`tools.rebar.member.${id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-1.5 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('tools.rebar.field.gridLength')}
            </Text>
            <TextInput
              value={lengthM}
              onChangeText={setLengthM}
              keyboardType="decimal-pad"
              placeholder={t('tools.rebar.placeholder.gridLength')}
              placeholderTextColor="#9CA3AF"
              className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />

            <Text className="mb-1.5 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('tools.rebar.field.cuttingLength')}
            </Text>
            <TextInput
              value={widthM}
              onChangeText={setWidthM}
              keyboardType="decimal-pad"
              placeholder={t('tools.rebar.placeholder.cuttingLength')}
              placeholderTextColor="#9CA3AF"
              className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />

            <Text className="mb-2 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('tools.rebar.field.diameter')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DIAMETERS.map((d) => {
                const sel = diameterMm === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDiameterMm(d)}
                    className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border ${
                      sel ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                    }`}
                  >
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-1.5 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('tools.rebar.field.spacing')}
            </Text>
            <TextInput
              value={spacingMm}
              onChangeText={setSpacingMm}
              keyboardType="number-pad"
              placeholder="150"
              placeholderTextColor="#9CA3AF"
              className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />

            <Text className="mb-1.5 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('tools.rebar.field.layers')}
            </Text>
            <TextInput
              value={layers}
              onChangeText={setLayers}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
          </ToolInputCard>

          <ToolInputCard title="Optional cost">
            <TextInput
              value={steelPrice}
              onChangeText={setSteelPrice}
              keyboardType="decimal-pad"
              placeholder={t('tools.rebar.placeholder.steelPrice').replace('{currency}', normalizedCurrency)}
              placeholderTextColor="#9CA3AF"
              className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
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
              <ToolResultCardTitle>Steel</ToolResultCardTitle>
              <Row label="Number of bars" value={String(result.numberOfBars)} />
              <Row label="Cutting length (each)" value={`${result.cuttingLengthM} m`} />
              <Row label="Total weight" value={`${result.totalWeightKg} kg`} />
              {result.estimatedCost !== undefined ? (
                <Row label="Est. cost" value={fmtUsd(result.estimatedCost)} emphasize />
              ) : null}
            </ToolResultCard>
          ) : null}

          <FormulaCard
            lines={[
              'Bars = (floor(length mm / spacing mm) + 1) × layers',
              'Cutting length = width + 0.3 m hook allowance (per bar)',
              'Weight/m = (diameter²) / 162  [kg/m, indicative]',
              'Total weight = weight/m × cutting length × number of bars',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label={t('tools.rebar.calculateRebar')} onPress={runCalculate} />
    </SafeAreaView>
  );
}
