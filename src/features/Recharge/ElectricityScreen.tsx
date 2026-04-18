import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// Utils & Hooks
import { translate } from '../../utils/languageUtils/I18n';
import { APP_URLS } from '../../utils/network/urls';
import useAxiosHook from '../../utils/network/AxiosClient';
import { useDeviceInfoHook } from '../../utils/hooks/useDeviceInfoHook';
import { encrypt } from '../../utils/encryptionUtils';
import { hScale, wScale } from '../../utils/styles/dimensions';
import { RootState } from '../../reduxUtils/store';
import { useLocationHook } from '../../hooks/useLocationHook';

// Components
import DynamicButton from '../drawer/button/DynamicButton';
import AppBarSecond from '../drawer/headerAppbar/AppBarSecond';
import FlotingInput from '../drawer/securityPages/FlotingInput';
import OnelineDropdownSvg from '../drawer/svgimgcomponents/simpledropdown';
import ElectricityOperatorBottomSheet from '../../components/ElectricityOperatorBottomSheet';
import Rechargeconfirm from '../../components/Rechargeconfirm';
import RecentHistory from '../../components/RecentHistoryBottomSheet';
import ShowLoader from '../../components/ShowLoder';
import RecentText from '../../components/RecentText';

const ElectricityScreen = () => {
  const navigation = useNavigation<any>();
  const { get, post } = useAxiosHook();
  const { getNetworkCarrier, getMobileIp } = useDeviceInfoHook();
  const { latitude, longitude } = useLocationHook();
  const { userId, Loc_Data, colorConfig } = useSelector((state: RootState) => state.userInfo);

  // Modal Visibility States
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [isvisible, setIsvisible] = useState(false);
  const [isrecent, setIsrecent] = useState(false);
  
  // Loader States
  const [showLoader, setShowLoader] = useState(false);
  const [showLoader2, setShowLoader2] = useState(false);

  // Form & Data States
  const [stateName, setStateName] = useState('Select Your State & Operator');
  const [opt, setopt] = useState(translate('Select Your Operator'));
  const [optcode, setoptcode] = useState('');
  const [consumerNo, setconsumerNo] = useState('');
  const [amount, setAmount] = useState('');
  const [billAmount, setbillAmount] = useState('');
  
  // Bill Info States
  const [CustomerName, setCustomerName] = useState('');
  const [dueDate, setDueDate] = useState('N/A');
  const [custBal, setCustBal] = useState('N/A');
  const [Status, setstatus] = useState(translate('Status'));
  
  // List States
  const [stateslist, setstateslist] = useState([]);
  const [operatorList, setoperatorList] = useState([]);
  const [historylist, setHistorylist] = useState([]);
  const [reqId, setReqId] = useState('');
  const [reqTime, setReqTime] = useState('');

  // Dynamic Label State
  const [paramname, setParamName] = useState('Customer ID');
  const [isInfo, setIsinfo] = useState(false);
  const [accntvisivility, setAccntvisivility] = useState(false);
  const [accntvisivility2, setAccntvisivility2] = useState(false);
  const [accnumhint, setAccnumhint] = useState('');
  const [accnumhint2, setAccnumhint2] = useState('');
  const [agencyCode, setAgencyCode] = useState('');
  const [agencyCode2, setAgencyCode2] = useState('');

  // Memoized Formatted Date
  const formattedDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
  }, []);

  // --- API LOGIC ---

  const recenttransactions = useCallback(async () => {
    try {
      const url = `${APP_URLS.recenttransaction}pageindex=1&pagesize=5&retailerid=${userId}&fromdate=${formattedDate}&todate=${formattedDate}&role=Retailer&rechargeNo=ALL&status=ALL&OperatorName=ALL&portno=ALL`;
      const response = await get({ url });
      if (response && response.length > 0) {
        setHistorylist(response);
        setReqTime(response[0]['Reqesttime']);
        setReqId(response[0]['Request_ID']);
      }
    } catch (error) {
      console.log("History Error:", error);
    }
  }, [get, userId, formattedDate]);

  const stateList = useCallback(async () => {
    try {
      const data = await get({ url: APP_URLS.statelist });
      setstateslist(data || []);
    } catch (error) {
      console.error('State List Error:', error);
    }
  }, [get]);

  useEffect(() => {
    stateList();
    recenttransactions();
  }, [stateList, recenttransactions]);

  const billInfo = async () => {
    setShowLoader2(true);
    try {
      const url = `${APP_URLS.rechargeViewBill}billnumber=${consumerNo}&Operator=${optcode}&billunit=${agencyCode}&ProcessingCycle&acno&lt&ViewBill=Y`;
      const res = await get({ url });

      if (res?.RESULT === 0) {
        const billinfoo = res.ADDINFO?.BillInfo;
        setDueDate(billinfoo?.billDueDate || 'N/A');
        setAmount(billinfoo?.billAmount?.toString() || '');
        setbillAmount(billinfoo?.billAmount?.toString() || '');
        setCustomerName(billinfoo?.customerName || 'N/A');
        setCustBal(billinfoo?.balance || 'N/A');
        setstatus(res?.customerStatus || 'Active');
        setBottomSheetVisible(true);
      } else {
        Alert.alert(res?.ADDINFO?.ERRORMSG || "Error", res?.ADDINFO?.Message || "Unable to fetch bill");
      }
    } catch (error) {
      console.log("Bill Info Error:", error);
    } finally {
      setShowLoader2(false);
    }
  };

  const onRechargePress = useCallback(async () => {
    setBottomSheetVisible(false);
    setShowLoader(true);

    try {
      const mobileNetwork = await getNetworkCarrier();
      const ip = await getMobileIp();
      const lat = Loc_Data?.latitude || '0.0';
      const long = Loc_Data?.longitude || '0.0';

      const encryption = encrypt([
        userId, consumerNo, optcode, (amount || billAmount),
        lat, long, 'city', 'address', 'postcode',
        mobileNetwork, ip, '57bea5094fd9082d'
      ]);

      const enc = encryption.encryptedData;
      const url = `${APP_URLS.rechTask}rd=${encodeURIComponent(enc[0])}&n=${encodeURIComponent(enc[1])}&ok=${encodeURIComponent(enc[2])}&amn=${amount || billAmount}&pc=${agencyCode}&bu=${agencyCode2}&ip=${encodeURIComponent(enc[10])}&em=57bea5094fd9082d&Latitude=${encodeURIComponent(enc[4])}&Longitude=${encodeURIComponent(enc[5])}&value1=${encodeURIComponent(encryption.keyEncode)}&value2=${encodeURIComponent(encryption.ivEncode)}&billduedate=${dueDate}`;

      const res = await post({ url });

      if (res.status === 'False') {
        Alert.alert("Alert", res.message);
      } else {
        navigation.navigate('Rechargedetails', {
          mobileNumber: consumerNo,
          Amount: amount || billAmount,
          operator: opt,
          status: res.Response || 'Success',
          reqId: res.RequestID || '',
          reqTime: new Date().toLocaleString(),
          Message: res.Message || 'Recharge Successful'
        });
        
        // Reset Form
        setconsumerNo('');
        setAmount('');
        setbillAmount('');
        setStateName('Select Your State & Operator');
      }
    } catch (error) {
      Alert.alert("Error", "Recharge transaction failed");
    } finally {
      setShowLoader(false);
      recenttransactions();
    }
  }, [amount, billAmount, consumerNo, optcode, userId, Loc_Data, post, navigation, recenttransactions, agencyCode, agencyCode2, dueDate, opt]);

  const GetOptlist = async (state_id: any) => {
    setoperatorList([]);
    setopt('Select Your Operator');
    try {
      const url = `${APP_URLS.electricity_opt_Via_StateId}${state_id}`;
      const dataa = await get({ url });
      setoperatorList(dataa?.myprop2Items || []);
    } catch (error) {
      console.error('Opt List Error:', error);
    }
  };

  const handleItemPress = (item: any) => {
    setAccntvisivility(false);
    setAccntvisivility2(false);
    const custparam = item.customerparams;

    if (custparam && custparam.length > 0) {
      setParamName(custparam[0]?.paramName || 'Consumer Number');
      if (custparam.length >= 2) {
        setAccnumhint(custparam[1].paramName);
        setAccntvisivility(true);
      }
      if (custparam.length >= 3) {
        setAccnumhint2(custparam[2].paramName);
        setAccntvisivility2(true);
      }
    }
  };

  return (
    <View style={styles.main}>
      <AppBarSecond title='Electricity Recharge' />
      
      <View style={styles.container}>
        {showLoader && <ShowLoader />}

        {/* State/Operator Selector */}
        <TouchableOpacity onPress={() => setIsvisible(true)}>
          <FlotingInput
            label={stateName}
            labelinputstyle={stateName !== "Select Your State & Operator" ? styles.labelinputstyle : null}
            editable={false}
          />
          {opt !== "Select Your Operator" && (
            <Text style={[styles.circletext, { color: colorConfig.primaryColor }]}>{opt}</Text>
          )}
          <View style={styles.righticon2}>
            <OnelineDropdownSvg />
          </View>
        </TouchableOpacity>

        {/* Dynamic Inputs Based on Operator */}
        {accntvisivility && (
          <FlotingInput 
            label={accnumhint} 
            value={agencyCode} 
            onChangeTextCallback={setAgencyCode}
            autoCapitalize='characters'
          />
        )}

        {accntvisivility2 && (
          <FlotingInput 
            label={accnumhint2} 
            value={agencyCode2} 
            onChangeTextCallback={setAgencyCode2}
            autoCapitalize='characters'
          />
        )}

        <ElectricityOperatorBottomSheet
          showState={false}
          isModalVisible={isvisible}
          stateData={stateslist}
          setModalVisible={setIsvisible}
          setOperatorcode={setoptcode}
          setOperator={setopt}
          operatorData={operatorList}
          GetOptlist={GetOptlist}
          handleItemPress={handleItemPress}
          setState={setStateName}
        />

        {/* Consumer ID Input */}
        <View>
          <FlotingInput
            label={paramname}
            autoCapitalize='characters'
            value={consumerNo}
            onChangeTextCallback={text => {
              setconsumerNo(text);
              setIsinfo(text.length >= 1);
            }}
          />
          <View style={styles.righticon2}>
            {isInfo && (
              <TouchableOpacity style={styles.infobtn} onPress={billInfo}>
                {showLoader2 ? <ActivityIndicator color="green" /> : <Text style={styles.infobtntex}>{translate("Info")}</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Amount Input */}
        <FlotingInput
          label={'Enter Amount'}
          maxLength={5}
          keyboardType="number-pad"
          value={amount || billAmount || ''}
          onChangeTextCallback={setAmount}
        />

        <DynamicButton
          title='Next'
          onPress={() => {
            if (stateName.includes('Select')) return ToastAndroid.show('Select State/Operator', ToastAndroid.SHORT);
            if (!amount && !billAmount) return ToastAndroid.show('Enter Amount', ToastAndroid.SHORT);
            setBottomSheetVisible(true);
          }}
        />

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

        <Rechargeconfirm
          Lottieimg={require('../../utils/lottieIcons/light-bulb.json')}
          isModalVisible={bottomSheetVisible}
          onBackdropPress={() => setBottomSheetVisible(false)}
          status={Status}
          details={[
            { label: 'User Name', value2: CustomerName || 'N/A' },
            { label: 'Customer ID', value: consumerNo },
            { label: 'Due Date', value2: dueDate || 'N/A' },
            { label: 'Operator Name', value2: opt },
            { label: 'Customer Status', value2: Status || 'N/A' },
            { label: 'Bill Amount', value2: billAmount || 'N/A' },
          ]}
          lastlabel={'Transaction Amount'}
          lastvalue={amount || billAmount}
          onRechargedetails={onRechargePress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: wScale(20), flex: 1, paddingTop: hScale(30) },
  labelinputstyle: { fontSize: wScale(20), fontWeight: "bold", marginTop: hScale(-7) },
  circletext: { position: "absolute", top: hScale(38), paddingLeft: wScale(15), fontSize: wScale(12) },
  righticon2: { position: "absolute", right: 0, height: "85%", justifyContent: "center", paddingRight: wScale(12) },
  infobtn: { alignItems: 'center' },
  infobtntex: { fontSize: wScale(18), fontWeight: 'bold', color: '#fff', backgroundColor: 'green', paddingHorizontal: wScale(13), paddingVertical: hScale(5), borderRadius: 5 },
  recentviewbtn: { alignSelf: 'flex-end', flexDirection: 'row', marginTop: 10 },
});

export default ElectricityScreen;