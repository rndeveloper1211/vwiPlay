import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastProvider } from 'react-native-toast-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { store, persistor } from './src/reduxUtils/store';
import RNBootSplash from "react-native-bootsplash";
import { AppContainer } from './src/AppContainer';
import { navigationRef } from './src/utils/navigation/NavigationService';
import { setUnlocked } from './src/reduxUtils/store/userInfoSlice';
import { PaperProvider } from 'react-native-paper';
import OtaHotUpdate from 'react-native-ota-hot-update';
import firestore from '@react-native-firebase/firestore';

type Step = 'idle' | 'checking' | 'downloading' | 'installing' | 'restarting';

const STEPS = [
  { key: 'checking',    label: 'Update check ho raha hai...' },
  { key: 'downloading', label: 'Download ho raha hai...'     },
  { key: 'installing',  label: 'Install ho raha hai...'      },
  { key: 'restarting',  label: 'App restart ho rahi hai...'  },
];

// ─── OTA UPDATE ───
const checkUpdate = async (setStep: (s: Step) => void) => {
  try {
    setStep('checking');

    const doc = await firestore().collection('config').doc('ota').get();

    if (!doc.exists || !doc.data()) {
      console.log('⚠️ [OTA] Firebase config nahi mila!');
      setStep('idle');
      return;
    }

    const { otaBundleUrl, updateAvailable } = doc.data() as {
      otaBundleUrl: string;
      updateAvailable: boolean;
    };

    if (!updateAvailable) {
      console.log('✅ [OTA] Koi update nahi!');
      setStep('idle');
      return;
    }

    setStep('downloading');

OtaHotUpdate.downloadBundleUri(otaBundleUrl, {
  fileType: 'zip',
  restart: true,
  onSuccess: async () => {
    setStep('installing');
    await firestore().collection('config').doc('ota').update({
      updateAvailable: false,
    });
    setStep('restarting');
  },
  onError: (err) => {
    console.log('❌ [OTA] Error:', err);
    setStep('idle');
  },
});

  } catch (err) {
    console.log('💥 [OTA] Failed:', err);
    setStep('idle');
  }
};

// ─── UPDATE OVERLAY ───
const UpdateOverlay = ({ currentStep }: { currentStep: Step }) => (
  <View style={styles.overlay}>
    <View style={styles.box}>
      <Text style={styles.title}>App Update</Text>

      {STEPS.map((step, index) => {
        const stepKeys = STEPS.map(s => s.key);
        const currentIndex = stepKeys.indexOf(currentStep);
        const stepIndex = index;

        const isDone    = stepIndex < currentIndex;
        const isActive  = step.key === currentStep;
        const isPending = stepIndex > currentIndex;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={[
              styles.stepDot,
              isDone   && styles.dotDone,
              isActive && styles.dotActive,
              isPending && styles.dotPending,
            ]}>
              {isDone   && <Text style={styles.dotText}>✓</Text>}
              {isActive && <ActivityIndicator size="small" color="#fff" />}
              {isPending && <Text style={styles.dotTextPending}>{index + 1}</Text>}
            </View>

            <Text style={[
              styles.stepLabel,
              isDone    && styles.labelDone,
              isActive  && styles.labelActive,
              isPending && styles.labelPending,
            ]}>
              {step.label}
            </Text>
          </View>
        );
      })}

      <Text style={styles.hint}>Kripya app band mat karein...</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  box: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 28,
    width: '82%',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dotDone:    { backgroundColor: '#22c55e' },
  dotActive:  { backgroundColor: '#3b82f6' },
  dotPending: { backgroundColor: '#374151' },
  dotText:        { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  dotTextPending: { color: '#9ca3af', fontSize: 12 },
  stepLabel:  { fontSize: 14 },
  labelDone:    { color: '#22c55e' },
  labelActive:  { color: '#ffffff', fontWeight: 'bold' },
  labelPending: { color: '#6b7280' },
  hint: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 20,
    textAlign: 'center',
  },
});

// ─── APP CONTENT ───
const AppContent = () => {
  const language = useSelector((state: any) => state.userInfo.appLanguage);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setUnlocked(false));
  }, [dispatch, language]);

  return (
    <NavigationContainer
      key={language}
      ref={navigationRef}
      onReady={() => { RNBootSplash.hide({ fade: true }); }}
    >
      <AppContainer />
    </NavigationContainer>
  );
};

// ─── MAIN APP ───
function App() {
  const [currentStep, setCurrentStep] = useState<Step>('idle');

  useEffect(() => {
 //   checkUpdate(setCurrentStep);

    if (__DEV__) {
      const isFabric = global?.nativeFabricUIManager != null;
      const isBridgeless = global?.RN$Bridgeless === true;
      const isHermes = !!global?.HermesInternal;
      console.log('--- SYSTEM CHECK ---');
      console.log('Fabric Enabled:', isFabric);
      console.log('Bridgeless Mode:', isBridgeless);
      console.log('Hermes Enabled:', isHermes);
      console.log('--------------------');
    }
  }, []);

  return (
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

        {currentStep !== 'idle' && (
          <UpdateOverlay currentStep={currentStep} />
        )}

      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;