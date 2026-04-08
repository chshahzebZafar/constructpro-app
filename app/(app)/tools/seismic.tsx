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
import { calculateSeismic, type SeismicInputs, type SeismicResult } from '@/lib/formulas/seismic';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';
import { useI18n } from '@/hooks/useI18n';

const TOOL_KEY = 'seismic';

function n(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(v) ? v : NaN;
}

export default function SeismicScreen() {
  const { t } = useI18n();
  const [weightKn, setWeightKn] = useState('');
  const [cs, setCs] = useState('');
  const [importance, setImportance] = useState('1');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SeismicResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<SeismicInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<SeismicInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const run = useCallback(() => {
    setFormError(null);
    const inputs: SeismicInputs = {
      seismicWeightKn: n(weightKn),
      responseCoefficientCs: n(cs),
      importanceFactor: n(importance) || 1,
    };
    if (!Number.isFinite(inputs.seismicWeightKn) || inputs.seismicWeightKn <= 0) {
      setFormError(t('tools.seismic.error.weight'));
      return;
    }
    if (!Number.isFinite(inputs.responseCoefficientCs) || inputs.responseCoefficientCs <= 0) {
      setFormError(t('tools.seismic.error.cs'));
      return;
    }
    if (!Number.isFinite(inputs.importanceFactor) || inputs.importanceFactor < 1) {
      setFormError(t('tools.seismic.error.importance'));
      return;
    }

    const out = calculateSeismic(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<SeismicInputs>(TOOL_KEY).then(setHistory);
  }, [weightKn, cs, importance, t]);

  const applyHistory = (e: HistoryEntry<SeismicInputs>) => {
    const i = e.inputs;
    setWeightKn(String(i.seismicWeightKn));
    setCs(String(i.responseCoefficientCs));
    setImportance(String(i.importanceFactor));
    setResult(e.result as SeismicResult);
    setShowResult(true);
  };

  const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Seismic base shear" level="Advanced" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<SeismicInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) =>
              t('tools.seismic.historySummary').replace('{v}', fmt((e.result as SeismicResult).baseShearKn, 1))
            }
          />
          <ToolInputCard title="Inputs">
            {[
              [t('tools.seismic.field.weight'), weightKn, t('tools.seismic.hint.weight'), setWeightKn],
              [t('tools.seismic.field.cs'), cs, t('tools.seismic.hint.cs'), setCs],
              [t('tools.seismic.field.importance'), importance, t('tools.seismic.hint.importance'), setImportance],
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
              <ToolResultCardTitle>Base shear</ToolResultCardTitle>
              <Row label="V (kN)" value={fmt(result.baseShearKn, 2)} emphasize />
            </ToolResultCard>
          ) : null}
          <FormulaCard
            lines={[
              'V = Cs × I × W',
              'Obtain Cs, I, and W definitions from your local seismic code.',
              'Vertical distribution and combinations are not included here.',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label={t('tools.seismic.calculateV')} onPress={run} />
    </SafeAreaView>
  );
}
