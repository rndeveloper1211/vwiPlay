import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ToastAndroid, Linking, AppState,
} from 'react-native';
import { hScale, wScale } from '../../utils/styles/dimensions';
import { useNavigation } from '../../utils/navigation/NavigationService';
import useAxiosHook from '../../utils/network/AxiosClient';
import { APP_URLS } from '../../utils/network/urls';
import { useDeviceInfoHook } from '../../utils/hooks/useDeviceInfoHook';
import { RootState } from '../../reduxUtils/store';
import { useSelector } from 'react-redux';
import { encrypt } from '../../utils/encryptionUtils';
import { colors, FontSize } from '../../utils/styles/theme';
import AppBarSecond from '../drawer/headerAppbar/AppBarSecond';
import QrcodSvg from '../drawer/svgimgcomponents/QrcodSvg';
import Upipaymentoptionssvg from '../drawer/svgimgcomponents/Upipaymentoptionssvg';
import uuid from 'react-native-uuid';
import AllBalance from '../../components/AllBalance';
import ShowLoaderBtn from '../../components/ShowLoaderBtn';
import { NativeModules } from 'react-native';
import { translate } from '../../utils/languageUtils/I18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';

const { UpiNative } = NativeModules;

// ✅ Selector bahar
const selectUserInfo = (s: RootState) => ({
  colorConfig: s.userInfo.colorConfig,
  IsDealer:    s.userInfo.IsDealer,
  Loc_Data:    s.userInfo.Loc_Data,
  userId:      s.userInfo.userId,
});

// ✅ Merchant data ek type mein
interface MerchantData {
  key: string; id: string; salt: string;
  userId: string; privateKey: string;
  successUrl: string; failureUrl: string;
  email: string; mobile: string; name: string;
}

