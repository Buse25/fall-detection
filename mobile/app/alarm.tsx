import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { BASE_URL, authHeaders } from '@/services/api';
import { emitFallCancel, emitInactivityCancel, onEmergencyAlert } from '@/services/socket';

// ────────────────────────────────────────────────────────────────────────────
// Alarm tiplerine göre içerik tablosu
// ────────────────────────────────────────────────────────────────────────────
const CONTENT = {
  fall: {
    icon: 'warning' as const,
    title: 'DÜŞME TESPİT EDİLDİ!',
    subtitle: 'Ani bir düşme tespit edildi. Yardım çok yakında bildirilecek.',
    cancelLabel: 'İyiyim (İptal Et)',
    footerText: 'Acil durum kişileri uyarılıyor...',
  },
  inactivity: {
    icon: 'person-off' as const,
    title: 'HAREKETSİZLİK TESPİT EDİLDİ!',
    subtitle: 'Uzun süredir hareket algılanmadı. İyi misiniz?',
    cancelLabel: 'İyiyim, Ben Buradayım',
    footerText: 'Yanıt vermezseniz acil durum kişileriniz uyarılacak...',
  },
} as const;

type AlarmType = keyof typeof CONTENT;

export default function AlarmScreen() {
  const router = useRouter();
  const {
    alarmType: alarmTypeParam,
    alarmId,
    fallScore,
    countdownSec,
  } = useLocalSearchParams<{
    alarmType?: string;
    alarmId?: string;
    fallScore?: string;
    countdownSec?: string;
  }>();

  const alarmType: AlarmType =
    alarmTypeParam === 'inactivity' ? 'inactivity' : 'fall';

  const initialSec = countdownSec ? parseInt(countdownSec, 10) : 10;
  const [timeLeft, setTimeLeft] = useState(initialSec > 0 ? initialSec : 10);

  // confirmed: inactivity PRE_ALARM → CONFIRMED geçişi (in-place UI değişimi)
  const [confirmed, setConfirmed] = useState(initialSec === 0 && alarmType === 'inactivity');

  const content = CONTENT[alarmType];

  // ── Geri sayım ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (confirmed) return; // CONFIRMED modunda sayaç çalışmaz

    Vibration.vibrate([500, 500, 500]);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (alarmType === 'fall') {
            triggerEmergency();
          }
          // inactivity: backend PRE_ALARM_TIMEOUT'u yönetir; yerel olarak sadece dur
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [confirmed]);

  // ── inactivity CONFIRMED: emergency_alert gelirse in-place geçiş ────────
  useEffect(() => {
    if (alarmType !== 'inactivity') return;

    const unsub = onEmergencyAlert((payload) => {
      if (payload.type === 'inactivity') {
        setConfirmed(true);
        Vibration.vibrate([500, 200, 500, 200, 500]);
      }
    });
    return unsub;
  }, [alarmType]);

  // ── "İyiyim" — fall tipi: REST API + socket emit ────────────────────────
  const cancelFallAlarm = async () => {
    Vibration.cancel();

    if (alarmId) {
      try {
        const response = await fetch(`${BASE_URL}/api/alarms/${alarmId}/resolve`, {
          method: 'PATCH',
          headers: authHeaders(),
        });
        if (!response.ok) throw new Error('API isteği başarısız');
      } catch (err) {
        console.error('Alarm iptal edilemedi:', err);
        Alert.alert('Bağlantı Hatası', 'İptal işlemi başarısız oldu. Lütfen tekrar deneyin.');
        return;
      }
    }
    // Backend'i bilgilendir (panel odası güncellemesi için)
    emitFallCancel(alarmId);
    // router.replace: replace önceki push/replace durumuna bakmaksızın çalışır.
    // router.back() kullanmıyoruz çünkü _layout'taki router.replace('/alarm')
    // stack geçmişini sildiğinden GO_BACK hatası verir.
    router.replace('/(tabs)/home');
  };

  // ── "İyiyim, Ben Buradayım" — inactivity tipi: socket emit ─────────────
  const cancelInactivityAlarm = useCallback(() => {
    Vibration.cancel();
    emitInactivityCancel();
    router.replace('/(tabs)/home');
  }, []);

  const handleCancel = alarmType === 'inactivity' ? cancelInactivityAlarm : cancelFallAlarm;

  const triggerEmergency = () => {
    Vibration.cancel();
    Alert.alert(
      'Acil Durum Tetiklendi!',
      'Kişilere haber veriliyor...',
      [{ text: 'Tamam', onPress: () => router.replace('/(tabs)/home') }],
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // CONFIRMED modu (inactivity alarm kesinleşti)
  // ────────────────────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerContainer}>
          <View style={styles.warningIcon}>
            <MaterialIcons name="emergency" size={48} color="#bb0112" />
          </View>
          <Text style={styles.title}>ACİL DURUM!</Text>
          <Text style={styles.subtitle}>
            Yanıt alınamadı. Acil durum kişileri bilgilendiriliyor.
          </Text>
        </View>
        <View style={styles.timerContainer}>
          <View style={styles.circle}>
            <MaterialIcons name="sos" size={80} color="white" />
          </View>
        </View>
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.btnEmergency} onPress={triggerEmergency}>
            <MaterialIcons name="sos" size={24} color="#bb0112" />
            <Text style={styles.btnEmergencyText}>HEMEN YARDIM GÖNDER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnCancel, { marginTop: 8 }]}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <MaterialIcons name="home" size={24} color="white" />
            <Text style={styles.btnCancelText}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>Acil durum kişileri uyarılıyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // Normal alarm modu (fall veya inactivity PRE_ALARM)
  // ────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* Üst Kısım */}
      <View style={styles.headerContainer}>
        <View style={styles.warningIcon}>
          <MaterialIcons name={content.icon} size={48} color="#bb0112" />
        </View>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>
      </View>

      {/* Geri Sayım */}
      <View style={styles.timerContainer}>
        <View style={styles.circle}>
          <Text style={styles.timerText}>{timeLeft}</Text>
          <Text style={styles.secondsText}>SANİYE</Text>
        </View>
        <Text style={styles.timerLabel}>Süre dolduğunda yardım çağrılacak</Text>
      </View>

      {/* Butonlar */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.btnCancel} onPress={handleCancel}>
          <MaterialIcons name="check-circle" size={28} color="white" />
          <Text style={styles.btnCancelText}>{content.cancelLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnEmergency} onPress={triggerEmergency}>
          <MaterialIcons name="sos" size={24} color="#bb0112" />
          <Text style={styles.btnEmergencyText}>HEMEN YARDIM GÖNDER</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>{content.footerText}</Text>
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
