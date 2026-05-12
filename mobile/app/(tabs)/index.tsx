import { Accelerometer, Gyroscope } from "expo-sensors";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function App() {
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    const accSubscription = Accelerometer.addListener((data) =>
      setAccelData(data),
    );
    const gyroSubscription = Gyroscope.addListener((data) => setGyroData(data));

    return () => {
      accSubscription.remove();
      gyroSubscription.remove();
    };
  }, []);

  // BACKEND'İN BEKLEDİĞİ PAYLOAD YAPISI
  const payload = {
    userId: "test_kullanici_123",
    deviceId: "mobil_cihaz_sude_01",
    timestamp: new Date().toISOString(),
    accelerometer: {
      x: parseFloat(accelData.x.toFixed(3)),
      y: parseFloat(accelData.y.toFixed(3)),
      z: parseFloat(accelData.z.toFixed(3)),
    },
    gyroscope: {
      x: parseFloat(gyroData.x.toFixed(3)),
      y: parseFloat(gyroData.y.toFixed(3)),
      z: parseFloat(gyroData.z.toFixed(3)),
    },
  };

  const sendDataToBackend = async () => {
    const backendURL = "http://10.17.121.187:5000/api/sensor-data";

    try {
      const response = await fetch(backendURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert("Başarılı!", "Veri MongoDB'ye kaydedildi! 🎉");
      } else {
        const errorData = await response.json();
        console.log("Backend Hatası:", errorData);
        Alert.alert("Format Hatası", JSON.stringify(errorData, null, 2));
      }
    } catch (error) {
      console.error("Bağlantı hatası:", error);
      Alert.alert("Bağlantı Koptu", "Sunucuya ulaşılamıyor.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Düşme Tespiti Sensörleri</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>İvmeölçer (Hareket/Darbe)</Text>
        {}
        <Text>X: {payload.accelerometer.x}</Text>
        <Text>Y: {payload.accelerometer.y}</Text>
        <Text>Z: {payload.accelerometer.z}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Jiroskop (Dönüş/Açı)</Text>
        {}
        <Text>X: {payload.gyroscope.x}</Text>
        <Text>Y: {payload.gyroscope.y}</Text>
        <Text>Z: {payload.gyroscope.z}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={sendDataToBackend}>
        <Text style={styles.buttonText}>Veriyi Sunucuya Gönder</Text>
      </TouchableOpacity>

      <View style={styles.jsonContainer}>
        <Text style={styles.cardTitle}>Backend'e Gidecek Paket:</Text>
        <Text style={styles.jsonText}>{JSON.stringify(payload, null, 2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 30,
    color: "#333",
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0056b3",
  },
  button: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  jsonContainer: {
    backgroundColor: "#282c34",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  jsonText: { color: "#98c379", fontFamily: "monospace", fontSize: 12 },
});
