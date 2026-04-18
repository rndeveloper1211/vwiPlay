import React, { useState, useCallback, useRef } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WalletSvg from "../features/drawer/svgimgcomponents/Walletsvg";
import { hScale, wScale } from "../utils/styles/dimensions";
import { colors } from "../utils/styles/theme";
import { RootState } from "../reduxUtils/store";
import { useSelector } from "react-redux";
import OnelineDropdownSvg from "../features/drawer/svgimgcomponents/simpledropdown";
import { APP_URLS, IMAGE_BASE_URL } from "../utils/network/urls";
import { decryptData } from "../utils/encryptionUtils";
import useAxiosHook from "../utils/network/AxiosClient";
import ShowLoaderBtn from './ShowLoaderBtn';
import { useFocusEffect } from '@react-navigation/native';
import { translate } from '../utils/languageUtils/I18n';

// ✅ Selector bahar — har render pe naya function nahi banega
const selectConfig = (s: RootState) => ({
  secondaryColor: s.userInfo.colorConfig.secondaryColor,
  IsDealer:       s.userInfo.IsDealer,
});

const AllBalance = () => {
  const { secondaryColor, IsDealer } = useSelector(selectConfig);
  const color1 = `${secondaryColor}33`;

  const [openDropdown, setOpenDropdown] = useState(false);
  const [balanceInfo, setBalanceInfo]   = useState<any>(null);

  // ✅ Flag — pehli baar hi call hogi, har focus pe nahi
  const hasFetched = useRef(false);

  const { get } = useAxiosHook();

  // ✅ useCallback stable — get aur IsDealer pe depend
  const getData = useCallback(async () => {
    try {
      const userInfoRes = await get({ url: APP_URLS.getUserInfo });
      const userData    = userInfoRes.data;
      const { kkkk: key, vvvv: iv } = userData;

      if (!IsDealer) {
        const response = await get({ url: APP_URLS.balanceInfo });
        setBalanceInfo(response.data?.[0] ?? {});
      } else {
        setBalanceInfo({
          adminfarmname: decryptData(key, iv, userData.adminfarmname),
          posremain:     decryptData(key, iv, userData.posremain),
          remainbal:     decryptData(key, iv, userData.remainbal),
          frmanems:      decryptData(key, iv, userData.frmanems),
        });
      }
    } catch (error: any) {
      const msg = error?.message === "Network Error"
        ? "Please check your internet connection."
        : "Something went wrong. Try again later.";
      Alert.alert("Error", msg);
    }
  }, [get, IsDealer]);

  // ✅ Sirf pehli baar fetch — dobara focus pe skip
  useFocusEffect(
    useCallback(() => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      getData();
    }, [getData])
  );

  // ✅ useCallback — stable reference
  const toggleDropdown = useCallback(() => {
    setOpenDropdown(prev => !prev);
  }, []);

  const totalBalance =
    (Number(balanceInfo?.posremain) || 0) +
    (Number(balanceInfo?.remainbal) || 0);

  return (
    <ImageBackground
      source={{ uri: IMAGE_BASE_URL + 'WalletBalBg.jpeg' }}
      imageStyle={styles.borderRadius}
    >
      <View style={[styles.headerview, styles.borderRadius, { backgroundColor: color1 }]}>
        <TouchableOpacity style={styles.headertop} onPress={toggleDropdown}>

          <View style={styles.imgview}>
            <WalletSvg size={wScale(30)} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.headertop}>
              <Text style={styles.balanceTitle}>{translate("Wallet Balance")}</Text>

              <TouchableOpacity
                style={[styles.dropbtn, openDropdown && styles.rotated]}
                onPress={toggleDropdown}
              >
                <OnelineDropdownSvg />
              </TouchableOpacity>

              {balanceInfo
                ? <Text style={styles.total}>₹{totalBalance}</Text>
                : (
                  <View style={styles.loaderWrap}>
                    <ShowLoaderBtn color={secondaryColor} size={30} />
                  </View>
                )
              }
            </View>

            {openDropdown && (
              <View>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceTitle}>{translate("Main Wallet")}</Text>
                  <Text style={styles.balanceValue}>₹{balanceInfo?.remainbal || 0}</Text>
                </View>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceTitle}>{translate("POS Balance")}</Text>
                  <Text style={styles.balanceValue}>₹{balanceInfo?.posremain || 0}</Text>
                </View>
              </View>
            )}
          </View>

        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

export default AllBalance;

const styles = StyleSheet.create({
  headerview:   { paddingTop: hScale(20), paddingHorizontal: wScale(15), paddingBottom: hScale(20) },
  headertop:    { flexDirection: "row", alignItems: 'center' },
  imgview:      { borderWidth: wScale(1), borderRadius: 30, marginRight: wScale(15), borderColor: colors.black75, height: wScale(45), width: wScale(45), alignItems: "center", justifyContent: "center" },
  dropbtn:      { marginLeft: wScale(5), paddingHorizontal: 10 },
  rotated:      { transform: [{ rotate: "180deg" }] },  // ✅ inline object nahi
  balanceCard:  { alignItems: "center", marginTop: hScale(5), flexDirection: "row", justifyContent: "space-between" },
  balanceTitle: { fontSize: wScale(16), color: colors.black },
  balanceValue: { fontSize: wScale(20), fontWeight: "bold", color: colors.black },
  total:        { fontSize: wScale(22), fontWeight: "bold", color: colors.black, flex: 1, textAlign: "right" },
  loaderWrap:   { flex: 1, alignItems: 'flex-end' },
  borderRadius: { borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
});