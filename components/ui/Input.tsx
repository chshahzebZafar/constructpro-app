import { useState } from 'react';
import { TextInput, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: InputProps) {
  const [show, setShow] = useState(false);
  const secure = secureTextEntry && !show;

  return (
    <View className="mb-4">
      <Text
        className="mb-1.5 text-[13px] text-neutral-700"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          className={`min-h-[52px] rounded-lg border px-3 text-base text-neutral-900 ${
            secureTextEntry ? 'pr-12' : 'pr-3'
          } ${error ? 'border-danger-600' : 'border-neutral-300'}`}
          style={{ fontFamily: 'Inter_400Regular' }}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setShow((s) => !s)}
            className="absolute right-3 top-3 h-10 w-10 items-center justify-center"
            hitSlop={8}
          >
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1 text-sm text-danger-600" style={{ fontFamily: 'Inter_400Regular' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
