import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, ToastAndroid, Alert, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// Utils & Hooks
import { translate } from '../../utils/languageUtils/I18n';
import { APP_URLS } from '../../utils/network/urls';
import useAxiosHook from '../../utils/network/AxiosClient';
import { useDeviceInfoHook } from '../../utils/hooks/useDeviceInfoHook';
import { encrypt } from '../../utils/encryptionUtils';
import { RootState } from '../../reduxUtils/store';
import { hScale, wScale } from '../../utils/styles/dimensions';
import { useLocationHook } from '../../hooks/useLocationHook';

// Components
import AppBarSecond from '../drawer/headerAppbar/AppBarSecond';
import FlotingInput from '../drawer/securityPages/FlotingInput';
import DynamicButton from '../drawer/button/DynamicButton';
import Rechargeconfirm from '../../components/Rechargeconfirm';
import OperatorBottomSheet from '../../components/OperatorBottomSheet';
import ShowLoader from '../../components/ShowLoder';
import RecentHistory from '../../components/RecentHistoryBottomSheet';
import OnelineDropdownSvg from '../drawer/svgimgcomponents/simpledropdown';
import RecentText from '../../components/RecentText';

const FastagScreen = () => {
  const navigation = useNavigation<any>();
  const { get, post } = useAxiosHook();
  const { getNetworkCarrier, getMobileIp } = useDeviceInfoHook();
  const { latitude, longitude } = useLocationHook();
  
  // Safe Redux Access
  const userInfo = useSelector((state: RootState) => state.userInfo);
  const userId = userInfo?.userId;
  const Loc_Data = userInfo?.Loc_Data;
  const colorConfig = userInfo?.colorConfig;

  // States
  const [showLoader, setShowLoader] = useState(false);
  const [showLoader2, setShowLoader2] = useState(false);
  const [isOperatorList, setIsOperatorList] = useState(false);
  const [isrecent, setIsrecent] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

  const [consumerNo, setconsumerNo] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedOpt, setselectedOpt] = useState(translate('Select Your Operator'));
  const [optcode, setOptCode] = useState('');
  const [paramname, setParamName] = useState('Customer ID');
  const [isInfo, setIsinfo] = useState(true);

  // Bill Details
  const [dueDate, setDueDate] = useState('Date');
  const [CustomerName, setCustomerName] = useState('N/A');
  const [Status, setStatus] = useState(translate('Status'));
  const [insuranceOptList, setInsuranceOptList] = useState([]);
  const [historylist, setHistorylist] = useState([]);
  const [reqId, setReqId] = useState('');

  // Dynamic Inputs
  const [accntvisivility, setAccntvisivility] = useState(false);
  const [accntvisivility2, setAccntvisivility2] = useState(false);
  const [accnumhint, setAccnumhint] = useState('');
  const [accnumhint2, setAccnumhint2] = useState('');
  const [agencyCode, setAgencyCode] = useState('');

  const formattedDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
  }, []);

  const recenttransactions = useCallback(async () => {
    if (!userId) return;
    try {
      const url = `${APP_URLS.recenttransaction}pageindex=1&pagesize=5&retailerid=${userId}&fromdate=${formattedDate}&todate=${formattedDate}&role=Retailer&rechargeNo=ALL&status=ALL&OperatorName=ALL&portno=ALL`;
      const response = await get({ url });
      if (response && response.length > 0) {
        setHistorylist(response);
        setReqId(response[0]['Request_ID'] || '');
      }
    } catch (error) { console.log(error); }
  }, [get, userId, formattedDate]);

  const CreditCardOpt = useCallback(async (opttype: string) => {
    try {
      const url = `${APP_URLS.getDthOperator}${opttype}`;
      const res = await get({ url });
      setInsuranceOptList(res?.myprop2Items || []);
    } catch (error) { console.error(error); }
  }, [get]);

  useEffect(() => {
    CreditCardOpt('Fastag');
    recenttransactions();
  }, [CreditCardOpt, recenttransactions]);

  const billInfo = useCallback(async () => {
    if (!optcode || !consumerNo) return;
    setShowLoader2(true);
    try {
      const url = `${APP_URLS.rechargeViewBill}billnumber=${consumerNo}&Operator=${optcode}&billunit=&ProcessingCycle=&acno=&lt=&ViewBill=Y`;
      const res = await get({ url });
      if (res?.RESULT === 0) {
        const info = res.ADDINFO?.BillInfo;
        setDueDate(info?.billDueDate || 'N/A');
        setAmount(info?.billAmount?.toString() || '');
        setCustomerName(info?.customerName || 'N/A');
        setBottomSheetVisible(true);
      } else {
        Alert.alert('Error', res?.ADDINFO?.ERRORMSG || 'Unable to fetch bill');
      }
    } catch (error) { console.log(error); }
    finally { setShowLoader2(false); }
  }, [consumerNo, optcode, get]);

  const onRechargePress = useCallback(async () => {
    setBottomSheetVisible(false);
    setShowLoader(true);
    try {
      const mobileNetwork = await getNetworkCarrier();
      const ip = await getMobileIp();
      const lat = Loc_Data?.latitude || latitude || '0.0';
      const long = Loc_Data?.longitude || longitude || '0.0';

      const encryption = await encrypt([
        userId, consumerNo, optcode, amount, lat, long,
        'city', 'address', 'postcode', mobileNetwork, ip, '57bea5094fd9082d'
      ]);

      const enc = encryption.encryptedData;
      const url = `${APP_URLS.rechTask}rd=${encodeURIComponent(enc[0])}&n=${encodeURIComponent(enc[1])}&ok=${encodeURIComponent(enc[2])}&amn=${amount}&pc=${agencyCode}&bu=${accnumhint2}&ip=${encodeURIComponent(enc[10])}&em=57bea5094fd9082d&Latitude=${encodeURIComponent(enc[4])}&Longitude=${encodeURIComponent(enc[5])}&value1=${encodeURIComponent(encryption.keyEncode)}&value2=${encodeURIComponent(encryption.ivEncode)}&billduedate=${dueDate}`;

      const res = await post({ url });

      navigation.navigate('Rechargedetails', {
        mobileNumber: consumerNo,
        Amount: amount,
        operator: selectedOpt,
        status: res?.Response || 'Success',
        reqTime: new Date().toLocaleString(),
        Message: res?.Message || 'Success'
      });
    } catch (error) { Alert.alert("Error", "Transaction failed"); }
    finally { setShowLoader(false); recenttransactions(); }
  }, [amount, consumerNo, optcode, userId, Loc_Data, latitude, longitude, post, navigation, recenttransactions, agencyCode, accnumhint2, dueDate, selectedOpt]);

  return (
    <View style={styles.main}>
      <AppBarSecond title='Fastag Recharge' />
      <View style={styles.container}>
        {showLoader && <ShowLoader />}

        <TouchableOpacity onPress={() => setIsOperatorList(true)}>
          <FlotingInput label={selectedOpt} editable={false} />
          <View style={styles.righticon2}><OnelineDropdownSvg /></View>
        </TouchableOpacity>

        {accntvisivility && (
          <FlotingInput label={accnumhint} value={agencyCode} onChangeTextCallback={setAgencyCode} />
        )}

        <View>
          <FlotingInput label={paramname} onChangeTextCallback={setconsumerNo} value={consumerNo} autoCapitalize="characters" />
          <View style={styles.righticon2}>
            {isInfo && (
              <TouchableOpacity style={styles.infobtn} onPress={billInfo}>
                {showLoader2 ? <ActivityIndicator size="small" color="green" /> : <Text style={styles.infobtntex}>{translate("Info")}</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlotingInput label={'Enter Amount'} maxLength={5} keyboardType="number-pad" value={amount} onChangeTextCallback={setAmount} />

        <DynamicButton title='Next' onPress={() => {
            if (selectedOpt.includes('Select')) return ToastAndroid.show('Select Operator', ToastAndroid.SHORT);
            setBottomSheetVisible(true);
        }} />

        <TouchableOpacity onPress={() => setIsrecent(true)} style={styles.recentviewbtn}><RecentText /></TouchableOpacity>

      <OperatorBottomSheet
  isModalVisible={isOperatorList}
  operatorData={insuranceOptList}
  setModalVisible={setIsOperatorList}
  selectOperator={setselectedOpt}
  setOperatorcode={setOptCode}
  showState={false}
  // Is line ko add karein (even if empty function) taaki crash na ho
  selectOperatorImage={(img: string) => console.log(img)} 
  handleItemPress={(item: any) => {
    const cp = item.customerparams;
    if (cp && cp.length > 0) {
      setParamName(cp[0].paramName);
      setAccntvisivility(cp.length >= 2);
      if (cp.length >= 2) setAccnumhint(cp[1].paramName);
      setAccntvisivility2(cp.length >= 3);
      if (cp.length >= 3) setAccnumhint2(cp[2].paramName);
    }
  }}
/>

        <Rechargeconfirm
          isModalVisible={bottomSheetVisible}
          onBackdropPress={() => setBottomSheetVisible(false)}
          details={[
            { label: 'User Name', value2: CustomerName },
            { label: 'Customer ID', value: consumerNo },
            { label: 'Operator', value2: selectedOpt },
          ]}
          lastvalue={amount}
          onRechargedetails={onRechargePress}
        />
        
        <RecentHistory isModalVisible={isrecent} setModalVisible={setIsrecent} historylistdata={historylist} onBackdropPress={() => setIsrecent(false)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: wScale(20), flex: 1, paddingTop: hScale(30) },
  righticon2: { position: "absolute", right: 0, height: "85%", justifyContent: "center", paddingRight: wScale(12) },
  infobtn: { alignItems: 'center' },
  infobtntex: { fontSize: wScale(18), fontWeight: 'bold', color: '#fff', backgroundColor: 'green', paddingHorizontal: wScale(13), paddingVertical: hScale(5), borderRadius: 5 },
  recentviewbtn: { alignSelf: 'flex-end', marginTop: 15 },
});

export default FastagScreen;