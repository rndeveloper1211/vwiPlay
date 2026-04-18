import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { translate } from '../../utils/languageUtils/I18n';
import { APP_URLS } from '../../utils/network/urls';
import useAxiosHook from '../../utils/network/AxiosClient';
import { useDeviceInfoHook } from '../../utils/hooks/useDeviceInfoHook';
import { useSelector } from 'react-redux';
import { RootState } from '../../reduxUtils/store';
import { useLocationHook } from '../../utils/hooks/useLocationHook';
import { encrypt } from '../../utils/encryptionUtils';
import { hScale, wScale } from '../../utils/styles/dimensions';
import AppBarSecond from '../drawer/headerAppbar/AppBarSecond';
import FlotingInput from '../drawer/securityPages/FlotingInput';
import DynamicButton from '../drawer/button/DynamicButton';
import RecentHistory from '../../components/RecentHistoryBottomSheet';
import OperatorBottomSheet from '../../components/OperatorBottomSheet';
import Rechargeconfirm from '../../components/Rechargeconfirm';
import OnelineDropdownSvg from '../drawer/svgimgcomponents/simpledropdown';
import { useNavigation } from '@react-navigation/native';
import ShowLoader from '../../components/ShowLoder';
import RecentText from '../../components/RecentText';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomerParam {
  dataType: string;
  maxLength: number;
  minLength: number;
  visibility: boolean;
  optional: string;
  paramName: string;
  regex: string;
  values: string;
}

