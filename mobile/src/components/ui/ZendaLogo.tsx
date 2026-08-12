import React from 'react'
import { Image, StyleSheet, View, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native'
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
  Path,
  Text as SvgText,
} from 'react-native-svg'
import { brandPalette } from '../../theme/colors'

export type ZendaLogoSize = 'small' | 'medium' | 'large'
export type ZendaLogoVariant = 'full' | 'icon' | 'mark'

interface ZendaLogoProps {
  size?: ZendaLogoSize
  /** full = logo mark + wordmark area; icon/mark = square brand mark only */
  variant?: ZendaLogoVariant
  style?: StyleProp<ViewStyle>
  /** Prefer raster asset when available (splash / auth). SVG mark used by default. */
  useRaster?: boolean
}

const SIZE_PX: Record<ZendaLogoSize, number> = {
  small: 40,
  medium: 72,
  large: 120,
}

/** Official mark rendered with logo SVG colors (source of truth). */
function ZendaMarkSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityRole="image" accessibilityLabel="Zenda">
      <Defs>
        <LinearGradient id="zendaBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={brandPalette.primary} />
          <Stop offset="55%" stopColor={brandPalette.primaryDark} />
          <Stop offset="100%" stopColor={brandPalette.primaryDeep} />
        </LinearGradient>
        <LinearGradient id="zendaWord" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={brandPalette.navy} />
          <Stop offset="55%" stopColor={brandPalette.navyMid} />
          <Stop offset="100%" stopColor={brandPalette.primaryMuted} />
        </LinearGradient>
      </Defs>
      <Rect width="1024" height="1024" fill="url(#zendaBg)" rx="180" />
      <G fill="#050505">
        <Rect x="302" y="420" width="105" height="305" rx="2" />
        <Rect x="454" y="300" width="105" height="425" rx="2" />
        <Rect x="606" y="190" width="105" height="535" rx="2" />
      </G>
      <Path d="M606 315 L711 288 L711 392 L676 401 L676 350 L606 369 Z" fill="#050505" />
      <Path
        d="M150 610 C215 680 315 690 410 650 C500 612 578 544 660 470 L615 438 L711 405 L695 505 L662 476 C565 565 487 641 394 684 C294 730 204 710 150 610 Z"
        fill={brandPalette.growth}
      />
      <Path
        d="M120 595 C205 650 286 632 365 585 C455 531 542 441 632 365 L600 338 L708 300 L695 405 L662 375 C562 462 479 557 381 616 C281 676 181 667 120 595 Z"
        fill={brandPalette.growth}
      />
      <Path d="M615 438 L653 462 L620 493 L588 470 Z" fill={brandPalette.navy} />
      <Path d="M600 338 L632 365 L610 384 L582 360 Z" fill={brandPalette.navy} />
      <SvgText
        x="512"
        y="850"
        textAnchor="middle"
        fontFamily="System"
        fontSize="154"
        fontWeight="800"
        letterSpacing={-8}
        fill="url(#zendaWord)"
      >
        Zenda
      </SvgText>
    </Svg>
  )
}

/**
 * Official Zenda logo. Prefer this over reinvented marks.
 * Raster (`logo.png` / `zenda_logo.svg` companion PNG) optional via `useRaster`.
 */
export default function ZendaLogo({
  size = 'medium',
  variant = 'full',
  style,
  useRaster = false,
}: ZendaLogoProps) {
  const px = SIZE_PX[size]
  const isIcon = variant === 'icon' || variant === 'mark'

  if (useRaster) {
    const imageStyle: StyleProp<ImageStyle> = {
      width: px,
      height: px,
      borderRadius: isIcon ? px * 0.22 : 0,
    }
    return (
      <View style={[styles.wrap, style]} accessibilityRole="image" accessibilityLabel="Zenda">
        <Image
          source={require('../../../assets/logo.png')}
          style={imageStyle}
          resizeMode="contain"
        />
      </View>
    )
  }

  return (
    <View style={[styles.wrap, style]} accessibilityRole="image" accessibilityLabel="Zenda">
      <ZendaMarkSvg size={px} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
