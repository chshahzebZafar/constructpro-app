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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { ToolInputCard } from '@/components/tools/ToolInputCard';
import { ToolResultCard, ToolResultCardTitle, Row } from '@/components/tools/ToolResultCard';
import { FormulaCard } from '@/components/tools/FormulaCard';
import { ToolStickyCalculateBar } from '@/components/tools/ToolStickyCalculateBar';
import { HistoryCard } from '@/components/tools/HistoryCard';
import { calculateRoi, type RoiInputs, type RoiResult } from '@/lib/formulas/roi';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';

const schema = z.object({
  totalInvestment: z.string().min(1),
  expectedRevenue: z.string().min(1),
  durationMonths: z.string().min(1),
  annualOperatingCost: z.string().min(1),
  financingInterestRatePercent: z.string().min(1),
});

type Form = z.infer<typeof schema>;
const TOOL_KEY = 'roi';

function num(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export default function RoiScreen() {
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<RoiResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry<RoiInputs>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      totalInvestment: '',
      expectedRevenue: '',
      durationMonths: '12',
      annualOperatingCost: '0',
      financingInterestRatePercent: '5',
    },
  });

  useEffect(() => {
    void getHistory<RoiInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const run = useCallback((data: Form) => {
    setFormError(null);
    const inputs: RoiInputs = {
      totalInvestment: num(data.totalInvestment),
      expectedRevenue: num(data.expectedRevenue),
      durationMonths: Math.round(num(data.durationMonths)),
      annualOperatingCost: num(data.annualOperatingCost),
      financingInterestRatePercent: num(data.financingInterestRatePercent),
    };
    if (Object.values(inputs).some((v) => !Number.isFinite(v))) {
      setFormError('Enter valid numbers.');
      return;
    }
    if (inputs.durationMonths < 1 || inputs.durationMonths > 240) {
      setFormError('Duration must be 1–240 months.');
      return;
    }
    const out = calculateRoi(inputs);
    setResult(out);
    setShowResult(true);
    void saveToHistory(TOOL_KEY, inputs, out);
    void getHistory<RoiInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const applyHistory = (e: HistoryEntry<RoiInputs>) => {
    const i = e.inputs;
    reset({
      totalInvestment: String(i.totalInvestment),
      expectedRevenue: String(i.expectedRevenue),
      durationMonths: String(i.durationMonths),
      annualOperatingCost: String(i.annualOperatingCost),
      financingInterestRatePercent: String(i.financingInterestRatePercent),
    });
    setResult(e.result as RoiResult);
    setShowResult(true);
  };

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="ROI calculator" level="Mid" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<RoiInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) =>
              `ROI ${(e.result as RoiResult).roiPercent.toFixed(1)}% · ${fmtUsd((e.result as RoiResult).netProfit)}`
            }
          />
          <ToolInputCard title="Investment & returns">
            {(
              [
                ['totalInvestment', 'Total investment ($)'],
                ['expectedRevenue', 'Expected revenue ($)'],
                ['durationMonths', 'Project duration (months)'],
                ['annualOperatingCost', 'Annual operating cost ($)'],
                ['financingInterestRatePercent', 'Financing interest (%/yr)'],
              ] as const
            ).map(([name, label]) => (
              <View key={name} className="mb-3">
                <Text className="mb-1 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  {label}
                </Text>
                <Controller
                  control={control}
                  name={name}
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                      className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-neutral-900"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    />
                  )}
                />
              </View>
            ))}
          </ToolInputCard>
          {formError ? (
            <Text className="mb-2 text-center text-sm text-danger-600">{formError}</Text>
          ) : null}
          {showResult && result ? (
            <ToolResultCard>
              <ToolResultCardTitle>Results</ToolResultCardTitle>
              <Row label="Financing cost" value={fmtUsd(result.financingCost)} />
              <Row label="Total OPEX (period)" value={fmtUsd(result.totalOpex)} />
              <Row label="Gross profit" value={fmtUsd(result.grossProfit)} />
              <Row label="Net profit" value={fmtUsd(result.netProfit)} emphasize />
              <Row label="ROI" value={`${result.roiPercent.toFixed(1)}%`} emphasize />
              <Row label="Annualised ROI" value={`${result.annualisedRoiPercent.toFixed(1)}%`} />
              <Row
                label="Breakeven (months)"
                value={result.breakevenMonths !== null ? String(result.breakevenMonths) : 'N/A'}
              />
            </ToolResultCard>
          ) : null}
          <FormulaCard
            lines={[
              'Financing ≈ Investment × (rate/100) × (months/12)',
              'OPEX = Annual OPEX × (months/12)',
              'Gross = Revenue − Investment',
              'Net = Gross − OPEX − Financing',
              'ROI% = (Net / Investment) × 100',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar label="Calculate ROI" onPress={handleSubmit(run)} />
    </SafeAreaView>
  );
}
