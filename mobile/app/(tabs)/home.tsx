import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useRouter, Redirect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import CatchMeIcon from '@/components/CatchMeIcon';
import { clearAuth, getUserId, getUserName, getOrCreateDeviceId } from '@/services/api';
import {
  emitSensorWindow,
  onSocketConnectionChange,
  type SensorReading,
} from '@/services/socket';

/** 50 Hz örnekleme → 20 ms aralık */
const SAMPLE_INTERVAL_MS = 20;
/** 1,5 sn pencere (50 Hz × 1,5 = 75 okuma) */
const WINDOW_SIZE = 75;
const SAMPLE_RATE_HZ = 1000 / SAMPLE_INTERVAL_MS;

type NetworkStatus = 'idle' | 'online' | 'offline';

export default function HomeScreen() {
  const router = useRouter();
  
  const userId = getUserId();
  const userName = getUserName();

  const [isStreaming, setIsStreaming] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('idle');
  const [windowProgress, setWindowProgress] = useState(0);
  const [windowsSent, setWindowsSent] = useState(0);
  /** Cihaza özgü kalıcı ID — AsyncStorage'dan yüklenir, yüklenene kadar null */
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const accelRef = useRef({ x: 0, y: 0, z: 0 });
  const gyroRef = useRef({ x: 0, y: 0, z: 0 });
  const windowBufferRef = useRef<SensorReading[]>([]);
  const windowStartRef = useRef<string | null>(null);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Mount olduğunda başlat, unmount olduğunda durdur
  useEffect(() => {
    setIsStreaming(true);
    return () => setIsStreaming(false);
  }, []);

  // Cihaz kimliğini AsyncStorage'dan yükle (ya da ilk kullanımda üret)
  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  /* Sensör dinleyicileri — ref'lere yazar, state güncellemez (performans) */
  useEffect(() => {
    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    Gyroscope.setUpdateInterval(SAMPLE_INTERVAL_MS);

    const accSub = Accelerometer.addListener(data => {
      accelRef.current = data;
    });
    const gyroSub = Gyroscope.addListener(data => {
      gyroRef.current = data;
    });

    return () => {
      accSub.remove();
      gyroSub.remove();
    };
  }, []);

  /* Socket bağlantı durumunu izle */
  useEffect(() => {
    return onSocketConnectionChange(connected => {
      if (!isStreamingRef.current) {
        setNetworkStatus('idle');
      } else {
        setNetworkStatus(connected ? 'online' : 'offline');
      }
    });
  }, []);

  /* 50 Hz örnekleme + pencere tamamlanınca WebSocket emit */
  useEffect(() => {
    if (!isStreaming) {
      windowBufferRef.current = [];
      windowStartRef.current = null;
      setWindowProgress(0);
      setNetworkStatus('idle');
      return;
    }

    const tick = () => {
      const now = new Date().toISOString();
      if (!windowStartRef.current) windowStartRef.current = now;

      const reading: SensorReading = {
        timestamp: now,
        accelerometer: {
          x: parseFloat(accelRef.current.x.toFixed(3)),
          y: parseFloat(accelRef.current.y.toFixed(3)),
          z: parseFloat(accelRef.current.z.toFixed(3)),
        },
        gyroscope: {
          x: parseFloat(gyroRef.current.x.toFixed(3)),
          y: parseFloat(gyroRef.current.y.toFixed(3)),
          z: parseFloat(gyroRef.current.z.toFixed(3)),
        },
      };

      windowBufferRef.current.push(reading);
      setWindowProgress(windowBufferRef.current.length);

      if (windowBufferRef.current.length >= WINDOW_SIZE) {
        // deviceId henüz yüklenmediyse boş payload gönderme
        if (!deviceId) return;

        const payload = {
          userId: userId || 'anonim_kullanici',
          deviceId,
          windowStart: windowStartRef.current,
          windowEnd: now,
          sampleRateHz: SAMPLE_RATE_HZ,
          readings: [...windowBufferRef.current],
        };

        const sent = emitSensorWindow(payload);
        setNetworkStatus(sent ? 'online' : 'offline');
        if (sent) {
          setWindowsSent(prev => prev + 1);
          console.log(`[Socket] Pencere gönderildi: ${WINDOW_SIZE} okuma`);
        }

        windowBufferRef.current = [];
        windowStartRef.current = null;
        setWindowProgress(0);
      }
    };

    const intervalId = setInterval(tick, SAMPLE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isStreaming, userId, deviceId]);

  const simulateFall = () => router.push('/alarm');

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: () => {
            setIsStreaming(false);
            clearAuth();
            router.replace('/');
          },
        },
      ],
    );
  };

  const networkLabel =
    networkStatus === 'online' ? 'Bağlı' :
    networkStatus === 'offline' ? 'Bağlantı Yok' : 'Boşta';

  const networkIcon: React.ComponentProps<typeof MaterialIcons>['name'] =
    networkStatus === 'online' ? 'wifi' :
    networkStatus === 'offline' ? 'wifi-off' : 'wifi';

  const networkColor =
    networkStatus === 'online' ? '#0040a1' :
    networkStatus === 'offline' ? '#bb0112' : '#737785';

  if (!userId) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CatchMeIcon size={32} />
          <View>
            <Text style={styles.headerTitle}>CatchMe</Text>
            {userName ? (
              <Text style={styles.headerSubtitle}>Hoş geldin, {userName}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={26} color="#bb0112" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusContainer}>
          <View style={[styles.statusCircle, isStreaming ? styles.circleActive : styles.circleInactive]}>
            <MaterialIcons
              name={isStreaming ? 'sensors' : 'sensors-off'}
              size={64}
              color={isStreaming ? '#0040a1' : '#424654'}
            />
            <Text style={[styles.statusText, { color: isStreaming ? '#0040a1' : '#424654' }]}>
              {isStreaming ? 'SİSTEM AKTİF' : 'SİSTEM DURAKLATILDI'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.mainButton, isStreaming ? styles.btnStop : styles.btnStart]}
          onPress={() => setIsStreaming(!isStreaming)}
        >
          <MaterialIcons name={isStreaming ? 'pause-circle' : 'play-circle'} size={28} color="white" />
          <Text style={styles.mainButtonText}>
            {isStreaming ? 'Sensör İzlemeyi Durdur' : 'Sensör İzlemeyi Başlat'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>
          {isStreaming
            ? `Pencere: ${windowProgress}/${WINDOW_SIZE} okuma · ${windowsSent} pencere gönderildi`
            : 'Sensör akışı durduruldu. Başlatmak için düğmeye dokunun.'}
        </Text>

        <View style={styles.grid}>
          <View style={styles.infoCard}>
            <View style={[styles.iconBox, networkStatus === 'offline' && styles.iconBoxDanger]}>
              <MaterialIcons name={networkIcon} size={24} color={networkColor} />
            </View>
            <View>
              <Text style={styles.cardLabel}>WEBSOCKET</Text>
              <Text style={[styles.cardValue, { color: networkColor }]}>{networkLabel}</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.iconBox}>
              <MaterialIcons name={isStreaming ? 'sync' : 'sync-disabled'} size={24} color="#0040a1" />
            </View>
            <View>
              <Text style={styles.cardLabel}>PENCERE</Text>
              <Text style={styles.cardValue}>
                {isStreaming ? `${(WINDOW_SIZE / SAMPLE_RATE_HZ).toFixed(1)} sn / ${WINDOW_SIZE} okuma` : 'Duraklatıldı'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.simulateButton} onPress={simulateFall}>
          <MaterialIcons name="warning" size={24} color="white" />
          <Text style={styles.simulateButtonText}>Düşme Alarmını Test Et</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#eceef0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0040a1' },
  headerSubtitle: { fontSize: 13, color: '#424654', marginTop: 1 },
  iconButton: { padding: 4 },
  content: {
    padding: 24, alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
  },
  statusContainer: { marginVertical: 36, alignItems: 'center', justifyContent: 'center' },
  statusCircle: {
    width: 220, height: 220, borderRadius: 110,
    justifyContent: 'center', alignItems: 'center',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20,
  },
  circleActive: { backgroundColor: '#dae2ff', borderWidth: 4, borderColor: '#b2c5ff' },
  circleInactive: { backgroundColor: '#e0e3e5', borderWidth: 4, borderColor: '#c3c6d6' },
  statusText: { marginTop: 12, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  mainButton: {
    width: '100%', paddingHorizontal: 30, height: 72, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 12, elevation: 4,
  },
  btnStart: { backgroundColor: '#0040a1' },
  btnStop: { backgroundColor: '#bb0112' },
  mainButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  infoText: { marginTop: 14, color: '#424654', fontSize: 14, marginBottom: 28, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 16, width: '100%' },
  infoCard: {
    flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f2f4f6', justifyContent: 'center', alignItems: 'center',
  },
  iconBoxDanger: { backgroundColor: '#ffdad6' },
  cardLabel: { fontSize: 12, fontWeight: 'bold', color: '#737785' },
  cardValue: { fontSize: 14, fontWeight: '600', color: '#191c1e' },
  simulateButton: {
    marginTop: 36, backgroundColor: '#e02928', padding: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  simulateButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
