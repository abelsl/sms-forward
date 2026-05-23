import { showToast } from '@/components/ToastNotification';
import TransactionCard from '@/components/TransactionCard';
import { setServerUrl } from '@/services/apiSync';
import { requestSMSPermissions, startSMSGatewayListener } from '@/services/smsListener';
import { useGatewayStore } from '@/store/gatewayStore';
import { QueueItem } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  requestSmsPermissionAsync,
  startSmsListenerServiceAsync,
  
} from 'expo-sms-listener';
// Ensure the SMS headless task is registered in the JS bundle
// import "@/services/smsHeadlessTask";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';



const STORAGE_KEY = '@birr_gateway_server_url';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "synced" | "raw_logs">("dashboard");

  // --- PERSISTENCE & MODAL STATES ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState("");
  const [isLoadingStorage, setIsLoadingStorage] = useState(true); // Blocks UI until disk read is done

  const CARD_HEIGHT = 110;
  const CARD_MARGIN = 12;

  const getItemLayout = (_data: any, index: number) => ({
    length: CARD_HEIGHT + CARD_MARGIN,
    offset: (CARD_HEIGHT + CARD_MARGIN) * index,
    index,
  });
  
  const keyExtractor = (item: QueueItem) => item.id;

  const { isListening, queue, setListeningStatus } = useGatewayStore();
  const pendingItems = queue.filter((item: any) => item.status === "pending");

  const handleToast = useCallback((message: string, type: 'success' | 'error') => {
    showToast(message, type);
  }, []);

  const renderPendingItem = useCallback(({ item }: { item: QueueItem }) => (
    <TransactionCard item={item} variant="pending" onToast={handleToast} />
  ), [handleToast]);

  const emptyPending = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTextMain}>All transactions cleared!</Text>
      <Text style={styles.emptyTextSub}>No financial alerts waiting in local database memory.</Text>
    </View>
  );

  /**
   * 1. LOAD SAVED URL FROM ASYNCSTORAGE ON BOOT
   */
  useEffect(() => {
    const loadSavedUrl = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedUrl) {
          setServerUrl(savedUrl);
          setServerUrlInput(savedUrl);
        } else {
          setIsModalVisible(true); // No URL found, show configuration setup
        }
      } catch (e) {
        console.log("[Storage Error]", e);
        setIsModalVisible(true);
      } finally {
        setIsLoadingStorage(false);
      }
    };
    loadSavedUrl();
  }, []);

  /**
   * 2. SAVE URL TO ASYNCSTORAGE
   */
  const handleSaveUrl = async () => {
    const cleanedUrl = serverUrlInput.trim();
    if (!cleanedUrl) {
      Alert.alert("Invalid URL", "Please enter a valid backend server URL.");
      return;
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, cleanedUrl);
      setServerUrl(cleanedUrl);
      setIsModalVisible(false);
      showToast("Configuration updated", "success");
    } catch (e) {
      Alert.alert("Error", "Could not save configuration to device.");
    }
  };

  /**
   * 3. START SMS ENGINE (Only runs if storage is ready and modal is hidden)
   */
  useEffect(() => {
    if (isLoadingStorage || isModalVisible || !serverUrlInput) return;

    let listener: any;

    const init = async () => {
      const hasPermission = await requestSMSPermissions();
      if (!hasPermission) {
        Alert.alert("Permission Required", "SMS permission is needed to run the listener.");
        await requestSmsPermissionAsync();

        return;
      }
      
      listener = await startSMSGatewayListener();
      setListeningStatus(true);
      
    };

    init();

    return () => {
      // listener?.remove?.();
      listener;
    };
  }, [isLoadingStorage, isModalVisible, serverUrlInput]); 

  useEffect(() => {
    const forgroundListner = async () => {
    if (isListening) {
      await startSmsListenerServiceAsync();
    } else {
      // Stop the SMS listener service when not listening
        await requestSmsPermissionAsync();

    }}
      forgroundListner();
  }, [isListening]);

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert("Copied", "Raw message copied to clipboard");
  };

  // Safe splash screen while reading storage profile
  if (isLoadingStorage) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* REUSABLE CONFIGURATION OVERLAY CARD */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Node Configuration</Text>
            <Text style={styles.modalSubtitle}>Enter the target backend API endpoint destination to route local transactions.</Text>
            <Text style={styles.modalSubtitle}>Note: The URL must be a valid HTTPS endpoint.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="https://yourdomain.com/api/v1/birr-receiver"
              placeholderTextColor="#475569"
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            
            <View style={styles.modalActionRow}>
              {/* Only let them hit cancel if they already have an existing URL saved */}
              {serverUrlInput !== "" && !isLoadingStorage && (
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalBtnSecondary]} 
                  onPress={async () => {
                    const fallback = await AsyncStorage.getItem(STORAGE_KEY);
                    setServerUrlInput(fallback ?? "");
                    setIsModalVisible(false);
                  }}
                >
                  <Text style={styles.modalBtnSecondaryText}>CANCEL</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalBtnPrimary]} 
                onPress={handleSaveUrl}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>SAVE & RUN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.mainWrapper}>
        {/* HEADER SECTION */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>SMS Forward</Text>
            <Text style={styles.headerSubtitle}>SMS SYNC NODE</Text>
          </View>

          <View style={styles.headerControls}>
            {/* CLICK TO CHANGE URL LATER BUTTON */}
            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              style={styles.configChangeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.configChangeText}>⚙️ URL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setListeningStatus(!isListening)}
              style={[
                styles.statusBadge,
                isListening ? styles.badgeActive : styles.badgePaused,
              ]}
            >
              <Text style={[styles.statusText, isListening ? styles.txtActive : styles.txtPaused]}>
                {isListening ? "● ENGINE LIVE" : "○ ENGINE OFF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STATS DECK */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>UNSYNCED</Text>
            <Text style={styles.statValue}>{pendingItems.length}</Text>
          </View>
        </View>

        {/* CONTROLS TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab("dashboard")}
            style={[styles.tabButton, activeTab === "dashboard" && styles.tabActive]}
          >
            <Text style={styles.tabText}>PENDING</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("raw_logs")}
            style={[styles.tabButton, activeTab === "raw_logs" && styles.tabActive]}
          >
            <Text style={styles.tabText}>LOGS</Text>
          </TouchableOpacity>
        </View>

        {/* WORKSPACE VIEWS */}
        {activeTab === "dashboard" && (
          <FlatList
            data={pendingItems}
            renderItem={renderPendingItem}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={8}
            keyExtractor={keyExtractor}
            ListEmptyComponent={emptyPending}
          />
        )}

        {activeTab === "raw_logs" && (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onLongPress={() => copyToClipboard(item.payload.raw_message)}
                style={styles.card}
              >
                <Text style={styles.txnIdText}>{item.payload.source}</Text>
                <Text style={styles.cardSubText}>{item.payload.raw_message}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
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
  modalBtnPrimary: { backgroundColor: '#4f46e5' },
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
});





























// // App.tsx
// import { showToast } from '@/components/ToastNotification';
// import TransactionCard from '@/components/TransactionCard';
// import { requestSMSPermissions, startSMSGatewayListener } from '@/services/smsListener';
// import { setServerUrl } from '@/services/apiSync'; // <-- Import the new setter
// import { useGatewayStore } from '@/store/gatewayStore';
// import { QueueItem } from '@/types';
// import React, { useCallback, useEffect, useState } from 'react';
// import {
//   Alert,
//   Clipboard,
//   FlatList,
//   Modal,
//   SafeAreaView,
//   StatusBar,
//   StyleSheet, 
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View
// } from 'react-native';

// export default function HomeScreen() {
//   const [activeTab, setActiveTab] = useState<
//     "dashboard" | "synced" | "raw_logs"
//   >("dashboard");

//   // --- NEW STATES FOR SERVER URL POPUP ---
//   const [isSetupComplete, setIsSetupComplete] = useState(false);
//   const [serverUrlInput, setServerUrlInput] = useState("");

//   const CARD_HEIGHT = 110;
//   const CARD_MARGIN = 12;

//   const getItemLayout = (_data: any, index: number) => ({
//     length: CARD_HEIGHT + CARD_MARGIN,
//     offset: (CARD_HEIGHT + CARD_MARGIN) * index,
//     index,
//   });
  
//   const keyExtractor = (item: QueueItem) => item.id;

//   const {
//     isListening,
//     queue,
//     setListeningStatus,
//   } = useGatewayStore();

//   const pendingItems = queue.filter((item: any) => item.status === "pending");
//   const syncedItems = queue.filter((item: any) => item.status === "synced");
//   const failedItems = queue.filter((item: any) => item.status === "failed");

//   const handleToast = useCallback((message: string, type: 'success' | 'error') => {
//     showToast(message, type);
//   }, []);

//   const renderPendingItem = useCallback(({ item }: { item: QueueItem }) => (
//     <TransactionCard item={item} variant="pending" onToast={handleToast} />
//   ), [handleToast]);

//   const emptyPending = (
//     <View style={styles.emptyState}>
//       <Text style={styles.emptyTextMain}>All transactions cleared!</Text>
//       <Text style={styles.emptyTextSub}>No financial alerts waiting in local database memory.</Text>
//     </View>
//   );

//   /**
//    * HANDLE SAVING THE URL FROM THE MODAL
//    */
//   const handleSaveUrl = () => {
//     if (!serverUrlInput.trim()) {
//       Alert.alert("Invalid URL", "Please enter a valid backend server URL.");
//       return;
//     }
    
//     // Set it in apiSync.ts
//     setServerUrl(serverUrlInput.trim());
    
//     // Close modal and trigger the useEffect below
//     setIsSetupComplete(true); 
//   };

//   /**
//    * START REAL SMS ENGINE (Only runs AFTER setup is complete)
//    */
//   useEffect(() => {
//     let listener: any;

//     const init = async () => {
//       // Don't start if the URL hasn't been provided yet
//       if (!isSetupComplete) return;

//       const hasPermission = await requestSMSPermissions();

//       if (!hasPermission) {
//         Alert.alert(
//           "Permission Required",
//           "SMS permission is needed to run gateway."
//         );
//         return;
//       }

//       listener = await startSMSGatewayListener();
//       setListeningStatus(true);
//     };

//     init();

//     return () => {
//       listener?.remove?.();
//     };
//   }, [isSetupComplete]); // Dependency array listens for setup completion

//   /**
//    * COPY RAW MESSAGE
//    */
//   const copyToClipboard = (text: string) => {
//     Clipboard.setString(text);
//     Alert.alert("Copied", "Raw message copied to clipboard");
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#020617" />

//       {/* --- START URL CONFIG MODAL --- */}
//       <Modal 
//         visible={!isSetupComplete} 
//         transparent 
//         animationType="fade"
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalCard}>
//             <Text style={styles.modalTitle}>Node Configuration</Text>
//             <Text style={styles.modalSubtitle}>Enter the target backend API URL to sync transactions.</Text>
            