const AddMoneyOptions = ({ route }) => {
  const { colorConfig, IsDealer, Loc_Data, userId } = useSelector(selectUserInfo);
  const { amount, jsonData, paymentMode, chargeType, from } = route.params;
  const { latitude, longitude } = Loc_Data;

  const { getNetworkCarrier, getMobileDeviceId, getMobileIp } = useDeviceInfoHook();
  const { get, post } = useAxiosHook();
  const navigation = useNavigation<any>();

  // ✅ 15 useState → grouped
  const [upich,        setUpich]        = useState<any>(null);
  const [charges,      setCharges]      = useState<any>(null);
  const [merchant,     setMerchant]     = useState<MerchantData | null>(null);
  const [charge,       setCharge]       = useState<string | null>(null);
  const [totalCharge,  setTotalCharge]  = useState<string | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [intentLoad,   setIntentLoad]   = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);

  // UPI detail state — grouped
  const [upiDetail, setUpiDetail] = useState({
    upiid: '', minamnt: '', maxamnt: '',
    perdaylimit: '', uselimit: '', limitmessage: '',
    dealerUpiStatus: '', dealerUpiid: '', dealerCapping: '',
  });

  // ─── Mount — parallel calls ───────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      upiCharges(),
      getCharges(),
      callSelfUPIIntent(amount),
    ]);
  }, []);

  const upiCharges = useCallback(async () => {
    try {
      const res = await get({ url: APP_URLS.upicharges });
      setUpich(res);
    } catch (e) {
      console.error('upiCharges:', e);
    }
  }, [get]);

  const getCharges = useCallback(async () => {
    try {
      const res = await get({ url: `${APP_URLS.addmoneyChg}${amount}` });
      setCharges(res);
    } catch (e) {
      console.error('getCharges:', e);
    }
  }, [get, amount]);

  const callSelfUPIIntent = useCallback(async (amt: string) => {
    try {
      const res = await post({ url: `${APP_URLS.UPISUMSlab}?Amount=${amt}&Type=${chargeType}` });
      setCharge(res.Charge);
      setTotalCharge(res.TotalCharge);
    } catch (e) {
      console.error('callSelfUPIIntent:', e);
    }
  }, [post, chargeType]);

  // ─── Alert helpers ────────────────────────────────────────────────────────
  const showAlert = useCallback((msg: string) => {
    Alert.alert(translate('Error'), msg, [{ text: translate('OK') }], { cancelable: false });
  }, []);

  const showRangeAlert = useCallback((min: number, max: number) => {
    Alert.alert(
      translate('Invalid Amount'),
      translate(`For UPI Amount Should be between ₹${min} To ₹${max}`),
      [{ text: translate('OK') }], { cancelable: false },
    );
  }, []);

  // ─── Gateway ──────────────────────────────────────────────────────────────
  const gatewaytype = useCallback(async (type: string) => {
    setIsLoading(true);
    try {
      const data = await post({ url: `${APP_URLS.Chkpayu}type=${type}` });

      if (data.Response === 'Success') {
        // ✅ Merchant data ek object mein set
        setMerchant({
          key: data.Merchantkey,   id: data.Merchantid,
          salt: data.MerchantSalt, userId: data.USERID,
          privateKey: data.Privatekey,
          successUrl: data.txnsuccessUrl, failureUrl: data.txnfailureUrl,
          email: data.email, mobile: data.mobile, name: data.name,
        });

        // ✅ Map se switch replace
        const typeMap: Record<string, string> = {
          CC: 'CC', DC: 'DC', WA: 'WA', NB: 'NB', UPI: 'UP',
        };
        if (typeMap[type]) Apitransitionsencrypt(typeMap[type], data);
      } else {
        Alert.alert(translate('Warning'), data.Message,
          [{ text: translate('OK') }], { cancelable: false });
      }
    } catch (e) {
      console.error('gatewaytype:', e);
    } finally {
      setIsLoading(false);
    }
  }, [post]);

  // ─── Encrypt + Pay ────────────────────────────────────────────────────────
  const Apitransitionsencrypt = useCallback(async (type: string, data1: any) => {
    setIsLoading(true);
    try {
      const id            = uuid.v4().toString().substring(0, 16);
      const mobileNetwork = await getNetworkCarrier();
      const ip            = await getMobileIp();
      const model         = await getMobileDeviceId();

      const encryption = await encrypt([
        type, model, latitude || 0, longitude || 0,
        model, 'city', 'postcode', mobileNetwork, ip, 'Address',
      ]);

      const [typee,,lat,long,Model2,city,postcode,mobileNetwork2,ip2,address] =
        encryption.encryptedData;

      const url = `${APP_URLS.sendgatewayReq}txtamt=${encodeURIComponent(amount)}&txnid=${encodeURIComponent(id)}&ddltypes=${encodeURIComponent(typee)}&Devicetoken=${encodeURIComponent(ip2)}&Latitude=${encodeURIComponent(lat)}&Longitude=${encodeURIComponent(long)}&ModelNo=${encodeURIComponent(Model2)}&City=${encodeURIComponent(city)}&PostalCode=${encodeURIComponent(postcode)}&InternetTYPE=${encodeURIComponent(mobileNetwork2)}&IP=${encodeURIComponent(ip2)}&Addresss=${encodeURIComponent(address)}&value1=${encodeURIComponent(encryption.keyEncode)}&value2=${encodeURIComponent(encryption.ivEncode)}`;

      const data     = await post({ url });
      const payUParam = Object.assign({}, data, data1, { amount });

      // ✅ savePayUParam — console.error fix kiya
      try {
        await AsyncStorage.setItem('payUParam', JSON.stringify(payUParam));
      } catch (e) {
        console.error('Error saving payUParam:', e);
      }

      if (data.Status === 'Success') {
        navigation.navigate('SeamlessScreen', { payUParam });
      } else {
        Alert.alert(translate('Payment Failed'),
          `Transaction failed. Reason: ${data.message || data.txnid}`,
          [{ text: translate('OK') }], { cancelable: false });
      }
    } catch (e: any) {
      Alert.alert(translate('Error'), `Something went wrong: ${e.message}`,
        [{ text: translate('OK') }], { cancelable: false });
    } finally {
      setIsLoading(false);
    }
  }, [amount, navigation, latitude, longitude, post]);

  // ─── QR Flow ──────────────────────────────────────────────────────────────
  const Qrcodestatus = useCallback(async (amnt: string) => {
    setIsLoading(true);
    try {
      const response = await post({ url: `${APP_URLS.UPIQR}?amount=${amnt}` });

      if (response.name === 'ICICI') {
        if (response.status === true) {
          navigation.navigate('QRCodePage', {
            qrcode1response: response.QR,
            generatedidresponse: response.GeneratedUniqueid,
            amnt,
          });
        } else {
          showAlert(response.msg);
        }
      } else if (response?.status && response?.qrstatus === 'OK') {
        navigation.navigate('UpiQrCodes', { response, amnt });
      } else {
        ToastAndroid.showWithGravity(
          response?.msg || 'QR status is not OK, try again.',
          ToastAndroid.LONG, ToastAndroid.BOTTOM,
        );
      }
    } catch (e) {
      console.error('Qrcodestatus:', e);
    } finally {
      setIsLoading(false);
    }
  }, [post, navigation, showAlert]);

  const upiqr = useCallback(async () => {
    if (!from || from !== 'abc') {
      navigation.navigate('UpiQrCodes', {
        response: { QR: '', msg: 'OKss', name: 'VASTBAZAAR', qrstatus: 'OK', status: true },
        amnt: amount,
      });
      return;
    }
    setIsLoading(true);
    try {
      const data     = await get({ url: APP_URLS.upitxChk });
      const statuss  = data.ShowQR;

      const needsRangeCheck = ['PRICEBASE', 'VAR_QR', 'UPIQR'].includes(statuss);

      if (needsRangeCheck) {
        const min = parseFloat(data.msg?.minmium ?? upich?.Minqr ?? 0);
        const max = parseFloat(data.msg?.maximium ?? upich?.Maxqr ?? 0);
        const amt = parseFloat(amount);

        if (amt >= min && amt <= max) {
          Qrcodestatus(amount);
        } else {
          Alert.alert(translate('Invalid Amount'), translate('key_forupiam_43'),
            [{ text: translate('OK') }]);
        }
      } else {
        Qrcodestatus(amount);
      }
    } catch (e) {
      console.error('upiqr:', e);
    } finally {
      setIsLoading(false);
    }
  }, [from, amount, navigation, upich, Qrcodestatus, get]);

  // ─── UPI Status ───────────────────────────────────────────────────────────
  const phonepestatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data      = await get({ url: APP_URLS.phonepestatus });
      const min       = parseFloat(data.minmium);
      const max       = parseFloat(data.maximium);
      const amt       = parseFloat(amount);

      if (amt >= min && amt <= max) {
        if (data.Status === 'Success') {
          // phonepe()
        } else {
          showAlert(data.Message);
        }
      } else {
        showRangeAlert(min, max);
      }
    } catch (e) {
      console.error('phonepestatus:', e);
    } finally {
      setIsLoading(false);
    }
  }, [get, amount, showAlert, showRangeAlert]);

  const upists = useCallback(async () => {
    setIsLoading(true);
    try {
      const response  = await get({ url: APP_URLS.upistatus });
      const activeApi = response.ActiveApi;
      const amt       = parseFloat(amount);
      const min       = parseFloat(response.Minqr);
      const max       = parseFloat(response.Maxqr);

      if (activeApi === 'PHONEPE') {
        phonepestatus();
        return;
      }

      // ✅ Bug fix: `if (ActiveApi === ActiveApi)` always true tha
      if (amt >= min && amt <= max) {
        gatewaytype('UPI');
      } else {
        Alert.alert(translate('Warning'),
          translate(`For UPI Amount should be between ₹ ${min} To ₹ ${max}`),
          [{ text: translate('OK') }], { cancelable: false });
      }
    } catch (e) {
      console.error('upists:', e);
    } finally {
      setIsLoading(false);
    }
  }, [get, amount, phonepestatus, gatewaytype]);

  // ─── Intent Payment ───────────────────────────────────────────────────────
  const parseUpiResponse = (str: string): Record<string, string> => {
    if (!str || typeof str !== 'string') return {};
    return str.split('&').reduce((acc, pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return acc;
      acc[pair.substring(0, idx)] = decodeURIComponent(pair.substring(idx + 1) || '');
      return acc;
    }, {} as Record<string, string>);
  };

  const startPayment = useCallback(async (upiUrl: string) => {
    if (!upiUrl) { Alert.alert(translate('UPI URL missing')); return; }
    setIntentLoad(true);
    try {
      const result = await UpiNative.pay(upiUrl);
      if (result === 'CANCELLED' || result === 'NO_RESPONSE') {
        ToastAndroid.show(translate('Payment Cancelled'), ToastAndroid.SHORT);
        return;
      }
      const parsed = parseUpiResponse(result);
      const status = (parsed.status || parsed.Status || '').toUpperCase();
      const toastMap: Record<string, string> = {
        SUCCESS: translate('Payment Successful'),
        FAILURE: translate('Payment Failed'),
        SUBMITTED: translate('Payment Pending'),
      };
      ToastAndroid.show(toastMap[status] || translate('Unknown Payment Response'), ToastAndroid.SHORT);
      if (['SUCCESS', 'FAILURE', 'SUBMITTED'].includes(status)) {
        navigation.navigate('AddMoneyPayResponse');
      }
    } catch (e) {
      ToastAndroid.show(translate('UPI Failed'), ToastAndroid.SHORT);
    } finally {
      setIntentLoad(false);
    }
  }, [navigation]);

  const Vastbazzarqr = useCallback(async (amnt: string) => {
    setIntentLoad(true);
    try {
      const self = await post({ url: APP_URLS.selfupiintent });
      if (!self.status) {
        ToastAndroid.show(self.msg || '', ToastAndroid.BOTTOM);
        return;
      }
      const response           = await post({ url: `${APP_URLS.VastbazzarUPIQRGenerate}${amnt}` });
      const qrcode1response    = response.Intenturl;

      if (!qrcode1response) {
        Alert.alert(translate('Something went wrong!'));
        return;
      }

      await AsyncStorage.setItem('upi_intent_params', JSON.stringify({ result: qrcode1response }));
      setPaymentStarted(true);
      startPayment(qrcode1response);
    } catch (e) {
      Alert.alert(translate('Something went wrong!'));
    } finally {
      setIntentLoad(false);
    }
  }, [post, startPayment]);

  // ─── handleOptionClick2 — ek hi function, map se ─────────────────────────
  const handleOptionClick2 = useCallback((optionName: string) => {
    const actionMap: Record<string, () => void> = {
      'QR Code':              () => upiqr(),
      'Creditcard':           () => gatewaytype('CC'),
      'Wallet':               () => gatewaytype('WA'),
      'debitCardcharges':     () => gatewaytype('DC'),
      'Netbanking':           () => gatewaytype('NB'),
      'UPI':                  () => { upists(); gatewaytype('UP'); },
      'Request to Admin':     () => navigation.navigate('ReqToAdmin', { amount, type: 'Admin' }),
      'Request to Distributor': () => navigation.navigate('ReqToAdmin', { amount, type: 'Distributor' }),
      'Request to Master':    () => navigation.navigate('ReqToAdmin', { amount, type: 'Distributor' }),
    };
    actionMap[optionName]?.();
  }, [upiqr, gatewaytype, upists, navigation, amount]);

  // ─── UI ───────────────────────────────────────────────────────────────────
  const cardBg = useMemo(
    () => `${colorConfig.secondaryColor}80`,
    [colorConfig.secondaryColor]
  );

  return (
    <View style={styles.main}>
      <AppBarSecond
        title={translate('Payment Options')}
        actionButton={undefined}
        onActionPress={undefined}
        onPressBack={undefined}
        titlestyle={undefined}
      />
      <AllBalance />

      <View style={styles.container}>
        {/* Charges Info */}
        <View style={styles.chargesContainer}>
          <View style={[styles.chargeview, { backgroundColor: cardBg }]}>
            <View style={styles.chargeinfo}>
              <Text style={styles.chargesTitle}>{translate('Charges')}</Text>
              <Text style={styles.chargesvalue}>₹ {charge}</Text>
            </View>
            <View style={styles.bordercontainer} />
            <View style={styles.chargeinfo}>
              <Text style={styles.chargesTitle}>{translate('Net Amount')}</Text>
              <Text style={styles.chargesvalue}>₹ {totalCharge}</Text>
            </View>
          </View>
        </View>

        {/* Payment Card */}
        <View style={styles.btncard}>
          <View style={[styles.row, styles.transparentRow]}>
            <View>
              <Text style={styles.amounttitle}>{translate('Added Amount')}</Text>
              <Text style={styles.amounttext}>{amount}</Text>
            </View>
            <View>
              <Text style={[styles.amounttitle, styles.textRight]}>{translate('Payment Mode')}</Text>
              <Text style={[styles.amounttext, styles.textRight]}>{translate(paymentMode)}</Text>
            </View>
          </View>

          <Text style={styles.notText}>{translate('key_beloware_18')}</Text>

          {/* QR */}
          <TouchableOpacity style={styles.row} onPress={upiqr}>
            <View style={styles.leftSection}><QrcodSvg /></View>
            <Text style={styles.label}>{translate('Generate QR')}</Text>
            {isLoading
              ? <ShowLoaderBtn />
              : <FontAwesome6 name="chevron-right" size={22} color="#fff" />
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>{translate('OR')}</Text>
            <View style={styles.line} />
          </View>

          {/* Intent */}
          <TouchableOpacity style={styles.row} onPress={() => Vastbazzarqr(amount)}>
            <View style={styles.leftSection}><Upipaymentoptionssvg /></View>
            <Text style={styles.label}>{translate('UPI') + ' Intent'}</Text>
            {intentLoad
              ? <ShowLoaderBtn />
              : <FontAwesome6 name="chevron-right" size={22} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  main:             { flex: 1 },
  container:        { flex: 1, paddingHorizontal: wScale(10), paddingTop: hScale(10) },
  chargesContainer: { marginVertical: hScale(10), marginBottom: hScale(20) },
  chargesTitle:     { fontSize: FontSize.massive, color: colors.white, textAlign: 'center' },
  chargesvalue:     { fontSize: FontSize.regular, color: colors.white, fontWeight: 'bold', textAlign: 'center' },
  chargeview:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: hScale(5), borderRadius: 20 },
  chargeinfo:       { alignItems: 'center', flex: 1 },
  bordercontainer:  { borderRightWidth: wScale(2), borderRightColor: colors.black_01 },
  amounttext:       { fontSize: FontSize.heading, color: colors.white, fontWeight: 'bold' },
  amounttitle:      { fontSize: wScale(14), color: colors.white },
  textRight:        { textAlign: 'right' },
  btncard:          { backgroundColor: '#6A0DAD', borderRadius: 14, paddingHorizontal: wScale(15), width: '100%', alignSelf: 'center', paddingVertical: hScale(20) },
  transparentRow:   { borderWidth: 0, backgroundColor: 'transparent' },
  row:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderWidth: 0.5, borderColor: 'white', borderRadius: 5, paddingHorizontal: wScale(10), backgroundColor: 'rgba(0,0,0,0.4)' },
  leftSection:      { flexDirection: 'row', alignItems: 'center', padding: wScale(4), borderWidth: 0.5, borderColor: 'white', borderRadius: 3 },
  label:            { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: wScale(10) },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  line:             { flex: 1, height: 1, backgroundColor: '#fff' },
  orText:           { marginHorizontal: 10, color: '#fff', fontSize: 14, fontWeight: '500' },
  notText:          { color: '#fff', fontSize: 12, textAlign: 'justify', paddingBottom: hScale(10) },
});

export default AddMoneyOptions;