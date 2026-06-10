import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, TextInput, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { clearAuth, BASE_URL, authHeaders } from '@/services/api';
import CatchMeIcon from '@/components/CatchMeIcon';

interface Contact {
  name: string;
  phone: string;
  _id?: string;
}

export default function ContactsScreen() {
  const router = useRouter();

  // Fetched data
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Modal form state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: authHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.user?.emergencyContacts && Array.isArray(data.user.emergencyContacts)) {
          setContacts(data.user.emergencyContacts);
        } else {
          // Geriye dönük uyumluluk (Fallback)
          if (data.user?.emergencyContactName || data.user?.emergencyContactPhone) {
            setContacts([{
              name: data.user.emergencyContactName || '',
              phone: data.user.emergencyContactPhone || ''
            }]);
          } else {
            setContacts([]);
          }
        }
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
    setFormName('');
    setFormPhone('');
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const handleSaveContact = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      Alert.alert('Uyarı', 'Lütfen isim ve telefon numarası girin.');
      return;
    }

    const newContact = { name: formName.trim(), phone: formPhone.trim() };
    const updatedContacts = [...contacts, newContact];

    setIsSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          emergencyContacts: updatedContacts,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Başarılı', 'Acil durum kişisi eklendi.');
        if (data.user?.emergencyContacts) {
          setContacts(data.user.emergencyContacts);
        } else {
          setContacts(updatedContacts);
        }
        setIsModalVisible(false);
      } else {
        Alert.alert('Hata', data.message || 'Kişi eklenemedi.');
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Kayıt sırasında bir sorun oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = (indexToRemove: number) => {
    Alert.alert('Kişiyi Sil', 'Bu acil durum kişisini silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const updatedContacts = contacts.filter((_, index) => index !== indexToRemove);
          setIsSaving(true);
          try {
            const response = await fetch(`${BASE_URL}/api/auth/me`, {
              method: 'PATCH',
              headers: authHeaders(),
              body: JSON.stringify({
                emergencyContacts: updatedContacts,
              }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
              if (data.user?.emergencyContacts) {
                setContacts(data.user.emergencyContacts);
              } else {
                setContacts(updatedContacts);
              }
            } else {
              Alert.alert('Hata', data.message || 'Kişi silinemedi.');
            }
          } catch (error) {
            Alert.alert('Bağlantı Hatası', 'Silme işlemi başarısız oldu.');
          } finally {
            setIsSaving(false);
          }
        }
      }
    ]);
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
        {/* Başlık ve Ekle Butonu */}
        <View style={styles.titleSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Acil Durum Kişileri</Text>
            <Text style={styles.pageSub}>Alarm durumunda aranacak listesi.</Text>
          </View>
          <TouchableOpacity style={styles.addIconBtn} onPress={handleOpenModal}>
            <MaterialIcons name="person-add" size={24} color="#0040a1" />
          </TouchableOpacity>
        </View>

        {/* Kişi Listesi / Boş Durum */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0040a1" style={{ marginTop: 40, marginBottom: 40 }} />
        ) : contacts.length > 0 ? (
          <View style={styles.listContainer}>
            {contacts.map((contact, index) => (
              <View key={contact._id || index.toString()} style={[styles.contactCard, { borderLeftColor: '#0040a1' }]}>
                <View style={styles.contactCardLeft}>
                  <View style={styles.iconBgBlue}>
                    <MaterialIcons name="person" size={28} color="#0040a1" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.contactRole} numberOfLines={1}>{contact.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteContact(index)}>
                  <MaterialIcons name="delete-outline" size={24} color="#bb0112" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity style={styles.addFullBtn} onPress={handleOpenModal}>
              <MaterialIcons name="add" size={24} color="#0040a1" />
              <Text style={styles.addFullBtnText}>Yeni Kişi Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="group-off" size={48} color="#737785" />
            </View>
            <Text style={styles.emptyTitle}>Henüz kimse eklenmedi</Text>
            <Text style={styles.emptyDesc}>
              Düşme tespiti sırasında uyarılacak kişileri listeye ekleyebilirsiniz.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenModal}>
              <MaterialIcons name="add-circle-outline" size={20} color="#0040a1" />
              <Text style={styles.emptyAddBtnText}>İlk Kişiyi Ekle</Text>
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
              Düşme tespit edildiğinde, sistem listedeki kişileri sırasıyla bilgilendirmeye çalışacaktır.
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
            <Text style={styles.modalTitle}>Yeni Kişi Ekle</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Ahmet Yılmaz"
                value={formName}
                onChangeText={setFormName}
                placeholderTextColor="#737785"
                autoCapitalize="words"
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
                onPress={handleSaveContact}
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

      {/* Global Yükleme Katmanı (Silme vs işlemleri için) */}
      {isSaving && !isModalVisible && (
        <View style={styles.globalLoading}>
          <View style={styles.globalLoadingBox}>
            <ActivityIndicator size="large" color="#0040a1" />
            <Text style={{ marginTop: 12, color: '#191c1e', fontWeight: '600' }}>İşleniyor...</Text>
          </View>
        </View>
      )}
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
  titleSection: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 24 
  },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#191c1e' },
  pageSub: { fontSize: 16, color: '#424654', marginTop: 4 },
  addIconBtn: {
    backgroundColor: '#dae2ff', padding: 12, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },

  listContainer: { marginBottom: 24 },
  contactCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, borderLeftWidth: 6, elevation: 1,
  },
  contactCardLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12,
  },
  contactInfo: { flex: 1 },
  iconBgBlue: { backgroundColor: '#dae2ff', padding: 12, borderRadius: 24, marginRight: 12 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#191c1e' },
  contactRole: { fontSize: 14, color: '#424654', marginTop: 2 },
  deleteBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  addFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#c3c6d6',
    borderRadius: 16, marginTop: 8, gap: 8, backgroundColor: '#f7f9fb',
  },
  addFullBtnText: { fontSize: 16, fontWeight: '600', color: '#0040a1' },

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
  
  globalLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  globalLoadingBox: {
    backgroundColor: 'white', padding: 24, borderRadius: 16,
    alignItems: 'center', elevation: 10,
  }
});
