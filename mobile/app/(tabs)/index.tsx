import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (username.trim() !== '' && password.trim() !== '') {
      Alert.alert("Başarılı", `Hoş geldin, ${username}!`);
      
      router.replace({
        pathname: '/sensor',
        params: { userId: username } 
      });
    } else {
      Alert.alert('Hata', 'Lütfen kullanıcı adı ve şifrenizi girin.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Düşme Tespit Sistemi</Text>
      <Text style={styles.subtitle}>Lütfen Giriş Yapın</Text>

      <TextInput
        style={styles.input}
        placeholder="Kullanıcı Adı"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry 
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Giriş Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#0056b3', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#0056b3', textAlign: 'center', marginTop: 20, fontWeight: 'bold' }
});