import React, { memo, useState } from "react";
import { Image, View } from "react-native";
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

// ─── PNG Converter ────────────────────────────────────────────
const svgToPngUrl = (svgUrl: string, size: number): string => {
  if (!svgUrl) return "";
  return `https://images.weserv.nl/?url=${encodeURIComponent(svgUrl)}&output=png&w=${Math.round(size)}&h=${Math.round(size)}&fit=contain`;
};

// ─── SmartIcon ────────────────────────────────────────────────
const SmartIcon = memo(
  ({ uri, size = 50, width, height, onError }: SmartIconProps) => {
    const isSvg      = isSvgUrl(uri);
    const scaledSize = wScale(size);
    const finalW     = width  ?? scaledSize;
    const finalH     = height ?? scaledSize;

    // SVG → SvgUri pehle, PNG → Image pehle
    const [stage, setStage] = useState<"svg" | "png" | "failed">(
      isSvg ? "svg" : "png"
    );

    if (!uri || uri === "undefined" || uri === "null") return null;
    if (stage === "failed") return null;

    const imgStyle = {
      width:  finalW as number,
      height: finalH as number,
    };

    // ── SVG Stage ─────────────────────────────────────────
    if (stage === "svg") {
      return (
        <View style={imgStyle}>
          <SvgUri
            width="100%"
            height="100%"
            uri={uri}
            onError={() => setStage("png")}   // ← fail → PNG try
          />
        </View>
      );
    }

    // ── PNG Stage ─────────────────────────────────────────
    return (
      <Image
        source={{ uri: svgToPngUrl(uri, scaledSize) }}
        style={imgStyle}
        resizeMode="contain"
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