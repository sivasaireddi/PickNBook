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

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80";

const normalizeImages = (images = []) => {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  return list.length > 0 ? list : [FALLBACK_IMAGE];
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

  return (
    <>
      <View style={styles.container}>
        <Pressable onPress={() => openGallery(0)} style={styles.heroWrap}>
          <Image source={{ uri: galleryImages[0] }} style={styles.heroImage} />
          <View style={styles.heroBadge}>
            <Ionicons name="images-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>{galleryImages.length} photos</Text>
          </View>
        </Pressable>

        <FlatList
          horizontal
          data={galleryImages.slice(1, 5)}
          keyExtractor={(item, index) => `${item}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => openGallery(index + 1)} style={styles.thumbWrap}>
              <Image source={{ uri: item }} style={styles.thumbImage} />
            </Pressable>
          )}
        />
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
            <Text style={styles.modalTitle}>Gallery</Text>
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
                <Image source={{ uri: item }} style={styles.modalImage} />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  heroWrap: { borderRadius: 26, overflow: "hidden" },
  heroImage: { width: "100%", height: 260, backgroundColor: "#E5E7EB" },
  heroBadge: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  thumbRow: { gap: 10, paddingRight: 4 },
  thumbWrap: { borderRadius: 18, overflow: "hidden" },
  thumbImage: { width: 92, height: 78, backgroundColor: "#E5E7EB" },
  modalRoot: { flex: 1, backgroundColor: "#000" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSlide: { width: 340, justifyContent: "center", alignItems: "center" },
  modalImage: { width: "92%", height: "78%", borderRadius: 24 },
});
