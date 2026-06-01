import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BASE_URL } from '@/services/api';
import CatchMeIcon from '@/components/CatchMeIcon';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileType, setProfileType] = useState('elderly');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (name.trim() === '' || email.trim() === '' || password.trim() === '') {
      Alert.alert('Hata', 'Tüm alanları doldurmanız gerekmektedir.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Hata', 'Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Hata', 'Gizlilik politikasını kabul etmelisiniz.');
      return;
    }

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          profileType,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Başarılı!',
          'Hesabınız oluşturuldu. Giriş yapabilirsiniz.',
          [{ text: 'Giriş Yap', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Kayıt Başarısız', data.message || 'Kayıt sırasında bir hata oluştu.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
      } else {
        Alert.alert('Hata', 'Bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color="#0040a1" />
          </TouchableOpacity>
          <CatchMeIcon size={28} />
          <Text style={styles.headerText}>CatchMe</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Hesabınızı Oluşturun</Text>
          <Text style={styles.subTitle}>
            7/24 akıllı düşme tespiti ve tıbbi gözetim için CatchMe'ye katılın.
          </Text>

          {/* Profil Tipi Seçimi */}
          <Text style={styles.sectionTitle}>Profil Tipinizi Seçin</Text>
          <Text style={styles.sectionSub}>
            Bu seçim, hareketlilik kalıplarınıza göre düşme tespit algoritmalarını optimize eder.
          </Text>

          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={[styles.profileCard, profileType === 'elderly' && styles.profileCardActive]}
              onPress={() => setProfileType('elderly')}
            >
              {profileType === 'elderly' && (
                <MaterialIcons name="check-circle" size={24} color="#0040a1" style={styles.checkIcon} />
              )}
              <View style={styles.iconCircle}>
                <MaterialIcons name="elderly" size={32} color="#0056d2" />
              </View>
              <Text style={styles.cardTitle}>Yaşlı Kullanıcı</Text>
              <Text style={styles.cardDesc}>Kırılgan denge için yüksek hassasiyetli tespit.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.profileCard, profileType === 'active' && styles.profileCardActive]}
              onPress={() => setProfileType('active')}
            >
              {profileType === 'active' && (
                <MaterialIcons name="check-circle" size={24} color="#0040a1" style={styles.checkIcon} />
              )}
              <View style={styles.iconCircle}>
                <MaterialIcons name="directions-run" size={32} color="#0056d2" />
              </View>
              <Text style={styles.cardTitle}>Genç/Aktif</Text>
              <Text style={styles.cardDesc}>Yüksek etkili aktiviteler için dengeli tespit.</Text>
            </TouchableOpacity>
          </View>

          {/* Ad Soyad */}
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

          {/* E-posta */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-posta</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#424654" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta adresinizi girin"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Şifre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şifre</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#424654" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="En az 8 karakter"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#424654"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <MaterialIcons
              name={termsAccepted ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color="#0040a1"
            />
            <Text style={styles.checkboxText}>
              Gizlilik Politikasını kabul ediyor ve veri toplamanın farkında olduğumu beyan ediyorum.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Kayıt Ol</Text>
                <MaterialIcons name="arrow-forward" size={24} color="white" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
            <Text style={styles.loginLinkText}>
              Zaten hesabınız var mı?{' '}
              <Text style={{ fontWeight: 'bold' }}>Giriş Yapın</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 50, backgroundColor: '#ffffff',
    gap: 10, borderBottomWidth: 1, borderBottomColor: '#eceef0',
  },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#0040a1' },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0040a1', marginBottom: 8 },
  subTitle: { fontSize: 16, color: '#424654', marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#191c1e', marginBottom: 4 },
  sectionSub: { fontSize: 14, color: '#424654', marginBottom: 16 },
  cardContainer: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  profileCard: {
    flex: 1, backgroundColor: '#f2f4f6', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  profileCardActive: { borderColor: '#0040a1', backgroundColor: '#ffffff', elevation: 2 },
  checkIcon: { position: 'absolute', top: 8, right: 8 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#dae2ff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0040a1', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#424654', textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#191c1e', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c3c6d6',
    borderRadius: 8, height: 56,
  },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16, color: '#191c1e' },
  checkboxContainer: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 24, paddingRight: 20,
  },
  checkboxText: { fontSize: 14, color: '#424654', flexShrink: 1 },
  registerButton: {
    height: 64, backgroundColor: '#0040a1', borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  registerButtonText: { color: 'white', fontSize: 20, fontWeight: '600' },
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginLinkText: { color: '#424654', fontSize: 16 },
});