//             <TextInput
//               style={styles.modalInput}
//               placeholder="https://api.yourserver.com/webhook"
//               placeholderTextColor="#475569"
//               value={serverUrlInput}
//               onChangeText={setServerUrlInput}
//               autoCapitalize="none"
//               autoCorrect={false}
//               keyboardType="url"
//             />
            
//             <TouchableOpacity 
//               style={styles.modalButton} 
//               onPress={handleSaveUrl}
//               activeOpacity={0.8}
//             >
//               <Text style={styles.modalButtonText}>CONNECT & START ENGINE</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//       {/* --- END URL CONFIG MODAL --- */}

//       <View style={styles.mainWrapper}>
//         {/* HEADER */}
//         <View style={styles.headerRow}>
//           <View>
//             <Text style={styles.headerTitle}>BIRR GATEWAY</Text>
//             <Text style={styles.headerSubtitle}>SMS SYNC NODE</Text>
//           </View>

//           <TouchableOpacity
//             onPress={() => setListeningStatus(!isListening)}
//             style={[
//               styles.statusBadge,
//               isListening ? styles.badgeActive : styles.badgePaused,
//             ]}
//           >
//             <Text
//               style={[
//                 styles.statusText,
//                 isListening ? styles.txtActive : styles.txtPaused,
//               ]}
//             >
//               {isListening ? "● ENGINE LIVE" : "○ ENGINE OFF"}
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* STATS */}
//         <View style={styles.statsRow}>
//           <View style={styles.statBox}>
//             <Text style={styles.statLabel}>UNSYNCED</Text>
//             <Text style={styles.statValue}>{pendingItems.length}</Text>
//           </View>
//         </View>

