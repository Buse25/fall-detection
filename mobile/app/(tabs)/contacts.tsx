import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, TextInput, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { clearAuth, BASE_URL, authHeaders } from '@/services/api';
import CatchMeIcon from '@/components/CatchMeIcon';

export default function ContactsScreen() {
  const router = useRouter();

  // Fetched data
  const [savedName, setSavedName] = useState('');
  const [savedPhone, setSavedPhone] = useState('');

  // Modal form state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchContact();
  }, []);

  const fetchContact = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: authHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSavedName(data.user?.emergencyContactName || '');
        setSavedPhone(data.user?.emergencyContactPhone || '');
      } else {
        Alert.alert('Hata', 'Kişi bilgileri alınamadı.');
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormName(savedName);
    setFormPhone(savedPhone);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      Alert.alert('Uyarı', 'Lütfen isim ve telefon numarası girin.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          emergencyContactName: formName,
          emergencyContactPhone: formPhone,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Başarılı', 'Acil durum kişisi başarıyla güncellendi.');
        setSavedName(formName);
        setSavedPhone(formPhone);
        setIsModalVisible(false);
      } else {
        Alert.alert('Hata', data.message || 'Kişi güncellenemedi.');
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Kayıt sırasında bir sorun oluştu.');
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

  const hasContact = savedName.trim() !== '' || savedPhone.trim() !== '';

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
          <Text style={styles.pageTitle}>Acil Durum Kişisi</Text>
          <Text style={styles.pageSub}>Alarm durumunda aranacak kişiyi belirleyin.</Text>
        </View>

        {/* Kişi Kartı / Boş Durum */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0040a1" style={{ marginTop: 40 }} />
        ) : hasContact ? (
          <View style={[styles.contactCard, { borderLeftColor: '#0040a1' }]}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBgBlue}>
                <MaterialIcons name="person" size={28} color="#0040a1" />
              </View>
              <View>
                <Text style={styles.contactName}>{savedName}</Text>
                <Text style={styles.contactRole}>{savedPhone}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={handleOpenModal}>
              <MaterialIcons name="edit" size={20} color="#0040a1" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="person-off" size={48} color="#737785" />
            </View>
            <Text style={styles.emptyTitle}>Henüz acil kişi eklenmedi</Text>
            <Text style={styles.emptyDesc}>
              Düşme tespiti sırasında uyarılacak kişiyi eklemek için düğmeye basın.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenModal}>
              <MaterialIcons name="add-circle-outline" size={20} color="#0040a1" />
              <Text style={styles.emptyAddBtnText}>Kişi Ekle</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Bilgi Kutusu */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={24} color="#0056d2" style={{ marginTop: 2 }} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Otomatik Uyarı</Text>
            <Text style={styles.infoDesc}>
              Düşme tespit edildiğinde, ilk olarak burada tanımladığınız kişi aranacaktır.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Düzenleme Modalı */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{hasContact ? 'Kişiyi Düzenle' : 'Kişi Ekle'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Ahmet Yılmaz"
                value={formName}
                onChangeText={setFormName}
                placeholderTextColor="#737785"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon Numarası</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 0555 123 4567"
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#737785"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCloseModal}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelBtnText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalSaveBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  contactCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, borderLeftWidth: 6, elevation: 1,
  },
  iconBgBlue: { backgroundColor: '#dae2ff', padding: 12, borderRadius: 24 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#191c1e' },
  contactRole: { fontSize: 14, color: '#424654' },
  editBtn: { backgroundColor: '#f2f4f6', padding: 12, borderRadius: 20 },

  emptyState: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: '#ffffff', borderRadius: 20,
    marginVertical: 8, elevation: 1, marginBottom: 24,
  },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#f2f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#191c1e', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, color: '#424654', textAlign: 'center',
    paddingHorizontal: 24, lineHeight: 22, marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#0040a1', borderRadius: 24,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  emptyAddBtnText: { color: '#0040a1', fontSize: 15, fontWeight: '600' },

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

  infoBox: {
    flexDirection: 'row', backgroundColor: '#f2f4f6', padding: 16,
    borderRadius: 12, borderStyle: 'dashed',
    borderWidth: 1, borderColor: '#c3c6d6',
  },
  infoTextContainer: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#191c1e' },
  infoDesc: { fontSize: 14, color: '#424654', marginTop: 4, lineHeight: 20 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContent: {
    width: '100%', backgroundColor: 'white', borderRadius: 20,
    padding: 24, elevation: 10,
  },
  modalTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#191c1e', marginBottom: 20,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#191c1e', marginBottom: 8 },
  input: {
    height: 56, backgroundColor: '#f7f9fb', borderWidth: 1, borderColor: '#c3c6d6',
    borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#191c1e',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16,
  },
  modalCancelBtn: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
  },
  modalCancelBtnText: { color: '#424654', fontSize: 16, fontWeight: 'bold' },
  modalSaveBtn: {
    backgroundColor: '#0040a1', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 100,
  },
  modalSaveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