interface OperatorItem {
  Operatorname: string;
  OPtCode: string;
  customerparams?: CustomerParam[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTodayFormatted = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const DEFAULT_OPERATOR_LABEL = translate('Select Your Operator');

// ─── Component ────────────────────────────────────────────────────────────────
const LoanScreen = () => {
  // ── Core fields
  const [CustomerID, setCustomerID]     = useState('');
  const [amount, setAmount]             = useState('');
  const [FastagOpt, setFastagOpt]       = useState<string>(DEFAULT_OPERATOR_LABEL);
  const [optcode, setOptCode]           = useState('');

  // ── Sheet visibility
  const [ProceedSheetVisible, setProceedSheetVisible] = useState(false);
  const [LandLineOPSheet, setLandLineOPSheet]         = useState(false);
  const [isrecent, setIsrecent]                       = useState(false);

  // ── Operator list
  const [LoanBillOperators, setLoanBillOperators] = useState<OperatorItem[]>([]);

  // ── Customer-param fields (first param)
  const [paramname,   setParamName]   = useState('Customer ID');
  const [maxlength,   setMaxLength]   = useState<number>(0);
  const [datatype,    setDataType]    = useState('');
  const [minlength,   setMinLength]   = useState<number>(0);
  const [optional,    setOptional]    = useState('');
  const [values,      setValues]      = useState('');
  const [regx,        setRegx]        = useState('');
  const [visibility,  setVisibility]  = useState(false);

  // ── Second param
  const [accntvisivility, setAccntvisivility] = useState(false);
  const [accnumhint,      setAccnumhint]      = useState('');
  const [accnumval,       setAccnumval]        = useState(''); // separate value state
  const [accmaxlength,    setAccmaxlength]    = useState(0);
  const [keyType2,        setKeyType2]        = useState<'default' | 'numeric'>('default');

  // ── Third param
  const [accntvisivility2, setAccntvisivility2] = useState(false);
  const [accnumhint2,      setAccnumhint2]      = useState('');
  const [accnumval2,       setAccnumval2]        = useState('');
  const [accmaxlength2,    setAccmaxlength2]    = useState(0);
  const [keyType3,         setKeyType3]         = useState<'default' | 'numeric'>('default');

  // ── Bill info display
  const [dueDate,      setDueDate]      = useState('Date');
  const [CustomerName, setCustomerName] = useState('N/A');
  const [custBal,      setCustBal]      = useState(translate('Balance'));
  const [Status,       setStatus]       = useState(translate('Status'));
  const [viewbillStatus, setviewbillStatus] = useState('');

  // ── UI state
  const [isInfo,      setIsInfo]      = useState(false);
  const [showLoader,  setShowLoader]  = useState(false);
  const [showLoader2, setShowLoader2] = useState(false);

  // ── Recent history
  const [historylist, setHistorylist] = useState<any[]>([]);
  const [reqTime,     setReqTime]     = useState('');
  const [reqId,       setReqId]       = useState('');

  // ── Hooks
  const { get, post }                          = useAxiosHook();
  const { getNetworkCarrier, getMobileIp }     = useDeviceInfoHook();
  const { userId, Loc_Data }                   = useSelector((state: RootState) => state.userInfo);
  const { latitude, longitude }                = useLocationHook();
  const navigation                             = useNavigation<any>();

  // ── Memory-leak guard: track mounted state
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Today's date — computed once per mount, not on every render
  const formattedDate = useMemo(() => getTodayFormatted(), []);

  // ─── Fetch operators ────────────────────────────────────────────────────────
  const getLoanBillOperators = useCallback(async () => {
    try {
      const url = `${APP_URLS.getDthOperator}Loan`;
      const response = await get({ url });
      if (!isMounted.current) return;
      setLoanBillOperators(response?.myprop2Items ?? []);
    } catch (e) {
      console.error('getLoanBillOperators:', e);
    }
  }, [get]);

  // ─── Recent transactions ────────────────────────────────────────────────────
  const recenttransactions = useCallback(async () => {
    try {
      const url =
        `${APP_URLS.recenttransaction}pageindex=1&pagesize=5` +
        `&retailerid=${userId}&fromdate=${formattedDate}&todate=${formattedDate}` +
        `&role=Retailer&rechargeNo=ALL&status=ALL&OperatorName=ALL&portno=ALL`;

      const response = await get({ url });
      if (!isMounted.current) return;

      setHistorylist(response ?? []);

      // Guard: response may be empty
      if (Array.isArray(response) && response.length > 0) {
        setReqTime(response[0]['Reqesttime'] ?? '');
        setReqId(response[0]['Request_ID'] ?? '');
      }
    } catch (error) {
      console.error('recenttransactions:', error);
    }
  }, [get, userId, formattedDate]);

  useEffect(() => {
    getLoanBillOperators();
    recenttransactions();
  }, [getLoanBillOperators, recenttransactions]);

  // ─── View-bill status check ─────────────────────────────────────────────────
  const ViewbillInfoStatus = useCallback(async (code: string) => {
    if (!code) return;
    try {
      const url = `${APP_URLS.viewbillstatuscheck}${code}`;
      const res  = await post({ url });
      if (!isMounted.current) return;
      setviewbillStatus(res?.['RESULT'] ?? '');
    } catch (_) {}
  }, [post]);

  // ─── Bill info fetch ────────────────────────────────────────────────────────
  const billInfo = useCallback(async (): Promise<boolean> => {
    try {
      const url =
        `${APP_URLS.rechargeViewBill}billnumber=${CustomerID}` +
        `&Operator=${optcode}&billunit=&ProcessingCycle=&acno=&lt=&ViewBill=Y`;

      const res    = await get({ url });
      if (!isMounted.current) return false;

      const result = res?.['RESULT'];
      const resp   = res?.['ADDINFO'];

      if (result === '0') {
        const billinfo = resp?.['BillInfo'] ?? {};
        setDueDate(billinfo['billDueDate'] ?? 'Date');
        setAmount(billinfo['billAmount']   ?? '');
        setCustomerName(billinfo['customerName']   ?? 'N/A');
        setCustBal(billinfo['balance']     ?? translate('Balance'));
        setStatus(billinfo['customerStatus'] ?? translate('Status'));
        return true;
      } else {
        ToastAndroid.show(
          resp?.Message ?? 'No message available',
          ToastAndroid.CENTER,
        );
        return false;
      }
    } catch (error) {
      console.error('billInfo:', error);
      return false;
    }
  }, [get, CustomerID, optcode]);

  // ─── Proceed / Pay ──────────────────────────────────────────────────────────
  const handlePayPress = useCallback(async () => {
    if (FastagOpt === DEFAULT_OPERATOR_LABEL) {
      ToastAndroid.show(translate('Please Select an Operator'), ToastAndroid.SHORT);
      return;
    }
    if (!CustomerID) {
      ToastAndroid.showWithGravity(
        `Please Enter ${paramname}`,
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      return;
    }
    if (!amount || amount === '0' || parseFloat(amount) <= 0) {
      ToastAndroid.showWithGravity(
        'Please Enter the Recharge Amount',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      return;
    }

    // Open confirm sheet only after a successful billInfo fetch
    const success = await billInfo();
    if (isMounted.current && success) {
      setProceedSheetVisible(true);
    }
  }, [FastagOpt, CustomerID, paramname, amount, billInfo]);

  // ─── Recharge submit ────────────────────────────────────────────────────────
  const onRechargePress = useCallback(async () => {
    setProceedSheetVisible(false);
    setShowLoader(true);

    let status  = 'Unknown';
    let Message = 'No message available';

    try {
      const mobileNetwork = await getNetworkCarrier();
      const ip            = await getMobileIp();

      const encryption = await encrypt([
        userId,
        paramname,
        optcode,
        amount,
        Loc_Data['latitude'],
        Loc_Data['longitude'],
        'city',
        'address',
        'postcode',
        mobileNetwork,
        ip,
        '57bea5094fd9082d',
      ]);

      const encode = (i: number) => encodeURIComponent(encryption.encryptedData[i]);

      const rd          = encode(0);
      const n1          = encode(1);
      const ok1         = encode(2);
      const ip1         = encode(10);
      const devtoken    = encode(6);
      const Latitude    = encode(4);
      const Longitude   = encode(5);
      const ModelNo     = encode(11);
      const PostalCode  = encode(8);
      const InternetTYPE = encode(9);
      const Addresss    = encode(7);
      const City        = devtoken;
      const em          = '57bea5094fd9082d';
      const value1      = encodeURIComponent(encryption.keyEncode);
      const value2      = encodeURIComponent(encryption.ivEncode);

      const url =
        `${APP_URLS.rechTask}rd=${rd}&n=${n1}&ok=${ok1}&amn=${amount}` +
        `&pc=${accnumval}&bu=${accnumval2}&acno&lt&ip=${ip1}&mc&em=${em}` +
        `&offerprice&commAmount&Devicetoken=${devtoken}&Latitude=${Latitude}` +
        `&Longitude=${Longitude}&ModelNo=${ModelNo}&City=${City}` +
        `&PostalCode=${PostalCode}&InternetTYPE=${InternetTYPE}&Addresss=${Addresss}` +
        `&value1=${value1}&value2=${value2}`;

      const res = await post({ url });

      if (!isMounted.current) return;

      if (res?.status === 'False') {
        alert(res.message);
        setShowLoader(false);
        return;
      }

      status  = res?.Response ?? 'Unknown';
      Message = res?.Message  ?? 'No message available';

      await recenttransactions();
    } catch (error) {
      console.error('onRechargePress:', error);
      status  = 'Failed';
      Message = 'Recharge failed, please try again';
    }

    if (!isMounted.current) return;

    // Reset form
    setCustomerID('');
    setFastagOpt(DEFAULT_OPERATOR_LABEL);
    setAmount('');
    setIsInfo(false);
    setShowLoader(false);

    navigation.navigate('Rechargedetails', {
      mobileNumber: CustomerID ?? '',
      Amount:       amount     ?? 0,
      operator:     FastagOpt  ?? 'N/A',
      status,
      reqId:   reqId   ?? '',
      reqTime: reqTime ?? new Date().toISOString(),
      Message,
    });
  }, [
    amount,
    accnumval,
    accnumval2,
    getMobileIp,
    getNetworkCarrier,
    paramname,
    optcode,
    post,
    userId,
    Loc_Data,
    CustomerID,
    FastagOpt,
    reqId,
    reqTime,
    recenttransactions,
    navigation,
  ]);

  // ─── Clear all operator-param state ────────────────────────────────────────
  const clearParamState = useCallback(() => {
    setDataType('');   setMaxLength(0);  setMinLength(0);
    setOptional('');   setParamName(''); setValues('');
    setRegx('');       setVisibility(false); setOptCode('');
    setFastagOpt(DEFAULT_OPERATOR_LABEL);

    setAccntvisivility(false);  setAccnumhint('');   setAccnumval('');
    setAccmaxlength(0);         setKeyType2('default');

    setAccntvisivility2(false); setAccnumhint2('');  setAccnumval2('');
    setAccmaxlength2(0);        setKeyType3('default');
  }, []);

  // ─── Operator selected from bottom sheet ───────────────────────────────────
  const handleItemPress = useCallback(async (item: OperatorItem) => {
    setLandLineOPSheet(false);
    setFastagOpt(item['Operatorname']);
    setOptCode(item['OPtCode']);

    // Fire-and-forget — no need to await; doesn't block UI
    ViewbillInfoStatus(item['OPtCode']);

    const custparam = item.customerparams;
    if (!custparam || custparam.length === 0) {
      clearParamState();
      return;
    }

    // First param (always present)
    setDataType(custparam[0]['dataType']);
    setMaxLength(custparam[0]['maxLength']);
    setMinLength(custparam[0]['minLength']);
    setVisibility(custparam[0]['visibility']);
    setOptional(custparam[0]['optional']);
    setParamName(custparam[0]['paramName']);
    setRegx(custparam[0]['regex']);
    setValues(custparam[0]['values']);

    const toKeyboardType = (dt: string): 'default' | 'numeric' =>
      dt === 'ALPHANUMERIC' ? 'default' : 'numeric';

    if (custparam.length >= 2) {
      setAccnumhint(custparam[1]['paramName']);
      setAccmaxlength(custparam[1]['maxLength']);
      setKeyType2(toKeyboardType(custparam[1]['dataType']));
      setAccntvisivility(true);
    } else {
      setAccntvisivility(false);
    }

    if (custparam.length >= 3) {
      setAccnumhint2(custparam[2]['paramName']);
      setAccmaxlength2(custparam[2]['maxLength']);
      setKeyType3(toKeyboardType(custparam[2]['dataType']));
      setAccntvisivility2(true);
    } else {
      setAccntvisivility2(false);
    }
  }, [ViewbillInfoStatus, clearParamState]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.main}>
      <AppBarSecond title={'Loan Screen'} />

      <View style={styles.container}>
        {showLoader && <ShowLoader />}

        {/* Operator selector */}
        <TouchableOpacity onPress={() => setLandLineOPSheet(true)}>
          <FlotingInput label={FastagOpt} editable={false} />
          <View style={styles.righticon2}>
            <OnelineDropdownSvg />
          </View>
        </TouchableOpacity>

        {/* Customer ID / primary param */}
        <View>
          <FlotingInput
            label={paramname}
            value={CustomerID}
            maxLength={maxlength || undefined}
            onChangeTextCallback={(text: string) => {
              setCustomerID(text);
              setIsInfo(text.length >= 5);
            }}
          />
          <View style={styles.righticon2}>
            {isInfo && (
              <TouchableOpacity style={styles.infobtn} onPress={billInfo}>
                {showLoader2
                  ? <ActivityIndicator size="large" />
                  : <Text style={styles.infobtntex}>{translate('Info')}</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Second param */}
        {accntvisivility && (
          <FlotingInput
            label={accnumhint}
            value={accnumval}
            maxLength={accmaxlength}
            keyboardType={keyType2}
            onChangeTextCallback={(text: string) => setAccnumval(text)}
          />
        )}

        {/* Third param */}
        {accntvisivility2 && (
          <View>
            <FlotingInput
              label={accnumhint2}
              value={accnumval2}
              maxLength={accmaxlength2}
              keyboardType={keyType3}
              onChangeTextCallback={(text: string) => setAccnumval2(text)}
            />
            <View style={styles.righticon2}>
              <TouchableOpacity>
                <Text style={styles.infobtntex}>{translate('Info')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Amount */}
        <FlotingInput
          label={'Enter Amount'}
          maxLength={5}
          value={amount}
          keyboardType="number-pad"
          onChangeTextCallback={(text: string) => setAmount(text)}
        />

        <DynamicButton title={'Next'} onPress={handlePayPress} />

        {/* Recent history */}
        <View>
          <RecentHistory
            isModalVisible={isrecent}
            setModalVisible={setIsrecent}
            historylistdata={historylist}
            onBackdropPress={() => setIsrecent(false)}
          />
          <TouchableOpacity
            onPress={() => setIsrecent(true)}
            style={styles.recentviewbtn}
          >
            <RecentText />
          </TouchableOpacity>
        </View>

        {/* Operator bottom sheet */}
        <OperatorBottomSheet
          isModalVisible={LandLineOPSheet}
          operatorData={LoanBillOperators}
          stateData={[]}
          selectedOperator={FastagOpt}
          setModalVisible={setLandLineOPSheet}
          selectOperator={(op: string) => { setFastagOpt(op); setLandLineOPSheet(false); }}
          setOperatorcode={setOptCode}
          setOperator={(name: string) => setFastagOpt(name)}
          setCircle={() => {}}
          setState={() => {}}
          selectOperatorImage={() => {}}
          path={''}
          showState={false}
          handleItemPress={handleItemPress}
        />

        {/* Confirm bottom sheet */}
        <Rechargeconfirm
          Lottieimg={require('../../utils/lottieIcons/loan.json')}
          isModalVisible={ProceedSheetVisible}
          onBackdropPress={() => setProceedSheetVisible(false)}
          status={Status}
          details={[
            { label: 'User Name',        value2: CustomerName },
            { label: 'Customer ID',      value:  CustomerID   },
            { label: 'Due Date',         value2: dueDate      },
            { label: 'Operator Name',    value2: FastagOpt    },
            { label: 'Customer Status',  value2: Status       },
          ]}
          lastlabel={'Transaction Amount'}
          lastvalue={amount}
          onRechargedetails={() => {
            if (!amount || amount === '0') {
              ToastAndroid.showWithGravity(
                'Please Enter Amount',
                ToastAndroid.SHORT,
                ToastAndroid.BOTTOM,
              );
            } else {
              onRechargePress();
            }
          }}
        />
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    paddingHorizontal: wScale(20),
    paddingTop:        wScale(30),
    flex: 1,
  },
  righticon2: {
    position:      'absolute',
    left:          'auto',
    right:         wScale(0),
    top:           hScale(0),
    height:        '85%',
    alignItems:    'flex-end',
    justifyContent:'center',
    paddingRight:  wScale(12),
  },
  infobtn: {
    alignItems: 'center',
  },
  infobtntex: {
    fontSize:          wScale(18),
    fontWeight:        'bold',
    color:             '#fff',
    backgroundColor:   'green',
    paddingHorizontal: wScale(13),
    paddingVertical:   hScale(5),
    borderRadius:      5,
  },
  recentviewbtn: {
    alignSelf:     'flex-end',
    flexDirection: 'row',
  },
});

export default LoanScreen;