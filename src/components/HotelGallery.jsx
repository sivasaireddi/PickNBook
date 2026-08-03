import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const normalizeImages = (images = []) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => (typeof img === "object" ? img?.image || img?.url || "" : String(img)))
    .filter(Boolean);
};

export default function HotelGallery({ images = [], onImagePress }) {
  const galleryImages = useMemo(() => normalizeImages(images), [images]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openGallery = (index) => {
    setActiveIndex(index);
    setModalVisible(true);
    if (typeof onImagePress === "function") onImagePress(index);
  };

  if (galleryImages.length === 0) {
    return (
      <View style={styles.noImageWrap}>
        <Ionicons name="image-outline" size={36} color="#94A3B8" />
        <Text style={styles.noImageText}>No hotel photos available</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Pressable onPress={() => openGallery(0)} style={styles.heroWrap}>
          <Image source={{ uri: galleryImages[0] }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroBadge}>
            <Ionicons name="images-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>{galleryImages.length} photo{galleryImages.length === 1 ? "" : "s"}</Text>
          </View>
        </Pressable>

        {galleryImages.length > 1 && (
          <FlatList
            horizontal
            data={galleryImages.slice(1, 6)}
            keyExtractor={(item, index) => `${item}-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => openGallery(index + 1)} style={styles.thumbWrap}>
                <Image source={{ uri: item }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
            )}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </Pressable>
            <Text style={styles.modalTitle}>Gallery ({activeIndex + 1}/{galleryImages.length})</Text>
            <View style={styles.closeBtn} />
          </View>
          <FlatList
            horizontal
            pagingEnabled
            initialScrollIndex={activeIndex}
            getItemLayout={(_, index) => ({
              length: 340,
              offset: 340 * index,
              index,
            })}
            data={galleryImages}
            keyExtractor={(item, index) => `${item}-modal-${index}`}
            renderItem={({ item }) => (
              <View style={styles.modalSlide}>
                <Image source={{ uri: item }} style={styles.modalImage} resizeMode="contain" />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  noImageWrap: {
    height: 160,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noImageText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  heroWrap: { borderRadius: 20, overflow: "hidden" },
  heroImage: { width: "100%", height: 220, backgroundColor: "#E2E8F0" },
  heroBadge: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  thumbRow: { gap: 8, paddingRight: 4 },
  thumbWrap: { borderRadius: 14, overflow: "hidden" },
  thumbImage: { width: 88, height: 70, backgroundColor: "#E2E8F0" },
  modalRoot: { flex: 1, backgroundColor: "#0F172A" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSlide: { width: 340, justifyContent: "center", alignItems: "center" },
  modalImage: { width: "95%", height: "80%", borderRadius: 16 },
});
