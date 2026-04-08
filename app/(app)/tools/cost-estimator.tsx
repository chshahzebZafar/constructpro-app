import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { ToolInputCard } from '@/components/tools/ToolInputCard';
import { ToolResultCard, ToolResultCardTitle, Row } from '@/components/tools/ToolResultCard';
import { FormulaCard } from '@/components/tools/FormulaCard';
import { ToolStickyCalculateBar } from '@/components/tools/ToolStickyCalculateBar';
import { HistoryCard } from '@/components/tools/HistoryCard';
import { Button } from '@/components/ui/Button';
import { calculateCost, type CostInputs, type CostResult } from '@/lib/formulas/cost';
import { saveToHistory, getHistory, type HistoryEntry } from '@/lib/storage/calculatorHistory';
import { exportCostEstimatePdf } from '@/lib/pdf/generateEstimatePdf';
import { useAuthStore } from '@/store/useAuthStore';
import { Colors } from '@/constants/colors';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/profile/currency';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

const PROJECT_TYPES = [
  { id: 'residential' as const, label: 'Residential', icon: 'home-outline' as const },
  { id: 'commercial' as const, label: 'Commercial', icon: 'business-outline' as const },
  { id: 'industrial' as const, label: 'Industrial', icon: 'cube-outline' as const },
  { id: 'infrastructure' as const, label: 'Infrastructure', icon: 'navigate-outline' as const },
];

const GRADES = [
  { id: 'basic' as const, label: 'Basic', mult: '×1.0' },
  { id: 'standard' as const, label: 'Standard', mult: '×1.35' },
  { id: 'premium' as const, label: 'Premium', mult: '×1.75' },
];

const costFormSchema = z.object({
  projectType: z.enum(['residential', 'commercial', 'industrial', 'infrastructure']),
  area: z.string().min(1, 'Enter area'),
  region: z.string().optional(),
  materialGrade: z.enum(['basic', 'standard', 'premium']),
  laborRatePerDay: z.string().min(1, 'Enter rate'),
  laborDays: z.string().min(1, 'Enter days'),
  contingencyPercent: z.number().min(0).max(30),
  taxPercent: z.string().min(1, 'Enter tax %'),
});

type CostForm = z.infer<typeof costFormSchema>;

const TOOL_KEY = 'cost-estimator';

