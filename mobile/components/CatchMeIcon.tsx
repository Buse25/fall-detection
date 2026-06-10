import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** CatchMe marka ikonu — düşme tespiti konsepti (human-handsdown). */
export default function CatchMeIcon({ size = 32, color = '#0040a1', style }: Props) {
  return (
    <MaterialCommunityIcons
      name="human-handsdown"
      size={size}
      color={color}
      style={style}
    />
  );
}
