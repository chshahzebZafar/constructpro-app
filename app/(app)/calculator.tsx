import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { evaluateExpression, factorial, type AngleMode } from '@/lib/calculator/evaluate';
import {
  loadCalcHistory,
  saveCalcHistory,
  newHistoryId,
  MAX_HISTORY_ITEMS,
  type CalcHistoryEntry,
} from '@/lib/calculator/historyStorage';
import { Colors } from '@/constants/colors';

function formatResult(n: number): string {
  if (!Number.isFinite(n) || Number.isNaN(n)) return 'Error';
  const a = Math.abs(n);
  if (a !== 0 && (a >= 1e15 || a < 1e-10)) return n.toExponential(8);
  const r = Math.round(n * 1e12) / 1e12;
  return Object.is(r, -0) ? '0' : String(r);
}

function Key({
  label,
  onInsert,
  onPress,
  tone = 'num',
  minH,
}: {
  label: string;
  onInsert?: () => void;
  onPress?: () => void;
  tone?: 'num' | 'op' | 'fn' | 'danger';
  minH: number;
}) {
  const bg =
    tone === 'num'
      ? 'bg-white border border-neutral-200'
      : tone === 'op'
        ? 'bg-brand-700'
        : tone === 'danger'
          ? 'bg-danger-600'
          : 'bg-neutral-200';
  const text =
    tone === 'op' || tone === 'danger'
      ? 'text-white'
      : tone === 'fn'
        ? 'text-neutral-900'
        : 'text-neutral-900';

  return (
    <Pressable
      onPress={() => {
        if (onPress) onPress();
        else if (onInsert) onInsert();
      }}
      className={`${bg} flex-1 m-1 items-center justify-center rounded-xl active:opacity-85`}
      style={{ minHeight: minH, maxHeight: 58 }}
    >
      <Text
        className={text}
        style={{
          fontFamily: tone === 'fn' ? 'Inter_500Medium' : 'Poppins_700Bold',
          fontSize: tone === 'fn' ? 13 : 18,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function CalculatorScreen() {
  const { width } = useWindowDimensions();
  const [expr, setExpr] = useState('');
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [scientificOn, setScientificOn] = useState(false);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);
  const afterEqualsRef = useRef(false);

  const btnSize = Math.min(56, (width - 48) / 4 - 6);

  useEffect(() => {
    void loadCalcHistory().then(setHistory);
  }, []);

  const pushHistory = useCallback((expression: string, result: string) => {
    if (result === 'Error' || !expression.trim()) return;
    setHistory((prev) => {
      const next: CalcHistoryEntry[] = [
        { id: newHistoryId(), expression: expression.trim(), result, at: Date.now() },
        ...prev,
      ].slice(0, MAX_HISTORY_ITEMS);
      void saveCalcHistory(next);
      return next;
    });
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      void saveCalcHistory(next);
      return next;
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    Alert.alert('Clear history', 'Remove all calculation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => {
          setHistory([]);
          void saveCalcHistory([]);
        },
      },
    ]);
  }, []);

  const applyHistoryResult = useCallback((result: string) => {
    setExpr(result);
    afterEqualsRef.current = true;
  }, []);

  const append = useCallback((s: string) => {
    if (expr === 'Error' && /[\d.]/.test(s)) {
      setExpr(s);
      afterEqualsRef.current = false;
      return;
    }
    if (afterEqualsRef.current && /[\d.]/.test(s)) {
      setExpr(s);
      afterEqualsRef.current = false;
      return;
    }
    if (afterEqualsRef.current && /[+\-*/^%]/.test(s)) {
      setExpr((e) => e + s);
      afterEqualsRef.current = false;
      return;
    }
    afterEqualsRef.current = false;
    setExpr((e) => e + s);
  }, [expr]);

  const clearAll = useCallback(() => {
    setExpr('');
    afterEqualsRef.current = false;
  }, []);

  const backspace = useCallback(() => {
    afterEqualsRef.current = false;
    setExpr((e) => e.slice(0, -1));
  }, []);

  const equals = useCallback(() => {
    const raw = expr.trim();
    if (!raw || raw === 'Error') return;
    try {
      const v = evaluateExpression(raw, angleMode);
      const res = formatResult(v);
      setExpr(res);
      afterEqualsRef.current = true;
      pushHistory(raw, res);
    } catch {
      setExpr('Error');
      afterEqualsRef.current = true;
    }
  }, [expr, angleMode, pushHistory]);

  const oneOverX = useCallback(() => {
    const raw = expr.trim();
    if (!raw || raw === 'Error') {
      append('1/');
      return;
    }
    afterEqualsRef.current = false;
    setExpr(`1/(${raw})`);
  }, [expr, append]);

  const square = useCallback(() => {
    const raw = expr.trim();
    if (!raw || raw === 'Error') return;
    afterEqualsRef.current = false;
    setExpr(`(${raw})^2`);
  }, [expr]);

  const sqrt = useCallback(() => {
    const raw = expr.trim();
    if (!raw || raw === 'Error') {
      append('sqrt(');
      return;
    }
    afterEqualsRef.current = false;
    setExpr(`sqrt(${raw})`);
  }, [expr, append]);

  const factBtn = useCallback(() => {
    const raw = expr.trim();
    if (!raw) {
      append('fact(');
      return;
    }
    try {
      const v = evaluateExpression(raw, angleMode);
      const r = factorial(v);
      const res = formatResult(r);
      setExpr(res);
      afterEqualsRef.current = true;
      pushHistory(`fact(${raw})`, res);
    } catch {
      setExpr('Error');
      afterEqualsRef.current = true;
    }
  }, [expr, angleMode, append, pushHistory]);

  const display = expr.trim() === '' ? '0' : expr;

  return (
    <SafeAreaView className="flex-1 bg-neutral-100" edges={['top', 'left', 'right']}>
      <View className="border-b border-neutral-200 bg-white px-4 pb-3 pt-2">
        <Text className="text-xl text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
          Calculator
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-sm text-neutral-700" style={{ fontFamily: 'Inter_500Medium' }}>
            Scientific keys
          </Text>
          <Switch
            value={scientificOn}
            onValueChange={setScientificOn}
            trackColor={{ false: Colors.neutral[300], true: Colors.brand[500] }}
            thumbColor={Colors.white}
            ios_backgroundColor={Colors.neutral[300]}
            accessibilityLabel="Show scientific calculator keys"
          />
        </View>
        <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
          {scientificOn ? 'Trig, powers, and advanced functions' : 'Basic keypad only'}
        </Text>
      </View>

      <View className="border-b border-neutral-200 bg-brand-900 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setAngleMode((m) => (m === 'deg' ? 'rad' : 'deg'))}
            className="rounded-lg bg-white/15 px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-xs text-white" style={{ fontFamily: 'Inter_500Medium' }}>
              {angleMode === 'deg' ? 'DEG' : 'RAD'}
            </Text>
          </Pressable>
          <Text className="text-[10px] text-white/60" style={{ fontFamily: 'Inter_400Regular' }}>
            sin/cos/tan use {angleMode === 'deg' ? 'degrees' : 'radians'}
          </Text>
        </View>
        <Text
          className="mt-2 text-right text-3xl text-white"
          style={{ fontFamily: 'Poppins_700Bold' }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.35}
        >
          {display}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {scientificOn ? (
          <>
            <Text
              className="mb-2 px-1 text-[11px] uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Scientific
            </Text>
            <View className="flex-row">
              <Key label="sin" minH={btnSize} tone="fn" onInsert={() => append('sin(')} />
              <Key label="cos" minH={btnSize} tone="fn" onInsert={() => append('cos(')} />
              <Key label="tan" minH={btnSize} tone="fn" onInsert={() => append('tan(')} />
              <Key label="log" minH={btnSize} tone="fn" onInsert={() => append('log(')} />
            </View>
            <View className="flex-row">
              <Key label="ln" minH={btnSize} tone="fn" onInsert={() => append('ln(')} />
              <Key label="asin" minH={btnSize} tone="fn" onInsert={() => append('asin(')} />
              <Key label="acos" minH={btnSize} tone="fn" onInsert={() => append('acos(')} />
              <Key label="atan" minH={btnSize} tone="fn" onInsert={() => append('atan(')} />
            </View>
            <View className="flex-row">
              <Key label="√" minH={btnSize} tone="fn" onPress={sqrt} />
              <Key label="x²" minH={btnSize} tone="fn" onPress={square} />
              <Key label="^" minH={btnSize} tone="fn" onInsert={() => append('^')} />
              <Key label="π" minH={btnSize} tone="fn" onInsert={() => append('pi')} />
            </View>
            <View className="flex-row">
              <Key label="e" minH={btnSize} tone="fn" onInsert={() => append('e')} />
              <Key label="n!" minH={btnSize} tone="fn" onPress={factBtn} />
              <Key label="1/x" minH={btnSize} tone="fn" onPress={oneOverX} />
              <Key label="mod" minH={btnSize} tone="fn" onInsert={() => append('%')} />
            </View>
            <View className="flex-row">
              <Key label="abs" minH={btnSize} tone="fn" onInsert={() => append('abs(')} />
              <Key label="exp" minH={btnSize} tone="fn" onInsert={() => append('exp(')} />
              <Key label="⌊x⌋" minH={btnSize} tone="fn" onInsert={() => append('floor(')} />
              <Key label="⌈x⌉" minH={btnSize} tone="fn" onInsert={() => append('ceil(')} />
            </View>
          </>
        ) : null}

        <Text
          className={`mb-2 px-1 text-[11px] uppercase tracking-wide text-neutral-500 ${scientificOn ? 'mt-4' : ''}`}
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Basic
        </Text>
        <View className="flex-row">
          <Key label="C" minH={btnSize} tone="danger" onPress={clearAll} />
          <Key label="⌫" minH={btnSize} tone="fn" onPress={backspace} />
          <Key label="(" minH={btnSize} tone="fn" onInsert={() => append('(')} />
          <Key label=")" minH={btnSize} tone="fn" onInsert={() => append(')')} />
        </View>
        <View className="flex-row">
          <Key label="7" minH={btnSize} onInsert={() => append('7')} />
          <Key label="8" minH={btnSize} onInsert={() => append('8')} />
          <Key label="9" minH={btnSize} onInsert={() => append('9')} />
          <Key label="÷" minH={btnSize} tone="op" onInsert={() => append('/')} />
        </View>
        <View className="flex-row">
          <Key label="4" minH={btnSize} onInsert={() => append('4')} />
          <Key label="5" minH={btnSize} onInsert={() => append('5')} />
          <Key label="6" minH={btnSize} onInsert={() => append('6')} />
          <Key label="×" minH={btnSize} tone="op" onInsert={() => append('*')} />
        </View>
        <View className="flex-row">
          <Key label="1" minH={btnSize} onInsert={() => append('1')} />
          <Key label="2" minH={btnSize} onInsert={() => append('2')} />
          <Key label="3" minH={btnSize} onInsert={() => append('3')} />
          <Key label="−" minH={btnSize} tone="op" onInsert={() => append('-')} />
        </View>
        <View className="flex-row">
          <Key label="0" minH={btnSize} onInsert={() => append('0')} />
          <Key label="." minH={btnSize} onInsert={() => append('.')} />
          <Key label="=" minH={btnSize} tone="op" onPress={equals} />
          <Key label="+" minH={btnSize} tone="op" onInsert={() => append('+')} />
        </View>

        <View className="mt-5 border-t border-neutral-200 pt-4">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Text
              className="text-[11px] uppercase tracking-wide text-neutral-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              History
            </Text>
            {history.length > 0 ? (
              <Pressable onPress={clearAllHistory} hitSlop={8} className="py-1">
                <Text className="text-xs text-danger-600" style={{ fontFamily: 'Inter_500Medium' }}>
                  Clear all
                </Text>
              </Pressable>
            ) : null}
          </View>
          {history.length === 0 ? (
            <Text className="px-1 py-2 text-sm text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
              No calculations yet. Results appear here after you tap =.
            </Text>
          ) : (
            history.map((h) => (
              <View
                key={h.id}
                className="mb-2 flex-row items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <Pressable
                  onPress={() => applyHistoryResult(h.result)}
                  className="min-w-0 flex-1 px-3 py-2.5 active:bg-neutral-50"
                  accessibilityLabel={`Use result ${h.result}`}
                >
                  <Text
                    className="text-xs text-neutral-500"
                    style={{ fontFamily: 'Inter_400Regular' }}
                    numberOfLines={2}
                  >
                    {h.expression}
                  </Text>
                  <Text
                    className="mt-1 text-base text-brand-900"
                    style={{ fontFamily: 'Poppins_700Bold' }}
                    numberOfLines={1}
                  >
                    = {h.result}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeHistoryItem(h.id)}
                  className="justify-center border-l border-neutral-200 px-3 active:bg-danger-100"
                  accessibilityLabel="Delete from history"
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.danger[600]} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
