import React from "react";
import { View, Text, StyleSheet, Image, useWindowDimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HotelHero({ images, hotelName, starRating, address, city, state, countryName, pinCode }) {
  const { width } = useWindowDimensions();

  const galleryImages = Array.isArray(images) && images.length > 0
    ? images.map(img => typeof img === "object" ? (img?.image || img?.url || "") : String(img)).filter(Boolean)
    : [];

  const fullAddress = [address, city, state, countryName, pinCode].filter(Boolean).join(", ");

  return (
    <View style={styles.container}>
      {galleryImages.length > 0 ? (
        <View style={styles.sliderWrap}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width }}>
            {galleryImages.slice(0, 5).map((img, idx) => ( // limit to 5 to avoid memory issues and keep it snappy
              <Image key={idx} source={{ uri: img }} style={[styles.sliderImage, { width }]} resizeMode="cover" />
            ))}
          </ScrollView>
          <View style={styles.imageOverlay} />
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
    height: 200,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  sliderImage: {
    height: 200,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
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
