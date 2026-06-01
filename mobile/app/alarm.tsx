import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function AlarmScreen() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    // Ekran açıldığında telefonu titret
    Vibration.vibrate([500, 500, 500]); 

    // 10 Saniyelik Geri Sayım Döngüsü
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerEmergency();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const cancelAlarm = () => {
    Vibration.cancel();
    router.back();
  };

  const triggerEmergency = () => {
    Vibration.cancel();
    alert("ACİL DURUM TETİKLENDİ! Kişilere haber veriliyor...");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Üst Kısım: Uyarı ve Başlık */}
      <View style={styles.headerContainer}>
        <View style={styles.warningIcon}>
          <MaterialIcons name="warning" size={48} color="#bb0112" />
        </View>
        <Text style={styles.title}>FALL DETECTED!</Text>
        <Text style={styles.subtitle}>A sudden fall was detected. Help will be notified soon.</Text>
      </View>

      {/* Orta Kısım: Sayaç */}
      <View style={styles.timerContainer}>
        <View style={styles.circle}>
          <Text style={styles.timerText}>{timeLeft}</Text>
          <Text style={styles.secondsText}>SECONDS</Text>
        </View>
      </View>

      {/* Alt Kısım: Butonlar */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.btnCancel} onPress={cancelAlarm}>
          <MaterialIcons name="check-circle" size={28} color="white" />
          <Text style={styles.btnCancelText}>I'm Fine (Cancel)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnEmergency} onPress={triggerEmergency}>
          <MaterialIcons name="sos" size={24} color="#bb0112" />
          <Text style={styles.btnEmergencyText}>SEND HELP NOW</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Emergency contacts are being alerted...</Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#bb0112', 
    padding: 20, 
    paddingTop: 50, 
    justifyContent: 'space-between'
  },
  headerContainer: { 
    alignItems: 'center', 
    marginTop: 10 
  },
  warningIcon: { 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 50, 
    marginBottom: 16 
  },
  title: { 
    fontSize: 36, 
    fontWeight: '900', 
    color: 'white', 
    textAlign: 'center', 
    letterSpacing: -1 
  },
  subtitle: { 
    fontSize: 16, 
    color: 'white', 
    textAlign: 'center', 
    opacity: 0.9, 
    marginTop: 8, 
    paddingHorizontal: 20 
  },
  
  timerContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  circle: { 
    width: 200, 
    height: 200, 
    borderRadius: 100, 
    borderWidth: 8, 
    borderColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  timerText: { 
    fontSize: 80, 
    fontWeight: 'bold', 
    color: 'white', 
    lineHeight: 85 
  },
  secondsText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'white', 
    letterSpacing: 2 
  },
  actionContainer: { 
    width: '100%', 
    gap: 12, 
    paddingBottom: 20 
  },
  btnCancel: { 
    backgroundColor: '#2e7d32', 
    height: 72, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12, 
    borderWidth: 3, 
    borderColor: 'white', 
    elevation: 5 
  },
  btnCancelText: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  btnEmergency: { 
    backgroundColor: '#ffdad6', 
    height: 56, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8 
  },
  btnEmergencyText: { 
    color: '#bb0112', 
    fontSize: 16, 
    fontWeight: 'bold', 
    letterSpacing: 1 
  },
  footerText: { 
    color: 'white', 
    textAlign: 'center', 
    fontSize: 14, 
    opacity: 0.8, 
    marginTop: 4 
  }
});