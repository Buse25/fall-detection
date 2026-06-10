import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BASE_URL, setAuth } from '@/services/api';
import { disconnectSocket, connectSocket } from '@/services/socket';
import CatchMeIcon from '@/components/CatchMeIcon';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok && data.success) {
        setAuth(data.token, data.user.id, data.user.name);
        
        // Refresh socket connection with new token
        disconnectSocket();
        connectSocket();

        router.replace({
          pathname: '/(tabs)/home',
          params: { userId: data.user.id, userName: data.user.name },
        });
      } else {
        Alert.alert('Giriş Başarısız', data.message || 'Geçersiz e-posta veya şifre.');
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
      {/* Üst Logo Kısmı */}
      <View style={styles.header}>
        <CatchMeIcon size={32} />
        <Text style={styles.headerText}>CatchMe</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Yuvarlak İkon ve Başlık */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="lock" size={48} color="#0056d2" />
          </View>
          <Text style={styles.welcomeText}>Tekrar Hoş Geldiniz</Text>
          <Text style={styles.subText}>Güvenlik ağınızı izlemek için giriş yapın</Text>
        </View>

        {/* Form Alanı */}
        <View style={styles.formContainer}>
          {/* E-posta */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="email" size={20} color="#191c1e" />
              <Text style={styles.label}>E-posta</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="E-posta adresinizi girin"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#737785"
            />
          </View>

          {/* Şifre */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="vpn-key" size={20} color="#191c1e" />
              <Text style={styles.label}>Şifre</Text>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#737785"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={24} color="#424654" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Giriş Butonu */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
                <MaterialIcons name="login" size={24} color="white" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
          </TouchableOpacity>
        </View>

        {/* Kayıt Ol Yönlendirmesi */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CatchMe'de yeni misiniz?</Text>
          <TouchableOpacity style={styles.createAccountBtn} onPress={() => router.push('/register')}>
            <Text style={styles.createAccountBtnText}>Hesap Oluştur</Text>
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
    padding: 20, paddingTop: 50, backgroundColor: '#ffffff', gap: 10,
  },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#0040a1' },
  scrollContent: {
    flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center',
    paddingBottom: 32,
  },
  heroSection: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#dae2ff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  welcomeText: { fontSize: 28, fontWeight: '700', color: '#191c1e', marginBottom: 8 },
  subText: { fontSize: 16, color: '#424654', textAlign: 'center' },
  formContainer: {
    width: '100%', backgroundColor: '#ffffff', padding: 24, borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
  },
  inputGroup: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#191c1e' },
  input: {
    height: 56, backgroundColor: '#f7f9fb', borderWidth: 1, borderColor: '#c3c6d6',
    borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#191c1e',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7f9fb', borderWidth: 1, borderColor: '#c3c6d6', borderRadius: 8,
  },
  passwordInput: { flex: 1, height: 56, paddingHorizontal: 16, fontSize: 16, color: '#191c1e' },
  eyeIcon: { padding: 16 },
  loginButton: {
    height: 64, backgroundColor: '#0040a1', borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: 'white', fontSize: 20, fontWeight: '600' },
  forgotPassword: { marginTop: 16, alignItems: 'center' },
  forgotPasswordText: { color: '#0040a1', fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 40, alignItems: 'center', gap: 16 },
  footerText: { color: '#424654', fontSize: 16 },
  createAccountBtn: {
    height: 56, paddingHorizontal: 32, borderWidth: 2, borderColor: '#0040a1',
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
  },
  createAccountBtnText: { color: '#0040a1', fontSize: 16, fontWeight: '600' },
});
