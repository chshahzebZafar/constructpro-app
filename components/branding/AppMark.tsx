import { View, Image, type ImageProps } from 'react-native';
import { APP_ICON } from '@/constants/branding';

type AppMarkProps = {
  size?: number;
  rounded?: boolean;
  /** White card + shadow so the mark reads on tinted page backgrounds (use real logo PNGs in assets/Icons). */
  framed?: boolean;
} & Omit<ImageProps, 'source'>;

/** ConstructPro logo for auth, about, modals — uses `assets/Icons/icon.png`. */
export function AppMark({ size = 80, rounded = true, framed = false, style, ...rest }: AppMarkProps) {
  const r = rounded ? size * 0.2 : 0;
  const image = (
    <Image
      source={APP_ICON}
      style={[{ width: size, height: size, borderRadius: r }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="ConstructPro"
      {...rest}
    />
  );

  if (!framed) return image;

  return (
    <View className="rounded-3xl bg-white p-3 shadow-sm shadow-black/10">{image}</View>
  );
}
