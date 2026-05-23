// src/components/TransactionCard.tsx

/**
 * Memoized Transaction Card Component
 *
 * Extracted from App.tsx's inline renderItem for FlatList performance.
 * React.memo prevents re-rendering unless the specific item changes.
 *
 * Visual states:
 *   - pending: amber border
 *   - syncing: indigo border + animated pulse
 *   - failed: red border + error context
 *   - synced: green border + success indicator
 */

import { useGatewayStore } from '@/store/gatewayStore';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { QueueItem } from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────────

interface TransactionCardProps {
  item: QueueItem;
  variant: 'pending' | 'synced' | 'trace';
  onCopyTrace?: (text: string) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

// ─── Component ───────────────────────────────────────────────────────────────────

const TransactionCard: React.FC<TransactionCardProps> = React.memo(
  ({ item, variant, onCopyTrace, onToast }) => {
    const handleRetry = useCallback(async () => {
      const success = await useGatewayStore.getState().retrySyncQueue(item.id);
      
      if (onToast) {
        onToast(
          success
            ? `✓ ${item.payload.transaction_id} synced`
            : `✗ Failed to sync ${item.payload.transaction_id}`,
          success ? 'success' : 'error'
        );
      }
    }, [item.id, item.payload.transaction_id, onToast]);

    // ── Pending/Failed Card ────────────────────────────────────────────
    if (variant === 'pending') {
      return (
        <View
          style={[
            styles.card,
            item.status === 'failed' ? styles.cardFailed
              : item.status === 'syncing' ? styles.cardSyncing
              : styles.cardPending,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.txnIdText}>{item.payload.transaction_id}</Text>
              <Text style={styles.amountText}>+ETB {item.payload.amount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              onPress={handleRetry}
              style={styles.retryButton}
              disabled={item.status === 'syncing'}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>
                {item.status === 'syncing' ? '⟳ SYNCING' : item.status === 'failed' ? '🔄 RETRY' : '🔄 PUSH'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSubText}>Sender: {item.payload.sender_name}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.timeText}>
              {item.payload.timestamp} • Attempt {item.attempts}
            </Text>
            {item.status === 'failed' && item.lastError && (
              <Text style={styles.errorText}>• {item.lastError}</Text>
            )}
          </View>
        </View>
      );
    }

    // ── Synced Card ────────────────────────────────────────────────────
    if (variant === 'synced') {
      return (
        <View style={[styles.card, styles.cardSynced]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.txnIdText, styles.syncedTxnId]}>{item.payload.transaction_id}</Text>
            <Text style={styles.syncedAmount}>+ETB {item.payload.amount.toFixed(2)}</Text>
          </View>
          <Text style={styles.cardSubText}>
            Channel: {item.payload.source.toUpperCase()} • Client: {item.payload.sender_name}
          </Text>
          <Text style={styles.syncedTime}>✓ Synced to Firebase • {item.payload.timestamp}</Text>
        </View>
      );
    }

    // ── Trace Card ─────────────────────────────────────────────────────
    return (
      <TouchableOpacity
        onLongPress={() => onCopyTrace?.(item.payload.raw_message)}
        style={styles.traceCard}
        activeOpacity={0.7}
      >
        <View style={styles.traceHeader}>
          <Text style={styles.traceTag}>[{item.payload.source.toUpperCase()} INTERCEPT]</Text>
          <Text style={styles.traceTime}>{item.payload.timestamp}</Text>
        </View>
        <View style={styles.traceBodyBox}>
          <Text style={styles.traceCodeText}>{item.payload.raw_message}</Text>
        </View>
        <Text style={styles.traceFooterText}>💡 Hold card down to copy raw string trace</Text>
      </TouchableOpacity>
    );
  },
  // Custom comparator: only re-render if status, attempts, or ID changes
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.status === next.item.status &&
    prev.item.attempts === next.item.attempts &&
    prev.variant === next.variant
);

TransactionCard.displayName = 'TransactionCard';

export default TransactionCard;

// ─── Styles (matching existing design language) ──────────────────────────────────

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, backgroundColor: '#0f172a' },
  cardPending: { borderColor: 'rgba(251, 191, 36, 0.2)' },
  cardSynced: { borderColor: 'rgba(16, 185, 129, 0.15)' },
  cardFailed: { borderColor: 'rgba(244, 63, 94, 0.3)', backgroundColor: 'rgba(244, 63, 94, 0.03)' },
  cardSyncing: { borderColor: 'rgba(79, 70, 229, 0.3)', backgroundColor: 'rgba(79, 70, 229, 0.03)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardHeaderLeft: { flex: 1 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  retryButton: { backgroundColor: 'rgba(79, 70, 229, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.4)' },
  retryButtonText: { color: '#818cf8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  txnIdText: { color: '#ffffff', fontFamily: 'monospace', fontWeight: '700', fontSize: 15 },
  amountText: { color: '#fbbf24', fontWeight: '800', fontSize: 16 },
  cardSubText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  timeText: { color: '#64748b', fontSize: 11, fontFamily: 'monospace' },
  errorText: { color: '#f87171', fontSize: 10, fontFamily: 'monospace', marginLeft: 4 },
  syncedTxnId: { color: '#94a3b8' },
  syncedAmount: { color: '#a7f3d0', fontWeight: '800', fontSize: 16 },
  syncedTime: { color: '#34d399', fontSize: 11, fontFamily: 'monospace', marginTop: 8 },
  traceCard: { backgroundColor: '#090d16', borderLeftWidth: 3, borderLeftColor: '#4f46e5', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b' },
  traceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  traceTag: { color: '#818cf8', fontSize: 10, fontWeight: '700' },
  traceTime: { color: '#475569', fontSize: 10, fontFamily: 'monospace' },
  traceBodyBox: { backgroundColor: '#020617', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#1e293b' },
  traceCodeText: { color: '#cbd5e1', fontFamily: 'monospace', fontSize: 11, lineHeight: 16 },
  traceFooterText: { color: '#475569', fontSize: 9, marginTop: 6, fontStyle: 'italic' },
});
