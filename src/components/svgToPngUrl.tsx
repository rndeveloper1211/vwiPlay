import React, { memo, useState } from "react";
import { View } from "react-native";
import FastImage from "react-native-fast-image"; // ← FastImage Import
import { SvgUri } from "react-native-svg";
import { wScale } from "../utils/styles/dimensions";

// ─── Types ───────────────────────────────────────────────────
interface SmartIconProps {
  uri: string;
  size?: number;
  width?: number | string;
  height?: number | string;
  onError?: () => void;
}

// ─── SVG URL detect ───────────────────────────────────────────
const isSvgUrl = (url: string): boolean =>
  url?.toLowerCase().includes(".svg");

// ─── PNG Converter (Images.weserv.nl caching ke liye achha hai) ──────────────────
const svgToPngUrl = (svgUrl: string, size: number): string => {
  if (!svgUrl) return "";
  // Agar URL pehle se PNG/JPG hai toh weserv ki zaroorat nahi, par fallback ke liye theek hai
  return `https://images.weserv.nl/?url=${encodeURIComponent(svgUrl)}&output=png&w=${Math.round(size)}&h=${Math.round(size)}&fit=contain`;
};

// ─── SmartIcon ────────────────────────────────────────────────
const SmartIcon = memo(
  ({ uri, size = 50, width, height, onError }: SmartIconProps) => {
    const isSvg      = isSvgUrl(uri);
    const scaledSize = wScale(size);
    const finalW     = width  ?? scaledSize;
    const finalH     = height ?? scaledSize;

    const [stage, setStage] = useState<"svg" | "png" | "failed">(
      isSvg ? "svg" : "png"
    );

    if (!uri || uri === "undefined" || uri === "null") return null;
    if (stage === "failed") return null;

    const imgStyle = {
      width:  finalW as any,
      height: finalH as any,
    };

    // ── SVG Stage ─────────────────────────────────────────
    if (stage === "svg") {
      return (
        <View style={imgStyle}>
          <SvgUri
            width="100%"
            height="100%"
            uri={uri}
            onError={() => setStage("png")} // SVG fail hua toh PNG try karega
          />
        </View>
      );
    }

    // ── PNG/Raster Stage (FastImage Added) ─────────────────
    return (
      <FastImage
        style={imgStyle}
        source={{
          uri: isSvg ? svgToPngUrl(uri, scaledSize) : uri, // Agar SVG stage fail hokar yahan aaya toh convert karega
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable, // Behtar caching ke liye
        }}
        resizeMode={FastImage.resizeMode.contain}
        onError={() => {
          setStage("failed");
          onError?.();
        }}
      />
    );
  },
  (prev, next) =>
    prev.uri    === next.uri    &&
    prev.size   === next.size   &&
    prev.width  === next.width  &&
    prev.height === next.height
);

export default SmartIcon;