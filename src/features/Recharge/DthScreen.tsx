import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ToastAndroid,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { colors } from '../../utils/styles/theme';
import { hScale, wScale } from '../../utils/styles/dimensions';
import { APP_URLS } from '../../utils/network/urls';
import useAxiosHook from '../../utils/network/AxiosClient';
import { BottomSheet } from '@rneui/base';
import { translate } from '../../utils/languageUtils/I18n';
import { useDeviceInfoHook } from '../../utils/hooks/useDeviceInfoHook';
import { useSelector } from 'react-redux';
import { RootState } from '../../reduxUtils/store';
import { encrypt } from '../../utils/encryptionUtils';
import FlotingInput from '../drawer/securityPages/FlotingInput';
import AppBarSecond from '../drawer/headerAppbar/AppBarSecond';
import DynamicButton from '../drawer/button/DynamicButton';
import { useNavigation } from '@react-navigation/native';
import OnelineDropdownSvg from '../drawer/svgimgcomponents/simpledropdown';
import OperatorBottomSheet from '../../components/OperatorBottomSheet';
import Rechargeconfirm from '../../components/Rechargeconfirm';
import RecentHistory from '../../components/RecentHistoryBottomSheet';
import RecentText from '../../components/RecentText';
import ClosseModalSvg2 from '../drawer/svgimgcomponents/ClosseModal2';
import ShowLoader from '../../components/ShowLoder';
import { useLocationHook } from '../../hooks/useLocationHook';

