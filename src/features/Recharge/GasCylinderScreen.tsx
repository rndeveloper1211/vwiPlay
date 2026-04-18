import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { BottomSheet } from '@rneui/themed';
import { FlashList } from '@shopify/flash-list';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utils & Hooks
import { translate } from '../../utils/languageUtils/I18n';
import { APP_URLS } from '../../utils/network/urls';
import useAxiosHook from '../../utils/network/AxiosClient';
import { useDeviceInfoHook } from '../../utils/hooks/useDeviceInfoHook';
import { useLocationHook } from '../../utils/hooks/useLocationHook';
import { encrypt } from '../../utils/encryptionUtils';
import { RootState } from '../../reduxUtils/store';
import { SCREEN_HEIGHT, hScale, wScale } from '../../utils/styles/dimensions';

// Components
import AppBarSecond from '../drawer/headerAppbar/AppBarSecond';
import ShowLoader from '../../components/ShowLoder';
import FlotingInput from '../drawer/securityPages/FlotingInput';
import OnelineDropdownSvg from '../drawer/svgimgcomponents/simpledropdown';
import DynamicButton from '../drawer/button/DynamicButton';
import RecentHistory from '../../components/RecentHistoryBottomSheet';
import Rechargeconfirm from '../../components/Rechargeconfirm';
import ClosseModalSvg2 from '../drawer/svgimgcomponents/ClosseModal2';
import RecentText from '../../components/RecentText';