//         {/* TABS */}
//         <View style={styles.tabContainer}>
//           <TouchableOpacity
//             onPress={() => setActiveTab("dashboard")}
//             style={[
//               styles.tabButton,
//               activeTab === "dashboard" && styles.tabActive,
//             ]}
//           >
//             <Text style={styles.tabText}>PENDING</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             onPress={() => setActiveTab("raw_logs")}
//             style={[
//               styles.tabButton,
//               activeTab === "raw_logs" && styles.tabActive,
//             ]}
//           >
//             <Text style={styles.tabText}>LOGS</Text>
//           </TouchableOpacity>
//         </View>

//         {/* PENDING */}
//         {activeTab === "dashboard" && (
//           <FlatList
//             data={pendingItems}
//             renderItem={renderPendingItem}
//             getItemLayout={getItemLayout}
//             showsVerticalScrollIndicator={false}
//             removeClippedSubviews={true}
//             maxToRenderPerBatch={10}
//             windowSize={5}
//             initialNumToRender={8}
//             keyExtractor={keyExtractor}
//             ListEmptyComponent={emptyPending}
//           />
//         )}

//         {/* RAW LOGS */}
//         {activeTab === "raw_logs" && (
//           <FlatList
//             data={queue}
//             keyExtractor={(item) => item.id}
//             renderItem={({ item }) => (
//               <TouchableOpacity
//                 onLongPress={() => copyToClipboard(item.payload.raw_message)}
//                 style={styles.card}
//               >
//                 <Text style={styles.txnIdText}>{item.payload.source}</Text>
//                 <Text style={styles.cardSubText}>{item.payload.raw_message}</Text>
//               </TouchableOpacity>
//             )}
//           />
//         )}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#020617' },
//   mainWrapper: { flex: 1, padding: 16 },
  