const DthScreen = () => {
  const navigation = useNavigation<any>();
  const { get, post } = useAxiosHook();
  const { getNetworkCarrier, getMobileIp } = useDeviceInfoHook();
  const { latitude, longitude } = useLocationHook();

  // Redux State
  const { colorConfig, Loc_Data, userId } = useSelector((state: RootState) => state.userInfo);
  
  // Memoized color for performance
  const color1 = useMemo(() => `${colorConfig.secondaryColor}20`, [colorConfig.secondaryColor]);

  // UI States
  const [showLoader, setShowLoader] = useState(false);
  const [showLoader2, setShowLoader2] = useState(false);
  const [isOperatorList, setIsOperatorList] = useState(false);
  const [isrecent, setIsrecent] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [bottomSheetVisible2, setBottomSheetVisible2] = useState(false);

  // Form States
  const [consumerNo, setconsumerNo] = useState('');
  const [Amount, setAmount] = useState('');
  const [selectedOpt, setselectedOpt] = useState(translate('Select Your Operator'));
  const [optimg, setOptimg] = useState('');
  const [optcode, setOptCode] = useState('');
  const [path, setpath] = useState('');
  
  // Data States
  const [insuranceOptList, setInsuranceOptList] = useState([]);
  const [historylist, setHistorylist] = useState([]);
  const [billDetails, setBillDetails] = useState<any>([]);
  const [monthlyRecharge, setMonthlyRecharge] = useState('');
  const [isInfo, setIsinfo] = useState(false);
  
  // Bill Details Placeholder States (Mapped from your original)
  const [CustomerName, setCustomerName] = useState('N/A');
  const [custBal, setCustBal] = useState(0);
  const [dueDate, setDueDate] = useState('N/A');
  const [Status, setStatus] = useState('');
  const [monthrecharghe, setmonthrecharge] = useState('N/A');

  // Logic: Fetch Operators
  const CreditCardOpt = useCallback(async (opttype: string) => {
    try {
      const url = `${APP_URLS.getDthOperator}${opttype}`;
      const res = await get({ url });
      if (res) {
        setpath(res['path']);
        setInsuranceOptList(res['myprop2Items'] || []);
      }
    } catch (error) {
      console.error(error);
    }
  }, [get]);

  // Logic: Recent Transactions
  const recenttransactions = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const url = `${APP_URLS.recenttransaction}pageindex=1&pagesize=5&retailerid=${userId}&fromdate=${today}&todate=${today}&role=Retailer&rechargeNo=ALL&status=ALL&OperatorName=ALL&portno=ALL`;
      const response = await get({ url });
      if (response) setHistorylist(response);
    } catch (error) {
      console.log(error);
    }
  }, [get, userId]);

  useEffect(() => {
    CreditCardOpt('DTH');
    recenttransactions();
  }, [CreditCardOpt, recenttransactions]);

  // Logic: Handle Operator Selection
  const selectOperator = (selectedOperator: string) => {
    setselectedOpt(selectedOperator);
    setIsOperatorList(false);
    setOptimg('selectOperatorImage');
  };

  const handleItemPress = (item: any) => {
    setselectedOpt(item['Operatorname']);
    setOptCode(item['OPtCode']);
    setpath(item['path']);
    setIsinfo(false); 
  };

  // Logic: Bill Info
  const billInfo = useCallback(async () => {
    if (!selectedOpt || !consumerNo) return;
    setShowLoader2(true);
    try {
      const url = `${APP_URLS.getdthCustomerInfo}optname=${selectedOpt}&mobileno=${consumerNo}`;
      const res = await post({ url });

      if (res?.status === 'SUCCESS') {
        if (APP_URLS.AppName === 'Recharge Drishti') {
          const amt = res.Response?.monthlyRecharge?.toString() || '0';
          setMonthlyRecharge(amt);
          setAmount(amt);
          setBillDetails(res.Response);
          setBottomSheetVisible2(true);
        } else {
          setCustomerName(res['customerName'] || 'N/A');
          setCustBal(res['balance'] || 0);
          setmonthrecharge(res['monthlyRecharge'] || '0');
          setStatus(res['customerStatus'] || 'Active');
          setDueDate(res['rechargedueDate'] || 'N/A');
          setBottomSheetVisible(true);
        }
      } else {
        ToastAndroid.show(res?.Message || 'Try again later', ToastAndroid.BOTTOM);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setShowLoader2(false);
    }
  }, [selectedOpt, consumerNo, post]);

  // Logic: Final Recharge Press
  const onRechargePress = useCallback(async () => {
    setBottomSheetVisible(false);
    setBottomSheetVisible2(false);
    setShowLoader(true);

    try {
      const mobileNetwork = await getNetworkCarrier();
      const ip = await getMobileIp();
      
      const encryption = await encrypt([
        userId, consumerNo, optcode, Amount,
        Loc_Data?.latitude || '0.0', Loc_Data?.longitude || '0.0',
        'city', 'address', 'postcode', mobileNetwork, ip, '57bea5094fd9082d'
      ]);

      const { encryptedData, keyEncode, ivEncode } = encryption;
      const url = `${APP_URLS.rechTask}rd=${encodeURIComponent(encryptedData[0])}&n=${encodeURIComponent(encryptedData[1])}&ok=${encodeURIComponent(encryptedData[2])}&amn=${Amount}&ip=${encodeURIComponent(encryptedData[10])}&em=57bea5094fd9082d&value1=${encodeURIComponent(keyEncode)}&value2=${encodeURIComponent(ivEncode)}&Latitude=${encodeURIComponent(encryptedData[4])}&Longitude=${encodeURIComponent(encryptedData[5])}`;

      const res = await post({ url });

      navigation.navigate('Rechargedetails', {
        mobileNumber: consumerNo,
        Amount: Amount,
        operator: selectedOpt,
        status: res?.Response || 'Pending',
        Message: res?.Message || 'Recharge Processed',
        reqTime: new Date().toLocaleString(),
      });

      // Clear states after success
      setconsumerNo('');
      setAmount('');
      setselectedOpt(translate('Select Your Operator'));
    } catch (error) {
      Alert.alert("Recharge Error", "Please try again");
    } finally {
      setShowLoader(false);
      recenttransactions();
    }
  }, [Amount, consumerNo, optcode, selectedOpt, userId, Loc_Data, post, navigation, recenttransactions]);

  const validateFields = () => {
    if (selectedOpt === translate('Select Your Operator')) {
      ToastAndroid.show('Please Select an Operator', ToastAndroid.SHORT);
    } else if (!Amount || parseFloat(Amount) <= 0) {
      ToastAndroid.show('Please Enter valid Amount', ToastAndroid.SHORT);
    } else {
      setBottomSheetVisible(true);
    }
  };

  return (
    <View style={styles.main}>
      <AppBarSecond title='Dth Recharge' />

      <View style={styles.container}>
        {showLoader && <ShowLoader />}

        <TouchableOpacity onPress={() => setIsOperatorList(true)}>
          <FlotingInput label={selectedOpt} editable={false} />
          <View style={styles.righticon2}>
            {selectedOpt === translate('Select Your Operator') ? (
              <OnelineDropdownSvg />
            ) : path === null ? (
              <OnelineDropdownSvg />
            ) : (
              <Image style={styles.rightimg} source={{ uri: optimg }} />
            )}
          </View>
        </TouchableOpacity>

        <View>
          <FlotingInput
            label="Customer ID"
            maxLength={12}
            autoCapitalize='characters'
            onChangeTextCallback={text => {
              setconsumerNo(text);
              setIsinfo(text.length >= 5);
            }}
            value={consumerNo}
          />
          <View style={styles.righticon2}>
            {isInfo && (
              <TouchableOpacity
                style={styles.infobtn}
                onPress={billInfo}>
                {showLoader2 ? (
                  <ActivityIndicator size={'small'} color="green" />
                ) : (
                  <Text style={styles.infobtntex}>{translate("Info")}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlotingInput
          label={'Enter Amount'}
          maxLength={5}
          keyboardType="number-pad"
          value={Amount}
          onChangeTextCallback={setAmount}
        />

        <DynamicButton title={'Proceed'} onPress={validateFields} />

        <View>
          <RecentHistory
            isModalVisible={isrecent}
            setModalVisible={setIsrecent}
            historylistdata={historylist}
            onBackdropPress={() => setIsrecent(false)}
          />
          <TouchableOpacity onPress={() => setIsrecent(true)} style={styles.recentviewbtn}>
            <RecentText />
          </TouchableOpacity>
        </View>

        {/* Confirmation Modal */}
        <Rechargeconfirm
          setAmount={(t) => console.log(t)}
          isModalVisible={bottomSheetVisible}
          onBackdropPress={() => setBottomSheetVisible(false)}
          status={Status}
          details={[
            { label: 'User Name', value2: CustomerName },
            { label: 'Customer ID', value: consumerNo },
            { label: 'Due Date', value2: dueDate },
            { label: 'Operator Name', value2: selectedOpt },
            { label: 'Customer Status', value2: Status },
            { label: 'Balance', value2: custBal },
          ]}
          lastlabel={'Transaction Amount'}
          lastvalue={Amount || monthrecharghe}
          onRechargedetails={onRechargePress}
          Lottieimg={require('../../utils/lottieIcons/satellite.json')}
        />

        {/* Bill Info BottomSheet for Recharge Drishti */}
        <BottomSheet 
          isVisible={bottomSheetVisible2} 
          onBackdropPress={() => setBottomSheetVisible2(false)}
          containerStyle={{ paddingHorizontal: wScale(5) }}
        >
          <View style={styles.billSheetContent}>
            <View style={[styles.header, { backgroundColor: color1 }]}>
              <Text style={styles.title}>{selectedOpt} {translate('bill info')}</Text>
              <TouchableOpacity onPress={() => setBottomSheetVisible2(false)}>
                <ClosseModalSvg2 size={40} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: hScale(10) }}>
              <View style={styles.billRow}><Text style={styles.billLabel}>{translate("Name")}</Text><Text style={styles.billValue}>{billDetails.name}</Text></View>
              <View style={styles.billRow}><Text style={styles.billLabel}>{translate("Balance")}</Text><Text style={styles.billValue}>₹{billDetails.balance}</Text></View>
              <View style={styles.billRow}><Text style={styles.billLabel}>{translate("Next_Recharge_Date")}</Text><Text style={styles.billValue}>{billDetails.nextRechargeDate}</Text></View>
              
              <TextInput
                value={monthlyRecharge}
                onChangeText={(text) => {
                  setMonthlyRecharge(text);
                  setAmount(text);
                }}
                keyboardType="number-pad"
                style={[styles.amtInput, { borderColor: colorConfig.primaryColor }]}
              />

              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: colorConfig.primaryColor }]}
                onPress={onRechargePress}
              >
                <Text style={styles.payBtnText}>{translate('Confirm and Pay')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheet>

        <OperatorBottomSheet
          isModalVisible={isOperatorList}
          operatorData={insuranceOptList}
          setModalVisible={setIsOperatorList}
          selectOperator={selectOperator}
          setOperatorcode={setOptCode}
          showState={false}
          selectOperatorImage={setOptimg}
          handleItemPress={handleItemPress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: wScale(20), flex: 1, paddingTop: hScale(30) },
  righticon2: { position: 'absolute', right: 0, height: '80%', justifyContent: 'center', paddingRight: wScale(12) },
  infobtntex: { fontSize: wScale(16), fontWeight: 'bold', color: '#fff', backgroundColor: 'green', paddingHorizontal: wScale(10), paddingVertical: hScale(5), borderRadius: 5 },
  rightimg: { height: wScale(40), width: wScale(40) },
  recentviewbtn: { alignSelf: 'flex-end', marginTop: 10 },
  header: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  title: { color: '#000', flex: 1, fontSize: wScale(18), fontWeight: 'bold' },
  billSheetContent: { backgroundColor: '#fff', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  billRow: { flexDirection: 'row', marginBottom: 8 },
  billLabel: { color: 'black', fontWeight: 'bold', width: '40%' },
  billValue: { color: 'black', width: '60%' },
  amtInput: { borderWidth: 1, borderRadius: 5, paddingLeft: 10, height: 45, marginVertical: 15, color: '#000' },
  payBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', elevation: 3 },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default DthScreen;