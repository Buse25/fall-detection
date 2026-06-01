import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer, Gyroscope } from 'expo-sensors';

const PERMISSIONS_KEY = '@catchme/permissions_granted';

export type PermissionResult = {
  granted: boolean;
  accelerometerAvailable: boolean;
  gyroscopeAvailable: boolean;
};

/** Sensörlerin cihazda mevcut olup olmadığını kontrol eder. */
export async function checkSensorAvailability(): Promise<{
  accelerometerAvailable: boolean;
  gyroscopeAvailable: boolean;
}> {
  const [accelerometerAvailable, gyroscopeAvailable] = await Promise.all([
    Accelerometer.isAvailableAsync(),
    Gyroscope.isAvailableAsync(),
  ]);
  return { accelerometerAvailable, gyroscopeAvailable };
}

/**
 * Uygulama ilk açılışında sensör ve arka plan izleme onayı ister.
 * Expo Go sınırları içinde: hareket sensörleri için ayrı OS izni gerekmez;
 * kullanıcıya bilgilendirme + onay akışı sunulur.
 */
export async function requestInitialPermissions(): Promise<PermissionResult> {
  const cached = await AsyncStorage.getItem(PERMISSIONS_KEY);
  if (cached === 'true') {
    const availability = await checkSensorAvailability();
    return { granted: true, ...availability };
  }

  return new Promise(resolve => {
    Alert.alert(
      'CatchMe — Sensör ve Arka Plan İzni',
      Platform.select({
        ios:
          'CatchMe, düşme tespiti için ivmeölçer ve jiroskop verilerinizi okur. ' +
          'Uygulama arka planda çalışırken izleme mümkün olduğunca devam eder. ' +
          'Devam etmek için izin verin.',
        android:
          'CatchMe, düşme tespiti için hareket sensörlerinizi okur ve arka planda ' +
          'izlemeye devam etmeye çalışır. Pil optimizasyonu izlemeyi kısıtlayabilir; ' +
          'CatchMe için arka plan kısıtlamasını kapatmanız önerilir.',
        default:
          'CatchMe, düşme tespiti için hareket sensörlerinizi okur.',
      }) ?? '',
      [
        {
          text: 'Reddet',
          style: 'cancel',
          onPress: () => resolve({ granted: false, accelerometerAvailable: false, gyroscopeAvailable: false }),
        },
        {
          text: 'İzin Ver',
          onPress: async () => {
            const availability = await checkSensorAvailability();

            if (!availability.accelerometerAvailable || !availability.gyroscopeAvailable) {
              Alert.alert(
                'Sensör Bulunamadı',
                'Cihazınızda ivmeölçer veya jiroskop sensörü bulunamadı. CatchMe düzgün çalışmayabilir.',
              );
              resolve({ granted: false, ...availability });
              return;
            }

            await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
            resolve({ granted: true, ...availability });
          },
        },
      ],
      { cancelable: false },
    );
  });
}

/** Kayıtlı izin durumunu sıfırlar (test/debug). */
export async function resetPermissionCache(): Promise<void> {
  await AsyncStorage.removeItem(PERMISSIONS_KEY);
}
