import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  Alert, ToastAndroid,
} from "react-native";
import { APP_URLS } from "../../utils/network/urls";
import useAxiosHook from "../../utils/network/AxiosClient";
import FlotingInput from "../drawer/securityPages/FlotingInput";
import { colors, FontFamily, FontSize } from "../../utils/styles/theme";
import { hScale, wScale } from "../../utils/styles/dimensions";
import DynamicButton from "../drawer/button/DynamicButton";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { decryptData, encrypt } from "../../utils/encryptionUtils";
import AppBarSecond from "../drawer/headerAppbar/AppBarSecond";
import { useSelector } from "react-redux";
import { RootState } from "../../reduxUtils/store";
import { FlashList } from "@shopify/flash-list";
import AmountDropdown from "./walletnewdropdown";
import uuid from "react-native-uuid";
import { useDeviceInfoHook } from "../../utils/hooks/useDeviceInfoHook";
import AllBalance from "../../components/AllBalance";
import ShowLoaderBtn from "../../components/ShowLoaderBtn";
import { translate } from "../../utils/languageUtils/I18n";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

// ✅ Selector bahar — stable reference
const selectUserInfo = (s: RootState) => ({
  colorConfig: s.userInfo.colorConfig,
  IsDealer:    s.userInfo.IsDealer,
  Loc_Data:    s.userInfo.Loc_Data,
});

// ✅ Static data bahar — render pe nahi banega
const AMOUNT_OPTIONS = [
  "UPI", "Credit Card", "Debit Card", "Net Banking",
  "Request to Master", "Request to Distributor", "Request to Admin",
];

const CHARGE_METHODS = [
  "UPI",
  "Debit Card Up to 2000",
  "Debit Card Above 2000",
  "Credit Card",
  "NetBanking",
] as const;

