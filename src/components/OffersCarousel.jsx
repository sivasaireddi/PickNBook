import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { getCouponImageUrl, getCoupons } from "../services/couponService";

export default function OffersCarousel({ serviceType }) {
  const { width } = useWindowDimensions();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);
  // Keep the offer card visually lighter than the search panel and leave a
  // little of the next card visible to make the carousel affordance clear.
  const carouselWidth = Math.max(width - 48, 1);
  const slideWidth = Math.max(carouselWidth - 32, 1);
  const imageHeight = Math.min(Math.max(slideWidth * 0.4, 120), 180);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getCoupons(serviceType).then((items) => {
      if (mounted) {
        setOffers(items.filter((item) => item?.imageUrl));
        setActiveIndex(0);
      }
    }).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [serviceType]);

  useEffect(() => {
    if (offers.length < 2) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % offers.length;
        const targetIndex = currentIndex === offers.length - 1 ? offers.length : nextIndex;
        carouselRef.current?.scrollTo({
          x: targetIndex * (slideWidth + 12),
          animated: true,
        });
        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [offers.length, slideWidth]);

  if (loading) return <View style={[styles.loading, { width: carouselWidth, height: imageHeight }]}><ActivityIndicator color="#E52332" /></View>;
  if (!offers.length) return null;

  // The extra first card lets the final transition animate naturally before
  // the scroll position is normalized back to the real first card.
  const renderOffers = offers.length > 1 ? [...offers, offers[0]] : offers;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={carouselRef}
        horizontal
        scrollEnabled
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={slideWidth + 12}
        style={styles.horizontalScroll}
        contentContainerStyle={styles.listContent}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (slideWidth + 12));
          if (index >= offers.length) {
            carouselRef.current?.scrollTo({ x: 0, animated: false });
            setActiveIndex(0);
            return;
          }
          setActiveIndex(Math.max(0, Math.min(index, offers.length - 1)));
        }}
      >
        {renderOffers.map((item, index) => (
          <View key={`${String(item?.id || item?.couponCode || "offer")}-${index}`} style={[styles.slide, { width: slideWidth, height: imageHeight }]}>
            <Image source={{ uri: getCouponImageUrl(item.imageUrl) }} style={styles.image} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>
      {offers.length > 1 ? (
        <View style={styles.pagination}>
          {offers.map((item, index) => <View key={String(item?.id || index)} style={[styles.dot, index === activeIndex && styles.activeDot]} />)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 28 },
  loading: { marginTop: 28, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  horizontalScroll: { flexGrow: 0 },
  listContent: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingRight: 16 },
  slide: { borderRadius: 18, overflow: "hidden", backgroundColor: "#F1F5F9" },
  image: { width: "100%", height: "100%" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#CBD5E1" },
  activeDot: { width: 18, backgroundColor: "#E52332" },
});
