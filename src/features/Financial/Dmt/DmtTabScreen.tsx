import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reduxUtils/store';
import useAxiosHook from '../../../utils/network/AxiosClient';
import { translate } from '../../../utils/languageUtils/I18n';
import { hScale, wScale } from '../../../utils/styles/dimensions';

// Screens
import DmtGetBeneficiaryScreen from './DmtGetBeneficiaryScreen';
import RadiantGetBenifiaryScreen from '../RadiantDMT/GetRadiantBeneficiaryScreen';
import GetBenifiaryScreen from '../VastDMT/GetBenifiaryScreen';
import PaysprintDmt from './PaySprintDmt';
import QRScanScreen from '../ScanQr/QRScanScreen';

// Components
import AppBarSecond from '../../drawer/headerAppbar/AppBarSecond';
import ShowLoader from '../../../components/ShowLoder';
import { DmtContext } from './DmtContext';
import noop from 'lodash/noop';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteKey = 'dmt1' | 'dmt2' | 'payout' | 'ppi' | 'scan';
interface Route { key: RouteKey; title: string }

// ─── Scene Map ────────────────────────────────────────────────────────────────

const SCENES: Record<RouteKey, React.ComponentType> = {
  dmt1:   DmtGetBeneficiaryScreen,
  dmt2:   RadiantGetBenifiaryScreen,
  payout: GetBenifiaryScreen,
  ppi:    PaysprintDmt,
  scan:   QRScanScreen,
};

// ─── API Config ───────────────────────────────────────────────────────────────

const ROUTE_CONFIG = [
  { api: () => ({ method: 'get',  url: 'Retailer/api/data/DMTStatusCheck'   }), check: (r: any) => r?.Response === 'Success', route: { key: 'dmt1',   title: 'DMT 1'    } },
  { api: () => ({ method: 'get',  url: 'Retailer/api/data/DMTStatusCheck1'  }), check: (r: any) => r?.Response === 'Success', route: { key: 'dmt2',   title: 'DMT 2'    } },
  { api: () => ({ method: 'get',  url: 'Retailer/api/data/PAYOUTStatusCheck'}), check: (r: any) => r?.Response === 'Success', route: { key: 'payout', title: 'Payout'   } },
  { api: () => ({ method: 'post', url: 'MoneyDMT/api/PPI/info'              }), check: (r: any) => r?.RESULT  === true,       route: { key: 'ppi',    title: 'PPI Fast' } },
] as const;

const SCAN_ROUTE: Route = { key: 'scan', title: 'Scan & Pay' };

// ─── Animated Segmented Tab Bar ───────────────────────────────────────────────

const TAB_WIDTH = wScale(100);
const TAB_H     = hScale(40);