function parseUsd(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export default function CostEstimatorScreen() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const temporaryDevLogin = useAuthStore((s) => s.temporaryDevLogin);
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const [areaUnit, setAreaUnit] = useState<'sqm' | 'sqft'>('sqm');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<CostResult | null>(null);
  const [lastInputs, setLastInputs] = useState<CostInputs | null>(null);
  const [history, setHistory] = useState<HistoryEntry<CostInputs>[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CostForm>({
    resolver: zodResolver(costFormSchema),
    defaultValues: {
      projectType: 'residential',
      area: '',
      region: '',
      materialGrade: 'standard',
      laborRatePerDay: '',
      laborDays: '',
      contingencyPercent: 10,
      taxPercent: '8',
    },
  });

  const areaStr = watch('area');

  const suggestedLaborDays = useMemo(() => {
    const raw = parseFloat(areaStr || '0');
    if (!Number.isFinite(raw) || raw <= 0) return null;
    const sqm = areaUnit === 'sqft' ? raw * 0.09290304 : raw;
    return Math.max(1, Math.round(sqm / 15));
  }, [areaStr, areaUnit]);

  useEffect(() => {
    void getHistory<CostInputs>(TOOL_KEY).then(setHistory);
  }, []);

  const toCostInputs = (data: CostForm): CostInputs | null => {
    const areaRaw = parseFloat(data.area);
    if (!Number.isFinite(areaRaw) || areaRaw <= 0) return null;
    const areaSqm = areaUnit === 'sqft' ? areaRaw * 0.09290304 : areaRaw;
    const laborRate = parseUsd(data.laborRatePerDay);
    const laborDays = parseInt(data.laborDays, 10);
    const tax = parseFloat(data.taxPercent);
    if (!Number.isFinite(laborRate) || laborRate < 0) return null;
    if (!Number.isFinite(laborDays) || laborDays < 1) return null;
    if (!Number.isFinite(tax) || tax < 0 || tax > 25) return null;
    return {
      projectType: data.projectType,
      areaSqm,
      materialGrade: data.materialGrade,
      laborRatePerDay: laborRate,
      laborDays,
      contingencyPercent: data.contingencyPercent,
      taxPercent: tax,
    };
  };

  const runCalculate = useCallback(
    async (data: CostForm) => {
      setFormError(null);
      const inputs = toCostInputs(data);
      if (!inputs) {
        setFormError(localizeKnownUiText(t, 'Check all numeric fields.'));
        return;
      }
      const out = calculateCost(inputs);
      setResult(out);
      setLastInputs(inputs);
      setShowResult(true);
      await saveToHistory(TOOL_KEY, inputs, out);
      void getHistory<CostInputs>(TOOL_KEY).then(setHistory);
    },
    [areaUnit]
  );

  const applyHistory = (entry: HistoryEntry<CostInputs>) => {
    const i = entry.inputs;
    const areaDisplay =
      areaUnit === 'sqft' ? (i.areaSqm / 0.09290304).toFixed(1) : i.areaSqm.toFixed(1);
    reset({
      projectType: i.projectType,
      area: areaDisplay,
      region: '',
      materialGrade: i.materialGrade,
      laborRatePerDay: String(i.laborRatePerDay),
      laborDays: String(i.laborDays),
      contingencyPercent: i.contingencyPercent,
      taxPercent: String(i.taxPercent),
    });
    setResult(entry.result as CostResult);
    setLastInputs(i);
    setShowResult(true);
  };

  const userName =
    temporaryDevLogin
      ? 'Preview user'
      : user?.displayName || user?.email?.split('@')[0] || 'User';

  const onExportPdf = async () => {
    if (!lastInputs || !result) return;
    setPdfLoading(true);
    try {
      await exportCostEstimatePdf(lastInputs, result, userName);
    } finally {
      setPdfLoading(false);
    }
  };

  const onSaveEstimate = async () => {
    if (!lastInputs || !result) return;
    await saveToHistory(TOOL_KEY, lastInputs, result);
    void getHistory<CostInputs>(TOOL_KEY).then(setHistory);
    setSaveHint(localizeKnownUiText(t, 'Saved to history'));
    setTimeout(() => setSaveHint(null), 2000);
  };

  const fmtUsd = (n: number) => formatCurrency(n, normalizedCurrency, { maximumFractionDigits: 0 });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Cost Estimator" level="Advanced" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <HistoryCard<CostInputs>
            entries={history}
            onSelect={applyHistory}
            formatSummary={(e) =>
              `${e.inputs.projectType} · ${e.inputs.areaSqm.toFixed(0)} m² · ${fmtUsd((e.result as CostResult).total)}`
            }
          />

          <ToolInputCard title="Project details">
            <Text className="mb-2 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Project type')}
            </Text>
            <Controller
              control={control}
              name="projectType"
              render={({ field: { value, onChange } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 mb-4">
                  <View className="flex-row gap-2 px-1">
                    {PROJECT_TYPES.map((p) => {
                      const sel = value === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => onChange(p.id)}
                          className={`min-w-[100px] items-center rounded-xl border px-3 py-3 ${
                            sel ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                          }`}
                        >
                          <Ionicons name={p.icon} size={22} color={Colors.brand[900]} />
                          <Text
                            className="mt-1 text-center text-[11px] text-brand-900"
                            style={{ fontFamily: 'Inter_500Medium' }}
                            numberOfLines={2}
                          >
                            {localizeKnownUiText(t, p.label)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            />
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
                {localizeKnownUiText(t, 'Area')}
              </Text>
              <View className="flex-row rounded-lg border border-neutral-300 p-0.5">
                <Pressable
                  onPress={() => setAreaUnit('sqm')}
                  className={`rounded-md px-3 py-1 ${areaUnit === 'sqm' ? 'bg-brand-900' : ''}`}
                >
                  <Text
                    className={`text-xs ${areaUnit === 'sqm' ? 'text-white' : 'text-neutral-600'}`}
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    m²
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAreaUnit('sqft')}
                  className={`rounded-md px-3 py-1 ${areaUnit === 'sqft' ? 'bg-brand-900' : ''}`}
                >
                  <Text
                    className={`text-xs ${areaUnit === 'sqft' ? 'text-white' : 'text-neutral-600'}`}
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    ft²
                  </Text>
                </Pressable>
              </View>
            </View>
            <Controller
              control={control}
              name="area"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder={areaUnit === 'sqm' ? 'e.g. 120' : 'e.g. 1500'}
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              )}
            />
            {errors.area ? (
              <Text className="mt-1 text-sm text-danger-600">{errors.area.message}</Text>
            ) : null}

            <Text className="mb-1.5 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Region (optional)')}
            </Text>
            <Controller
              control={control}
              name="region"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. UK — North West"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              )}
            />
          </ToolInputCard>

          <ToolInputCard title="Materials & labour">
            <Text className="mb-2 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Material grade (price multiplier)')}
            </Text>
            <Controller
              control={control}
              name="materialGrade"
              render={({ field: { value, onChange } }) => (
                <View className="mb-4 flex-row gap-2">
                  {GRADES.map((g) => {
                    const sel = value === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => onChange(g.id)}
                        className={`flex-1 items-center rounded-xl border py-3 ${
                          sel ? 'border-2 border-brand-900 bg-brand-100' : 'border border-neutral-300 bg-white'
                        }`}
                      >
                        <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                          {localizeKnownUiText(t, g.label)}
                        </Text>
                        <Text className="text-[10px] text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                          {g.mult}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
            <Text className="mb-1.5 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Labour rate')} ({normalizedCurrency} / {localizeKnownUiText(t, 'day')})
            </Text>
            <Controller
              control={control}
              name="laborRatePerDay"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="350"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              )}
            />
            {errors.laborRatePerDay ? (
              <Text className="mt-1 text-sm text-danger-600">{errors.laborRatePerDay.message}</Text>
            ) : null}

            <Text className="mb-1.5 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Labour days')}
            </Text>
            <Controller
              control={control}
              name="laborDays"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="12"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              )}
            />
            {suggestedLaborDays !== null ? (
              <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                {localizeKnownUiText(t, 'Suggested')}: ~{suggestedLaborDays} {localizeKnownUiText(t, 'days')} (area ÷ 15)
              </Text>
            ) : null}
            {errors.laborDays ? (
              <Text className="mt-1 text-sm text-danger-600">{errors.laborDays.message}</Text>
            ) : null}
          </ToolInputCard>

          <ToolInputCard title="Adjustments">
            <Text className="mb-1 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              Contingency: {watch('contingencyPercent')}%
            </Text>
            <Controller
              control={control}
              name="contingencyPercent"
              render={({ field: { value, onChange } }) => (
                <Slider
                  minimumValue={0}
                  maximumValue={30}
                  step={1}
                  value={value}
                  onValueChange={onChange}
                  minimumTrackTintColor={Colors.accent[600]}
                  maximumTrackTintColor={Colors.neutral[300]}
                  thumbTintColor={Colors.brand[900]}
                />
              )}
            />
            <Text className="mb-1.5 mt-4 text-[13px] text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, 'Tax / VAT (%)')}
            </Text>
            <Controller
              control={control}
              name="taxPercent"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="8"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-[52px] rounded-lg border border-neutral-300 px-3 text-base text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              )}
            />
          </ToolInputCard>

          {formError ? (
            <Text className="mb-2 text-center text-sm text-danger-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {formError}
            </Text>
          ) : null}

          {showResult && result && lastInputs ? (
            <>
              <ToolResultCard>
                <ToolResultCardTitle>Estimate</ToolResultCardTitle>
                <Row label="Material cost" value={fmtUsd(result.materialCost)} />
                <Row label="Labour cost" value={fmtUsd(result.laborCost)} />
                <Row
                  label={`Contingency (${lastInputs.contingencyPercent}%)`}
                  value={fmtUsd(result.contingency)}
                />
                <Row label={`Tax (${lastInputs.taxPercent}%)`} value={fmtUsd(result.tax)} />
                <View className="my-2 h-px bg-brand-500/30" />
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                    TOTAL
                  </Text>
                  <Text
                    className="text-[22px] text-brand-900"
                    style={{ fontFamily: 'Poppins_700Bold' }}
                  >
                    {fmtUsd(result.total)}
                  </Text>
                </View>
              </ToolResultCard>
              {saveHint ? (
                <Text className="mb-2 text-center text-sm text-success-600" style={{ fontFamily: 'Inter_500Medium' }}>
                  {saveHint}
                </Text>
              ) : null}
              <View className="mb-4 flex-row gap-3">
                <View className="flex-1">
                  <Button
                    title={pdfLoading ? '…' : 'Export PDF'}
                    onPress={onExportPdf}
                    loading={pdfLoading}
                    disabled={pdfLoading}
                    variant="outline"
                  />
                </View>
                <View className="flex-1">
                  <Button title="Save estimate" onPress={onSaveEstimate} variant="outline" />
                </View>
              </View>
              {pdfLoading ? (
                <ActivityIndicator className="mb-4" color={Colors.brand[900]} />
              ) : null}
            </>
          ) : null}

          <FormulaCard
            lines={[
              'Material = Area × Base Rate × Grade Multiplier',
              'Labour = Days × Daily Rate',
              'Contingency = (Material + Labour) × %',
              'Tax = (Subtotal + Contingency) × %',
              'Total = Material + Labour + Contingency + Tax',
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ToolStickyCalculateBar
        label={localizeKnownUiText(t, 'Calculate estimate')}
        onPress={handleSubmit(runCalculate)}
      />
    </SafeAreaView>
  );
}
