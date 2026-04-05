import { Text, Pressable, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Colors } from '@/constants/colors';

interface ProfileMenuRowProps {
  href?: Href;
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  isLast?: boolean;
}

export function ProfileMenuRow({ href, icon, label, onPress, isLast }: ProfileMenuRowProps) {
  const content = (
    <>
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: Colors.brand[100] }}
      >
        <Ionicons name={icon} size={22} color={Colors.brand[900]} />
      </View>
      <Text
        className="ml-3 flex-1 text-base text-neutral-900"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={Colors.neutral[500]} />
    </>
  );

  const className = `flex-row items-center py-4 active:bg-neutral-50 ${!isLast ? 'border-b border-neutral-100' : ''}`;

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable className={className}>{content}</Pressable>
      </Link>
    );
  }

  return (
    <Pressable className={className} onPress={onPress}>
      {content}
    </Pressable>
  );
}
