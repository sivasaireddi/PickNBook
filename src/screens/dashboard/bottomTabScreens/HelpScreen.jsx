import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../../components/AppHeader";

const COLORS = {
  primary: "#D11A2A",
  text: "#0F172A",
  textSecondary: "#475569",
  background: "#F8F9FB",
  surface: "#FFFFFF",
  border: "#E2E8F0",
};

export default function HelpScreen() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: "1",
      question: "How do I cancel my bus ticket?",
      answer:
        "Go to 'Bookings' tab, select your upcoming bus trip, tap on 'Cancel Ticket', choose your seat(s), and confirm. Instant refund will be credited to PickCash or your original source of payment.",
    },
    {
      id: "2",
      question: "Where can I view my e-ticket / M-ticket?",
      answer:
        "Your e-ticket is available under 'Bookings' > 'Completed/Active Bookings'. You can also show the SMS / WhatsApp message sent to your registered mobile number.",
    },
    {
      id: "3",
      question: "How long does a refund take to process?",
      answer:
        "PickCash refunds are 100% instant! Bank / UPI / Card refunds usually take 2 to 5 business days depending on your bank.",
    },
    {
      id: "4",
      question: "Can I reschedule my journey date?",
      answer:
        "Rescheduling depends on the bus operator policy. Open your ticket in 'Bookings' tab to check if 'Reschedule Journey' option is available.",
    },
  ];

  const contactOptions = [
    {
      id: "call",
      title: "Call Us",
      subtitle: "24/7 Customer Hotline",
      icon: "call-outline",
      color: "#2563EB",
      bgColor: "#EFF6FF",
    },
    {
      id: "chat",
      title: "Live Chat",
      subtitle: "Instant assistance",
      icon: "chatbubbles-outline",
      color: "#059669",
      bgColor: "#ECFDF5",
    },
    {
      id: "email",
      title: "Email Support",
      subtitle: "Get reply in 2 hrs",
      icon: "mail-outline",
      color: "#D97706",
      bgColor: "#FFFBEB",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <AppHeader />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Section */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>How can we help you today? 🎧</Text>
          <Text style={styles.bannerSub}>Find answers or get in touch with our 24/7 support team.</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              placeholder="Search help topics, booking issues..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Contact Us Bar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactGrid}>
            {contactOptions.map((opt) => (
              <TouchableOpacity key={opt.id} style={styles.contactCard} activeOpacity={0.8}>
                <View style={[styles.contactIcon, { backgroundColor: opt.bgColor }]}>
                  <Ionicons name={opt.icon} size={22} color={opt.color} />
                </View>
                <Text style={styles.contactTitle}>{opt.title}</Text>
                <Text style={styles.contactSub}>{opt.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            {faqs.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <View key={faq.id} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedFaq(isOpen ? null : faq.id)}
                  >
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.faqBody}>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  contactGrid: {
    flexDirection: "row",
    gap: 10,
  },
  contactCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  faqList: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    paddingRight: 10,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
});