const WalletScreen = () => {
  const { colorConfig, IsDealer, Loc_Data } = useSelector(selectUserInfo);
  const { latitude, longitude }             = Loc_Data;
  const navigation                          = useNavigation<any>();

  // ✅ Sirf ek useAxiosHook — get aur post dono ek se
  const { get, post } = useAxiosHook();
  const { getNetworkCarrier, getMobileIp, getMobileDeviceId } = useDeviceInfoHook();

  const [amount,                setAmount]                = useState("");
  const [Mode,                  setMode]                  = useState("");
  const [editMode,              setEditMode]              = useState(false);
  const [isload,                setIsload]                = useState(false);
  const [upich,                 setUpich]                 = useState(null);
  const [texterror,             setTexterror]             = useState(false);
  const [decryptedWalletCharges,setDecryptedWalletCharges]= useState<any>(null);
  const [errorText,             setErrorText]             = useState("");
  const [paymentMode,           setPaymentMode]           = useState("");
  const [chargeType,            setChargeType]            = useState("");
  const [charges,               setCharges]               = useState([]);

  // ✅ useMemo — chargesData derived from decryptedWalletCharges, no useState needed
  const chargesData = useMemo(() => {
    const api    = decryptedWalletCharges?.data;
    const apiUPI = decryptedWalletCharges?.dataUPI;

    return CHARGE_METHODS.map((method) => {
      switch (method) {
        case "UPI":
          return { method: translate(method), min: apiUPI?.min ?? 0,  variable: apiUPI?.Charge ?? 0 };
        case "Debit Card Up to 2000":
          return { method: translate(method), min: "N/A", variable: api?.debitupto2000 ?? 0 };
        case "Debit Card Above 2000":
          return { method: translate(method), min: "N/A", variable: api?.debitabove2000 ?? 0 };
        case "Credit Card":
          return { method: translate(method), min: "N/A", variable: api?.creditcard ?? 0 };
        case "NetBanking":
          return { method: translate(method), min: "N/A", variable: api?.netbanking ?? 0 };
        default:
          return { method: translate(method), min: "", variable: "" };
      }
    });
  }, [decryptedWalletCharges]);

  // ✅ color1 memoized
  const color1 = useMemo(
    () => `${colorConfig.secondaryColor}20`,
    [colorConfig.secondaryColor]
  );

  // ✅ getData2 + getData merge — ek hi API call getUserInfo
  const fetchInitialData = useCallback(async () => {
    try {
      const [walletRes, upiRes] = await Promise.all([
        get({ url: "Common/api/data/Wallet_ALL_Charges_Show" }),
        get({ url: APP_URLS.upicharges }),
        ...(!IsDealer ? [get({ url: APP_URLS.balanceInfo })] : []),
      ]);

      const walletCharges = JSON.parse(
        decryptData(walletRes.kkkk, walletRes.vvvv, walletRes.WalletCharges)
      );
      setDecryptedWalletCharges(walletCharges);
      setUpich(upiRes);

    } catch (error: any) {
      console.error("fetchInitialData error:", error);
      if (error?.message === "Network Error") {
        Alert.alert(translate("Error"), translate("Please check your internet connection."));
      }
    }
  }, [get, IsDealer]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // ✅ Focus pe sirf state reset — no API call
  useFocusEffect(
    useCallback(() => {
      setAmount("");
      setMode("");
      setChargeType("");
      setEditMode(false);
      setErrorText("");
    }, [])
  );

  const gatewaytype = useCallback(async (type: string) => {
    setErrorText("");
    try {
      const data = await post({ url: `${APP_URLS.Chkpayu}type=${type}` });
      if (data?.Response === "Success") {
        ToastAndroid.showWithGravity(
          data?.Message || `${type} ${translate("status is OK.")}`,
          ToastAndroid.LONG, ToastAndroid.BOTTOM,
        );
        setEditMode(true);
      } else {
        setErrorText(data?.Message || translate("Something went wrong!"));
        setEditMode(false);
        setAmount("");
      }
    } catch {
      setErrorText(translate("key_networker_55"));
      setEditMode(false);
      setAmount("");
    }
  }, [post]);

  const checkUPIStatus = useCallback(async (amt: string) => {
    setErrorText("");
    try {
      const [selfRes, qrRes] = await Promise.all([
        post({ url: APP_URLS.selfupiintent }),
        post({ url: `${APP_URLS.UPIQR}?amount=${amt}` }),
      ]);

      const isSelfOK = selfRes?.status === true && selfRes?.name === "VASTBAZAAR";
      const isQROK   = qrRes?.status === true && qrRes?.qrstatus === "OK";

      setEditMode(isSelfOK || isQROK);

      if (!isSelfOK) setErrorText(selfRes?.msg?.trim() || translate("Self UPI status failed."));
      else if (!isQROK) setErrorText(qrRes?.msg?.trim() || translate("QR UPI status failed."));

      setAmount("");
    } catch {
      setEditMode(false);
      setAmount("");
      setErrorText(translate("key_something_93"));
    }
  }, [post]);

  const Apitransitionsencrypt = useCallback(async (type: string, data1: any) => {
    try {
      const id            = uuid.v4().toString().substring(0, 16);
      const mobileNetwork = await getNetworkCarrier();
      const ip            = await getMobileIp();
      const model         = await getMobileDeviceId();

      const encryption = await encrypt([
        type, model, latitude || 0, longitude || 0,
        model, "city", "postcode", mobileNetwork, ip, "Address",
      ]);

      const [typee, , lat, long, Model2, city, postcode, mobileNetwork2, ip2, address] =
        encryption.encryptedData;

      const url = `${APP_URLS.sendgatewayReq}txtamt=${encodeURIComponent(amount)}&txnid=${encodeURIComponent(id)}&ddltypes=${encodeURIComponent(typee)}&Devicetoken=${encodeURIComponent(ip2)}&Latitude=${encodeURIComponent(lat)}&Longitude=${encodeURIComponent(long)}&ModelNo=${encodeURIComponent(Model2)}&City=${encodeURIComponent(city)}&PostalCode=${encodeURIComponent(postcode)}&InternetTYPE=${encodeURIComponent(mobileNetwork2)}&IP=${encodeURIComponent(ip2)}&Addresss=${encodeURIComponent(address)}&value1=${encodeURIComponent(encryption.keyEncode)}&value2=${encodeURIComponent(encryption.ivEncode)}`;

      const data = await post({ url });

      if (data["Status"] === "Success") {
        navigation.navigate("SeamlessScreen", {
          payUParam: Object.assign({}, data, data1, { amount }),
        });
      } else {
        Alert.alert(
          translate("Payment Failed"),
          `Transaction failed. Reason: ${data["message"] || data["txnid"]}`,
          [{ text: translate("OK") }],
          { cancelable: false },
        );
      }
    } catch (error: any) {
      Alert.alert(translate("Error"), `Something went wrong: ${error.message}`,
        [{ text: translate("OK") }], { cancelable: false });
    }
  }, [amount, navigation, latitude, longitude]);

  const getCharges = useCallback(async (amt: string) => {
    try {
      const userInfo = await get({ url: `${APP_URLS.addmoneyChg}${amt}` });
      setCharges(Object.entries(userInfo.WalletChargesenc));
      setIsload(false);
    } catch (error) {
      console.error("getCharges error:", error);
    }
  }, [get]);

  const handleModeChange = useCallback((mode: string) => {
    setErrorText("");
    setTexterror(false);

    const modeMap: Record<string, () => void> = {
      "UPI":                    () => { checkUPIStatus(amount); setPaymentMode("UPI");                  setChargeType("UPI"); },
      "Net Banking":            () => { gatewaytype("NB");      setPaymentMode("Net Banking");           setChargeType("NetBanking"); },
      "Debit Card":             () => { gatewaytype("DC");      setPaymentMode("Debit Card");            setChargeType("Debit_Card"); },
      "Credit Card":            () => { gatewaytype("CC");      setPaymentMode("Credit Card");           setChargeType("Credit_Card"); },
      "Request to Admin":       () => { setPaymentMode("Request to Admin");       setChargeType("Request to Admin"); setEditMode(true); },
      "Request to Distributor": () => { setPaymentMode("Request to Distributor"); setChargeType("Request to Admin"); setEditMode(true); },
      "Request to Master":      () => { setPaymentMode("Request to Distributor"); setChargeType("Request to Admin"); setEditMode(true); },
    };

    modeMap[mode]?.();
  }, [amount, checkUPIStatus, gatewaytype]);

  const onpressbtn = useCallback(() => {
    if (!amount?.trim()) {
      ToastAndroid.show(translate("Please enter an amount"), ToastAndroid.SHORT);
      return;
    }
    if (Mode === "Request to Admin") {
      navigation.navigate("ReqToAdmin", { amount, type: "Admin" });
    } else if (Mode === "Request to Distributor") {
      navigation.navigate("ReqToAdmin", { amount, type: "Distributor" });
    } else {
      navigation.navigate("AddMoneyOptions", { amount, jsonData: charges, paymentMode, chargeType, from: "abc" });
    }
    setAmount("");
  }, [amount, Mode, navigation, charges, paymentMode, chargeType]);

  // ✅ renderItem bahar — no re-create on render
  const renderChargeItem = useCallback(({ item }: any) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.paymentCell, { backgroundColor: `${colorConfig.secondaryColor}99` }]}>
        {item.method}
      </Text>
      <Text style={[styles.cell, styles.minCell, { backgroundColor: `${colorConfig.secondaryColor}80` }]}>
        {item.min}
      </Text>
      <Text style={[styles.cell, styles.variableCell, { backgroundColor: `${colorConfig.secondaryColor}66` }]}>
        {item.variable}
      </Text>
    </View>
  ), [colorConfig.secondaryColor]);

  return (
    <View style={styles.main}>
      <AppBarSecond title={"wallet"} />
      <AllBalance />

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={150}
      >
        <View style={styles.container}>

          <AmountDropdown
            value={Mode}
            options={AMOUNT_OPTIONS}
            onSelect={(val) => { setMode(val); handleModeChange(val); }}
          />

          {!!errorText && <Text style={styles.errortext}>⚠️ {errorText}</Text>}

          <FlotingInput
            keyboardType="number-pad"
            maxLength={6}
            label={"Enter Amount"}
            value={amount}
            editable={editMode}
            onChangeTextCallback={(text) => {
              setAmount(String(text));
              setTexterror(!text);
              if (text) getCharges(text);
            }}
            autoFocus={texterror}
          />

          {texterror && (
            <Text style={styles.errortext}>{translate("key_pleaseent_70")}</Text>
          )}

          <DynamicButton
            styleoveride={{ marginTop: hScale(8) }}
            onPress={onpressbtn}
            title={isload ? <ShowLoaderBtn size="large" /> : "Add Money"}
          />

          {/* Charges Table */}
          <View style={styles.chargeContainer}>
            <Text style={styles.title}>{translate("Following Charges are Applicable")}</Text>

            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>{translate("Payment Method")}</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>{translate("Min Charge")}</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>{translate("Charges(%)")}</Text>
            </View>

            <View style={styles.flex}>
              <FlashList
                data={chargesData}
                estimatedItemSize={50}
                keyExtractor={(_, i) => String(i)}
                renderItem={renderChargeItem}
              />
            </View>
          </View>

        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  main:          { flex: 1, backgroundColor: colors.white },
  flex:          { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 200 },
  container:     { backgroundColor: colors.white, paddingHorizontal: wScale(10), flex: 1, marginTop: hScale(15) },
  errortext:     { color: colors.red_deactivated, fontSize: wScale(FontSize.regular), marginTop: hScale(-10), marginBottom: hScale(15), fontFamily: FontFamily.italic },
  chargeContainer: { backgroundColor: "#ddd", borderRadius: wScale(10), paddingHorizontal: wScale(5), elevation: 2, flex: 1, paddingBottom: hScale(10), marginTop: hScale(20) },
  title:         { fontSize: wScale(18), fontWeight: "600", textAlign: "center", marginBottom: hScale(5), color: "#000", marginTop: hScale(5) },
  headerRow:     { flexDirection: "row", backgroundColor: "#2d2d3a", borderTopLeftRadius: wScale(8), borderTopRightRadius: wScale(8), justifyContent: "center", alignItems: "center", paddingVertical: hScale(5) },
  headerCell:    { color: "#fff", fontSize: wScale(14), textAlign: "center" },
  row:           { flexDirection: "row", minHeight: hScale(45) },
  cell:          { paddingVertical: hScale(10), paddingHorizontal: wScale(8), fontSize: wScale(14), color: "#fff", textAlignVertical: "center", borderBottomWidth: wScale(0.5), borderColor: "#ddd" },
  paymentCell:   { flex: 2 },
  minCell:       { flex: 1, textAlign: "center" },
  variableCell:  { flex: 1, textAlign: "center" },
});

export default WalletScreen;