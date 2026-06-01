import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (username.trim() !== '' && password.trim() !== '') {
      // Başarılı girişte sensör ekranına yönlendir ve ID'yi taşı
      router.replace({
        pathname: '/(tabs)/home',
        params: { userId: username }
      });
    } else {
      Alert.alert('Hata', 'Lütfen kullanıcı adı ve şifrenizi girin.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      
      {/* Üst Logo Kısmı */}
      <View style={styles.header}>
        <MaterialIcons name="health-and-safety" size={32} color="#0040a1" />
        <Text style={styles.headerText}>SafeGuard</Text>
      </View>

      <View style={styles.content}>
        {/* Yuvarlak İkon ve Başlık */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="lock" size={48} color="#0056d2" />
          </View>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subText}>Sign in to monitor your safety network</Text>
        </View>

        {/* Form Alanı */}
        <View style={styles.formContainer}>
          
          {/* Kullanıcı Adı */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="person" size={20} color="#191c1e" />
              <Text style={styles.label}>Username</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="#737785"
            />
          </View>

          {/* Şifre */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="vpn-key" size={20} color="#191c1e" />
              <Text style={styles.label}>Password</Text>
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
                <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={24} color="#424654" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Giriş Butonu */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
            <MaterialIcons name="login" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Kayıt Ol Yönlendirmesi */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to SafeGuard?</Text>
          <TouchableOpacity style={styles.createAccountBtn} onPress={() => router.push('/register')}>
            <Text style={styles.createAccountBtnText}>Create an Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#ffffff', gap: 10 },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#0040a1' },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  heroSection: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#dae2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  welcomeText: { fontSize: 28, fontWeight: '700', color: '#191c1e', marginBottom: 8 },
  subText: { fontSize: 16, color: '#424654' },
  formContainer: { width: '100%', backgroundColor: '#ffffff', padding: 24, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  inputGroup: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#191c1e' },
  input: { height: 56, backgroundColor: '#f7f9fb', borderWidth: 1, borderColor: '#c3c6d6', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#191c1e' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f9fb', borderWidth: 1, borderColor: '#c3c6d6', borderRadius: 8 },
  passwordInput: { flex: 1, height: 56, paddingHorizontal: 16, fontSize: 16, color: '#191c1e' },
  eyeIcon: { padding: 16 },
  loginButton: { height: 64, backgroundColor: '#0040a1', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
  loginButtonText: { color: 'white', fontSize: 20, fontWeight: '600' },
  forgotPassword: { marginTop: 16, alignItems: 'center' },
  forgotPasswordText: { color: '#0040a1', fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 40, alignItems: 'center', gap: 16 },
  footerText: { color: '#424654', fontSize: 16 },
  createAccountBtn: { height: 56, paddingHorizontal: 32, borderWidth: 2, borderColor: '#0040a1', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  createAccountBtnText: { color: '#0040a1', fontSize: 16, fontWeight: '600' }
});