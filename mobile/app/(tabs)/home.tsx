import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();

  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [isStreaming, setIsStreaming] = useState(false);

  const bufferRef = useRef<any[]>([]);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    const accSub = Accelerometer.addListener(data => setAccelData(data));
    const gyroSub = Gyroscope.addListener(data => setGyroData(data));

    return () => {
      accSub.remove();
      gyroSub.remove();
    };
  }, []);

  const payload = {
    userId: userId || "anonim_kullanici",
    deviceId: "mobil_cihaz_sude_01",
    timestamp: new Date().toISOString(),
    accelerometer: {
      x: parseFloat(accelData.x.toFixed(3)),
      y: parseFloat(accelData.y.toFixed(3)),
      z: parseFloat(accelData.z.toFixed(3))
    },
    gyroscope: {
      x: parseFloat(gyroData.x.toFixed(3)),
      y: parseFloat(gyroData.y.toFixed(3)),
      z: parseFloat(gyroData.z.toFixed(3))
    }
  };

  const payloadRef = useRef(payload);
  useEffect(() => { payloadRef.current = payload; }, [payload]);

  const sendDataToBackend = async (isDraining = false) => {
    if (!isDraining) {
      bufferRef.current.push(payloadRef.current);
      if (bufferRef.current.length > 300) bufferRef.current.shift();
    }

    const backendURL = 'http://10.150.71.187:5000/api/sensor-data'; 

    try {
      const dataToSend = bufferRef.current[0];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      const response = await fetch(backendURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        bufferRef.current.shift();
        console.log(`[ONLINE] Veri gitti. Kuyruk: ${bufferRef.current.length}`);
        if (bufferRef.current.length > 0) sendDataToBackend(true);
      }
    } catch (error) {
      if (!isDraining) {
        console.log(`[OFFLINE] Bağlantı yok! Kuyruk: ${bufferRef.current.length}`);
      }
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (isStreaming) {
      intervalId = setInterval(() => sendDataToBackend(), 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isStreaming]);

  const simulateFall = () => {
    router.push('/alarm');
  };

  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet", 
          onPress: () => {
            setIsStreaming(false); 
            router.replace('/'); 
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Üst Bar ve Çıkış Butonu */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="health-and-safety" size={32} color="#0040a1" />
          <Text style={styles.headerTitle}>SafeGuard</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={26} color="#bb0112" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusCircle, isStreaming ? styles.circleActive : styles.circleInactive]}>
            <MaterialIcons name={isStreaming ? "sensors" : "sensors-off"} size={64} color={isStreaming ? "#0040a1" : "#424654"} />
            <Text style={[styles.statusText, { color: isStreaming ? "#0040a1" : "#424654" }]}>
              {isStreaming ? "SYSTEM ACTIVE" : "SYSTEM PAUSED"}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.mainButton, isStreaming ? styles.btnStop : styles.btnStart]} 
          onPress={() => setIsStreaming(!isStreaming)}
        >
          <MaterialIcons name={isStreaming ? "pause-circle" : "play-circle"} size={28} color="white" />
          <Text style={styles.mainButtonText}>
            {isStreaming ? "Stop Sensor Monitoring" : "Start Sensor Monitoring"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>Monitoring since 08:00 AM Today</Text>

        <View style={styles.grid}>
          <View style={styles.infoCard}>
            <View style={styles.iconBox}>
              <MaterialIcons name="wifi" size={24} color="#0040a1" />
            </View>
            <View>
              <Text style={styles.cardLabel}>NETWORK</Text>
              <Text style={styles.cardValue}>Wi-Fi Connected</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.iconBox}>
              <MaterialIcons name="sync" size={24} color="#0040a1" />
            </View>
            <View>
              <Text style={styles.cardLabel}>SYNC</Text>
              <Text style={styles.cardValue}>Data Syncing</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.simulateButton} onPress={simulateFall}>
          <MaterialIcons name="warning" size={24} color="white" />
          <Text style={styles.simulateButtonText}>Test Fall Alarm</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#eceef0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0040a1' },
  iconButton: { padding: 4 },
  content: { padding: 24, alignItems: 'center' },
  statusContainer: { marginVertical: 40, alignItems: 'center', justifyContent: 'center' },
  statusCircle: { width: 220, height: 220, borderRadius: 110, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  circleActive: { backgroundColor: '#dae2ff', borderWidth: 4, borderColor: '#b2c5ff' },
  circleInactive: { backgroundColor: '#e0e3e5', borderWidth: 4, borderColor: '#c3c6d6' },
  statusText: { marginTop: 12, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  mainButton: { width: '100%', paddingHorizontal: 30, height: 72, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 4 },
  btnStart: { backgroundColor: '#0040a1' },
  btnStop: { backgroundColor: '#bb0112' },
  mainButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  infoText: { marginTop: 16, color: '#424654', fontSize: 14, marginBottom: 32 },
  grid: { flexDirection: 'row', gap: 16, width: '100%' },
  infoCard: { flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f2f4f6', justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12, fontWeight: 'bold', color: '#737785' },
  cardValue: { fontSize: 14, fontWeight: '600', color: '#191c1e' },
  simulateButton: { marginTop: 40, backgroundColor: '#e02928', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  simulateButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});