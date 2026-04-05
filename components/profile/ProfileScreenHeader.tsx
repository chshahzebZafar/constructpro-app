import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface ProfileScreenHeaderProps {
  title: string;
  /** Replaces the spacer on the right (e.g. action button). */
  rightSlot?: ReactNode;
}

export function ProfileScreenHeader({ title, rightSlot }: ProfileScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-b border-neutral-200 bg-white"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center px-3 pb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.brand[900]} />
        </Pressable>
        <Text
          className="flex-1 text-center text-base text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {rightSlot ? (
          <View className="min-w-[44px] items-center justify-center">{rightSlot}</View>
        ) : (
          <View className="h-11 w-11" />
        )}
      </View>
    </View>
  );
}
