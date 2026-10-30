import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Mask, Rect } from "react-native-svg";
import { authTheme } from "./authStyles";

const NOTCH_RADIUS = 12;

export default function AuthTicketCard({ children, footer, floatingBadge, compact = false }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dividerY, setDividerY] = useState(0);
  const cardRadius = compact ? 24 : authTheme.radii.ticket;

  return (
    <View
      style={[styles.card, compact && styles.cardCompact, !!floatingBadge && styles.cardWithBadge]}
      onLayout={({ nativeEvent }) => {
        const { width, height } = nativeEvent.layout;
        if (width !== size.width || height !== size.height) setSize({ width, height });
      }}
    >
      {size.width > 0 && size.height > 0 ? (
        <Svg
          pointerEvents="none"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <Mask id="authTicketMask">
              <Rect width={size.width} height={size.height} rx={cardRadius} fill="#FFFFFF" />
              {!!footer && dividerY > 0 ? (
                <>
                  <Circle cx="0" cy={dividerY} r={NOTCH_RADIUS} fill="#000000" />
                  <Circle cx={size.width} cy={dividerY} r={NOTCH_RADIUS} fill="#000000" />
                </>
              ) : null}
            </Mask>
          </Defs>
          <Rect
            width={size.width}
            height={size.height}
            rx={cardRadius}
            fill={authTheme.colors.authCard}
            mask="url(#authTicketMask)"
          />
        </Svg>
      ) : null}

      {!!floatingBadge && <View style={styles.badge}>{floatingBadge}</View>}
      <View style={[styles.body, compact && styles.bodyCompact, !!floatingBadge && styles.bodyWithBadge]}>
        {children}
      </View>
      {!!footer && (
        <>
          <View
            style={styles.dividerRow}
            onLayout={({ nativeEvent }) => setDividerY(nativeEvent.layout.y + NOTCH_RADIUS)}
          >
            <View style={styles.divider} />
          </View>
          <View style={[styles.footer, compact && styles.footerCompact]}>{footer}</View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderRadius: authTheme.radii.ticket,
    shadowColor: authTheme.shadow.shadowColor,
    shadowOffset: authTheme.shadow.shadowOffset,
    shadowOpacity: authTheme.shadow.shadowOpacity,
    shadowRadius: authTheme.shadow.shadowRadius,
    elevation: authTheme.shadow.elevation,
  },
  cardCompact: { borderRadius: 24 },
  cardWithBadge: { marginTop: 34 },
  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  bodyCompact: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  bodyWithBadge: { paddingTop: 48 },
  dividerRow: {
    height: NOTCH_RADIUS * 2,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  divider: {
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: authTheme.colors.authBorder,
  },
  footer: { minHeight: 52, paddingHorizontal: 20, paddingBottom: 12, justifyContent: "center" },
  footerCompact: { minHeight: 46, paddingHorizontal: 14, paddingBottom: 8 },
  badge: {
    position: "absolute",
    top: -34,
    left: "50%",
    marginLeft: -34,
    width: 68,
    height: 68,
    borderRadius: 34,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authTheme.colors.authCard,
    borderWidth: 6,
    borderColor: authTheme.colors.authBlush,
    shadowColor: authTheme.shadow.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 10,
    elevation: 6,
  },
});
