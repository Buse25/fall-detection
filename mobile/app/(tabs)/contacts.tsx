import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { clearAuth } from '@/services/api';
import CatchMeIcon from '@/components/CatchMeIcon';

export default function ContactsScreen() {
  const router = useRouter();

  /**
   * Gerçek kişi listesi: backend'de kişi yönetimi API'si hazır olduğunda
   * bu state buraya fetch edilerek doldurulacak.
   * Şimdilik backend endpoint'i bulunmadığından boş başlatıldı.
   */
  const [contacts] = useState<{ id: string; name: string; role: string }[]>([]);

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

  const handleAddContact = () => {
    Alert.alert('Yakında', 'Kişi ekleme özelliği çok yakında kullanıma açılacak.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CatchMeIcon size={28} />
          <Text style={styles.headerTitle}>CatchMe</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialIcons name="logout" size={26} color="#bb0112" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Acil Durum Kişileri</Text>
          <Text style={styles.pageSub}>Alarm durumunda bilgilendirilecek kişiler.</Text>

          <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
            <MaterialIcons name="person-add" size={20} color="white" />
            <Text style={styles.addButtonText}>Yeni Kişi Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Sabit Acil Servisler Kartı */}
        <TouchableOpacity style={styles.emergencyCard}>
          <View style={styles.cardLeft}>
            <View style={styles.emergencyIconBg}>
              <MaterialIcons name="emergency" size={28} color="#bb0112" />
            </View>
            <View>
              <Text style={styles.emergencyCardTitle}>Acil Servis</Text>
              <Text style={styles.emergencyCardSub}>Evrensel 112 / 110</Text>
            </View>
          </View>
          <View style={styles.callButtonWhite}>
            <MaterialIcons name="call" size={24} color="#bb0112" />
          </View>
        </TouchableOpacity>

        {/* Kişi Listesi veya Boş Durum */}
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="person-off" size={48} color="#737785" />
            </View>
            <Text style={styles.emptyTitle}>Henüz kişi eklenmedi</Text>
            <Text style={styles.emptyDesc}>
              Düşme tespiti sırasında uyarılacak kişileri eklemek için yukarıdaki
              "Yeni Kişi Ekle" düğmesine basın.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddContact}>
              <MaterialIcons name="add-circle-outline" size={20} color="#0040a1" />
              <Text style={styles.emptyAddBtnText}>İlk Kişiyi Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          contacts.map(contact => (
            <View key={contact.id} style={[styles.contactCard, { borderLeftColor: '#0040a1' }]}>
              <View style={styles.cardLeft}>
                <View style={styles.iconBgBlue}>
                  <MaterialIcons name="person" size={28} color="#0040a1" />
                </View>
                <View>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRole}>{contact.role}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callBtnBlue}>
                <MaterialIcons name="call" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Bilgi Kutusu */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={24} color="#0056d2" style={{ marginTop: 2 }} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Otomatik Uyarı</Text>
            <Text style={styles.infoDesc}>
              Düşme tespit edildiğinde CatchMe, birisi cevap verene kadar
              listedeki kişileri sırayla arayacaktır.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddContact}>
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>
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
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
  },
  titleSection: { marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#191c1e' },
  pageSub: { fontSize: 16, color: '#424654', marginTop: 4, marginBottom: 16 },
  addButton: {
    backgroundColor: '#0040a1', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  emergencyCard: {
    backgroundColor: '#bb0112', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, elevation: 4,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergencyIconBg: { backgroundColor: 'white', padding: 10, borderRadius: 20 },
  emergencyCardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emergencyCardSub: { color: '#ffdad6', fontSize: 14 },
  callButtonWhite: { backgroundColor: 'white', padding: 12, borderRadius: 24 },
  contactCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, borderLeftWidth: 6, elevation: 1,
  },
  iconBgBlue: { backgroundColor: '#dae2ff', padding: 12, borderRadius: 24 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#191c1e' },
  contactRole: { fontSize: 14, color: '#424654' },
  callBtnBlue: { backgroundColor: '#0040a1', padding: 12, borderRadius: 20 },
  emptyState: {
    alignItems: 'center', paddingVertical: 40,
    backgroundColor: '#ffffff', borderRadius: 20,
    marginVertical: 8, elevation: 1,
  },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f2f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#191c1e', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, color: '#424654', textAlign: 'center',
    paddingHorizontal: 24, lineHeight: 22, marginBottom: 24,
  },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#0040a1', borderRadius: 24,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  emptyAddBtnText: { color: '#0040a1', fontSize: 15, fontWeight: '600' },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#f2f4f6', padding: 16,
    borderRadius: 12, marginTop: 16, borderStyle: 'dashed',
    borderWidth: 1, borderColor: '#c3c6d6',
  },
  infoTextContainer: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#191c1e' },
  infoDesc: { fontSize: 14, color: '#424654', marginTop: 4, lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    backgroundColor: '#0040a1', width: 60, height: 60,
    borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
});
