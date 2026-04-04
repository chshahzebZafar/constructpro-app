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
import { calculateCarbon, type CarbonInputs, type CarbonResult } from '@/lib/formulas/carbon';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';

const TOOL_KEY = 'carbon-footprint';

function n(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(v) ? v : 0;
}

export default function CarbonFootprintScreen() {
  const [area, setArea] = useState('');
  const [concrete, setConcrete] = useState('');
  const [steel, setSteel] = useState('');
  const [bricks, setBricks] = useState('');
  const [timber, setTimber] = useState('');
  const [tonneKm, setTonneKm] = useState('');
  const [diesel, setDiesel] = useState('');
  const [kwh, setKwh] = useState('');
  const [grid, setGrid] = useState('0.45');
  const [waste, setWaste] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<CarbonResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<CarbonInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void getHistory<CarbonInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const run = useCallback(() => {
    setFormError(null);
    const inputs: CarbonInputs = {
      projectAreaSqm: n(area) || undefined,
      concreteCubicM: n(concrete),
      steelTonnes: n(steel),
      brickCount: n(bricks),
      timberCubicM: n(timber),
      tonneKm: n(tonneKm),
      dieselLiters: n(diesel),
      electricityKwh: n(kwh),
      gridKgCo2PerKwh: n(grid) || 0.45,
      wasteToLandfillTonnes: n(waste),
    };
    const allZero =
      inputs.concreteCubicM === 0 &&
      inputs.steelTonnes === 0 &&
      inputs.brickCount === 0 &&
      inputs.tonneKm === 0 &&
      inputs.dieselLiters === 0 &&
      inputs.electricityKwh === 0 &&
      inputs.wasteToLandfillTonnes === 0 &&
      inputs.timberCubicM === 0;
    if (allZero) {
      setFormError('Enter at least one quantity.');
      return;
    }
    const out = calculateCarbon(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<CarbonInputs>(TOOL_KEY).then(setHistory);
  }, [area, concrete, steel, bricks, timber, tonneKm, diesel, kwh, grid, waste]);

  const applyHistory = (e: HistoryEntry<CarbonInputs>) => {
    const i = e.inputs;
    setArea(i.projectAreaSqm !== undefined ? String(i.projectAreaSqm) : '');
    setConcrete(String(i.concreteCubicM));
    setSteel(String(i.steelTonnes));
    setBricks(String(i.brickCount));
    setTimber(String(i.timberCubicM));
    setTonneKm(String(i.tonneKm));
    setDiesel(String(i.dieselLiters));
    setKwh(String(i.electricityKwh));
    setGrid(String(i.gridKgCo2PerKwh));
    setWaste(String(i.wasteToLandfillTonnes));
    setResult(e.result as CarbonResult);
    setShowResult(true);
  };

  const fields: [string, string, string, (t: string) => void][] = [
    ['Project area (m²) — optional', area, 'For intensity rating', setArea],
    ['Concrete (m³)', concrete, '', setConcrete],
    ['Steel (tonnes)', steel, '', setSteel],
    ['Bricks (count)', bricks, '', setBricks],
    ['Timber (m³)', timber, 'Carbon sink (negative)', setTimber],
    ['Transport (tonne·km)', tonneKm, '', setTonneKm],
    ['Diesel (L)', diesel, 'Machinery', setDiesel],
    ['Electricity (kWh)', kwh, '', setKwh],
    ['Grid factor (kg CO₂/kWh)', grid, 'Default 0.45', setGrid],
    ['Waste to landfill (tonnes)', waste, '', setWaste],
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Carbon footprint" level="Advanced" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<CarbonInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) =>
              `${(e.result as CarbonResult).totalTco2e.toFixed(2)} tCO₂e` +
              ((e.result as CarbonResult).rating ? ` · ${(e.result as CarbonResult).rating}` : '')
            }
          />
          <ToolInputCard title="Inputs (indicative factors)">
            {fields.map(([label, val, hint, set], idx) => (
              <View key={String(idx)} className="mb-3">
                <Text className="mb-1 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  {label}
                </Text>
                {hint ? (
                  <Text className="mb-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    {hint}
                  </Text>
                ) : null}
                <TextInput
                  value={val}
                  onChangeText={set}
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
              <ToolResultCardTitle>Emissions (tCO₂e)</ToolResultCardTitle>
              <Row label="Concrete" value={String(result.concreteTco2e)} />
              <Row label="Steel" value={String(result.steelTco2e)} />
              <Row label="Bricks" value={String(result.brickTco2e)} />
              <Row label="Timber (sink)" value={String(result.timberTco2e)} />
              <Row label="Transport" value={String(result.transportTco2e)} />
              <Row label="Machinery (diesel)" value={String(result.machineryTco2e)} />
              <Row label="Electricity" value={String(result.electricityTco2e)} />
              <Row label="Landfill waste" value={String(result.wasteTco2e)} />
              <Row label="Total" value={String(result.totalTco2e)} emphasize />
              {result.kgCo2ePerSqm !== null ? (
                <Row label="Intensity" value={`${result.kgCo2ePerSqm} kg/m²`} />
              ) : null}
              {result.rating ? (
                <Row label="Rating (A+–D)" value={result.rating} emphasize />
              ) : null}
            </ToolResultCard>
          ) : null}
          <FormulaCard
            lines={[
              'Concrete: m³ × 0.15 tCO₂e/m³',
              'Steel: t × 1.85',
              'Bricks: count × 0.00024 t',
              'Timber: m³ × −0.9 (sink)',
              'Transport: tonne·km × 0.096 / 1000',
              'Diesel: L × 2.68 / 1000',
              'Electricity: kWh × grid factor / 1000',
              'Waste: t × 21 / 1000',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label="Calculate footprint" onPress={run} />
    </SafeAreaView>
  );
}
