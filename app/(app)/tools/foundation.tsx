import { useState, useEffect, useCallback } from 'react';
import {
  View,
  View as RNView,
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
  type BearingStatus,
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
              <Row label="Length (m)" value={fmt(result.lengthM, 3)} emphasize />
              <Row label="Width (m)" value={fmt(result.widthM, 3)} emphasize />
              <Row label="Footing self-weight (kN)" value={fmt(result.footingSelfWeightKn, 1)} />
              <Row label="Total on soil (kN)" value={fmt(result.totalLoadOnSoilKn, 1)} />
              {/* Bearing pressure row with status badge */}
              <RNView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 13, color: '#374151', fontFamily: 'Inter_400Regular' }}>Bearing pressure (kN/m²)</Text>
                <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: '#111827' }}>{fmt(result.bearingPressureKnPerM2, 2)}</Text>
                  {(() => {
                    const cfg: Record<BearingStatus, { label: string; bg: string; color: string }> = {
                      safe:    { label: 'Good Soil ≥300',  bg: '#dcfce7', color: '#16a34a' },
                      normal:  { label: 'Medium 150–299',  bg: '#dbeafe', color: '#1d4ed8' },
                      warning: { label: 'Weak 75–149',     bg: '#fef3c7', color: '#d97706' },
                      danger:  { label: 'Poor Soil <75',   bg: '#fee2e2', color: '#dc2626' },
                    };
                    const c = cfg[result.bearingStatus];
                    return (
                      <RNView style={{ backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, color: c.color, fontFamily: 'Inter_500Medium' }}>
                          {c.label} kN/m²
                        </Text>
                      </RNView>
                    );
                  })()}
                </RNView>
              </RNView>
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
