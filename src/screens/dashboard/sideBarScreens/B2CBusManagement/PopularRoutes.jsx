import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { Feather as Icon } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const INITIAL_ROUTES = [
  {
    id: 29,
    fromCity: "Hyderabad(8875)",
    toCity: "Vijayawada (9382)",
    status: "active",
    startPrice: 2000,
    imageUrl: "",
  },
];

export default function PopularBusRoutes() {
  const [routes, setRoutes] = useState(INITIAL_ROUTES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [addForm, setAddForm] = useState({
    fromCity: "",
    toCity: "",
    status: "active",
    startPrice: "",
    imageUrl: "",
  });

  const handleAddRoute = () => {
    if (!addForm.fromCity || !addForm.toCity) return;

    const newRoute = {
      ...addForm,
      id: Date.now(), // ✅ FIXED ID BUG
      startPrice: Number(addForm.startPrice),
    };

    setRoutes([...routes, newRoute]);
    setIsAddModalOpen(false);
  };

  const toggleStatus = (id) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "active" ? "inactive" : "active" }
          : r
      )
    );
  };

  const deleteRoute = (id) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setAddForm({
        ...addForm,
        imageUrl: result.assets[0].uri,
      });
    }
  };

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Icon name="plus" color="#fff" size={16} />
            <Text style={styles.btnText}>Add Popular Bus Route</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn}>
            <Icon name="download" color="#fff" size={16} />
            <Text style={styles.btnText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TABLE */}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>

          {/* HEADER ROW */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: 50 }]}>SN</Text>
            <Text style={[styles.th, { width: 70 }]}>ID</Text>
            <Text style={[styles.th, { width: 180 }]}>From City</Text>
            <Text style={[styles.th, { width: 180 }]}>To City</Text>
            <Text style={[styles.th, { width: 100 }]}>Image</Text>
            <Text style={[styles.th, { width: 120 }]}>Status</Text>
            <Text style={[styles.th, { width: 120 }]}>Start Price</Text>
            <Text style={[styles.th, { width: 180 }]}>Action</Text>
          </View>

          {/* DATA ROWS */}
          {routes.map((item, index) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, { width: 50 }]}>{index + 1}</Text>
              <Text style={[styles.td, { width: 70 }]}>{item.id}</Text>

              <Text style={[styles.td, { width: 180 }]} numberOfLines={1}>
                {item.fromCity}
              </Text>

              <Text style={[styles.td, { width: 180 }]} numberOfLines={1}>
                {item.toCity}
              </Text>

              <View style={[styles.td, { width: 100 }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} />
                ) : (
                  <Icon name="eye" size={16} />
                )}
              </View>

              <View style={[styles.td, { width: 120 }]}>
                <TouchableOpacity
                  onPress={() => toggleStatus(item.id)}
                  style={[
                    styles.statusChip,
                    item.status === "active"
                      ? styles.active
                      : styles.inactive,
                  ]}
                >
                  <Text>
                    {item.status === "active" ? "Active" : "Inactive"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.td, { width: 120 }]}>
                {item.startPrice}
              </Text>

              <View style={[styles.td, { width: 180, flexDirection: "row" }]}>
                <TouchableOpacity>
                  <Text style={{ marginRight: 10 }}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => deleteRoute(item.id)}>
                  <Text style={{ color: "red" }}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* MODAL */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Bus Route</Text>

            <ScrollView>
              <Text>From City</Text>
              <TextInput
                style={styles.input}
                onChangeText={(t) =>
                  setAddForm({ ...addForm, fromCity: t })
                }
              />

              <Text>To City</Text>
              <TextInput
                style={styles.input}
                onChangeText={(t) =>
                  setAddForm({ ...addForm, toCity: t })
                }
              />

              <Text>Start Price</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                onChangeText={(t) =>
                  setAddForm({ ...addForm, startPrice: t })
                }
              />

              <TouchableOpacity style={styles.fileBtn} onPress={pickImage}>
                <Text>Choose Image</Text>
              </TouchableOpacity>

              {addForm.imageUrl ? (
                <Image source={{ uri: addForm.imageUrl }} style={styles.preview} />
              ) : (
                <Text>No image</Text>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddRoute}
              >
                <Text style={{ color: "#fff" }}>Submit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },

  header: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 },
  headerBtns: { flexDirection: "row", gap: 10 },

  addBtn: { flexDirection: "row", backgroundColor: "#7a1f1f", padding: 10, borderRadius: 10 },
  exportBtn: { flexDirection: "row", backgroundColor: "#1e8e3e", padding: 10, borderRadius: 10 },
  btnText: { color: "#fff", marginLeft: 5 },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#7a1f1f",
    padding: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  th: { color: "#fff", fontWeight: "bold" },
  td: { justifyContent: "center" },

  image: { width: 40, height: 40, borderRadius: 6 },

  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },

  active: { backgroundColor: "#e6f4ea" },
  inactive: { backgroundColor: "#fde8e8" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },

  modal: {
    margin: 20,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
  },

  modalTitle: { fontSize: 18, marginBottom: 10 },

  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },

  fileBtn: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },

  preview: { height: 120, marginTop: 10 },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },

  submitBtn: {
    backgroundColor: "#7a1f1f",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
});