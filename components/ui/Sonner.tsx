import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import { colors, radius, shadows, spacing, typography } from '@theme';
import { haptic } from '@lib/haptics';

export type ToastType = 'default' | 'success' | 'info' | 'error' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
  cancel?: ToastAction;
  icon?: React.ReactNode;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  action?: ToastAction;
  cancel?: ToastAction;
  icon?: React.ReactNode;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private timerMap: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  show(title: string, type: ToastType = 'default', options: ToastOptions = {}) {
    const id = options.id || `toast-${title}-${options.description || ''}`;

    // Deduplicate: If an identical toast is already active, remove the old one first
    if (this.timerMap.has(id)) {
      const existingTimer = this.timerMap.get(id);
      if (existingTimer) clearTimeout(existingTimer);
      this.timerMap.delete(id);
      this.toasts = this.toasts.filter((t) => t.id !== id);
    } else {
      const existingSameToast = this.toasts.find(
        (t) => t.title === title && t.description === options.description,
      );
      if (existingSameToast) {
        this.dismiss(existingSameToast.id);
      }
    }

    const duration = options.duration ?? 3500;

    // Haptic feedback according to toast type
    if (type === 'success') haptic.success();
    else if (type === 'error') haptic.error();
    else if (type === 'warning') haptic.warning();
    else haptic.light();

    const toastItem: ToastItem = {
      id,
      type,
      title,
      description: options.description,
      duration,
      action: options.action,
      cancel: options.cancel,
      icon: options.icon,
      createdAt: Date.now(),
    };

    // Keep max 2 toasts active for clean stacking
    this.toasts = [toastItem, ...this.toasts.filter((t) => t.id !== id).slice(0, 1)];
    this.notify();

    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timerMap.set(id, timer);
    }

    return id;
  }

  dismiss(id?: string) {
    if (id) {
      const timer = this.timerMap.get(id);
      if (timer) clearTimeout(timer);
      this.timerMap.delete(id);
      this.toasts = this.toasts.filter((t) => t.id !== id);
    } else {
      this.timerMap.forEach((timer) => clearTimeout(timer));
      this.timerMap.clear();
      this.toasts = [];
    }
    this.notify();
  }
}

const toastManager = new ToastManager();

/**
 * Global Sonner-style imperative API
 */
export const toast = (title: string, options?: ToastOptions) =>
  toastManager.show(title, 'default', options);

toast.success = (title: string, options?: ToastOptions) =>
  toastManager.show(title, 'success', options);

toast.info = (title: string, options?: ToastOptions) =>
  toastManager.show(title, 'info', options);

toast.error = (title: string, options?: ToastOptions) =>
  toastManager.show(title, 'error', options);

toast.warning = (title: string, options?: ToastOptions) =>
  toastManager.show(title, 'warning', options);

toast.dismiss = (id?: string) => toastManager.dismiss(id);

/**
 * Toast Component Card
 */
function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const getIcon = () => {
    if (item.icon) return item.icon;

    switch (item.type) {
      case 'success':
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="close-circle" size={18} color={colors.error} />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="alert-circle" size={18} color={colors.warning} />
          </View>
        );
      case 'info':
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(0, 168, 150, 0.12)' }]}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
          </View>
        );
      default:
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(7, 30, 38, 0.08)' }]}>
            <Ionicons name="notifications" size={17} color={colors.textPrimary} />
          </View>
        );
    }
  };

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.toastCard, shadows.md]}
    >
      <Pressable
        onPress={() => onDismiss(item.id)}
        style={styles.toastContentRow}
        hitSlop={4}
      >
        {getIcon()}

        <View style={styles.textWrap}>
          <Text style={styles.toastTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.toastDescription} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
        </View>

        {item.action ? (
          <Pressable
            onPress={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            style={styles.actionButton}
            hitSlop={6}
          >
            <Text style={styles.actionButtonText}>{item.action.label}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onDismiss(item.id)}
            style={styles.closeButton}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Root Sonner Toaster Container
 */
export function Toaster() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastManager.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.toasterContainer,
        {
          top: insets.top + (spacing.xs || 4),
          width,
        },
      ]}
    >
      {toasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onDismiss={(id) => toastManager.dismiss(id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toasterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  toastCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(7, 30, 38, 0.08)',
    overflow: 'hidden',
  },
  toastContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  toastDescription: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  actionButtonText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 11.5,
  },
  closeButton: {
    padding: 2,
  },
});
