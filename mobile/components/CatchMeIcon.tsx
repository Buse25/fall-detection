import React from 'react';
import { Image, type StyleProp, type ImageStyle } from 'react-native';

type Props = {
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
};

/** CatchMe marka ikonu — düşme tespiti konsepti (yeni logo). */
export default function CatchMeIcon({ size = 32, style }: Props) {
  return (
    <Image
      source={require('@/assets/images/icon.png')}
      style={[{ width: size, height: size, resizeMode: 'contain', borderRadius: size / 2 }, style]}
    />
  );
}