const SegmentedTabBar = React.memo(({
  routes, index, primary, onPress,
}: { routes: Route[]; index: number; primary: string; onPress: (i: number) => void }) => {
  const anim = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: index,
      useNativeDriver: true,
      bounciness: 6,
      speed: 14,
    }).start();
  }, [index]);

  // Guard: single-tab edge-case needs at least 2 points for interpolation
  const safeRoutes = routes.length > 1 ? routes : [...routes, routes[0]];
  const translateX = anim.interpolate({
    inputRange:  safeRoutes.map((_, i) => i),
    outputRange: safeRoutes.map((_, i) => i * TAB_WIDTH + wScale(3)),
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.segContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segScroll}
      >
        <View style={[styles.segTrack, { width: routes.length * TAB_WIDTH + wScale(6) }]}>
          {/* Sliding White Pill */}
          <Animated.View
            style={[
              styles.segSlider,
              { width: TAB_WIDTH - wScale(4), transform: [{ translateX }] },
            ]}
          />

          {/* Labels */}
          {routes.map((r, i) => (
            <Pressable
              key={r.key}
              onPress={() => onPress(i)}
              style={[styles.segTab, { width: TAB_WIDTH }]}
              android_ripple={{ color: 'transparent' }}
            >
              <Text
                style={[styles.segLabel, { color: i === index ? primary : '#8E8E93' }]}
                numberOfLines={1}
              >
                {r.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

// ─── Lazy Scene Renderer ──────────────────────────────────────────────────────

const LazyScene = React.memo(({
  routeKey, active,
}: { routeKey: RouteKey; active: boolean }) => {
  const [loaded, setLoaded] = useState(active);
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      setLoaded(true);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }).start();
    }
  }, [active]);

  if (!loaded) return null;
  const Scene = SCENES[routeKey];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <Scene />
    </Animated.View>
  );
});

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyTitle}>{translate('No_Services_Available')}</Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DmtTabScreen = () => {
  const { colorConfig } = useSelector((state: RootState) => state.userInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [routes, setRoutes]       = useState<Route[]>([]);
  const [index, setIndex]         = useState(0);
  const { get, post }             = useAxiosHook();

  // Stable refs — axios instance identity change se effect re-run nahi hoga
  const getRef  = useRef(get);
  const postRef = useRef(post);
  useEffect(() => { getRef.current  = get;  }, [get]);
  useEffect(() => { postRef.current = post; }, [post]);

  const primary = colorConfig?.primaryColor || '#007AFF';

  // ── Fetch active routes ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const calls = ROUTE_CONFIG.map(({ api }) => {
          const { method, url } = api();
          return method === 'post'
            ? postRef.current({ url })
            : getRef.current({ url });
        });

        // allSettled: ek API fail ho toh baaki tabs mat giraao
        const settled = await Promise.allSettled(calls);

        if (cancelled) return;

        const active: Route[] = ROUTE_CONFIG
          .filter((cfg, i) => {
            const r = settled[i];
            return r.status === 'fulfilled' && cfg.check(r.value);
          })
          .map(cfg => cfg.route as Route);

        setRoutes([...active, SCAN_ROUTE]);
      } catch (e) {
        if (!cancelled) {
          console.error('[DmtTabScreen] fetch error:', e);
          setRoutes([SCAN_ROUTE]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; }; // unmount pe setState nahi chalega
  }, []);

  // Index clamp — routes shrink hone pe out-of-bounds se bachao
  useEffect(() => {
    if (routes.length > 0 && index >= routes.length) {
      setIndex(routes.length - 1);
    }
  }, [routes]);

  const handleTabPress = useCallback((i: number) => setIndex(i), []);

  const [aadharNumber,    setAadharNumber]    = useState('');
  const [mobileNumber,    setMobileNumber]    = useState('');
  const [consumerName,    setConsumerName]    = useState('');
  const [bankName,        setBankName]        = useState('');
  const [fingerprintData, setFingerprintData] = useState('');

  // Memoised context — har keystroke pe saare consumers re-render nahi honge
  const ctxValue = useMemo(() => ({
    aadharNumber,    setAadharNumber,
    mobileNumber,    setMobileNumber,
    consumerName,    setConsumerName,
    bankName,        setBankName,
    fingerprintData, setFingerprintData,
    scanFingerprint: noop,
    activeTabKey: routes[index]?.key,
  }), [
    aadharNumber, mobileNumber, consumerName,
    bankName, fingerprintData, routes, index,
  ]);

  // ── Render ──
  if (isLoading) return <ShowLoader />;

  return (
    <DmtContext.Provider value={ctxValue}>
      <View style={styles.root}>
        <AppBarSecond title="Money Transfer" />

        {routes.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <SegmentedTabBar
              routes={routes}
              index={index}
              primary={primary}
              onPress={handleTabPress}
            />

            {/* Scene Container */}
            <View style={styles.sceneContainer}>
              {routes.map((r, i) => (
                <LazyScene
                  key={r.key}
                  routeKey={r.key}
                  active={i === index}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </DmtContext.Provider>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  // Segmented Bar
  segContainer: {
    marginHorizontal: wScale(16),
    marginTop: hScale(12),
    marginBottom: hScale(8),
  },
  segScroll: {
    paddingVertical: hScale(3),
  },
  segTrack: {
    height: TAB_H,
    backgroundColor: '#E3E3E8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wScale(3),
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  segSlider: {
    position: 'absolute',
    height: TAB_H - hScale(8),
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  segTab: {
    height: TAB_H,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  segLabel: {
    fontSize: wScale(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Scenes
  sceneContainer: {
    flex: 1,
    position: 'relative',
  },

  // Empty State
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: hScale(8),
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: hScale(8),
  },
  emptyTitle: {
    fontSize: wScale(16),
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptySubtitle: {
    fontSize: wScale(13),
    color: '#8E8E93',
  },
});

export default DmtTabScreen;