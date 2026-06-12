import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '../app/(tabs)/profile';
import { setAuth } from '../services/api';

const router = global.__getExpoRouter();

function makeProfile(overrides = {}) {
  return {
    id: 'user-1',
    name: 'Mevcut Kullanıcı',
    email: 'user@test.com',
    profileType: 'other',
    emergencyContactName: 'Ahmet Yılmaz',
    emergencyContactPhone: '+90 555 123 4567',
    sleepSchedule: { nightStart: '23:00', nightEnd: '07:00' },
    ...overrides,
  };
}

function mockProfileFetch(initialProfile = makeProfile()) {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, user: initialProfile }),
    })
    .mockImplementation((_url, options) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            user: {
              ...initialProfile,
              ...body,
            },
          }),
      });
    });

  global.fetch = fetchMock as jest.Mock;
  return fetchMock;
}

describe('Senaryo 3.5 — Profil ve Acil Durum Kişisi Yönetimi Testleri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuth('jwt.profile', 'user-1', 'Mevcut Kullanıcı');
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.failing('3.5.1 Yaşlı Kullanıcı seçildiğinde PATCH payload profileType=elderly içerir', async () => {
    const fetchMock = mockProfileFetch(makeProfile({ profileType: 'other' }));

    const view = await render(<ProfileScreen />);
    expect(await view.findByText('Mevcut Kullanıcı')).toBeTruthy();

    fireEvent.press(view.getByText('Yaşlı Kullanıcı'));
    fireEvent.press(view.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.any(String),
        })
      );
    });

    const payload = JSON.parse(fetchMock.mock.calls.at(-1)?.[1].body);
    expect(payload.profileType).toBe('elderly');
  });

  test.failing('3.5.2 uyku takvimi HH:MM değerleri sleepSchedule payload alanına yazılır', async () => {
    const fetchMock = mockProfileFetch();

    const view = await render(<ProfileScreen />);
    expect(await view.findByDisplayValue('23:00')).toBeTruthy();

    fireEvent.changeText(view.getByDisplayValue('23:00'), '22:30');
    fireEvent.changeText(view.getByDisplayValue('07:00'), '06:30');
    fireEvent.press(view.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const payload = JSON.parse(fetchMock.mock.calls.at(-1)?.[1].body);
    expect(payload.sleepSchedule).toEqual({ nightStart: '22:30', nightEnd: '06:30' });
  });

  test.failing('3.5.2 geçersiz saat formatı frontend doğrulamasıyla engellenir', async () => {
    const fetchMock = mockProfileFetch();

    const view = await render(<ProfileScreen />);
    expect(await view.findByDisplayValue('23:00')).toBeTruthy();

    fireEvent.changeText(view.getByDisplayValue('23:00'), '25:00');
    fireEvent.press(view.getByText('Değişiklikleri Kaydet'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Hata',
      'Uyku saatleri HH:mm formatında olmalıdır (örn: 23:00, 07:00).'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test.failing('3.5.3 mevcut kod acil durum kişisi alanlarını ekranda render etmiyor', async () => {
    mockProfileFetch();

    const view = await render(<ProfileScreen />);
    expect(await view.findByText('Mevcut Kullanıcı')).toBeTruthy();

    expect(view.queryByDisplayValue('Ahmet Yılmaz')).toBeNull();
    expect(view.queryByDisplayValue('+90 555 123 4567')).toBeNull();
    expect(view.queryByText(/Acil Durum/i)).toBeNull();
  });

  test.failing('3.5.3 mevcut PATCH payload acil durum kişisi alanlarını göndermiyor', async () => {
    const fetchMock = mockProfileFetch();

    const view = await render(<ProfileScreen />);
    expect(await view.findByText('Mevcut Kullanıcı')).toBeTruthy();

    fireEvent.press(view.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const payload = JSON.parse(fetchMock.mock.calls.at(-1)?.[1].body);
    expect(payload).not.toHaveProperty('emergencyContactName');
    expect(payload).not.toHaveProperty('emergencyContactPhone');
  });

  test.failing('profil kaydetme başarılıysa kullanıcıya başarı mesajı gösterilir', async () => {
    mockProfileFetch();

    const view = await render(<ProfileScreen />);
    expect(await view.findByText('Mevcut Kullanıcı')).toBeTruthy();
    fireEvent.press(view.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Başarılı', 'Profiliniz güncellendi.');
    });
  });

  test.failing('401 profil yükleme yanıtında auth temizleme ve login yönlendirme akışı gösterilir', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false }),
      })
    ) as jest.Mock;

    await render(<ProfileScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Oturum Süresi Doldu',
        'Lütfen tekrar giriş yapın.',
        expect.any(Array)
      );
    });

    const actions = (Alert.alert as jest.Mock).mock.calls[0][2];
    actions[0].onPress();
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
