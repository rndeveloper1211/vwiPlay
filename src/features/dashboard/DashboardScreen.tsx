import React, { useCallback, useMemo } from "react";
import { Alert, Animated, StyleSheet, Text, Pressable } from "react-native";
import { CurvedBottomBar } from "react-native-curved-bottom-bar";
import WalletScreen from "./WalletScreen";
import HomeScreen from "./HomeScreen";
import ReportScreen from "./ReportScreen";
import { wScale } from "../../utils/styles/dimensions";
import { colors } from "../../utils/styles/theme";
import { TabComponent } from "./components/TabComponent";
import AccReportScreen from "./accont";
import { translate } from "../../utils/languageUtils/I18n";

// ✅ Module-level — render pe kabhi nahi banega
const TAB_MAP: Record<string, { title: string; icon: string }> = {
  HomeScreen:      { title: translate("dashboard.Home"),    icon: "home"   },
  WalletScreen:    { title: translate("dashboard.Wallet"),  icon: "wallet" },
  ReportScreen:    { title: translate("dashboard.Report"),  icon: "report" },
  AccReportScreen: { title: translate("dashboard.Account"), icon: "login"  },
};

// ✅ Screen components module-level — arrow function nahi
//    component={() => <HomeScreen />} = har navigate pe remount 🔴
//    component={HomeScreen} = stable reference ✅
const HomeComp      = () => <HomeScreen />;
const WalletComp    = () => <WalletScreen />;
const ReportComp    = () => <ReportScreen />;
const AccReportComp = () => <AccReportScreen />;

export default function DashboardScreen() {

  // ✅ useCallback + TAB_MAP — switch gone
  const renderIcon = useCallback((routeName: string) => {
    const tab = TAB_MAP[routeName] ?? TAB_MAP.HomeScreen;
    return <Text>{tab.title}</Text>;
  }, []);

  const renderTabBar = useCallback(
    ({ routeName, selectedTab, navigate }) => (
      <Pressable onPress={() => navigate(routeName)} style={styles.tabbarItem}>
        {renderIcon(routeName)}
      </Pressable>
    ),
    [renderIcon],
  );

  // ✅ renderCircle useCallback — stable reference
  const renderCircle = useCallback(
    ({ selectedTab, navigate }) => (
      <Animated.View style={styles.btnCircleUp}>
        <Pressable
          style={styles.button}
          onPress={() => Alert.alert(translate("Click Action"))}
        >
          <Text>{translate("dashboard.Scan QR")}</Text>
        </Pressable>
      </Animated.View>
    ),
    [],
  );

  return <TabComponent />;
}

export const styles = StyleSheet.create({
  shawdow: {
    shadowColor:   "#DDDDDD",
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius:  5,
  },
  button:      { flex: 1, justifyContent: "center" },
  bottomBar:   { marginBottom: wScale(20), justifyContent: "center" },
  btnCircleUp: {
    width: wScale(70), height: wScale(70),
    borderRadius: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.module_light_pink,
    bottom: 30,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 1,
  },
  tabbarItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  img:        { width: 30, height: 30 },
});