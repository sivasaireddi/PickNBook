import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Animated,
  Dimensions,
  ToastAndroid,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  getTravelers,
  getTravelerById,
  createTraveler,
  updateTraveler,
  deleteTraveler,
} from "../services/travelerService";
import {
  validateTravelerForm,
  sanitizeTravelerPayload,
  TRAVELER_TYPES,
  TITLES,
  GENDERS,
} from "../utils/travelerValidation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Toast helper ───────────────────────────────────────────────────────────
function showToast(message) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("", message);
  }
}

// ─── Error message extractor ────────────────────────────────────────────────
function extractErrorMessage(error, fallback = "Something went wrong.") {
  if (error?.response?.status === 401) return "Session expired. Please log in again.";
  if (error?.response?.status === 404) return "Traveler not found.";
  const apiMsg =
    error?.response?.data?.message ||
    error?.response?.data?.Message ||
    error?.response?.data?.error ||
    error?.response?.data?.title;
  if (apiMsg) return apiMsg;
  if (error?.message?.includes("Network")) return "Network error. Please check your connection.";
  return error?.message || fallback;
}

// ─── Type badge colors ──────────────────────────────────────────────────────
const TYPE_BADGE = {
  Adult: { bg: "#EFF6FF", text: "#2563EB" },
  Child: { bg: "#FFF7ED", text: "#EA580C" },
  Infant: { bg: "#F5F3FF", text: "#7C3AED" },
};

// ─── Skeleton Card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <Animated.View style={[styles.skeletonLine, { width: "60%", opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: "35%", marginTop: 8, opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: "80%", marginTop: 8, opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: "45%", marginTop: 8, opacity }]} />
      </View>
    </View>
  );
}

