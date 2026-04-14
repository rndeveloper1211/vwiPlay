import React, { memo, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  Alert,
  Image,
} from "react-native";
import { SvgUri } from "react-native-svg";
import { FlashList } from "@shopify/flash-list";
import { useSelector } from "react-redux";
import { RootState } from "../../../reduxUtils/store";
import { wScale } from "../../../utils/styles/dimensions";
import { sectionData } from "../utils";
import { useNavigation } from "@react-navigation/native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { colors } from "../../../utils/styles/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_URLS } from "../../../utils/network/urls";
import useAxiosHook from "../../../utils/network/AxiosClient";
import { translate } from "../../../utils/languageUtils/I18n";

// ─── Constants ───────────────────────────────────────────────
const MAX_ITEMS = 4;
const LOADER_DATA = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];
const COMING_SOON_SCREENS = [
  "BusinessCardScreen",
  "GiftCardScreen",
  "PrepaidCardScreen",
  "FlightScreen",
  "TrainScreen",
  "HotelScreen",
  "BusScreen",
];

// ─── SVG → PNG URL Converter ─────────────────────────────────
const svgToPngUrl = (svgUrl: string): string => {
  if (!svgUrl) return "";
  return `https://images.weserv.nl/?url=${encodeURIComponent(svgUrl)}&output=png&w=100&h=100&fit=contain`;
};

// ─── Types ────────────────────────────────────────────────────
interface IconButtonsProps {
  getItem: () => void;
  isQuickAccess: boolean;
  iconButtonstyle?: object;
  buttonData: sectionData[];
  showViewMoreButton?: boolean;
  setViewMoreStatus?: (fn: (prev: boolean) => boolean) => void;
  buttonTitle?: string;
}

// ─── Smart Icon ───────────────────────────────────────────────
// PNG try karta hai → fail ho toh SvgUri fallback
const SmartIcon = memo(
  ({ uri }: { uri: string }) => {
    const [useFallback, setUseFallback] = useState(false);

    if (!uri) return null;

    // ❌ PNG fail → SvgUri use karo (original)
    if (useFallback) {
      return (
        <SvgUri
          height={wScale(50)}
          width={wScale(50)}
          uri={uri}
        />
      );
    }

    // ✅ Pehle PNG try karo (fast + cached)
    return (
      <Image
        source={{ uri: svgToPngUrl(uri) }}
        style={styles.iconImage}
        resizeMode="contain"
        onError={() => setUseFallback(true)}
      />
    );
  },
  (prev, next) => prev.uri === next.uri
);

// ─── Skeleton Loader ─────────────────────────────────────────
const SkeletonLoader = memo(() => (
  <View style={{ flexDirection: "row" }}>
    {LOADER_DATA.map((item) => (
      <View key={item.id} style={{ marginHorizontal: wScale(18) }}>
        <SkeletonPlaceholder
          speed={1200}
          backgroundColor={colors.gray}
          borderRadius={4}
        >
          <SkeletonPlaceholder.Item alignItems="center">
            <SkeletonPlaceholder.Item
              width={wScale(45)}
              height={wScale(45)}
              borderRadius={wScale(45)}
            />
            <SkeletonPlaceholder.Item
              margin={wScale(10)}
              width={wScale(40)}
              height={wScale(10)}
            />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
    ))}
  </View>
));

// ─── Main Component ───────────────────────────────────────────
const IconButtons = ({
  getItem,
  isQuickAccess,
  iconButtonstyle,
  buttonData,
  setViewMoreStatus = () => {},
  buttonTitle = "",
}: IconButtonsProps) => {
  const { isDemoUser } = useSelector(
    (state: RootState) => state.userInfo
  );

  const { post } = useAxiosHook();
  const navigation = useNavigation();

  // ─── Fetch Initial Data ──────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        await post({ url: APP_URLS.signUpSvg });
        await post({ url: APP_URLS.getRechargeSectionImages });
      } catch (_) {}
    };
    fetchData();
  }, [post]);

  // ─── Save to Quick Access ────────────────────────────────
  const saveItemToStorage = useCallback(
    async (item: sectionData) => {
      try {
        const savedItems = await AsyncStorage.getItem("quickAccessItems");
        let itemsArray: sectionData[] = savedItems
          ? JSON.parse(savedItems)
          : [];

        const isItemExist = itemsArray.some(
          (existing) => existing.name === item.name
        );

        if (isItemExist) {
          ToastAndroid.show(
            `${item.name} ${translate("is_already_exists")}`,
            ToastAndroid.SHORT
          );
          return;
        }

        itemsArray.unshift(item);
        if (itemsArray.length > MAX_ITEMS) itemsArray.pop();

        await AsyncStorage.setItem(
          "quickAccessItems",
          JSON.stringify(itemsArray)
        );
        getItem();
      } catch (_) {}
    },
    [getItem]
  );

  // ─── Handle Item Press ───────────────────────────────────
  const handleItemPress = useCallback(
    (item: sectionData) => {
      if (COMING_SOON_SCREENS.includes(item.ScreenName)) {
        Alert.alert(
          "Coming Soon",
          "This feature is currently under development.\nIt will be available soon.",
          [{ text: "OK" }]
        );
        return;
      }

      if (item.ScreenName === "AepsScreen" && isDemoUser === true) {
        Alert.alert(
          "Demo Account",
          "This is a demo account. Live AEPS transactions not enabled."
        );
        return;
      }

      if (isQuickAccess) {
        saveItemToStorage(item);
        return;
      }

      switch (item.ScreenName) {
        case "HideMoreScreen":
          setViewMoreStatus((prev) => !prev);
          break;
        case "ViewMoreScreen":
          setViewMoreStatus(() => true);
          break;
        default:
          navigation.navigate(item.ScreenName as never);
          break;
      }
    },
    [isDemoUser, isQuickAccess, saveItemToStorage, setViewMoreStatus, navigation]
  );

  // ─── Render Item ─────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: sectionData }) => (
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        style={styles.element}
        activeOpacity={0.7}
      >
        <View style={styles.InputImage}>
          <SmartIcon uri={item.svg} />
        </View>
        <Text style={styles.screeitemname} numberOfLines={2}>
          {translate(item.name)}
        </Text>
      </TouchableOpacity>
    ),
    [handleItemPress]
  );

  // ─── Render ──────────────────────────────────────────────
  return (
    <FlashList
      style={[
        iconButtonstyle,
        { justifyContent: "space-between", alignSelf: "stretch" },
      ]}
      data={buttonData}
      ListEmptyComponent={SkeletonLoader}
      numColumns={4}
      estimatedItemSize={80}
      renderItem={renderItem}
      keyExtractor={(item) => item.name}
    />
  );
};

export default memo(IconButtons);

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  element: {
    paddingHorizontal: wScale(2),
    paddingVertical: wScale(8),
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: wScale(2),
    flex: 1,
  },
  InputImage: {
    height: wScale(50),
    width: wScale(50),
    shadowRadius: 3,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    height: wScale(50),
    width: wScale(50),
  },
  screeitemname: {
    color: "white",
    textAlign: "center",
  },
});