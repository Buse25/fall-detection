import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = () => {
    // TODO: Burası backend kayıt rotasına bağlanacak.
    if (username.trim() !== '' && password.trim() !== '') {
      Alert.alert("Başarılı!", "Kayıt oluşturuldu. Lütfen giriş yapın.");
      router.back(); 
    } else {
      Alert.alert('Eksik Bilgi', 'Tüm alanları doldurmanız gerekmektedir.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yeni Hesap Oluştur</Text>

      <TextInput
        style={styles.input}
        placeholder="Belirlediğiniz Kullanıcı Adı"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifreniz"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Kayıt Ol</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#333', marginBottom: 30 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  backButton: { padding: 15, alignItems: 'center', marginTop: 10 },
  backButtonText: { color: '#666', fontWeight: 'bold', fontSize: 16 }
});