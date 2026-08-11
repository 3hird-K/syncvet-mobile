import React, { forwardRef, useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TextInput } from 'react-native';

import { colors } from '@theme';

import { Input } from './Input';
import type { InputProps } from './Input';

export type PasswordInputProps = Omit<InputProps, 'secureTextEntry' | 'rightIcon' | 'onRightIconPress'>;

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);

    const toggle = useCallback(() => setVisible((v) => !v), []);

    return (
      <Input
        ref={ref}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        rightIcon={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={toggle}
            hitSlop={10}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        }
        onRightIconPress={toggle}
        {...props}
      />
    );
  },
);
