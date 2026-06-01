import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 

export default function ContactsScreen() {
  const router = useRouter(); 

  // Çıkış yapma fonksiyonumuz
  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { text: "Evet", onPress: () => router.replace('/') } // Kök dizine (Giriş) fırlatır
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bar (Header) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="health-and-safety" size={28} color="#0040a1" />
          <Text style={styles.headerTitle}>SafeGuard</Text>
        </View>
        
        {/* Çıkış Butonu Burası */}
        <TouchableOpacity onPress={handleLogout}>
          <MaterialIcons name="logout" size={26} color="#bb0112" />
        </TouchableOpacity>
      </View>

      {/* Kaydırılabilir İçerik */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Başlık ve Yeni Ekle Butonu */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Emergency Contacts</Text>
          <Text style={styles.pageSub}>Trusted individuals notified during alerts.</Text>
          
          <TouchableOpacity style={styles.addButton}>
            <MaterialIcons name="person-add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add New Contact</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Acil Servisler (Kırmızı Kart) */}
        <TouchableOpacity style={styles.emergencyCard}>
          <View style={styles.cardLeft}>
            <View style={styles.emergencyIconBg}>
              <MaterialIcons name="emergency" size={28} color="#bb0112" />
            </View>
            <View>
              <Text style={styles.emergencyCardTitle}>Emergency Services</Text>
              <Text style={styles.emergencyCardSub}>Universal 911 / 112</Text>
            </View>
          </View>
          <View style={styles.callButtonWhite}>
            <MaterialIcons name="call" size={24} color="#bb0112" />
          </View>
        </TouchableOpacity>

        {/* 2. Anne (Birincil Kişi) */}
        <View style={[styles.contactCard, { borderLeftColor: '#0040a1' }]}>
          <View style={styles.cardLeft}>
            <View style={styles.iconBgBlue}>
              <MaterialIcons name="female" size={28} color="#0040a1" />
            </View>
            <View>
              <Text style={styles.contactName}>Mom</Text>
              <Text style={styles.contactRole}>Primary Caregiver</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.messageBtn}>
              <MaterialIcons name="chat" size={20} color="#0040a1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callBtnBlue}>
              <MaterialIcons name="call" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Doktor */}
        <View style={[styles.contactCard, { borderLeftColor: '#0056d2' }]}>
          <View style={styles.cardLeft}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="local-hospital" size={28} color="#0056d2" />
            </View>
            <View>
              <Text style={styles.contactName}>Dr. Smith</Text>
              <Text style={styles.contactRole}>Primary Physician</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtnBlue}>
            <MaterialIcons name="call" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* 4. Komşu */}
        <View style={[styles.contactCard, { borderLeftColor: '#c3c6d6' }]}>
          <View style={styles.cardLeft}>
            <View style={styles.iconBgGray}>
              <MaterialIcons name="person" size={28} color="#424654" />
            </View>
            <View>
              <Text style={styles.contactName}>John Doe</Text>
              <Text style={styles.contactRole}>Neighbor</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtnBlue}>
            <MaterialIcons name="call" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bilgi Kutusu */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={24} color="#0056d2" style={{ marginTop: 2 }} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Automatic Alerting</Text>
            <Text style={styles.infoDesc}>In the event of a detected fall, Guardian IoT will call these contacts in order until someone answers.</Text>
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button (Artı Butonu) */}
      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#eceef0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0040a1' },
  scrollContent: { padding: 20, paddingBottom: 100 }, 
  titleSection: { marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#191c1e' },
  pageSub: { fontSize: 16, color: '#424654', marginTop: 4, marginBottom: 16 },
  addButton: { backgroundColor: '#4267b2', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  emergencyCard: { backgroundColor: '#bb0112', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, elevation: 4 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergencyIconBg: { backgroundColor: 'white', padding: 10, borderRadius: 20 },
  emergencyCardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emergencyCardSub: { color: '#ffdad6', fontSize: 14 },
  callButtonWhite: { backgroundColor: 'white', padding: 12, borderRadius: 24 },
  contactCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderLeftWidth: 6, elevation: 1 },
  iconBgBlue: { backgroundColor: '#dae2ff', padding: 12, borderRadius: 24 },
  iconBgGray: { backgroundColor: '#e0e3e5', padding: 12, borderRadius: 24 },
  avatarContainer: { backgroundColor: '#e6e8ea', padding: 12, borderRadius: 24 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#191c1e' },
  contactRole: { fontSize: 14, color: '#424654' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  messageBtn: { backgroundColor: '#f2f4f6', padding: 12, borderRadius: 20 },
  callBtnBlue: { backgroundColor: '#0040a1', padding: 12, borderRadius: 20 },
  infoBox: { flexDirection: 'row', backgroundColor: '#f2f4f6', padding: 16, borderRadius: 12, marginTop: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#c3c6d6' },
  infoTextContainer: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#191c1e' },
  infoDesc: { fontSize: 14, color: '#424654', marginTop: 4, lineHeight: 20 },
  fab: { position: 'absolute', bottom: 80, right: 20, backgroundColor: '#0040a1', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6 }
});