//   // --- NEW STYLES FOR URL MODAL ---
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'center', padding: 20 },
//   modalCard: { backgroundColor: '#0f172a', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
//   modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
//   modalSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 24, lineHeight: 18 },
//   modalInput: { backgroundColor: '#020617', color: '#ffffff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 20, fontSize: 15, fontFamily: 'monospace' },
//   modalButton: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 10, alignItems: 'center' },
//   modalButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
//   // --------------------------------

//   headerRow: { marginBottom: 16, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
//   headerSubtitle: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
//   statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
//   badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' },
//   badgePaused: { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)' },
//   statusText: { fontSize: 11, fontWeight: '700' },
//   txtActive: { color: '#34d399' },
//   txtPaused: { color: '#f43f5e' },
//   statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
//   statBox: { flex: 1, backgroundColor: '#0f172a', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
//   statLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
//   statValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
//   tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
//   tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
//   tabActive: { backgroundColor: '#1e293b' },
//   tabText: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
//   card: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, backgroundColor: '#0f172a' },
//   txnIdText: { color: '#ffffff', fontFamily: 'monospace', fontWeight: '700', fontSize: 15 },
//   cardSubText: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginTop: 4 },
//   emptyState: { flex: 1, paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
//   emptyTextMain: { color: '#475569', fontSize: 14, fontWeight: '600' },
//   emptyTextSub: { color: '#334155', fontSize: 12, marginTop: 4, textAlign: 'center' },
// });