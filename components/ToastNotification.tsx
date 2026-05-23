// src/components/ToastNotification.tsx

/**
 * Lightweight Toast Notification System
 *
 * Provides non-blocking feedback for sync operations:
 *   - Success: green accent
 *   - Error: red accent
 *   - Info: indigo accent
 *
 * Auto-dismisses after duration. Stacks from the bottom.
 * Uses Animated API for smooth enter/exit transitions.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastConfig {
  durationMs?: number;
  maxVisible?: number;
}

// ─── Singleton Controller ────────────────────────────────────────────────────────

let _showToast: ((message: string, type: ToastType) => void) | null = null;

/**
 * Show a toast from anywhere in the app.
 * Must have <ToastProvider /> mounted in the component tree.
 */
export const showToast = (message: string, type: ToastType = 'info'): void => {
  _showToast?.(message, type);
};

// ─── Toast Item Component ────────────────────────────────────────────────────────

const ToastBubble: React.FC<{
  item: ToastItem;
  onDismiss: (id: number) => void;
  duration: number;
}> = React.memo(({ item, onDismiss, duration }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Enter animation
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss(item.id));
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const accentColor = item.type === 'success' ? '#10b981'
    : item.type === 'error' ? '#f43f5e'
    : '#6366f1';

  return (
    <Animated.View
      style={[
        styles.toast,
        { borderLeftColor: accentColor, opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity onPress={() => onDismiss(item.id)} activeOpacity={0.8}>
        <Text style={styles.toastText}>
          {item.type === 'success' ? '✓ ' : item.type === 'error' ? '✗ ' : 'ℹ '}
          {item.message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

ToastBubble.displayName = 'ToastBubble';

// ─── Provider Component ──────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{
  children: React.ReactNode;
  config?: ToastConfig;
}> = ({ children, config }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const duration = config?.durationMs ?? 3000;
  const maxVisible = config?.maxVisible ?? 3;

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++counterRef.current;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.length > maxVisible ? next.slice(-maxVisible) : next;
    });
  }, [maxVisible]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register the singleton
  useEffect(() => {
    _showToast = addToast;
    return () => { _showToast = null; };
  }, [addToast]);

  return (
    <View style={styles.rootContainer}>
      {children}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((item) => (
          <ToastBubble
            key={item.id}
            item={item}
            onDismiss={removeToast}
            duration={duration}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  toastContainer: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  toastText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
});
