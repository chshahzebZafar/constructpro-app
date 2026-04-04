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
  calculateLoadBearing,
  type LoadBearingInputs,
  type LoadBearingResult,
} from '@/lib/formulas/loadBearing';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';

const TOOL_KEY = 'load-bearing';

function n(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(v) ? v : NaN;
}

export default function LoadBearingScreen() {
  const [widthM, setWidthM] = useState('');
  const [thicknessM, setThicknessM] = useState('');
  const [heightM, setHeightM] = useState('');
  const [fMpa, setFMpa] = useState('');
  const [gammaM, setGammaM] = useState('1.5');
  const [appliedKn, setAppliedKn] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<LoadBearingResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<LoadBearingInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<LoadBearingInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const run = useCallback(() => {
    setFormError(null);
    const inputs: LoadBearingInputs = {
      widthM: n(widthM),
      thicknessM: n(thicknessM),
      heightM: heightM.trim() === '' ? 0 : n(heightM),
      compressiveStrengthMpa: n(fMpa),
      materialPartialFactor: n(gammaM),
      appliedLoadKn: appliedKn.trim() === '' ? 0 : n(appliedKn),
    };
    if (
      !Number.isFinite(inputs.widthM) ||
      !Number.isFinite(inputs.thicknessM) ||
      !Number.isFinite(inputs.compressiveStrengthMpa) ||
      !Number.isFinite(inputs.materialPartialFactor)
    ) {
      setFormError('Enter valid numbers for width, thickness, strength, and γM.');
      return;
    }
    if (inputs.widthM <= 0 || inputs.thicknessM <= 0) {
      setFormError('Width and thickness must be positive.');
      return;
    }
    if (inputs.compressiveStrengthMpa <= 0) {
      setFormError('Compressive strength must be positive.');
      return;
    }
    if (inputs.materialPartialFactor < 1) {
      setFormError('γM should be at least 1.');
      return;
    }
    if (inputs.heightM < 0 || (heightM.trim() !== '' && !Number.isFinite(inputs.heightM))) {
      setFormError('Height must be empty or a valid non-negative number.');
      return;
    }
    if (appliedKn.trim() !== '' && (!Number.isFinite(inputs.appliedLoadKn) || inputs.appliedLoadKn < 0)) {
      setFormError('Applied load must be empty or ≥ 0.');
      return;
    }

    const out = calculateLoadBearing(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<LoadBearingInputs>(TOOL_KEY).then(setHistory);
  }, [widthM, thicknessM, heightM, fMpa, gammaM, appliedKn]);

  const applyHistory = (e: HistoryEntry<LoadBearingInputs>) => {
    const i = e.inputs;
    setWidthM(String(i.widthM));
    setThicknessM(String(i.thicknessM));
    setHeightM(i.heightM > 0 ? String(i.heightM) : '');
    setFMpa(String(i.compressiveStrengthMpa));
    setGammaM(String(i.materialPartialFactor));
    setAppliedKn(i.appliedLoadKn > 0 ? String(i.appliedLoadKn) : '');
    setResult(e.result as LoadBearingResult);
    setShowResult(true);
  };

  const fmt = (x: number, d = 2) =>
    Number.isFinite(x) ? x.toFixed(d) : '—';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Load bearing" level="Mid" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<LoadBearingInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) =>
              `${fmt((e.result as LoadBearingResult).designCapacityKn, 1)} kN design · φ ${fmt(
                (e.result as LoadBearingResult).slendernessReduction,
                2
              )}`
            }
          />
          <ToolInputCard title="Section & material">
            {[
              ['Width / length (m)', widthM, 'Bearing plan dimension', setWidthM],
              ['Thickness (m)', thicknessM, 'Wall thickness or column depth', setThicknessM],
              ['Height (m)', heightM, 'Optional — for h/t slenderness', setHeightM],
              ['f (MPa)', fMpa, 'Characteristic compressive strength', setFMpa],
              ['γM', gammaM, 'Partial factor on material (e.g. 1.5)', setGammaM],
              ['Applied axial load (kN)', appliedKn, 'Optional — for FoS & utilization', setAppliedKn],
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
              <ToolResultCardTitle>Axial resistance</ToolResultCardTitle>
              <Row label="Area (m²)" value={fmt(result.areaM2, 3)} />
              <Row
                label="h/t"
                value={result.slendernessRatio !== null ? fmt(result.slendernessRatio, 2) : '— (no height)'}
              />
              <Row label="Slenderness φ" value={fmt(result.slendernessReduction, 3)} />
              <Row label="Gross N (no φ) (kN)" value={fmt(result.grossCapacityKn, 1)} />
              <Row label="Design N Rd (kN)" value={fmt(result.designCapacityKn, 1)} emphasize />
              {result.factorOfSafety !== null ? (
                <Row label="FoS (N Rd / N Ed)" value={fmt(result.factorOfSafety, 2)} emphasize />
              ) : null}
              {result.utilizationPercent !== null ? (
                <Row label="Utilization (%)" value={fmt(result.utilizationPercent, 1)} />
              ) : null}
            </ToolResultCard>
          ) : null}
          <FormulaCard
            lines={[
              'A = width × thickness (m²)',
              'N_gross = f × A × 1000 (kN)',
              'N_Rd = (f / γM) × A × 1000 × φ',
              'φ(h/t): indicative reduction for slender walls',
              'Not a substitute for national structural codes.',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label="Calculate capacity" onPress={run} />
    </SafeAreaView>
  );
}
