import { Text } from "@react-navigation/elements";
import { Alert, Modal, TouchableOpacity, View } from "react-native";
import { StyleSheet } from 'react-native';
import { useGatewayStore } from "@/store/gatewayStore";
import { syncPast24HoursSms } from "@/services/pastSyncHistory";

export function SyncModal(props: { isModalVisible: boolean; setStartModalVisible: (visible: boolean) => void; pendingItems: any[] }) {
    const { isModalVisible, setStartModalVisible , pendingItems} = props;
    const handleSyncALL = async () => { 
            await syncPast24HoursSms();
              Alert.alert("Sync Complete", "All transactions from yesterday till now have been synced.");
     }
  return (
    <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sync All Transactions</Text>
            <Text style={styles.modalSubtitle}>Are you sure you want to sync all messages since yesterday?</Text>
            <Text style={styles.modalSubtitle}>Note: Your server must handle if there is any duplicated transactions.</Text>
            <View style={styles.modalActionRow}>
            <TouchableOpacity 
                style={[styles.modalButton, styles.modalBtnPrimary]} 
                onPress={() => {
                    handleSyncALL();
                  setStartModalVisible(false);
                }}
                activeOpacity={0.8}>
                <Text style={styles.modalButtonText}>SYNC ALL</Text>
              </TouchableOpacity>
            <TouchableOpacity 
                  style={[styles.modalButton, styles.modalBtnSecondary]} 
                  onPress={() => {
                    setStartModalVisible(false);
                  }}
                >
                  <Text style={styles.modalBtnSecondaryText}>CANCEL</Text>
                </TouchableOpacity>
              
            </View>
          </View>
        </View>
      </Modal>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  mainWrapper: { flex: 1, padding: 16 },
  
  // MODAL CONFIG CARDS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.88)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#0f172a', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
  modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
  modalSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 24, lineHeight: 18 },
  modalInput: { backgroundColor: '#020617', color: '#ffffff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 20, fontSize: 14, fontFamily: 'monospace' },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnPrimary: { backgroundColor: '#a31616' },
  modalBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  modalButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  modalBtnSecondaryText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },

  // INTERFACE HEADERS
  headerRow: { marginBottom: 20,  marginTop: 30,  // increased from 8 (fixes "too high" feeling on Android)
  paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  configChangeButton: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
  configChangeText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  badgePaused: { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  txtActive: { color: '#34d399' },
  txtPaused: { color: '#f43f5e' },
  
  // STATS DISPLAY
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#0f172a', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  statLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontWeight: '900', color: '#ffffff', marginTop: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#1e293b' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  
  // CARDS LAYOUT
  card: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, backgroundColor: '#0f172a', borderColor: '#1e293b' },
  txnIdText: { color: '#ffffff', fontFamily: 'monospace', fontWeight: '700', fontSize: 15 },
  cardSubText: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginTop: 4 },
  emptyState: { flex: 1, paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
  emptyTextMain: { color: '#475569', fontSize: 14, fontWeight: '600' },
  emptyTextSub: { color: '#334155', fontSize: 12, marginTop: 4, textAlign: 'center' },
  // HISTORICAL SYNC
  historicalCard: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
  historicalTitle: { color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 12 },
  historicalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  historicalStatBox: { flex: 1, minWidth: '22%', backgroundColor: '#020617', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
  historicalStatLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  historicalStatValue: { fontSize: 16, fontWeight: '800', color: '#cbd5e1', marginTop: 4 },
  historicalStatValueError: { fontSize: 16, fontWeight: '800', color: '#f43f5e', marginTop: 4 },
  historicalActionRow: { flexDirection: 'row', gap: 12 },
  histBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  histBtnPrimary: { backgroundColor: '#4f46e5' },
  histBtnDanger: { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },
  histBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  histBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  histBtnTextSecondary: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});