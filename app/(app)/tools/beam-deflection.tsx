import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { ToolInputCard } from '@/components/tools/ToolInputCard';
import { ToolResultCard, ToolResultCardTitle, Row } from '@/components/tools/ToolResultCard';
import { FormulaCard } from '@/components/tools/FormulaCard';
import { ToolStickyCalculateBar } from '@/components/tools/ToolStickyCalculateBar';
import { HistoryCard } from '@/components/tools/HistoryCard';
import {
  calculateBeamDeflection,
  deflectionPassesSpanLimit,
  type BeamDeflectionInputs,
  type BeamDeflectionResult,
  type BeamLoadType,
} from '@/lib/formulas/beamDeflection';
import { Colors } from '@/constants/colors';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';

const TOOL_KEY = 'beam-deflection';

function n(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(v) ? v : NaN;
}

export default function BeamDeflectionScreen() {
  const [loadType, setLoadType] = useState<BeamLoadType>('udl');
  const [wKnm, setWKnm] = useState('');
  const [pointKn, setPointKn] = useState('');
  const [spanM, setSpanM] = useState('');
  const [eGpa, setEGpa] = useState('200');
  const [icm4, setIcm4] = useState('');
  const [limitRatio, setLimitRatio] = useState('360');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<BeamDeflectionResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<BeamDeflectionInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<BeamDeflectionInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const run = useCallback(() => {
    setFormError(null);
    const inputs: BeamDeflectionInputs = {
      loadType,
      wKnm: n(wKnm),
      pointLoadKn: n(pointKn),
      spanM: n(spanM),
      elasticModulusGpa: n(eGpa),
      secondMomentCm4: n(icm4),
    };
    if (!Number.isFinite(inputs.spanM) || inputs.spanM <= 0) {
      setFormError('Enter a valid span (m).');
      return;
    }
    if (!Number.isFinite(inputs.elasticModulusGpa) || inputs.elasticModulusGpa <= 0) {
      setFormError('Enter E (GPa).');
      return;
    }
    if (!Number.isFinite(inputs.secondMomentCm4) || inputs.secondMomentCm4 <= 0) {
      setFormError('Enter I (cm⁴).');
      return;
    }
    if (loadType === 'udl') {
      if (!Number.isFinite(inputs.wKnm) || inputs.wKnm <= 0) {
        setFormError('Enter w (kN/m).');
        return;
      }
    } else if (!Number.isFinite(inputs.pointLoadKn) || inputs.pointLoadKn <= 0) {
      setFormError('Enter point load (kN).');
      return;
    }

    const lim = n(limitRatio);
    if (!Number.isFinite(lim) || lim <= 0) {
      setFormError('Span limit ratio must be positive (e.g. 360).');
      return;
    }

    const out = calculateBeamDeflection(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<BeamDeflectionInputs>(TOOL_KEY).then(setHistory);
  }, [loadType, wKnm, pointKn, spanM, eGpa, icm4, limitRatio]);

  const applyHistory = (e: HistoryEntry<BeamDeflectionInputs>) => {
    const i = e.inputs;
    setLoadType(i.loadType);
    setWKnm(String(i.wKnm));
    setPointKn(String(i.pointLoadKn));
    setSpanM(String(i.spanM));
    setEGpa(String(i.elasticModulusGpa));
    setIcm4(String(i.secondMomentCm4));
    setResult(e.result as BeamDeflectionResult);
    setShowResult(true);
  };

  const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');

  let passes: boolean | null = null;
  if (result && limitRatio) {
    const lim = n(limitRatio);
    if (Number.isFinite(lim) && lim > 0) {
      passes = deflectionPassesSpanLimit(n(spanM) || 0, result.deflectionMm, lim);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Beam deflection" level="Advanced" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<BeamDeflectionInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) => {
              const r = e.result as BeamDeflectionResult;
              const lsd = r.spanOverDeflection;
              return `${fmt(r.deflectionMm, 2)} mm${lsd != null ? ` · L/δ ${fmt(lsd, 0)}` : ''}`;
            }}
          />
          <ToolInputCard title="Load type">
            <View className="flex-row gap-2">
              {(['udl', 'point'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setLoadType(t)}
                  className="flex-1 rounded-xl border px-3 py-3"
                  style={{
                    borderColor: loadType === t ? Colors.brand[700] : Colors.neutral[300],
                    backgroundColor: loadType === t ? Colors.brand[100] : '#fff',
                  }}
                >
                  <Text
                    className="text-center text-sm text-brand-900"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {t === 'udl' ? 'UDL' : 'Point @ mid'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ToolInputCard>
          <ToolInputCard title="Section & span">
            {loadType === 'udl' ? (
              <View className="mb-3">
                <Text className="mb-1 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  w (kN/m)
                </Text>
                <TextInput
                  value={wKnm}
                  onChangeText={setWKnm}
                  keyboardType="decimal-pad"
                  className="min-h-[48px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
            ) : (
              <View className="mb-3">
                <Text className="mb-1 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  Point load (kN)
                </Text>
                <TextInput
                  value={pointKn}
                  onChangeText={setPointKn}
                  keyboardType="decimal-pad"
                  className="min-h-[48px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
            )}
            {[
              ['Span L (m)', spanM, 'Simply supported', setSpanM],
              ['E (GPa)', eGpa, 'Steel ~200, concrete ~30', setEGpa],
              ['I (cm⁴)', icm4, 'Second moment of area', setIcm4],
              ['Deflection limit L / ?', limitRatio, 'e.g. 360 (roof), 250 (floor)', setLimitRatio],
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
              <ToolResultCardTitle>Elastic deflection (SLS)</ToolResultCardTitle>
              <Row label="δ (mm)" value={fmt(result.deflectionMm, 3)} emphasize />
              <Row
                label="L / δ"
                value={result.spanOverDeflection !== null ? fmt(result.spanOverDeflection, 0) : '—'}
              />
              {passes !== null ? (
                <Row
                  label={`SLS check (δ ≤ L/${limitRatio})`}
                  value={passes ? 'OK' : 'Exceeds'}
                  emphasize
                />
              ) : null}
            </ToolResultCard>
          ) : null}
          <FormulaCard
            lines={[
              'UDL: δ = 5 w L⁴ / (384 E I)',
              'Point @ midspan: δ = P L³ / (48 E I)',
              'w → N/m, P → N, E → Pa, I → m⁴ (cm⁴ × 10⁻⁸)',
              'Simply supported; verify with your code for creep, cracking, limits.',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label="Calculate deflection" onPress={run} />
    </SafeAreaView>
  );
}
