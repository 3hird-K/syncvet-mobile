import React from 'react';
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '@theme';
import { getPetAvatarSource } from '@lib/petAvatars';
import type { Species } from '@services/data';

interface PopoutPetAvatarProps {
  avatarId?: string;
  species: Species;
  photoUrl?: string;
  /** Diameter of the circular frame. Default is 78 */
  size?: number;
  /** Image scale multiplier relative to circle. Default is 1.55 */
  scale?: number;
  showCameraBadge?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  bgColor?: string;
}

export function PopoutPetAvatar({
  avatarId,
  species,
  photoUrl,
  size = 78,
  scale = 1.55,
  showCameraBadge = false,
  onPress,
  style,
  borderColor,
  bgColor,
}: PopoutPetAvatarProps) {
  const isDog = species === 'dog';
  const avatarSource = getPetAvatarSource(avatarId, species, photoUrl);
  const isCustomPhoto = Boolean(photoUrl);

  // Exact 3D Popout Proportions
  const circleSize = size;
  const imgSize = Math.round(size * scale);
  // Setting wrapperHeight equal to imgSize guarantees top: 0 has 0px offset so ears/head are NEVER clipped
  const wrapperHeight = imgSize;
  const wrapperWidth = Math.max(circleSize, imgSize);

  // Height of the popping upper head container (from top of image down past the circle top ring)
  const headContainerHeight = wrapperHeight - Math.round(circleSize * 0.48);

  const defaultBorderColor = borderColor || (isDog ? colors.primary : '#DB2777');
  const defaultBgColor =
    bgColor || (isDog ? 'rgba(0, 168, 150, 0.14)' : 'rgba(219, 39, 119, 0.14)');
  const ringWidth = Math.max(3, Math.round(size * 0.045));

  // Precise attachment offset for the camera badge on the circular frame perimeter
  const badgeSize = Math.max(26, Math.round(size * 0.28));
  const badgeRightOffset = Math.round((wrapperWidth - circleSize) / 2) + Math.round(circleSize * 0.04);
  const badgeBottomOffset = Math.round(circleSize * 0.02);

  const content = (
    <View
      style={[
        styles.wrapper,
        {
          width: wrapperWidth,
          height: wrapperHeight,
        },
        style,
      ]}
    >
      {isCustomPhoto ? (
        // Custom user camera roll photo: render as clean circle
        <View
          style={[
            styles.customPhotoCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderColor: defaultBorderColor,
              borderWidth: ringWidth,
              backgroundColor: defaultBgColor,
            },
            shadows.sm,
          ]}
        >
          <Image
            source={avatarSource}
            style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2 }}
            resizeMode="cover"
          />
        </View>
      ) : (
        // 3D Porthole Pop-Out Layer Sandwich
        <>
          {/* LAYER 1: Background & Clipped Body (Lower Half clipped inside porthole) */}
          <View
            style={[
              styles.circleBase,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                backgroundColor: defaultBgColor,
              },
            ]}
          >
            <Image
              source={avatarSource}
              style={[
                styles.avatarImgBase,
                {
                  width: imgSize,
                  height: imgSize,
                  bottom: 0,
                },
              ]}
              resizeMode="contain"
            />
          </View>

          {/* LAYER 2: Porthole Frame Ring (Renders in front of lower body) */}
          <View
            style={[
              styles.portholeRing,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                borderWidth: ringWidth,
                borderColor: defaultBorderColor,
              },
              shadows.sm,
            ]}
            pointerEvents="none"
          />

          {/* LAYER 3: Popping Head & Ears (Upper Half overflows in front of top ring with ZERO top clipping) */}
          <View
            style={[
              styles.poppingHeadContainer,
              {
                width: wrapperWidth + 24,
                height: headContainerHeight,
              },
            ]}
            pointerEvents="none"
          >
            <Image
              source={avatarSource}
              style={[
                styles.avatarImgHead,
                {
                  width: imgSize,
                  height: imgSize,
                  top: 0,
                },
              ]}
              resizeMode="contain"
            />
          </View>
        </>
      )}

      {/* LAYER 4: Camera Customizer Badge attached directly to the circular frame */}
      {showCameraBadge && (
        <View
          style={[
            styles.cameraBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: defaultBorderColor,
              right: badgeRightOffset,
              bottom: badgeBottomOffset,
            },
            shadows.md,
          ]}
        >
          <Ionicons
            name="camera"
            size={Math.max(13, Math.round(badgeSize * 0.52))}
            color={colors.white}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Change pet avatar"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'visible',
  },
  customPhotoCircle: {
    position: 'absolute',
    bottom: 0,
    overflow: 'hidden',
  },
  circleBase: {
    position: 'absolute',
    bottom: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarImgBase: {
    position: 'absolute',
    alignSelf: 'center',
  },
  portholeRing: {
    position: 'absolute',
    bottom: 0,
  },
  poppingHeadContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    alignItems: 'center',
  },
  avatarImgHead: {
    position: 'absolute',
    alignSelf: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    zIndex: 20,
    elevation: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
});
