/* eslint-disable @typescript-eslint/no-unused-vars */
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastProvider } from 'react-native-toast-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'; // Zaroori import
import 'react-native-reanimated';   // 👈 MUST ADD
import { store, persistor } from './src/reduxUtils/store';
import RNBootSplash from 'react-native-bootsplash';
import { AppContainer } from './src/AppContainer';
import { navigationRef } from './src/utils/navigation/NavigationService';
import { setUnlocked } from './src/reduxUtils/store/userInfoSlice';
import { PaperProvider } from 'react-native-paper';
import { useToast } from 'react-native-toast-notifications';
import OtUpdate  from 'react-native-ota-hot-update';
import ReactNativeBlobUtil from 'react-native-blob-util';
const AppContent = () => {
  const toast = useToast();

  const language = useSelector((state: any) => state.userInfo.appLanguage);
  const dispatch = useDispatch();

  const VERSION_URL = 'https://raw.githubusercontent.com/rndeveloper1211/vwi-ota/main/version.json';
const checkOta = async () => {
  try {
    const res = await fetch(VERSION_URL);
    const data = await res.json();

    const installed = Number(await OtUpdate.getCurrentVersion()) || 0;
    const latest = Number(data.version);

    console.log('Installed:', installed, 'Latest:', latest);

    // ❗ extra safety
    if (!latest || isNaN(latest)) {
      console.log('Invalid OTA version from server');
      return;
    }

    if (latest > installed) {
      console.log('New update found');
      startUpdate(data);
    } else {
      console.log('Already latest version');

      toast.show(`Welcome`, {
        type: 'success',
        placement: 'top',
        duration: 1200,
      });
    }

  } catch (error) {
    console.log('OTA check failed', error);
  }
};

const startUpdate = async (data: any) => {
  toast.show(`Downloading v${data.version}...`, {
    type: 'info',
    placement: 'top',
  });

  try {
    await OtUpdate.downloadBundleUri(
      ReactNativeBlobUtil,
      data.bundle_url,
      Number(data.version),
      {
        restartAfterInstall: true,
        restartDelay: 1000,

        updateSuccess() {
          console.log('✅ OTA Updated to version:', data.version);

          toast.show(`Updated to v${data.version}`, {
            type: 'success',
            placement: 'top',
          });
        },

        updateFail(error) {
          console.error('❌ Update Failed:', error);

          toast.show('Update Failed. Check connection.', {
            type: 'danger',
          });
        },

        progress(received, total) {
          if (total > 0) {
            const percent = Math.floor((received / total) * 100);
            console.log(`Download: ${percent}%`);
          }
        },
      }
    );
  } catch (error) {
    console.error('OTA execution error:', error);
  }
};
  useEffect(() => {
//checkOta();
    // Language badalte hi agar lock/unlock state reset karni hai toh
    dispatch(setUnlocked(false));
  }, [dispatch, language]);
  return (
    <NavigationContainer

      key={language}
      ref={navigationRef}
      onReady={() => {
        RNBootSplash.hide({ fade: true });
      }}
    >
      <AppContainer />
    </NavigationContainer>
  );
};

function App() {
  useEffect(() => {
    const isFabric = global?.nativeFabricUIManager != null;
    const isBridgeless = global?.RN$Bridgeless === true;
    const isHermes = !!global?.HermesInternal;

    if (__DEV__) {
      console.log('--- SYSTEM CHECK ---');
      console.log('Fabric Enabled:', isFabric);
      console.log('Bridgeless Mode:', isBridgeless);
      console.log('Hermes Enabled:', isHermes);
      console.log('--------------------');
    }
  }, []);

  return (
    /** * STEP 1: GestureHandlerRootView sabse top par hona chahiye
     * STEP 2: KeyboardProvider pure app ke insets ko handle karega
     */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ToastProvider>
            <Provider store={store}>
              <PaperProvider>

                <PersistGate loading={null} persistor={persistor}>
                  <AppContent />

                </PersistGate>
              </PaperProvider>

            </Provider>
          </ToastProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
