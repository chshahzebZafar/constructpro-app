import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`min-h-[52px] w-full items-center justify-center rounded-xl px-4 ${
        isDanger
          ? 'bg-danger-600 active:opacity-90'
          : isPrimary
            ? 'bg-accent-600 active:opacity-90'
            : isSecondary
              ? 'border border-brand-900 bg-white active:opacity-90'
              : 'border border-neutral-300 bg-white active:opacity-90'
      } ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={isDanger || isPrimary ? '#FFFFFF' : '#1B3A5C'} />
      ) : (
        <Text
          className={`text-base font-medium ${
            isDanger || isPrimary ? 'text-white' : 'text-brand-900'
          }`}
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
