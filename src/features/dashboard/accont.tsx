import React, { useMemo, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import LinearGradient from "react-native-linear-gradient";
import { FlashList } from "@shopify/flash-list";

import { RootState } from "../../reduxUtils/store";
import { hScale, wScale } from "../../utils/styles/dimensions";
import { translate } from "../../utils/languageUtils/I18n";
import DashboardHeader from "./components/DashboardHeader";
import { APP_URLS } from "../../utils/network/urls";

import DayEarnsvg from "../drawer/svgimgcomponents/DayEarnsvg";
import DayLedgerSvg from "../drawer/svgimgcomponents/DayLedgerSvg";
import AddedMoneySvg from "../drawer/svgimgcomponents/AddedMoneySvg";
import RToRSvg from "../drawer/svgimgcomponents/RToRSvg";
import FundReceivedSvg from "../drawer/svgimgcomponents/FundReceivedSvg";
import OperatorCommissionSvg from "../drawer/svgimgcomponents/OperatorCommissionSvg";
import ManageAccountSvg from "../drawer/svgimgcomponents/ManageAccountSvg";
import PurchaseOrderSvg from "../drawer/svgimgcomponents/PurchaseOrderSvg";
import DisputeSvg from "../drawer/svgimgcomponents/DisputeSvg";
import OtherLinksSvg from "../drawer/svgimgcomponents/OtherLinksSvg";
import DayBookSvg from "../drawer/svgimgcomponents/DayBookSvg";
import RToRiportSvg from "../drawer/svgimgcomponents/RToRiportSvg";
import Paymentsvg from "../drawer/svgimgcomponents/Paymentsvg";

// ─── Constants (module-level, ek baar hi banta hai) ──────────────────────────
const ICON_COLOR: Record<string, string> = {
  "Day Earning":           "#6EE7B7",
  "Ledger":                "#93C5FD",
  "Day Ledger":            "#93C5FD",
  "Day & Month Book":      "#7DD3FC",
  "Day Book":              "#7DD3FC",
  "Added Money":           "#FCD34D",
  "R TO R":                "#C4B5FD",
  "Credit Report":         "#FCA5A5",
  "Fund Transfer History": "#A5B4FC",
  "R TO R Report":         "#A5B4FC",
  "Fund Receive Report":   "#86EFAC",
  "Operator Commission":   "#FDE68A",
  "Manage A/C":            "#7DD3FC",
  "Purchase order Report": "#D8B4FE",
  "Dispute Report":        "#FCA5A5",
  "Other Links":           "#CBD5E1",
  "Commission Report":     "#FDBA74",
};

const ROUTE_MAP: Record<string, string> = {
  "Day Earning":            "DayEarningReport",
  "Ledger":                 "DayLedgerReport",
  "Day Ledger":             "DayLedgerReport",
  "Day & Month Book":       "DayBookReport",
  "Day Book":               "DayBookReport",
  "Added Money":            "AddedMoneyROTRReport",
  "R TO R":                 "RtorScreen",
  "Fund Transfer History":  "RToRReport",
  "R TO R Report":          "RToRReport",
  "Credit Report":          "CreditReport",
  "Fund Receive Report":    "FundReceivedReport",
  "Operator Commission":    "OperatorCommissionReport",
  "Manage A/C":             "ManageAccount",
  "Purchase order Report":  "PurchaseOrderReport",
  "Dispute Report":         "DisputeReport",
  "Other Links":            "OtherLinks",
  "Commission Report":      "CommissionReport",
};

// Pure function — component tree ke bahar, re-render se immune
const getSvgIcon = (item: string, color: string) => {
  const p = { color, size: 26 };
  switch (item) {
    case "Day Earning":                             return <DayEarnsvg {...p} />;
    case "Ledger": case "Day Ledger":               return <DayLedgerSvg {...p} />;
    case "Day & Month Book": case "Day Book":       return <DayBookSvg {...p} />;
    case "Added Money":                             return <AddedMoneySvg {...p} />;
    case "R TO R":                                  return <RToRSvg {...p} />;
    case "Credit Report": case "Commission Report": return <Paymentsvg {...p} />;
    case "Fund Transfer History": case "R TO R Report": return <RToRiportSvg {...p} />;
    case "Fund Receive Report":                     return <FundReceivedSvg {...p} />;
    case "Operator Commission":                     return <OperatorCommissionSvg {...p} />;
    case "Manage A/C":                              return <ManageAccountSvg {...p} />;
    case "Purchase order Report":                   return <PurchaseOrderSvg {...p} />;
    case "Dispute Report":                          return <DisputeSvg {...p} />;
    case "Other Links":                             return <OtherLinksSvg {...p} />;
    default:                                        return null;
  }
};

// Static gradient arrays — inline likhne se har render pe naya array banta tha
const CARD_GLASS   = ["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"] as const;
const SHIMMER_GRAD = ["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]    as const;
const SHEET_GRAD   = ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"] as const;
const GRAD_START   = { x: 0, y: 0 } as const;
const GRAD_END_D   = { x: 1, y: 1 } as const;
const GRAD_END_V   = { x: 0, y: 1 } as const;

// Spring configs
const SPRING_IN  = { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 } as const;
const SPRING_OUT = { toValue: 1,    useNativeDriver: true, speed: 30, bounciness: 6 } as const;

// ─── Orbs — static layout, no props drilling needed ──────────────────────────
const GlowOrbs = React.memo(({ primaryColor }: { primaryColor: string }) => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <View style={[styles.orb, { top: -80,  left: -80,   width: 260, height: 260, backgroundColor: `${primaryColor}70` }]} />
    <View style={[styles.orb, { top: 180,  right: -100, width: 300, height: 300, backgroundColor: `${primaryColor}22` }]} />
    <View style={[styles.orb, { top: 400,  left: 10,    width: 180, height: 180, backgroundColor: "rgba(5,150,105,0.15)" }]} />
    <View style={[styles.orb, { bottom:80, right: 20,   width: 220, height: 220, backgroundColor: "rgba(219,39,119,0.12)" }]} />
  </View>
));

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps { item: string; onPress: (item: string) => void; }

const AccReportCard = React.memo(({ item, onPress }: CardProps) => {
  const color    = ICON_COLOR[item] ?? "#CBD5E1";
  const scaleRef = useRef(new Animated.Value(1)).current;        // ✅ useRef — no re-create

  // Memoized dynamic styles (color changes nahi, so safe)
  const borderStyle    = useMemo(() => ({ borderColor: `${color}30` }),                    [color]);
  const iconGlowShadow = useMemo(() => ({ shadowColor: color }),                           [color]);
  const iconGradColors = useMemo(() => [`${color}40`, `${color}12`] as [string, string],   [color]);

  const onPressIn  = useCallback(() => Animated.spring(scaleRef, SPRING_IN ).start(), [scaleRef]);
  const onPressOut = useCallback(() => Animated.spring(scaleRef, SPRING_OUT).start(), [scaleRef]);
  const handlePress= useCallback(() => onPress(item), [item, onPress]);

  return (
    <View style={styles.itemWrapper}>
      <Animated.View style={{ transform: [{ scale: scaleRef }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[styles.cardOuter, borderStyle]}
        >
          <LinearGradient colors={CARD_GLASS}   start={GRAD_START} end={GRAD_END_D} style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={SHIMMER_GRAD} start={GRAD_START} end={GRAD_END_V} style={styles.topShimmer} />

          <View style={[styles.iconGlow, iconGlowShadow]}>
            <LinearGradient colors={iconGradColors} start={GRAD_START} end={GRAD_END_D} style={styles.iconInner}>
              {getSvgIcon(item, color)}
            </LinearGradient>
          </View>

          <Text numberOfLines={2} style={styles.itemText}>
            {translate(item)}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const AccReportScreen = () => {
  const navigation                   = useNavigation<any>();
  const { colorConfig, IsDealer }    = useSelector((s: RootState) => s.userInfo);

  const bgGradColors = useMemo(
    () => [colorConfig.primaryColor, colorConfig.secondaryColor] as [string, string],
    [colorConfig.primaryColor, colorConfig.secondaryColor]
  );

  const gridItems = useMemo(() => [
    "Day Earning",
    IsDealer ? "Ledger"             : "Day Ledger",
    IsDealer ? "Day & Month Book"   : "Day Book",
    ...(!IsDealer ? ["Added Money", "R TO R"] : []),
    ...(IsDealer  ? ["Credit Report"]         : []),
    IsDealer ? "Fund Transfer History" : "R TO R Report",
    ...(!IsDealer ? ["Dispute Report"] : []),
    "Fund Receive Report",
    "Operator Commission",
    "Manage A/C",
    "Purchase order Report",
    ...(APP_URLS.AppName === "Maxus Pay" ? ["Commission Report"] : []),
    ...(!IsDealer ? ["Other Links"] : []),
  ], [IsDealer]);

  const handlePress  = useCallback((item: string) => {
    const route = ROUTE_MAP[item];
    if (route) navigation.navigate(route);
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: string }) => <AccReportCard item={item} onPress={handlePress} />,
    [handlePress]
  );

  return (
    <View style={styles.main}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={bgGradColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <GlowOrbs primaryColor={colorConfig.primaryColor} />
      <DashboardHeader />

      <View style={styles.sheet}>
        <LinearGradient colors={SHEET_GRAD} start={GRAD_START} end={GRAD_END_V} style={StyleSheet.absoluteFillObject} />
        <View style={styles.sheetTopLine} />
        <FlashList
          data={gridItems}
          renderItem={renderItem}
          keyExtractor={(_, i) => String(i)}
          numColumns={3}
          estimatedItemSize={118}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === "android"}
          drawDistance={400}
        />
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  main:        { flex: 1 },
  orb:         { position: "absolute", borderRadius: 999 },

  sheet: {
    flex: 1, marginTop: hScale(8),
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", borderBottomWidth: 0,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    //shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  sheetTopLine: {
    position: "absolute", top: 0, left: "20%", right: "20%", zIndex: 1,
    height: 1.5, backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 999,
  },
  listContent: {
    paddingTop: hScale(16), paddingHorizontal: wScale(8), paddingBottom: hScale(100),
  },

  itemWrapper: { flex: 1, padding: wScale(5) },
  cardOuter: {
    borderRadius: 20, height: hScale(110), overflow: "hidden",
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: wScale(4), borderWidth: 1,
    shadowColor: "rgba(255,255,255,0.6)",
   // shadowOffset: { width: 0, height: -1 }, shadowOpacity: 1, shadowRadius: 0,
    //elevation: 4,
  },
  topShimmer: {
    position: "absolute", top: 0, left: 0, right: 0, height: hScale(40),
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  iconGlow: {
    marginBottom: hScale(8),
    //shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 8, elevation: 6,
  },
  iconInner: {
    height: hScale(46), width: hScale(46), borderRadius: 13,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  itemText: {
    color: "rgba(255,255,255,0.92)", fontSize: wScale(13), textAlign: "center",
    fontWeight: "bold", lineHeight: hScale(14), paddingHorizontal: 2,
    textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
});

export default AccReportScreen;