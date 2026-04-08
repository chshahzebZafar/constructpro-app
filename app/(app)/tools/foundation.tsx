import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
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
import {
  calculateFoundation,
  type FoundationInputs,
  type FoundationResult,
} from '@/lib/formulas/foundation';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';
import { useI18n } from '@/hooks/useI18n';

const TOOL_KEY = 'foundation';

function n(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(v) ? v : NaN;
}

export default function FoundationScreen() {
  const { t } = useI18n();
  const [loadKn, setLoadKn] = useState('');
  const [sbc, setSbc] = useState('');
  const [depthM, setDepthM] = useState('0.5');
  const [density, setDensity] = useState('24');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<FoundationResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<FoundationInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<FoundationInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const run = useCallback(() => {
    setFormError(null);
    const inputs: FoundationInputs = {
      columnLoadKn: n(loadKn),
      allowableBearingKnPerM2: n(sbc),
      footingDepthM: n(depthM),
      concreteDensityKnPerM3: n(density) || 24,
    };
    if (!Number.isFinite(inputs.columnLoadKn) || !Number.isFinite(inputs.allowableBearingKnPerM2)) {
      setFormError(t('tools.foundation.error.loadSbc'));
      return;
    }
    if (inputs.columnLoadKn <= 0 || inputs.allowableBearingKnPerM2 <= 0) {
      setFormError(t('tools.foundation.error.positive'));
      return;
    }
    if (!Number.isFinite(inputs.footingDepthM) || inputs.footingDepthM < 0) {
      setFormError(t('tools.foundation.error.depth'));
      return;
    }

    const out = calculateFoundation(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<FoundationInputs>(TOOL_KEY).then(setHistory);
  }, [loadKn, sbc, depthM, density, t]);

  const applyHistory = (e: HistoryEntry<FoundationInputs>) => {
    const i = e.inputs;
    setLoadKn(String(i.columnLoadKn));
    setSbc(String(i.allowableBearingKnPerM2));
    setDepthM(String(i.footingDepthM));
    setDensity(String(i.concreteDensityKnPerM3));
    setResult(e.result as FoundationResult);
    setShowResult(true);
  };

  const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Foundation sizing" level="Mid" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<FoundationInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) => {
              const r = e.result as FoundationResult;
              return t('tools.foundation.historySummary')
                .replace('{side}', fmt(r.squareSideM, 2))
                .replace('{bearing}', fmt(r.bearingPressureKnPerM2, 1));
            }}
          />
          <ToolInputCard title="Loads & soil">
            {[
              [t('tools.foundation.field.load'), loadKn, t('tools.foundation.hint.load'), setLoadKn],
              [t('tools.foundation.field.sbc'), sbc, t('tools.foundation.hint.sbc'), setSbc],
              [t('tools.foundation.field.depth'), depthM, t('tools.foundation.hint.depth'), setDepthM],
              [t('tools.foundation.field.density'), density, t('tools.foundation.hint.density'), setDensity],
            ].map(([label, val, hint, set], idx) => (
              <View key={String(idx)} className="mb-3">
                <Text className="mb-1 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  {label as string}
                </Text>
                {hint ? (
                  <Text className="mb-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    {hint as string}
                  </Text>
                ) : null}
                <TextInput
                  value={val as string}
                  onChangeText={set as (t: string) => void}
                  keyboardType="decimal-pad"
                  className="min-h-[48px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
            ))}
          </ToolInputCard>
          {formError ? (
            <Text className="mb-2 text-center text-sm text-danger-600">{formError}</Text>
          ) : null}
          {showResult && result ? (
            <ToolResultCard>
              <ToolResultCardTitle>Square footing</ToolResultCardTitle>
              <Row label="Required area (m²)" value={fmt(result.requiredAreaM2, 3)} />
              <Row label="Side length B (m)" value={fmt(result.squareSideM, 3)} emphasize />
              <Row label="Footing self-weight (kN)" value={fmt(result.footingSelfWeightKn, 1)} />
              <Row label="Total on soil (kN)" value={fmt(result.totalLoadOnSoilKn, 1)} />
              <Row label="Bearing pressure (kN/m²)" value={fmt(result.bearingPressureKnPerM2, 2)} emphasize />
            </ToolResultCard>
          ) : null}
          <FormulaCard
            lines={[
              'Iterate: A = (P + SW) / qₐₗₗ',
              'SW ≈ γ_concrete × depth × A',
              'B = √A for a square pad',
              'Keep P and qₐₗₗ from consistent load factors.',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label={t('tools.foundation.calculateFooting')} onPress={run} />
    </SafeAreaView>
  );
}
