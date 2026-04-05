import { Image, type ImageProps } from 'react-native';
import { APP_ICON } from '@/constants/branding';

type AppMarkProps = {
  size?: number;
  rounded?: boolean;
} & Omit<ImageProps, 'source'>;

/** ConstructPro logo for auth, about, modals — uses `assets/Icons/icon.png`. */
export function AppMark({ size = 80, rounded = true, style, ...rest }: AppMarkProps) {
  const r = rounded ? size * 0.2 : 0;
  return (
    <Image
      source={APP_ICON}
      style={[{ width: size, height: size, borderRadius: r }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="ConstructPro"
      {...rest}
    />
  );
}
