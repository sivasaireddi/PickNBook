import React, { useState } from "react";
import { View, Text, StyleSheet, Image, useWindowDimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HotelHero({ images, hotelName, starRating, address, city, state, countryName, pinCode }) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const galleryImages = Array.isArray(images) && images.length > 0
    ? images.map(img => typeof img === "object" ? (img?.image || img?.url || "") : String(img)).filter(Boolean)
    : [];

  const fullAddress = [address, city, state, countryName, pinCode].filter(Boolean).join(", ");

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width || width;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    if (index !== activeIndex && index >= 0 && index < galleryImages.length) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      {galleryImages.length > 0 ? (
        <View style={styles.sliderWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width }}
          >
            {galleryImages.map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: img }}
                style={[styles.sliderImage, { width }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Touch-safe gradient overlay */}
          <View style={styles.imageOverlay} pointerEvents="none" />

          {/* Image counter badge */}
          {galleryImages.length > 1 && (
            <View style={styles.counterBadge} pointerEvents="none">
              <Ionicons name="images-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.counterBadgeText}>
                {activeIndex + 1} / {galleryImages.length}
              </Text>
            </View>
          )}

          {/* Dots Indicator */}
          {galleryImages.length > 1 && galleryImages.length <= 8 && (
            <View style={styles.dotsRow} pointerEvents="none">
              {galleryImages.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === activeIndex ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.noImageGalleryBox, { width }]}>
          <Ionicons name="image-outline" size={40} color="#94A3B8" />
          <Text style={styles.noImageGalleryText}>No hotel images provided</Text>
        </View>
      )}

      <View style={styles.quickInfoContainer}>
        <View style={styles.ratingRow}>
          {Array.from({ length: Math.max(1, Math.round(starRating || 4)) }).map((_, idx) => (
            <Ionicons key={idx} name="star" size={12} color="#F59E0B" />
          ))}
          <Text style={styles.ratingText}>{starRating || 4} Star</Text>
        </View>
        
        <Text style={styles.hotelName} numberOfLines={2}>{hotelName}</Text>
        
        {fullAddress ? (
          <View style={styles.addressRow}>
            <Ionicons name="location" size={14} color="#EF4444" style={{ marginTop: 2 }} />
            <Text style={styles.hotelAddress} numberOfLines={2}>
              {fullAddress}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  sliderWrap: {
    height: 240,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  sliderImage: {
    height: 240,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  counterBadge: {
    position: "absolute",
    bottom: 30,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  counterBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  dotsRow: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: "#FFFFFF",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  noImageGalleryBox: {
    height: 180,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noImageGalleryText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  quickInfoContainer: {
    paddingHorizontal: 16,
    marginTop: -20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "700",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hotelName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    lineHeight: 24,
  },
  addressRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "flex-start",
  },
  hotelAddress: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    flex: 1,
  },
});
