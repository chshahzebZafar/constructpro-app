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
import { ToolResultCard, ToolResultCardTitle } from '@/components/tools/ToolResultCard';
import { FormulaCard } from '@/components/tools/FormulaCard';
import { ToolStickyCalculateBar } from '@/components/tools/ToolStickyCalculateBar';
import { HistoryCard } from '@/components/tools/HistoryCard';
import {
  calculateMaterial,
  type MaterialInputs,
  type MaterialMode,
  type MaterialResult,
} from '@/lib/formulas/material';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';
import { Colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

const MODES: { id: MaterialMode; label: string }[] = [
  { id: 'bricks', label: 'Bricks' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'paint', label: 'Paint' },
  { id: 'sand', label: 'Sand' },
];

const TOOL_KEY = 'material-quantity';

export default function MaterialQuantityScreen() {
  const { t } = useI18n();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const [mode, setMode] = useState<MaterialMode>('bricks');
  const [wastage, setWastage] = useState(8);
  const [wallArea, setWallArea] = useState('');
  const [floorArea, setFloorArea] = useState('');
  const [tileL, setTileL] = useState('300');
  const [tileW, setTileW] = useState('300');
  const [paintArea, setPaintArea] = useState('');
  const [coverage, setCoverage] = useState('10');
  const [coats, setCoats] = useState('2');
  const [sandVol, setSandVol] = useState('');
  const [screedArea, setScreedArea] = useState('');
  const [screedThick, setScreedThick] = useState('');
  const [sandMode, setSandMode] = useState<'direct' | 'screed'>('direct');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<MaterialResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<MaterialInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<MaterialInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const buildInputs = (): MaterialInputs | null => {
    const base: MaterialInputs = { mode, wastagePercent: wastage };
    switch (mode) {
      case 'bricks': {
        const a = parseFloat(wallArea);
        if (!Number.isFinite(a) || a <= 0) return null;
        return { ...base, wallAreaSqm: a };
      }
      case 'tiles': {
        const a = parseFloat(floorArea);
        const L = parseFloat(tileL);
        const W = parseFloat(tileW);
        if (!Number.isFinite(a) || a <= 0) return null;
        if (![L, W].every((n) => Number.isFinite(n) && n > 0)) return null;
        return { ...base, floorAreaSqm: a, tileLengthMm: L, tileWidthMm: W };
      }
      case 'paint': {
        const a = parseFloat(paintArea);
        const cov = parseFloat(coverage);
        const c = parseInt(coats, 10);
        if (!Number.isFinite(a) || a <= 0) return null;
        if (!Number.isFinite(cov) || cov <= 0) return null;
        if (!Number.isFinite(c) || c < 1) return null;
        return { ...base, surfaceAreaSqm: a, coverageSqmPerLiter: cov, coats: c };
      }
      case 'sand': {
        if (sandMode === 'direct') {
          const v = parseFloat(sandVol);
          if (!Number.isFinite(v) || v <= 0) return null;
          return { ...base, sandVolumeCubicM: v };
        }
        const sa = parseFloat(screedArea);
        const th = parseFloat(screedThick);
        if (!Number.isFinite(sa) || sa <= 0) return null;
        if (!Number.isFinite(th) || th <= 0) return null;
        return { ...base, screedAreaSqm: sa, screedThicknessMm: th };
      }
      default:
        return null;
    }
  };

  const runCalculate = useCallback(() => {
    setFormError(null);
    const inputs = buildInputs();
    if (!inputs) {
      setFormError(localizeKnownUiText(t, 'Check all required fields for this mode.'));
      return;
    }
    const out = calculateMaterial(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<MaterialInputs>(TOOL_KEY).then(setHistory);
  }, [
    mode,
    wastage,
    wallArea,
    floorArea,
    tileL,
    tileW,
    paintArea,
    coverage,
    coats,
    sandVol,
    screedArea,
    screedThick,
    sandMode,
  ]);

  const applyHistory = (entry: HistoryEntry<MaterialInputs>) => {
    const i = entry.inputs;
    setMode(i.mode);
    setWastage(i.wastagePercent);
    setWallArea(i.wallAreaSqm !== undefined ? String(i.wallAreaSqm) : '');
    setFloorArea(i.floorAreaSqm !== undefined ? String(i.floorAreaSqm) : '');
    setTileL(i.tileLengthMm !== undefined ? String(i.tileLengthMm) : '300');
    setTileW(i.tileWidthMm !== undefined ? String(i.tileWidthMm) : '300');
    setPaintArea(i.surfaceAreaSqm !== undefined ? String(i.surfaceAreaSqm) : '');
    setCoverage(i.coverageSqmPerLiter !== undefined ? String(i.coverageSqmPerLiter) : '10');
    setCoats(i.coats !== undefined ? String(i.coats) : '2');
    setSandVol(i.sandVolumeCubicM !== undefined ? String(i.sandVolumeCubicM) : '');
    setScreedArea(i.screedAreaSqm !== undefined ? String(i.screedAreaSqm) : '');
    setScreedThick(i.screedThicknessMm !== undefined ? String(i.screedThicknessMm) : '');
    if (i.sandVolumeCubicM !== undefined) setSandMode('direct');
    else if (i.screedAreaSqm !== undefined) setSandMode('screed');
    setResult(entry.result as MaterialResult);
    setShowResult(true);
  };

  const formulaLines =
    mode === 'bricks'
      ? ['Bricks ≈ wall area (m²) × 50 bricks/m² × (1 + wastage%)', 'Rule of thumb — verify against local bond pattern']
      : mode === 'tiles'
        ? [
            'Tile area = (length mm × width mm) / 10⁶',
            'Count = ceil(floor area / tile area × (1 + wastage%))',
          ]
        : mode === 'paint'
          ? [
              'Litres = ceil(area / coverage per litre × coats × (1 + wastage%))',
              'Coverage from datasheet (m² per litre)',
            ]
          : [
              'Direct: volume × (1 + wastage%)',
              'Screed: area × thickness / 1000 → m³ sand',
            ];

  const localizedResultLabel = result
    ? tr(`tools.material.result.${result.mode}.primary`, result.primaryLabel)
    : '';

  const localizedResultSecondary = result
    ? result.mode === 'bricks'
      ? tr(
          'tools.material.result.bricks.secondary',
          `Based on ~50 bricks/m² wall area (incl. wastage)`
        )
      : result.mode === 'tiles'
        ? tr(
            'tools.material.result.tiles.secondary',
            `Tile size ${tileL || 300}×${tileW || 300} mm`
          )
            .replace('{tileL}', tileL || '300')
            .replace('{tileW}', tileW || '300')
        : result.mode === 'paint'
          ? tr(
              'tools.material.result.paint.secondary',
              `${coats || 2} coat(s), ${coverage || 10} m²/L coverage (incl. wastage)`
            )
              .replace('{coats}', coats || '2')
              .replace('{coverage}', coverage || '10')
          : sandMode === 'screed' && screedArea && screedThick
            ? tr(
                'tools.material.result.sand.screedSecondary',
                `Screed ${screedArea} m² × ${screedThick} mm`
              )
                .replace('{area}', screedArea)
                .replace('{thickness}', screedThick)
            : tr('tools.material.result.sand.directSecondary', 'Direct volume (incl. wastage)')
    : '';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title={localizeKnownUiText(t, 'Material quantity')} level="Basic" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<MaterialInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) =>
              `${localizeKnownUiText(t, e.inputs.mode === 'bricks' ? 'Bricks' : e.inputs.mode === 'tiles' ? 'Tiles' : e.inputs.mode === 'paint' ? 'Paint' : 'Sand')} · ${(e.result as MaterialResult).primaryValue} ${(e.result as MaterialResult).primaryUnit}`
            }
          />

            <ToolInputCard title={localizeKnownUiText(t, 'Material type')}>
            <View className="flex-row flex-wrap gap-2">
              {MODES.map((m) => {
                const sel = mode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setMode(m.id);
                      setShowResult(false);
                    }}
                    className={`rounded-xl border px-4 py-2 ${
                      sel ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                    }`}
                  >
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {localizeKnownUiText(t, m.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mb-1 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Wastage')}: {wastage}%
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={25}
              step={1}
              value={wastage}
              onValueChange={setWastage}
              minimumTrackTintColor={Colors.accent[600]}
              maximumTrackTintColor={Colors.neutral[300]}
              thumbTintColor={Colors.brand[900]}
            />
          </ToolInputCard>

          {mode === 'bricks' ? (
            <ToolInputCard title={localizeKnownUiText(t, 'Wall area')}>
              <TextInput
                value={wallArea}
                onChangeText={setWallArea}
                keyboardType="decimal-pad"
                placeholder={localizeKnownUiText(t, 'Net wall area (m²)')}
                placeholderTextColor="#9CA3AF"
                className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
            </ToolInputCard>
          ) : null}

          {mode === 'tiles' ? (
            <ToolInputCard title={localizeKnownUiText(t, 'Floor & tile')}>
              <Text className="mb-1 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
                {localizeKnownUiText(t, 'Floor area (m²)')}
              </Text>
              <TextInput
                value={floorArea}
                onChangeText={setFloorArea}
                keyboardType="decimal-pad"
                placeholder="e.g. 24"
                placeholderTextColor="#9CA3AF"
                className="mb-4 min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-neutral-600">
                    {localizeKnownUiText(t, 'Tile L (mm)')}
                  </Text>
                  <TextInput
                    value={tileL}
                    onChangeText={setTileL}
                    keyboardType="number-pad"
                    className="min-h-[48px] rounded-lg border border-neutral-300 px-2 text-center text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-neutral-600">
                    {localizeKnownUiText(t, 'Tile W (mm)')}
                  </Text>
                  <TextInput
                    value={tileW}
                    onChangeText={setTileW}
                    keyboardType="number-pad"
                    className="min-h-[48px] rounded-lg border border-neutral-300 px-2 text-center text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
              </View>
            </ToolInputCard>
          ) : null}

          {mode === 'paint' ? (
            <ToolInputCard title={localizeKnownUiText(t, 'Paint')}>
              <TextInput
                value={paintArea}
                onChangeText={setPaintArea}
                keyboardType="decimal-pad"
                placeholder={localizeKnownUiText(t, 'Surface area (m²)')}
                placeholderTextColor="#9CA3AF"
                className="mb-3 min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <TextInput
                value={coverage}
                onChangeText={setCoverage}
                keyboardType="decimal-pad"
                placeholder={localizeKnownUiText(t, 'Coverage (m² per litre)')}
                placeholderTextColor="#9CA3AF"
                className="mb-3 min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <TextInput
                value={coats}
                onChangeText={setCoats}
                keyboardType="number-pad"
                placeholder={localizeKnownUiText(t, 'Number of coats')}
                placeholderTextColor="#9CA3AF"
                className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
            </ToolInputCard>
          ) : null}

          {mode === 'sand' ? (
            <ToolInputCard title={localizeKnownUiText(t, 'Sand volume')}>
              <View className="mb-4 flex-row gap-2">
                <Pressable
                  onPress={() => setSandMode('direct')}
                  className={`flex-1 rounded-xl border py-2 ${
                    sandMode === 'direct' ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300'
                  }`}
                >
                  <Text className="text-center text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                    {localizeKnownUiText(t, 'Direct m³')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSandMode('screed')}
                  className={`flex-1 rounded-xl border py-2 ${
                    sandMode === 'screed' ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300'
                  }`}
                >
                  <Text className="text-center text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                    {localizeKnownUiText(t, 'Screed')}
                  </Text>
                </Pressable>
              </View>
              {sandMode === 'direct' ? (
                <TextInput
                  value={sandVol}
                  onChangeText={setSandVol}
                  keyboardType="decimal-pad"
                  placeholder={localizeKnownUiText(t, 'Required sand (m³)')}
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              ) : (
                <>
                  <TextInput
                    value={screedArea}
                    onChangeText={setScreedArea}
                    keyboardType="decimal-pad"
                    placeholder={localizeKnownUiText(t, 'Area (m²)')}
                    placeholderTextColor="#9CA3AF"
                    className="mb-2 min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                  <TextInput
                    value={screedThick}
                    onChangeText={setScreedThick}
                    keyboardType="decimal-pad"
                    placeholder={localizeKnownUiText(t, 'Thickness (mm)')}
                    placeholderTextColor="#9CA3AF"
                    className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </>
              )}
            </ToolInputCard>
          ) : null}

          {formError ? (
            <Text className="mb-2 text-center text-sm text-danger-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {formError}
            </Text>
          ) : null}

          {showResult && result ? (
            <ToolResultCard>
              <ToolResultCardTitle>{localizedResultLabel}</ToolResultCardTitle>
              <Text
                className="text-[22px] text-brand-900"
                style={{ fontFamily: 'Poppins_700Bold' }}
              >
                {result.primaryValue} {result.primaryUnit}
              </Text>
              {localizedResultSecondary ? (
                <Text className="mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                  {localizedResultSecondary}
                </Text>
              ) : null}
            </ToolResultCard>
          ) : null}

          <FormulaCard lines={formulaLines} />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label={localizeKnownUiText(t, 'Calculate quantity')} onPress={runCalculate} />
    </SafeAreaView>
  );
}