// ─── Dropdown Picker Component ──────────────────────────────────────────────
function DropdownPicker({ label, value, options, onSelect, error }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {label} <Text style={styles.requiredStar}>*</Text>
      </Text>
      <TouchableOpacity
        style={[styles.dropdownButton, error ? styles.inputError : null]}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.dropdownButtonText, !value && { color: "#94A3B8" }]}>
          {value || `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownMenuTitle}>{label}</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.dropdownOption,
                  opt === value && styles.dropdownOptionActive,
                ]}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    opt === value && styles.dropdownOptionTextActive,
                  ]}
                >
                  {opt}
                </Text>
                {opt === value && (
                  <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── MAIN SCREEN ────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export default function TravelersScreen() {
  const navigation = useNavigation();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [travelers, setTravelers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState(null); // null = add mode
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const emptyForm = {
    type: "",
    title: "",
    firstName: "",
    lastName: "",
    gender: "",
    age: "",
    email: "",
    phoneNo: "",
    passportNo: "",
    country: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const debounceRef = useRef(null);

  // ─── Load Travelers ─────────────────────────────────────────────────────────
  const loadTravelers = useCallback(async (query) => {
    try {
      setErrorMessage("");
      const filters = query ? { query } : {};
      const data = await getTravelers(filters);
      setTravelers(data);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Failed to load travelers."));
      setTravelers([]);
    }
  }, []);

  const fetchInitial = useCallback(async () => {
    setIsLoading(true);
    await loadTravelers(searchText);
    setIsLoading(false);
  }, [loadTravelers, searchText]);

  useEffect(() => {
    fetchInitial();
  }, []);

  // ─── Pull to Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTravelers(searchText);
    setIsRefreshing(false);
  }, [loadTravelers, searchText]);

  // ─── Search with 400ms Debounce ─────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (text) => {
      setSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        await loadTravelers(text);
        setIsLoading(false);
      }, 400);
    },
    [loadTravelers]
  );

  // ─── Open Add Modal ─────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingTraveler(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalVisible(true);
  };

  // ─── Open Edit Modal ────────────────────────────────────────────────────────
  const openEditModal = async (traveler) => {
    setEditingTraveler(traveler);
    setFormErrors({});
    setIsLoadingEdit(true);
    setModalVisible(true);

    try {
      const full = await getTravelerById(traveler.id);
      setForm({
        type: full.type || "Adult",
        title: full.title || "Mr",
        firstName: full.firstName || "",
        lastName: full.lastName || "",
        gender: full.gender || "Male",
        age: String(full.age || ""),
        email: full.email || "",
        phoneNo: full.phoneNo || full.phoneNumber || "",
        passportNo: full.passportNo || "",
        country: full.country || "",
      });
    } catch (error) {
      // Fallback: use local data if GET by id fails
      setForm({
        type: traveler.type || "Adult",
        title: traveler.title || "Mr",
        firstName: traveler.firstName || "",
        lastName: traveler.lastName || "",
        gender: traveler.gender || "Male",
        age: String(traveler.age || ""),
        email: traveler.email || "",
        phoneNo: traveler.phoneNo || traveler.phoneNumber || "",
        passportNo: traveler.passportNo || "",
        country: traveler.country || "",
      });
    } finally {
      setIsLoadingEdit(false);
    }
  };

  // ─── Save / Update ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    const { isValid, errors } = validateTravelerForm(form);
    setFormErrors(errors);
    if (!isValid) return;

    const payload = sanitizeTravelerPayload(form);
    setIsSaving(true);

    try {
      if (editingTraveler) {
        await updateTraveler(editingTraveler.id, payload);
        showToast("Traveler updated successfully.");
      } else {
        await createTraveler(payload);
        showToast("Traveler added successfully.");
      }
      setModalVisible(false);
      setForm(emptyForm);
      setEditingTraveler(null);
      // Refresh list
      setIsLoading(true);
      await loadTravelers(searchText);
      setIsLoading(false);
    } catch (error) {
      const msg = extractErrorMessage(error, "Failed to save traveler.");
      // Show backend validation errors inline if available
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const mapped = {};
        for (const [key, val] of Object.entries(apiErrors)) {
          mapped[key.charAt(0).toLowerCase() + key.slice(1)] = Array.isArray(val)
            ? val[0]
            : val;
        }
        setFormErrors((prev) => ({ ...prev, ...mapped }));
      } else {
        showToast(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (traveler) => {
    Alert.alert(
      "Delete Traveler?",
      "Are you sure you want to remove this traveler?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTraveler(traveler.id);
              // Optimistically remove from list
              setTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
              showToast("Traveler deleted successfully.");
            } catch (error) {
              showToast(extractErrorMessage(error, "Failed to delete traveler."));
            }
          },
        },
      ]
    );
  };

  // ─── Update single form field ───────────────────────────────────────────────
  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // ─── Render Traveler Card ───────────────────────────────────────────────────
  const renderCard = ({ item }) => {
    const badge = TYPE_BADGE[item.type] || TYPE_BADGE.Adult;
    return (
      <View style={styles.card}>
        <View style={styles.cardBody}>
          {/* Row 1: Name + Type badge */}
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>
                {item.title} {item.firstName} {item.lastName}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                {item.type || "Adult"}
              </Text>
            </View>
          </View>

          {/* Row 2: Details */}
          <View style={styles.cardDetails}>
            <View style={styles.detailChip}>
              <Ionicons name="person-outline" size={13} color="#64748B" />
              <Text style={styles.detailText}>{item.gender}</Text>
            </View>
            <View style={styles.detailChip}>
              <Ionicons name="calendar-outline" size={13} color="#64748B" />
              <Text style={styles.detailText}>Age {item.age}</Text>
            </View>
            {item.country ? (
              <View style={styles.detailChip}>
                <Ionicons name="globe-outline" size={13} color="#64748B" />
                <Text style={styles.detailText}>{item.country}</Text>
              </View>
            ) : null}
          </View>

          {/* Row 3: Contact info */}
          {(item.phoneNumber || item.email) ? (
            <View style={styles.cardContactRow}>
              {item.phoneNumber ? (
                <View style={styles.contactItem}>
                  <Ionicons name="call-outline" size={13} color="#64748B" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {item.phoneNumber}
                  </Text>
                </View>
              ) : null}
              {item.email ? (
                <View style={styles.contactItem}>
                  <Ionicons name="mail-outline" size={13} color="#64748B" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Row 4: Passport (only if available) */}
          {item.passportNo ? (
            <View style={styles.passportRow}>
              <Ionicons name="document-text-outline" size={13} color="#64748B" />
              <Text style={styles.passportText}>Passport: {item.passportNo}</Text>
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={20} color="#2563EB" />
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Empty State ────────────────────────────────────────────────────────────
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
        </View>
        <Text style={styles.emptyTitle}>No saved travelers found.</Text>
        <Text style={styles.emptySubtitle}>
          Add your first traveler to speed up bookings.
        </Text>
        <TouchableOpacity
          style={styles.emptyAddButton}
          activeOpacity={0.8}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.emptyAddButtonText}>Add Traveler</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Travelers</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search travelers..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => handleSearchChange("")}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchInitial}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── List / Skeleton ────────────────────────────────────────────────── */}
      {isLoading ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      ) : (
        <FlatList
          data={travelers}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            travelers.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#2563EB"]}
              tintColor="#2563EB"
            />
          }
        />
      )}

      {/* ── FAB ────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Traveler</Text>
      </TouchableOpacity>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setEditingTraveler(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTraveler ? "Edit Traveler" : "Add Traveler"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditingTraveler(null);
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {isLoadingEdit ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.modalLoadingText}>Loading traveler data...</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Dropdowns row */}
                <View style={styles.dropdownRow}>
                  <View style={{ flex: 1 }}>
                    <DropdownPicker
                      label="Type"
                      value={form.type}
                      options={TRAVELER_TYPES}
                      onSelect={(v) => updateField("type", v)}
                      error={formErrors.type}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <DropdownPicker
                      label="Title"
                      value={form.title}
                      options={TITLES}
                      onSelect={(v) => updateField("title", v)}
                      error={formErrors.title}
                    />
                  </View>
                </View>

                <DropdownPicker
                  label="Gender"
                  value={form.gender}
                  options={GENDERS}
                  onSelect={(v) => updateField("gender", v)}
                  error={formErrors.gender}
                />

                {/* Text inputs */}
                <FormInput
                  label="First Name"
                  required
                  value={form.firstName}
                  onChangeText={(v) => updateField("firstName", v)}
                  error={formErrors.firstName}
                  placeholder="Enter first name"
                />
                <FormInput
                  label="Last Name"
                  required
                  value={form.lastName}
                  onChangeText={(v) => updateField("lastName", v)}
                  error={formErrors.lastName}
                  placeholder="Enter last name"
                />
                <FormInput
                  label="Age"
                  required
                  value={form.age}
                  onChangeText={(v) => updateField("age", v)}
                  error={formErrors.age}
                  placeholder="Enter age"
                  keyboardType="number-pad"
                />
                <FormInput
                  label="Country"
                  required
                  value={form.country}
                  onChangeText={(v) => updateField("country", v)}
                  error={formErrors.country}
                  placeholder="Enter country"
                />
                <FormInput
                  label="Email"
                  value={form.email}
                  onChangeText={(v) => updateField("email", v)}
                  error={formErrors.email}
                  placeholder="Enter email (optional)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <FormInput
                  label="Phone Number"
                  value={form.phoneNo}
                  onChangeText={(v) => updateField("phoneNo", v)}
                  error={formErrors.phoneNo}
                  placeholder="Enter phone (optional)"
                  keyboardType="phone-pad"
                  maxLength={30}
                />
                <FormInput
                  label="Passport Number"
                  value={form.passportNo}
                  onChangeText={(v) => updateField("passportNo", v)}
                  error={formErrors.passportNo}
                  placeholder="Enter passport (optional)"
                  autoCapitalize="characters"
                />

                {/* Save button */}
                <TouchableOpacity
                  style={styles.saveButton}
                  activeOpacity={0.85}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingTraveler ? "Update Traveler" : "Save Traveler"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Bottom spacer */}
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Reusable Form Input ────────────────────────────────────────────────────
function FormInput({
  label,
  required,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {label} {required ? <Text style={styles.requiredStar}>*</Text> : null}
      </Text>
      <TextInput
        style={[styles.formInput, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── STYLES ─────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 8 : 12,
    paddingBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#0F172A",
  },

  // ── Error Banner ────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "500",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    marginLeft: 8,
  },

  // ── List ────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  cardBody: {
    padding: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  cardContactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: "#64748B",
    maxWidth: SCREEN_WIDTH * 0.35,
  },
  passportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  passportText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDivider: {
    width: 1,
    backgroundColor: "#F1F5F9",
  },

  // ── Skeleton ────────────────────────────────────────────────────────────────
  skeletonLine: {
    height: 14,
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
  },

  // ── Empty State ─────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ── FAB ─────────────────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Modal ───────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalLoadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  // ── Form Fields ─────────────────────────────────────────────────────────────
  dropdownRow: {
    flexDirection: "row",
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  requiredStar: {
    color: "#EF4444",
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    fontWeight: "500",
  },

  // ── Dropdown ────────────────────────────────────────────────────────────────
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
  },
  dropdownButtonText: {
    fontSize: 15,
    color: "#0F172A",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownMenuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  dropdownOptionText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "500",
  },
  dropdownOptionTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },

  // ── Save Button ─────────────────────────────────────────────────────────────
  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
