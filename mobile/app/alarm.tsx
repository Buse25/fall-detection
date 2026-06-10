import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { BASE_URL, authHeaders } from '@/services/api';

export default function AlarmScreen() {
  const router = useRouter();
  const { alarmId, fallScore, countdownSec } = useLocalSearchParams<{ alarmId?: string, fallScore?: string, countdownSec?: string }>();
  
  const [timeLeft, setTimeLeft] = useState(countdownSec ? parseInt(countdownSec, 10) : 10);

  useEffect(() => {
    Vibration.vibrate([500, 500, 500]);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
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

  const cancelAlarm = async () => {
    Vibration.cancel();

    if (alarmId) {
      try {
        const response = await fetch(`${BASE_URL}/api/alarms/${alarmId}/resolve`, {
          method: 'PATCH',
          headers: authHeaders(),
        });

        if (!response.ok) {
          throw new Error('API isteği başarısız');
        }
      } catch (err) {
        console.error('Alarm iptal edilemedi:', err);
        Alert.alert('Bağlantı Hatası', 'İptal işlemi başarısız oldu. Lütfen tekrar deneyin.');
        return; // Geri sayımı durdurmamak için dönüyoruz.
      }
    }

    router.back();
  };

  const triggerEmergency = () => {
    Vibration.cancel();
    Alert.alert(
      'Acil Durum Tetiklendi!',
      'Kişilere haber veriliyor...',
      [{ text: 'Tamam', onPress: () => router.back() }],
    );
  };

  return (

    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* Üst Kısım: Uyarı ve Başlık */}
      <View style={styles.headerContainer}>
        <View style={styles.warningIcon}>
          <MaterialIcons name="warning" size={48} color="#bb0112" />
        </View>
        <Text style={styles.title}>DÜŞME TESPİT EDİLDİ!</Text>
        <Text style={styles.subtitle}>
          Ani bir düşme tespit edildi. Yardım çok yakında bildirilecek.
        </Text>
      </View>

      {/* Orta Kısım: Geri Sayım */}
      <View style={styles.timerContainer}>
        <View style={styles.circle}>
          <Text style={styles.timerText}>{timeLeft}</Text>
          <Text style={styles.secondsText}>SANİYE</Text>
        </View>
        <Text style={styles.timerLabel}>Süre dolduğunda yardım çağrılacak</Text>
      </View>

      {/* Alt Kısım: Butonlar */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.btnCancel} onPress={cancelAlarm}>
          <MaterialIcons name="check-circle" size={28} color="white" />
          <Text style={styles.btnCancelText}>İyiyim (İptal Et)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnEmergency} onPress={triggerEmergency}>
          <MaterialIcons name="sos" size={24} color="#bb0112" />
          <Text style={styles.btnEmergencyText}>HEMEN YARDIM GÖNDER</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Acil durum kişileri uyarılıyor...</Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bb0112',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  warningIcon: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 50,
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 85,
  },
  secondsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
  },
  timerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
    gap: 12,
    paddingBottom: 16,
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
    elevation: 5,
  },
  btnCancelText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  btnEmergency: {
    backgroundColor: '#ffdad6',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnEmergencyText: {
    color: '#bb0112',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footerText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
});