const GasCylinderScreen = () => {
  const navigation = useNavigation<any>();
  const { get, post } = useAxiosHook();
  const { getNetworkCarrier, getMobileIp } = useDeviceInfoHook();
  const { userId, colorConfig } = useSelector((state: RootState) => state.userInfo);
  
  // UI & Design
  const color1 = useMemo(() => `${colorConfig.secondaryColor}20`, [colorConfig.secondaryColor]);

  // Modal Visibility States
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [ProceedSheetVisible, setProceedSheetVisible] = useState(false);
  const [showStateList, setshowStateList] = useState(false);
  const [showdistrictData, setshowdistrictData] = useState(false);
  const [isrecent, setIsrecent] = useState(false);
  
  // Loader States
  const [showLoader, setShowLoader] = useState(false);
  const [showLoader2, setShowLoader2] = useState(false);

  // Form States
  const [stateData, setStateData] = useState(translate('Select Your State'));
  const [district, setdistrict] = useState('Select Your District');
  const [operator, setCylenderBillOpt] = useState('Select Your Operator');
  const [CustomerID, setCustomerID] = useState('');
  const [amount, setAmount] = useState('');
  const [distributorId, setdistributorId] = useState('');
  const [MobileNumber, setMobileNumber] = useState('');
  const [distCode, setDistCode] = useState('');
  
  // Bill Details
  const [CustomerName, setCustomerName] = useState('N/A');
  const [dueDate, setDueDate] = useState('Date');
  const [custBal, setCustBal] = useState<any>(0);
  
  // List Data
  const [statelist, setstatelist] = useState([]);
  const [districtData, setdistrictData] = useState([]);
  const [GasCylenderBillOpt, setGasCylenderBillOpt] = useState([]);
  const [historylist, setHistorylist] = useState([]);
  
  // Logic Control
  const [selectedBharat, setSeleectedBharat] = useState(false);
  const [selectbool, setSelectbool] = useState(true);
  const [isInfo, setIsinfo] = useState(false);
  const [ddlStatus, setDdlStatus] = useState('Hp');
  const [selectedFilter, setSelectedFilter] = useState('Hp');
  const [reqId, setReqId] = useState('');
  const [reqTime, setReqTime] = useState('');

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
      console.log(error);
    }
  }, [get, userId, formattedDate]);

  const Statelist = useCallback(async () => {
    try {
      const res = await post({ url: APP_URLS.gasCylinderState });
      if (res?.data) setstatelist(res.data);
    } catch (error) {
      console.error(error);
    }
  }, [post]);

  useEffect(() => {
    Statelist();
    recenttransactions();
  }, [Statelist, recenttransactions]);

  const fatchDist = async (state: string) => {
    try {
      const url = `${APP_URLS.DistrictByState}${state}`;
      const res = await post({ url });
      if (res?.data) setdistrictData(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const billInfo = async () => {
    if (!CustomerID) return;
    setShowLoader2(true);
    try {
      const url = `${APP_URLS.rechargeViewBill}billnumber=${CustomerID}&Operator=${distCode}&billunit&ProcessingCycle&acno&lt&ViewBill=Y`;
      const res = await get({ url });
      if (res.RESULT == 0) {
        setDueDate(res['rechargedueDate']);
        setCustomerName(res['customerName']);
        setCustBal(res['balance']);
        setBottomSheetVisible(true);
      } else {
        Alert.alert('Info', res.ADDINFO || "No information found");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setShowLoader2(false);
    }
  };

  const onRechargePress = useCallback(async () => {
    setShowLoader(true);
    try {
      const locationStr = await AsyncStorage.getItem('locationData');
      const loc = locationStr ? JSON.parse(locationStr) : { latitude: '0.0', longitude: '0.0' };
      const mobileNetwork = await getNetworkCarrier();
      const ip = await getMobileIp();

      const encryption = await encrypt([
        userId, CustomerID, operator, amount,
        loc.latitude, loc.longitude, 'city', 'address', 'postcode',
        mobileNetwork, ip, '57bea5094fd9082d'
      ]);

      const enc = encryption.encryptedData;
      const url = `${APP_URLS.rechTask}rd=${encodeURIComponent(enc[0])}&n=${encodeURIComponent(enc[1])}&ok=${encodeURIComponent(enc[2])}&amn=${amount}&pc=${distributorId}&bu=${MobileNumber}&ip=${encodeURIComponent(enc[10])}&em=57bea5094fd9082d&Latitude=${encodeURIComponent(enc[4])}&Longitude=${encodeURIComponent(enc[5])}&value1=${encodeURIComponent(encryption.keyEncode)}&value2=${encodeURIComponent(encryption.ivEncode)}&billduedate=${dueDate}`;

      const res = await post({ url });

      navigation.navigate('Rechargedetails', {
        mobileNumber: CustomerID,
        Amount: amount,
        operator: operator,
        status: res.Response || 'Pending',
        reqId: reqId,
        reqTime: reqTime,
        Message: res.Message || 'Transaction Processed'
      });

      // Reset
      setCustomerID('');
      setAmount('');
      setCylenderBillOpt('Select Your Operator');
    } catch (error) {
      Alert.alert("Error", "Transaction failed");
    } finally {
      setShowLoader(false);
      recenttransactions();
    }
  }, [amount, CustomerID, operator, userId, post, navigation, recenttransactions, distributorId, MobileNumber, dueDate, reqId, reqTime]);

  // --- Helper Functions ---

  const getHpAgency = async (stateName: string, dist: string) => {
    try {
      const url = `${APP_URLS.hpAgency}statename=${stateName}&District=${dist}`;
      const res = await post({ url });
      setGasCylenderBillOpt(res['data'] || []);
      setSelectbool(false);
    } catch (error) { console.log(error); }
  };

  const getIn = async (stateName: string, dist: string) => {
    try {
      const url = `${APP_URLS.getIndaneAgency}statename=${stateName}&District=${dist}`;
      const res = await post({ url });
      setGasCylenderBillOpt(res['data'] || []);
      setSelectbool(false);
    } catch (error) { console.log(error); }
  };

  const handlePressOptions = (key: string) => {
    setSelectedFilter(key);
    setDdlStatus(key);
    setSeleectedBharat(key === 'Bharat');
  };

  const showBottomSheetList = () => (
    <FlashList
      data={selectbool ? districtData : GasCylenderBillOpt}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.operatorview}
          onPress={() => {
            if (selectbool) {
              setdistrict(item);
              if (ddlStatus === 'Hp') getHpAgency(stateData, item);
              else if (ddlStatus === 'Indian') getIn(stateData, item);
            } else {
              setDistCode(item['Distcode']);
              setCylenderBillOpt(item['Name']);
              setshowdistrictData(false);
              setSelectbool(true);
            }
          }}>
          <Text style={styles.operatornametext}>{selectbool ? item : item['Name']}</Text>
        </TouchableOpacity>
      )}
      estimatedItemSize={60}
    />
  );

  return (
    <View style={styles.main}>
      <AppBarSecond title={'Gas Cylinder'} />

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={100}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
      >
        <View style={styles.row}>
          {['Hp', 'Indian', 'Bharat'].map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.button, { backgroundColor: selectedFilter === key ? 'green' : 'lightgreen' }]}
              onPress={() => handlePressOptions(key)}
            >
              <Text style={styles.buttonText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.container}>
          {showLoader && <ShowLoader />}

          {!selectedBharat && (
            <>
              <TouchableOpacity onPress={() => setshowStateList(true)}>
                <FlotingInput label={stateData} editable={false} />
                <View style={styles.righticon2}><OnelineDropdownSvg /></View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setshowdistrictData(true)}>
                <FlotingInput label={district} editable={false} />
                <View style={styles.righticon2}><OnelineDropdownSvg /></View>
              </TouchableOpacity>

              <View>
                <FlotingInput label={operator} editable={false} />
                <View style={styles.righticon2}><OnelineDropdownSvg /></View>
              </View>
            </>
          )}

          {selectedBharat && (
            <>
              <FlotingInput label={'Agency Code'} keyboardType="numeric" onChangeTextCallback={setdistributorId} value={distributorId} />
              <FlotingInput label={'Mobile Number'} keyboardType="numeric" maxLength={10} onChangeTextCallback={setMobileNumber} value={MobileNumber} />
            </>
          )}

          <View style={{ position: 'relative' }}>
            <FlotingInput
              label={'Customer Id'}
              value={CustomerID}
              keyboardType="numeric"
              maxLength={12}
              onChangeTextCallback={text => {
                setCustomerID(text);
                setIsinfo(text.length >= 5);
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

          <FlotingInput
            label={'Enter Amount'}
            value={amount}
            keyboardType="numeric"
            onChangeTextCallback={text => setAmount(text.replace(/\D/g, ""))}
          />

          <DynamicButton title={'Next'} onPress={() => setProceedSheetVisible(true)} />

          <TouchableOpacity onPress={() => setIsrecent(true)} style={styles.recentviewbtn}>
            <RecentText />
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Modals outside ScrollView */}
      <RecentHistory isModalVisible={isrecent} setModalVisible={setIsrecent} historylistdata={historylist} onBackdropPress={() => setIsrecent(false)} />

      <Rechargeconfirm
        Lottieimg={require('../../utils/lottieIcons/loan.json')}
        isModalVisible={ProceedSheetVisible}
        onBackdropPress={() => setProceedSheetVisible(false)}
        details={[
          { label: 'User Name', value2: CustomerName },
          { label: 'Customer ID', value: CustomerID },
          { label: 'Due Date', value2: dueDate },
          { label: 'Operator Name', value2: operator },
        ]}
        lastlabel={'Transaction Amount'}
        lastvalue={amount}
        onRechargedetails={onRechargePress}
      />

      <BottomSheet isVisible={showdistrictData} onBackdropPress={() => setshowdistrictData(false)}>
        <View style={styles.bottomsheetview}>
          <View style={[styles.StateTitle, { backgroundColor: color1 }]}>
            <Text style={styles.stateTitletext}>{selectbool ? "Select Your District" : "Select Your Operator"}</Text>
            <TouchableOpacity onPress={() => setshowdistrictData(false)}><ClosseModalSvg2 /></TouchableOpacity>
          </View>
          {showBottomSheetList()}
        </View>
      </BottomSheet>

      <BottomSheet isVisible={showStateList} onBackdropPress={() => setshowStateList(false)}>
        <View style={styles.bottomsheetview}>
          <View style={[styles.StateTitle, { backgroundColor: color1 }]}>
            <Text style={styles.stateTitletext}>{translate("Select Your State")}</Text>
            <TouchableOpacity onPress={() => setshowStateList(false)}><ClosseModalSvg2 /></TouchableOpacity>
          </View>
          <FlashList
            data={statelist}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.operatorview} onPress={() => { setshowStateList(false); setStateData(item); fatchDist(item); }}>
                <Text style={styles.operatornametext}>{item}</Text>
              </TouchableOpacity>
            )}
            estimatedItemSize={60}
          />
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: wScale(20), paddingTop: wScale(10), flex: 1 },
  righticon2: { position: "absolute", right: 0, height: "85%", justifyContent: "center", paddingRight: wScale(12) },
  infobtn: { alignItems: 'center' },
  infobtntex: { fontSize: wScale(18), fontWeight: 'bold', color: '#fff', backgroundColor: 'green', paddingHorizontal: wScale(13), paddingVertical: hScale(5), borderRadius: 5 },
  recentviewbtn: { alignSelf: 'flex-end', marginTop: 15 },
  operatorview: { paddingHorizontal: wScale(15), borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  operatornametext: { textTransform: "capitalize", fontSize: wScale(18), color: "#000", paddingVertical: hScale(20) },
  bottomsheetview: { backgroundColor: "#fff", height: SCREEN_HEIGHT / 1.5, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  StateTitle: { paddingVertical: hScale(12), borderTopLeftRadius: 15, borderTopRightRadius: 15, justifyContent: "space-between", alignItems: "center", flexDirection: "row", paddingHorizontal: wScale(15) },
  stateTitletext: { fontSize: wScale(20), color: "#000", fontWeight: "bold" },
  button: { flex: 1, marginHorizontal: 5, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default GasCylinderScreen;