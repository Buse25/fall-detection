import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BASE_URL, authHeaders, clearAuth } from '@/services/api';
import CatchMeIcon from '@/components/CatchMeIcon';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: authHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.user);
        setName(data.user.name || '');
      } else if (response.status === 401) {
        Alert.alert('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın.', [
          { text: 'Giriş Yap', onPress: () => { clearAuth(); router.replace('/'); } },
        ]);
      } else {
        Alert.alert('Hata', data.message || 'Profil bilgileri yüklenemedi.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
      } else {
        Alert.alert('Hata', 'Profil yüklenirken bir sorun oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (name.trim() === '') {
      Alert.alert('Hata', 'Ad Soyad alanı boş bırakılamaz.');
      return;
    }

    setIsSaving(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactPhone: emergencyContactPhone.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Başarılı', 'Profiliniz güncellendi.');
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || '');
        }
      } else {
        Alert.alert(
          'Güncelleme Başarısız',
          data.message || 'Profil güncellenirken bir hata oluştu.',
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
      } else {
        Alert.alert('Hata', 'Güncelleme sırasında bir sorun oluştu.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: () => { clearAuth(); router.replace('/'); } },
      ],
    );
  };

  /* ---------- Yükleniyor Ekranı ---------- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <CatchMeIcon size={28} />
            <Text style={styles.headerTitle}>CatchMe</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0040a1" />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- Ana Ekran ---------- */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CatchMeIcon size={28} />
          <Text style={styles.headerTitle}>CatchMe</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialIcons name="logout" size={26} color="#bb0112" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar ve ad/soyad */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <MaterialIcons name="person" size={52} color="#0056d2" />
            </View>
            <Text style={styles.profileName}>{profile?.name || 'Kullanıcı'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
          </View>

          {/* ---- Kişisel Bilgiler ---- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad Soyad</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#424654" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Adınızı ve soyadınızı girin"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta</Text>
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <MaterialIcons name="email" size={20} color="#737785" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#737785' }]}
                  value={profile?.email || ''}
                  editable={false}
                  placeholder="E-posta"
                />
              </View>
              <Text style={styles.inputHint}>E-posta adresi değiştirilemez.</Text>
            </View>
          </View>

          {/* ---- Acil Durum Kişisi ---- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acil Durum Kişisi</Text>
            <Text style={styles.sectionSub}>
              Düşme tespitinde öncelikli olarak aranacak kişi
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kişi Adı Soyadı</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="contact-phone" size={20} color="#424654" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Ayşe Yılmaz"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon Numarası</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="phone" size={20} color="#424654" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Örn: +90 555 123 4567"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Kaydet Butonu */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialIcons name="save" size={24} color="white" />
                <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Bilgi notu */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color="#0056d2" />
            <Text style={styles.infoText}>
              Bilgileriniz güvenli şekilde sunucuda saklanır ve yalnızca düşme
              tespit sistemimiz tarafından kullanılır.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#eceef0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0040a1' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#424654' },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
  },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#dae2ff', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
  },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#191c1e' },
  profileEmail: { fontSize: 14, color: '#424654', marginTop: 4 },
  section: {
    backgroundColor: '#ffffff', borderRadius: 16,
    padding: 20, marginBottom: 16, elevation: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#191c1e', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#424654', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', color: '#191c1e', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7f9fb', borderWidth: 1, borderColor: '#c3c6d6',
    borderRadius: 8, height: 52,
  },
  inputDisabled: { backgroundColor: '#eceef0', borderColor: '#e0e3e5' },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, color: '#191c1e' },
  inputHint: { fontSize: 12, color: '#737785', marginTop: 4 },
  saveButton: {
    height: 64, backgroundColor: '#0040a1', borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, marginBottom: 20, elevation: 3,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#f2f4f6',
    padding: 16, borderRadius: 12, gap: 10, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: '#424654', lineHeight: 20 },
});
