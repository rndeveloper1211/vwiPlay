import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Platform,
  PermissionsAndroid,
  NativeModules,
  Alert,
  Linking,
} from 'react-native';
import { 
  check, 
  PERMISSIONS, 
  RESULTS 
} from 'react-native-permissions'; // ✅ Added
import { useDispatch } from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import { setDeviceInfo } from '../../reduxUtils/store/userInfoSlice';

const { LocationModule } = NativeModules;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationData {
  latitude:    string | number;
  longitude:   string | number;
  address?:    string;
  city?:       string;
  postalCode?: string;
  [key: string]: unknown;
}

interface DeviceInfoPayload {
  brand:          string;
  modelNumber:    string;
  androidVersion: string;
  packageName:    string;
  ipAddress:      string;
  uniqueId:       string;
  buildId:        string;
  net:            string;
  latitude?:      string | number;
  longitude?:     string | number;
  address?:       string;
  city?:          string;
  postalCode?:    string;
}

interface UseLocationManagerReturn {
  isLoading2:      boolean;
  locationAllowed: boolean;
  refreshStrictly: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCATION_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS      = 1500;
const MAX_ATTEMPTS        = 5;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useLocationManager = (): UseLocationManagerReturn => {
  const dispatch = useDispatch();

  const [isLoading2, setIsLoading2]         = useState<boolean>(true);
  const [locationAllowed, setLocationAllowed] = useState<boolean>(false);

  // RN 0.77 New Arch: typed ref
  const isFetching = useRef<boolean>(false);

  // ─── Static device info (no async) ───────────────────────────────────────

  const getStaticInfo = (): Pick<
    DeviceInfoPayload,
    'brand' | 'modelNumber' | 'androidVersion' | 'packageName'
  > => ({
    brand:          DeviceInfo.getBrand(),
    modelNumber:    DeviceInfo.getModel(),
    androidVersion: DeviceInfo.getSystemVersion(),
    packageName:    DeviceInfo.getBundleId(),
  });

  // ─── Fetch Device + Location ──────────────────────────────────────────────

  const fetchDeviceInfo = useCallback(async (): Promise<boolean> => {
    if (isFetching.current) return false;

    try {
      isFetching.current = true;

      const [buildId, ip, uniqueId, carrier] = await Promise.all([
        DeviceInfo.getBuildId(),
        DeviceInfo.getIpAddress(),
        DeviceInfo.getUniqueId(),
        DeviceInfo.getCarrier(),
      ]);

      if (!LocationModule) {
        console.warn('LocationModule is not available on this platform');
        return false;
      }

      const isEnabled: boolean = await LocationModule.isLocationEnabled();
      if (!isEnabled) return false;

      // Location fetch is isolated — a timeout rejection does NOT abort device-info dispatch
      let locData: LocationData | null = null;
      try {
        const loc: LocationData = await Promise.race([
          LocationModule.getCurrentLocation() as Promise<LocationData>,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), LOCATION_TIMEOUT_MS),
          ),
        ]);

        const lat = loc?.latitude;
        if (lat !== undefined && lat !== '0' && lat !== 0) {
          locData = loc;
        }
      } catch (locError: unknown) {
        // Timeout or native error — log and continue without location
        const msg = locError instanceof Error ? locError.message : String(locError);
        console.warn('Location fetch failed:', msg);
      }

      if (locData) {
        const finalData: DeviceInfoPayload = {
          ...getStaticInfo(),
          ipAddress: ip       || '0.0.0.0',
          uniqueId,
          buildId,
          net: carrier        || 'wifi/net',
          ...locData,
        };

        dispatch(setDeviceInfo(finalData));
        setLocationAllowed(true);
        return true;
      }

      return false;
    } catch (e: unknown) {
      // Typed catch — required by TS 5.x (used in RN 0.77)
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('fetchDeviceInfo failed:', msg);
      return false;
    } finally {
      isFetching.current = false;
    }
  }, [dispatch]);

  // ─── Strict Location Flow (FIXED) ─────────────────────────────────────────

  const forceFetchStrictData = useCallback(async (): Promise<void> => {
    setIsLoading2(true);

    try {
      // ── Android location permission (✅ FIXED - 4 lines only!) ──
      if (Platform.OS === 'android') {
        const currentStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        
        if (currentStatus !== RESULTS.GRANTED) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title:           'Location Permission',
              message:         'This app requires location access to verify your identity securely.',
              buttonPositive:  'Allow',
              buttonNegative:  'Deny',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permission Required',
              'Location permission is required for security verification.',
              [
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
            return;
          }
        }
      }

      // ── Retry loop (SAME) ──
      let success  = false;
      let attempts = 0;

      while (!success && attempts < MAX_ATTEMPTS) {
        const isEnabled: boolean = await LocationModule?.isLocationEnabled?.();

        if (!isEnabled) {
          const status: string = await LocationModule?.requestGPSEnabling?.();
          if (status !== 'ENABLED' && status !== 'ALREADY_ON') {
            Alert.alert(
              'GPS Required',
              'Please enable GPS to continue.',
              [
                { text: 'Enable GPS', onPress: () => forceFetchStrictData() },
                { text: 'Cancel',     style: 'cancel' },
              ],
            );
            return;
          }
        }

        success = await fetchDeviceInfo();

        if (!success) {
          attempts++;
          if (attempts < MAX_ATTEMPTS) {
            await new Promise<void>(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      if (!success) {
        Alert.alert(
          'Location Error',
          'Unable to fetch location after multiple attempts. Please check your GPS settings.',
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('forceFetchStrictData error:', msg);
    } finally {
      setIsLoading2(false);
    }
  }, [fetchDeviceInfo]);

  // ─── Auto Start ───────────────────────────────────────────────────────────

  useEffect(() => {
    forceFetchStrictData();
  }, [forceFetchStrictData]);

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    isLoading2,
    locationAllowed,
    refreshStrictly: forceFetchStrictData,
  };
};