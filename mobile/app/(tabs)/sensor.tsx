import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useLocalSearchParams } from 'expo-router';

export default function SensorScreen() {
  const { userId } = useLocalSearchParams();

  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [isStreaming, setIsStreaming] = useState(false);

  const bufferRef = useRef<any[]>([]);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    const accSubscription = Accelerometer.addListener(data => setAccelData(data));
    const gyroSubscription = Gyroscope.addListener(data => setGyroData(data));

    return () => {
      accSubscription.remove();
      gyroSubscription.remove();
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
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const sendDataToBackend = async (isDraining = false) => {
    
    if (!isDraining) {
      bufferRef.current.push(payloadRef.current);

      if (bufferRef.current.length > 300) {
        bufferRef.current.shift();
      }
    }

    const backendURL = 'http://192.168.1.103:5000/api/sensor-data';

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
        
        if (bufferRef.current.length > 0) {
           sendDataToBackend(true); 
        }
      }
    } catch (error) {

      if (!isDraining) {
        console.log(`[OFFLINE] Bağlantı yok! Veri birikiyor... Kuyruk: ${bufferRef.current.length}`);
      }
    }
  };

  useEffect(() => {
    
    let intervalId: ReturnType<typeof setInterval>;
    
    if (isStreaming) {
      console.log("Sensör okuması BAŞLADI");
      intervalId = setInterval(() => {
        sendDataToBackend();
      }, 1000); 
    } else {
      console.log("Sensör okuması DURDU");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isStreaming]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Düşme Tespiti Sensörleri</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>İvmeölçer (Hareket/Darbe)</Text>
        <Text>X: {payload.accelerometer.x}</Text>
        <Text>Y: {payload.accelerometer.y}</Text>
        <Text>Z: {payload.accelerometer.z}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Jiroskop (Dönüş/Açı)</Text>
        <Text>X: {payload.gyroscope.x}</Text>
        <Text>Y: {payload.gyroscope.y}</Text>
        <Text>Z: {payload.gyroscope.z}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, isStreaming ? styles.buttonStop : styles.buttonStart]} 
        onPress={() => setIsStreaming(!isStreaming)}
      >
        <Text style={styles.buttonText}>
          {isStreaming ? "Veri Akışını Durdur ⏹️" : "Otomatik Gönderimi Başlat ▶️"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, marginTop: 30, color: '#333' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#0056b3' },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonStart: { backgroundColor: '#28a745' },
  buttonStop: { backgroundColor: '#dc3545' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});