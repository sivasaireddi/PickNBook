import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  fetchSeatLayout,
  normalizeSeatLayoutPayload,
} from "../utils/seatLayout";

const DEFAULT_BUS_ID = 49;

const COLORS = {
  background: "#F3F3F3",
  surface: "#FFFFFF",
  text: "#1F1F1F",
  muted: "#7A7A7A",
  border: "#D6D6D6",
  female: "#E78AA7",
  male: "#56A6E8",
  booked: "#D0D3D8",
  bookedText: "#818894",
 selected: "#D11A2A",        
  selectedCushion: "#D11A2A",
  footerShadow: "#0F172A",
  cardShadow: "#0F172A",
};

const SEAT_SIZE = {
  width: 48,
  height: 48,
};

const LEGEND_SEAT_SIZE = {
  width: 34,
  height: 34,
};

const CARD = {
  horizontalPadding: 6,
  rowGap: 12,
  seatGap: 6,
  aisleWidth: 56,
  lastRowGap: 3,
  radius: 28,
};

const DEFAULT_ROUTE = {
  from: "Hyderabad",
  to: "Kadapa",
  dateText: "Mon 15 Jun 2026",
  timeText: "05:00",
  operatorText: "APSRTC - 9991",
};

const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatPrice = (value = 0) =>
  `\u20B9${normalizeAmount(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const buildRouteMeta = (route) => {
  const from =
    route?.params?.from || route?.params?.sourceCity || DEFAULT_ROUTE.from;
  const to =
    route?.params?.to || route?.params?.destinationCity || DEFAULT_ROUTE.to;
  const dateText =
    route?.params?.dateText ||
    route?.params?.date ||
    route?.params?.travelDate ||
    DEFAULT_ROUTE.dateText;
  const timeText =
    route?.params?.time ||
    route?.params?.departureTime ||
    route?.params?.departureHour ||
    DEFAULT_ROUTE.timeText;
  const operatorText =
    route?.params?.operatorName ||
    route?.params?.bus?.operatorName ||
    DEFAULT_ROUTE.operatorText;

  return {
    title: `${from} \u2192 ${to}`,
    subtitle: `${dateText}, ${timeText} | ${operatorText}`,
  };
};

const getSeatDefinitions = (layout) => {
  if (
    Array.isArray(layout?.seatDefinitions) &&
    layout.seatDefinitions.length > 0
  ) {
    return layout.seatDefinitions.filter(Boolean);
  }

  if (Array.isArray(layout?.seats) && layout.seats.length > 0) {
    return layout.seats.filter(Boolean);
  }

  return [];
};

const getSeatCatalog = (layout) => {
  const definitions = getSeatDefinitions(layout);
  const liveSeats = Array.isArray(layout?.seats)
    ? layout.seats.filter(Boolean)
    : [];

  if (definitions.length === 0) {
    return liveSeats;
  }

  const liveSeatByCode = new Map(
    liveSeats.map((seat) => [seat?.seatCode, seat]),
  );

  return definitions.map((definition) => {
    const liveSeat = liveSeatByCode.get(definition?.seatCode);

    return {
      ...definition,
      ...liveSeat,
      seatCode: definition?.seatCode ?? liveSeat?.seatCode,
    };
  });
};

const getSeatRows = (layout) => {
  const definitions = getSeatCatalog(layout);

  if (definitions.length === 0) {
    return [];
  }

  const sections = Array.isArray(layout?.sections) ? layout.sections : [];
  const definitionsByCode = new Map(
    definitions.map((definition) => [definition?.seatCode, definition]),
  );

  const buildRowsFromDefinitions = (items, fallbackColumnsPerRow = 4) => {
    const rowMap = new Map();

    items.forEach((definition) => {
      const rowNumber = Math.max(1, Number(definition?.row) || 1);
      const columnNumber = Math.max(1, Number(definition?.column) || 1);
      const columnIndex = columnNumber - 1;

      if (!rowMap.has(rowNumber)) {
        rowMap.set(rowNumber, []);
      }

      const rowSeats = rowMap.get(rowNumber);

      while (rowSeats.length <= columnIndex) {
        rowSeats.push(null);
      }

      rowSeats[columnIndex] = definition;
    });

    return [...rowMap.entries()]
      .sort((firstRow, secondRow) => firstRow[0] - secondRow[0])
      .map(([rowNumber, seats]) => ({
        rowNumber,
        cells: Array.from(
          { length: fallbackColumnsPerRow },
          (_, index) => seats[index] ?? null,
        ),
      }));
  };

  if (sections.length > 0) {
    return sections
      .map((section, index) => {
        const sectionDefinitions =
          Array.isArray(section?.seatDefinitions) &&
          section.seatDefinitions.length > 0
            ? section.seatDefinitions.filter(Boolean)
            : Array.isArray(section?.seatCodes) && section.seatCodes.length > 0
              ? section.seatCodes
                  .map((seatCode) => definitionsByCode.get(seatCode))
                  .filter(Boolean)
              : definitions;

        if (sectionDefinitions.length === 0) {
          return null;
        }

        const columnsPerRow = Math.max(
          2,
          Number(section?.columnsPerRow) || 0,
          sectionDefinitions.reduce(
            (maxColumns, definition) =>
              Math.max(maxColumns, Number(definition?.column) || 0),
            0,
          ),
        );

        const aisleAfterColumnValue = Number(section?.aisleAfterColumn);
        const aisleAfterColumn = Number.isFinite(aisleAfterColumnValue)
          ? aisleAfterColumnValue
          : columnsPerRow > 2
            ? Math.floor((columnsPerRow - 1) / 2)
            : -1;

        return {
          key: `${section?.label ?? section?.deck ?? "section"}-${index}`,
          label: String(section?.label ?? "").trim(),
          columnsPerRow,
          aisleAfterColumn,
          rows: buildRowsFromDefinitions(sectionDefinitions, columnsPerRow),
        };
      })
      .filter(Boolean);
  }

  const columnsPerRow = Math.max(
    2,
    definitions.reduce(
      (maxColumns, definition) =>
        Math.max(maxColumns, Number(definition?.column) || 0),
      0,
    ),
  );

  return [
    {
      key: "default-section",
      label: "",
      columnsPerRow,
      aisleAfterColumn:
        columnsPerRow > 2 ? Math.floor((columnsPerRow - 1) / 2) : -1,
      rows: buildRowsFromDefinitions(definitions, columnsPerRow),
    },
  ];
};

const getSeatTheme = (seat, selected) => {
  if (!seat) {
    return {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.border,
      cushionColor: "#AEB5BD",
      textColor: COLORS.text,
      borderWidth: 1.25,
      disabled: false,
    };
  }

  if (seat.isBooked) {
    const isFemaleBooked = String(seat.gender || "").toLowerCase() === "female";

    return {
      backgroundColor: COLORS.booked,
      borderColor: isFemaleBooked ? COLORS.female : COLORS.booked,
      cushionColor: isFemaleBooked ? COLORS.female : "#8D949F",
      textColor: COLORS.bookedText,
      borderWidth: 1.25,
      disabled: true,
    };
  }

  if (selected) {
    return {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.selected,
      cushionColor: COLORS.selectedCushion,
      textColor: COLORS.text,
      borderWidth: 2,
      disabled: false,
    };
  }

  const gender = String(seat.gender || "").toLowerCase();

  if (gender === "female") {
    return {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.female,
      cushionColor: COLORS.female,
      textColor: COLORS.text,
      borderWidth: 1.5,
      disabled: false,
    };
  }

  if (gender === "male") {
    return {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.male,
      cushionColor: COLORS.male,
      textColor: COLORS.text,
      borderWidth: 1.5,
      disabled: false,
    };
  }

  return {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    cushionColor: "#AEB5BD",
    textColor: COLORS.text,
    borderWidth: 1.25,
    disabled: false,
  };
};

const SeatVisual = memo(
  ({ seat, selected, label, showLabel = true, size = SEAT_SIZE }) => {
    const theme = getSeatTheme(seat, selected);
    const labelSpacerHeight = showLabel ? 15 : 8;

    return (
      <View
        style={[
          styles.seatVisual,
          {
            width: size.width,
            height: size.height,
            backgroundColor: theme.backgroundColor,
            borderColor: theme.borderColor,
            borderWidth: theme.borderWidth,
          },
        ]}
      >
        {showLabel ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.seatPriceText, { color: theme.textColor }]}
          >
            {label || formatPrice(seat?.price ?? seat?.priceInr)}
          </Text>
        ) : (
          <View style={{ height: labelSpacerHeight }} />
        )}

        <View
          style={[
            styles.seatCushion,
            {
              backgroundColor: theme.cushionColor,
            },
          ]}
        />
      </View>
    );
  },
);

const LegendItem = memo(({ item }) => (
  <View style={styles.legendItem}>
    <SeatVisual
      seat={{
        gender: item.gender,
        price: item.price ?? 0,
        isBooked: item.booked,
      }}
      selected={false}
      showLabel={false}
      size={LEGEND_SEAT_SIZE}
    />
    <Text numberOfLines={2} style={styles.legendLabel}>
      {item.label}
    </Text>
  </View>
));

const SeatCell = memo(({ seat, selected, onPress, gapRight = 0 }) => {
  const theme = getSeatTheme(seat, selected);
  const disabled = Boolean(theme.disabled);

  return (
    <View
      style={[
        styles.seatCellWrap,
        {
          marginRight: gapRight,
          opacity: disabled ? 0.92 : 1,
        },
      ]}
    >
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.seatPressable,
          {
            width: SEAT_SIZE.width,
            height: SEAT_SIZE.height,
          },
          pressed && !disabled && styles.seatPressed,
        ]}
      >
        <SeatVisual
          seat={seat}
          selected={selected}
          label={String(seat?.priceInr ?? seat?.price)}
        />
      </Pressable>
    </View>
  );
});

const Footer = memo(
  ({ selectedSeats, totalPrice, onNext, disabled, insets }) => (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 12,
        },
      ]}
    >
      <View style={styles.footerLeft}>
        <Text style={styles.footerLabel}>Selected Seats</Text>
        <Text numberOfLines={1} style={styles.footerSeats}>
          {selectedSeats.length > 0
            ? selectedSeats.join(", ")
            : "No seat selected"}
        </Text>
      </View>

      <View style={styles.footerRight}>
        <Text style={styles.footerTotal}>{formatPrice(totalPrice)}</Text>
        <Pressable
          disabled={disabled}
          onPress={onNext}
          style={({ pressed }) => [
            styles.nextButton,
            disabled && styles.nextButtonDisabled,
            pressed && !disabled && styles.nextButtonPressed,
          ]}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </Pressable>
      </View>
    </View>
  ),
);

const Seater = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const busId = route?.params?.busId ?? DEFAULT_BUS_ID;
  const seededLayout = normalizeSeatLayoutPayload(
    route?.params?.seatLayout ?? null,
  );
  const { title, subtitle } = useMemo(() => buildRouteMeta(route), [route]);

  const [layout, setLayout] = useState(seededLayout);
  const [loading, setLoading] = useState(!seededLayout);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);

  useEffect(() => {
    let isActive = true;

    const loadLayout = async () => {
      try {
        setLoading(true);
        setError("");

        if (seededLayout) {
          setLayout(seededLayout);
          return;
        }

        const data = await fetchSeatLayout(busId);

        console.log("Raw API Response:", data);

        const normalized = normalizeSeatLayoutPayload(data);

        console.log("Normalized Layout:", JSON.stringify(normalized, null, 2));

        if (isActive) {
          setLayout(normalized);
        }
      } catch (fetchError) {
        console.log(
          "Failed to load seat layout:",
          fetchError?.message || fetchError,
        );

        if (isActive) {
          setLayout(null);
          setError("Unable to load seat layout.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    setSelectedSeats([]);
    loadLayout();

    return () => {
      isActive = false;
    };
  }, [busId, seededLayout]);

  const seatMap = useMemo(() => {
    const catalog = getSeatCatalog(layout);

    return new Map(catalog.map((seat) => [seat?.seatCode, seat]));
  }, [layout]);

  const seatSections = useMemo(() => getSeatRows(layout), [layout]);

  const totalPrice = useMemo(
    () =>
      selectedSeats.reduce((sum, seatCode) => {
        const seat = seatMap.get(seatCode);
        return sum + normalizeAmount(seat?.priceInr ?? seat?.price);
      }, 0),
    [seatMap, selectedSeats],
  );

  const cardWidth = useMemo(() => {
    const usableWidth = Math.max(320, width - 24);
    const seatColumns = seatSections[0]?.columnsPerRow ?? 4;
    const aisleWidth = seatColumns > 2 ? CARD.aisleWidth : 0;
    const seatAreaWidth = seatColumns * SEAT_SIZE.width;
    const rowPadding = CARD.horizontalPadding * 2;

    return Math.max(
      320,
      Math.min(usableWidth, seatAreaWidth + aisleWidth + rowPadding),
    );
  }, [seatSections, width]);

  const handleSeatPress = (seatCode) => {
    const seat = seatMap.get(seatCode);

    if (!seat || seat.isBooked) {
      return;
    }

    setSelectedSeats((current) =>
      current.includes(seatCode)
        ? current.filter((item) => item !== seatCode)
        : [...current, seatCode],
    );
  };

  const handleShare = () => {
    Share.share({
      message: `${title} | ${subtitle}`,
    }).catch(() => {});
  };

  const handleNext = () => {
    if (selectedSeats.length === 0) {
      return;
    }

    navigation?.navigate?.("BordingNDroppingPoints", {
      ...route?.params,
      busId,
      selectedSeats,
      seatNumber: selectedSeats.join(", "),
      selectedSeatDetails: selectedSeats.map((seatCode) => {
        const seat = seatMap.get(seatCode) || {};
        const rawPrice = normalizeAmount(seat?.priceInr ?? seat?.price);
        const rawBase = seat.Price?.BaseFare ?? seat.Price?.baseFare ?? seat.BaseFare ?? seat.baseFare ?? seat.SeatFare ?? rawPrice ?? 0;
        const rawGst = seat.Price?.GSTAmount ?? seat.Price?.gstAmount ?? seat.GSTAmount ?? seat.gstAmount ?? 0;

        return {
          seatCode,
          priceInr: rawPrice,
          baseFare: Number(rawBase),
          seatType: seat.SeatType ?? seat.seatType ?? "Seater",
          externalGst: Number(rawGst),
        };
      }),
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.selected} />
          <Text style={styles.statusText}>Loading seat layout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.screen}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable
              hitSlop={12}
              onPress={() => navigation?.goBack?.()}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-back" size={30} color={COLORS.text} />
            </Pressable>

            <View style={styles.headerTextWrap}>
              <Text numberOfLines={2} style={styles.routeTitle}>
                {title}
              </Text>
              <Text numberOfLines={2} style={styles.routeSubtitle}>
                {subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            {[
              {
                key: "available",
                label: "Available",
                gender: null,
                booked: false,
              },
              {
                key: "female",
                label: "For Female",
                gender: "female",
                booked: false,
              },
              { key: "male", label: "For Male", gender: "male", booked: false },
              {
                key: "female-booked",
                label: "Female Booked",
                gender: "female",
                booked: true,
              },
              { key: "booked", label: "Booked", gender: null, booked: true },
            ].map((item) => (
              <LegendItem key={item.key} item={item} />
            ))}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + 132,
            },
          ]}
        >
          <View style={[styles.busCard, { width: cardWidth }]}>
            <View style={styles.busHeader}>
              <View style={styles.busHeaderSpacer} />
              <MaterialCommunityIcons
                name="steering"
                size={34}
                color="#A6A6A6"
              />
            </View>

            <View style={styles.busBody}>
              {seatSections.length > 0 ? (
                seatSections.map((section) => (
                  <View key={section.key}>
                    {section.label ? (
                      <Text style={styles.sectionLabel}>{section.label}</Text>
                    ) : null}

                    {section.rows.map((row) => (
                      <View
                        key={`${section.key}-${row.rowNumber}`}
                        style={styles.standardRow}
                      >
                        {row.cells.map((seat, index) => (
                          <React.Fragment
                            key={`${section.key}-${row.rowNumber}-${index}`}
                          >
                            {seat ? (
                              <SeatCell
                                seat={seat}
                                selected={selectedSeats.includes(seat.seatCode)}
                                onPress={() => handleSeatPress(seat.seatCode)}
                                gapRight={
                                  index < row.cells.length - 1 &&
                                  index !== section.aisleAfterColumn
                                    ? CARD.seatGap
                                    : 0
                                }
                              />
                            ) : (
                              <View style={styles.emptySlot} />
                            )}

                            {section.aisleAfterColumn >= 0 &&
                            index === section.aisleAfterColumn &&
                            index < row.cells.length - 1 ? (
                              <View style={styles.aisleGap} />
                            ) : null}
                          </React.Fragment>
                        ))}
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.statusText}>
                  No seats found for this bus.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        <Footer
          selectedSeats={selectedSeats}
          totalPrice={totalPrice}
          onNext={handleNext}
          disabled={selectedSeats.length === 0}
          insets={insets}
        />
      </View>
    </SafeAreaView>
  );
};

export default Seater;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  statusText: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 15,
    textAlign: "center",
  },
  errorText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: "center",
  },
  headerCard: {
    backgroundColor: COLORS.surface,
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
    paddingHorizontal: 6,
  },
  routeTitle: {
    color: COLORS.text,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "800",
  },
  routeSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  legendRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  legendItem: {
    width: 50,
    alignItems: "center",
  },
  legendLabel: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 9,
    lineHeight: 11,
    textAlign: "center",
  },
  sectionLabel: {
    marginBottom: 10,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  scrollContent: {
    paddingTop: 26,
    alignItems: "center",
  },
  busCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingHorizontal: CARD.horizontalPadding,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
  },
  busHeader: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: 10,
    minHeight: 36,
  },
  busHeaderSpacer: {
    height: 1,
  },
  busBody: {
    alignItems: "center",
  },
  standardRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: CARD.rowGap,
  },
  aisleGap: {
    width: CARD.aisleWidth,
  },
  emptySlot: {
    width: SEAT_SIZE.width,
    height: SEAT_SIZE.height,
  },
  seatCellWrap: {
    width: SEAT_SIZE.width,
    height: SEAT_SIZE.height,
  },
  seatPressable: {
    borderRadius: 12,
  },
  seatPressed: {
    opacity: 0.95,
  },
  seatVisual: {
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "space-between",
     paddingTop: 2,
  },
  seatVisualFull: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  seatPriceText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.1,
    textAlign: "center",
     marginTop: 10, // move text up
  },
  seatLabelSpacer: {
    height: 15,
  },
  seatCushion: {
    width: "78%",
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E7E7E7",
    shadowColor: COLORS.footerShadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 14,
  },
  footerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  footerLabel: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    marginBottom: 4,
  },
  footerSeats: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
  },
  footerRight: {
    alignItems: "flex-end",
  },
  footerTotal: {
    color: COLORS.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  nextButton: {
    minWidth: 94,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: COLORS.selected,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#BFD0E6",
  },
  nextButtonPressed: {
    opacity: 0.92,
  },
  nextButtonText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: "700",
  },
});
