import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { authTheme } from "./authStyles";

const TAB_HEIGHT = 60;
const STROKE_WIDTH = 2;
const STROKE_INSET = STROKE_WIDTH / 2;
const OUTER_RADIUS = 25;
const NOTCH_TOP_OFFSET = 38;
const NOTCH_SHELF_Y = 52;
const NOTCH_SHELF_HALF = 19;

const METHODS = [
  { value: "email", label: "Email", icon: "mail-outline" },
  { value: "phone", label: "Phone", icon: "call-outline" },
];

export default function AuthMethodTabs({ value, onChange }) {
  const [width, setWidth] = useState(0);
  const emailActive = value === "email";
  const measuredWidth = width || 320;
  const midpoint = measuredWidth / 2;
  const right = measuredWidth - STROKE_INSET;
  const notchTopLeft = midpoint - NOTCH_TOP_OFFSET;
  const notchTopRight = midpoint + NOTCH_TOP_OFFSET;
  const shelfLeft = midpoint - NOTCH_SHELF_HALF;
  const shelfRight = midpoint + NOTCH_SHELF_HALF;

  const activeFill = emailActive
    ? `M 0 0 L ${notchTopLeft} 0 L ${shelfLeft} ${NOTCH_SHELF_Y} L ${shelfRight} ${NOTCH_SHELF_Y} L ${shelfRight} ${TAB_HEIGHT} L 0 ${TAB_HEIGHT} Z`
    : `M ${shelfLeft} ${TAB_HEIGHT} L ${shelfLeft} ${NOTCH_SHELF_Y} L ${shelfRight} ${NOTCH_SHELF_Y} L ${notchTopRight} 0 L ${measuredWidth} 0 L ${measuredWidth} ${TAB_HEIGHT} Z`;
  const activeOutline = emailActive
    ? `M ${STROKE_INSET} ${TAB_HEIGHT} L ${STROKE_INSET} ${STROKE_INSET + OUTER_RADIUS} Q ${STROKE_INSET} ${STROKE_INSET} ${STROKE_INSET + OUTER_RADIUS} ${STROKE_INSET} L ${notchTopLeft} ${STROKE_INSET} L ${shelfLeft} ${NOTCH_SHELF_Y} L ${shelfRight} ${NOTCH_SHELF_Y}`
    : `M ${shelfLeft} ${NOTCH_SHELF_Y} L ${shelfRight} ${NOTCH_SHELF_Y} L ${notchTopRight} ${STROKE_INSET} L ${right - OUTER_RADIUS} ${STROKE_INSET} Q ${right} ${STROKE_INSET} ${right} ${STROKE_INSET + OUTER_RADIUS} L ${right} ${TAB_HEIGHT}`;

  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      onLayout={(event) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth && nextWidth !== width) setWidth(nextWidth);
      }}
    >
      <Svg
        pointerEvents="none"
        width="100%"
        height={TAB_HEIGHT}
        viewBox={`0 0 ${measuredWidth} ${TAB_HEIGHT}`}
        style={StyleSheet.absoluteFill}
      >
        <Path
          d={`M 0 0 H ${measuredWidth} V ${TAB_HEIGHT} H 0 Z`}
          fill="#F8EFF0"
        />
        <Path d={activeFill} fill="#FFFFFF" />
        <Path
          d={activeOutline}
          fill="none"
          stroke={authTheme.colors.redDeep}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="butt"
          strokeLinejoin="round"
        />
      </Svg>

      {METHODS.map((method) => {
        const selected = value === method.value;
        return (
          <TouchableOpacity
            key={method.value}
            style={styles.tab}
            onPress={() => onChange(method.value)}
            activeOpacity={0.78}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Ionicons
              name={method.icon}
              size={20}
              color={selected ? authTheme.colors.redDeep : authTheme.colors.slate}
            />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{method.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: TAB_HEIGHT,
    flexDirection: "row",
    marginHorizontal: -24,
    marginTop: -24,
    marginBottom: 24,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  tab: {
    flex: 1,
    minHeight: TAB_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: authTheme.colors.slate,
  },
  selectedLabel: { color: authTheme.colors.redDeep },
});
