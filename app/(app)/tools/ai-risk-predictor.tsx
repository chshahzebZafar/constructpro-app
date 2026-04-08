import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Colors } from '@/constants/colors';
import { computeAdvisoryRiskScore, type RiskInputs } from '@/lib/aiRisk/score';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

const KEYS: (keyof RiskInputs)[] = [
  'schedulePressure',
  'costExposure',
  'safetyExposure',
  'weatherOrSite',
  'stakeholderComplexity',
];

const TITLE: Record<keyof RiskInputs, string> = {
  schedulePressure: 'Schedule & time pressure',
  costExposure: 'Cost & commercial exposure',
  safetyExposure: 'Safety & compliance',
  weatherOrSite: 'Weather & site difficulty',
  stakeholderComplexity: 'Stakeholders & interfaces',
};

const HELP: Record<keyof RiskInputs, string> = {
  schedulePressure: 'Slippage, parallel trades, late approvals.',
  costExposure: 'Variations, supply volatility, fee exposure.',
  safetyExposure: 'Hazards, permits, incidents, audits.',
  weatherOrSite: 'Access, ground conditions, season.',
  stakeholderComplexity: 'Owners, subs, authorities, neighbors.',
};

export default function AiRiskPredictorScreen() {
  const { t } = useI18n();
  const [inputs, setInputs] = useState<RiskInputs>({
    schedulePressure: 3,
    costExposure: 3,
    safetyExposure: 3,
    weatherOrSite: 3,
    stakeholderComplexity: 3,
  });

  const result = useMemo(() => computeAdvisoryRiskScore(inputs), [inputs]);

  const setLevel = (key: keyof RiskInputs, level: number) => {
    setInputs((prev) => ({ ...prev, [key]: level }));
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title={localizeKnownUiText(t, 'AI risk predictor')} level="Advanced" />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
            {localizeKnownUiText(t, 'Advisory score (on-device)')}
          </Text>
          <Text className="mt-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {localizeKnownUiText(
              t,
              'This is a simple weighted checklist — not machine learning and not a substitute for formal risk workshops or insurance advice. Use it to prompt discussion only.'
            )}
          </Text>
        </View>

        {KEYS.map((key) => (
          <View key={key} className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
              {localizeKnownUiText(t, TITLE[key])}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              {localizeKnownUiText(t, HELP[key])}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = inputs[key] === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setLevel(key, n)}
                    className="min-w-[44px] items-center rounded-full border px-3 py-2"
                    style={{
                      borderColor: on ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: on ? Colors.brand[100] : '#fff',
                    }}
                  >
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-2 text-[10px] text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
              {localizeKnownUiText(t, '1 = lower concern · 5 = higher concern')}
            </Text>
          </View>
        ))}

        <View className="rounded-2xl border border-brand-200 bg-brand-100 p-4">
          <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
            {localizeKnownUiText(t, 'Combined exposure')}
          </Text>
          <Text className="mt-2 text-3xl text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
            {result.score}
            <Text className="text-lg text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {' '}
              / 100
            </Text>
          </Text>
          <Text className="mt-1 text-sm text-brand-800" style={{ fontFamily: 'Inter_500Medium' }}>
            {localizeKnownUiText(t, 'Band')}: {localizeKnownUiText(t, result.band)}
          </Text>
          <View className="mt-3 border-t border-brand-200 pt-3">
            {KEYS.map((key, i) => (
              <Text
                key={`${i}_${key}`}
                className="text-xs text-neutral-700"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {`${localizeKnownUiText(t, TITLE[key])}: ${inputs[key]}/5`}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
