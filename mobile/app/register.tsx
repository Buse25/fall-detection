import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profileType, setProfileType] = useState('elderly'); // Varsayılan Yaşlı
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleRegister = () => {
    if (username.trim() === '' || password.trim() === '') {
      Alert.alert('Hata', 'Tüm alanları doldurmanız gerekmektedir.');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Hata', 'Gizlilik politikasını kabul etmelisiniz.');
      return;
    }
    
    // BAŞARILI KAYIT
    Alert.alert("Başarılı!", `Kayıt oluşturuldu. Profil: ${profileType}`);
    router.back(); // Giriş ekranına dön
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#0040a1" />
        </TouchableOpacity>
        <Text style={styles.headerText}>SafeGuard</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subTitle}>Join Guardian IoT for 24/7 intelligent fall detection and medical oversight.</Text>

        {/* Profil Seçimi (Kritik Alan) */}
        <Text style={styles.sectionTitle}>Choose your Profile Type</Text>
        <Text style={styles.sectionSub}>This optimizes our fall detection algorithms based on your mobility patterns.</Text>

        <View style={styles.cardContainer}>
          {/* Elderly Card */}
          <TouchableOpacity 
            style={[styles.profileCard, profileType === 'elderly' && styles.profileCardActive]}
            onPress={() => setProfileType('elderly')}
          >
            {profileType === 'elderly' && <MaterialIcons name="check-circle" size={24} color="#0040a1" style={styles.checkIcon} />}
            <View style={styles.iconCircle}>
              <MaterialIcons name="elderly" size={32} color="#0056d2" />
            </View>
            <Text style={styles.cardTitle}>Elderly User</Text>
            <Text style={styles.cardDesc}>High-sensitivity detection for fragile balance.</Text>
          </TouchableOpacity>

          {/* Active Card */}
          <TouchableOpacity 
            style={[styles.profileCard, profileType === 'active' && styles.profileCardActive]}
            onPress={() => setProfileType('active')}
          >
            {profileType === 'active' && <MaterialIcons name="check-circle" size={24} color="#0040a1" style={styles.checkIcon} />}
            <View style={styles.iconCircle}>
              <MaterialIcons name="directions-run" size={32} color="#0056d2" />
            </View>
            <Text style={styles.cardTitle}>Young/Active</Text>
            <Text style={styles.cardDesc}>Balanced detection for high-impact activities.</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={20} color="#424654" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#424654" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
              <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#424654" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Checkbox & Buton */}
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setTermsAccepted(!termsAccepted)}>
          <MaterialIcons name={termsAccepted ? "check-box" : "check-box-outline-blank"} size={24} color="#0040a1" />
          <Text style={styles.checkboxText}>I agree to the Privacy Policy and understand data collection.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Sign Up</Text>
          <MaterialIcons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
          <Text style={styles.loginLinkText}>Already have an account? <Text style={{fontWeight: 'bold'}}>Log In</Text></Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#ffffff', gap: 10, borderBottomWidth: 1, borderBottomColor: '#eceef0' },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#0040a1' },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0040a1', marginBottom: 8 },
  subTitle: { fontSize: 16, color: '#424654', marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#191c1e', marginBottom: 4 },
  sectionSub: { fontSize: 14, color: '#424654', marginBottom: 16 },
  cardContainer: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  profileCard: { flex: 1, backgroundColor: '#f2f4f6', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  profileCardActive: { borderColor: '#0040a1', backgroundColor: '#ffffff', elevation: 2 },
  checkIcon: { position: 'absolute', top: 8, right: 8 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dae2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0040a1', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#424654', textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#191c1e', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c3c6d6', borderRadius: 8, height: 56 },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16, color: '#191c1e' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, paddingRight: 20 },
  checkboxText: { fontSize: 14, color: '#424654', flexShrink: 1 },
  registerButton: { height: 64, backgroundColor: '#0040a1', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  registerButtonText: { color: 'white', fontSize: 20, fontWeight: '600' },
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginLinkText: { color: '#424654', fontSize: 16 }
});