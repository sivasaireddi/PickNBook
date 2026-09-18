import React, { useContext, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import AuthContext from '../../../context/AuthContext'
import { requireAuthToken, clearAuthSession } from '../../../utils/authSession'
import { useNavigation } from '@react-navigation/native'
import { API_BASE_URL } from '../../../constants/config'

const PROFILE_API_URL = `${API_BASE_URL}/api/profile`

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'

const getObjectValue = (value) =>
  value && typeof value === 'object' ? value : null

const buildFullName = (firstName, lastName, fallback = '') => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
  return fullName || fallback || ''
}

const normalizeUser = (value, fallback = {}) => {
  const root = getObjectValue(value) || {}
  const raw =
    getObjectValue(root.profile) ||
    getObjectValue(root.user) ||
    getObjectValue(root.data?.profile) ||
    getObjectValue(root.data?.user) ||
    getObjectValue(root.data) ||
    getObjectValue(root.result) ||
    root

  const firstName =
    raw.firstName ?? raw.FirstName ?? root.firstName ?? fallback.firstName ?? ''
  const lastName =
    raw.lastName ?? raw.LastName ?? root.lastName ?? fallback.lastName ?? ''

  return {
    ...fallback,
    ...raw,
    id:
      raw.id ??
      raw.userId ??
      raw.Id ??
      root.id ??
      root.userId ??
      root.Id ??
      fallback.id ??
      null,
    firstName,
    lastName,
    email: raw.email ?? raw.Email ?? root.email ?? fallback.email ?? '',
    phoneNumber:
      raw.phoneNumber ??
      raw.phone ??
      raw.mobile ??
      root.phoneNumber ??
      fallback.phoneNumber ??
      '',
    profileImageUrl: raw.profileImageUrl
      ? raw.profileImageUrl.startsWith('http')
        ? raw.profileImageUrl
        : `${BASE_URL}${raw.profileImageUrl}`
      : fallback.profileImageUrl ?? null,
    fullName: buildFullName(
      firstName,
      lastName,
      raw.fullName ?? root.fullName ?? fallback.fullName ?? ''
    ),
  }
}

const hasUserData = (value) =>
  Boolean(value?.id || value?.fullName || value?.email || value?.phoneNumber)

const ProfileScreen = () => {
  const navigation = useNavigation()
  const { signOut } = useContext(AuthContext)

  const [user, setUser] = useState(null)
  const [imageUri, setImageUri] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [settingsModalVisible, setSettingsModalVisible] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const applyUserState = (nextUser) => {
    setUser(nextUser)
    setFirstName(nextUser?.firstName || '')
    setLastName(nextUser?.lastName || 'Reddy')
    setPhoneNumber(nextUser?.phoneNumber || '')
  }

  useEffect(() => {
    loadUser()
  }, [])

  const safeFetchJSON = async (response) => {
    const text = await response.text()
    if (!text) throw new Error('Empty response from server')
    try {
      return JSON.parse(text)
    } catch {
      throw new Error('Invalid JSON response')
    }
  }

  const loadUser = async () => {
    let cachedUser = null

    try {
      setIsLoading(true)

      const [token, savedImage, storedUser] = await Promise.all([
        SecureStore.getItemAsync('token'),
        SecureStore.getItemAsync('profileImage'),
        SecureStore.getItemAsync('user'),
      ])

      if (savedImage) setImageUri(savedImage)

      if (storedUser) {
        try {
          cachedUser = normalizeUser(JSON.parse(storedUser))
          if (hasUserData(cachedUser)) {
            applyUserState(cachedUser)
          }
        } catch (e) {
          console.log('STORED USER ERROR:', e.message)
        }
      }

      if (!cachedUser) {
        applyUserState({
          firstName: '',
          lastName: 'Reddy',
          fullName: '',
          email: '',
          phoneNumber: '',
        })
      }

      if (!token) return

      const response = await fetch(PROFILE_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch profile')

      const data = await safeFetchJSON(response)
      const formattedUser = normalizeUser(data, cachedUser ?? {})
      applyUserState(formattedUser)
      await SecureStore.setItemAsync('user', JSON.stringify(formattedUser))
    } catch (error) {
      console.log('PROFILE ERROR:', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow gallery access')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    })

    if (!result.canceled) {
      setImageUri(result.assets[0].uri)
      await SecureStore.setItemAsync('profileImage', result.assets[0].uri)
    }
  }

  const handleUpdateProfile = async () => {
    if (!firstName || !lastName || !phoneNumber) {
      Alert.alert('Validation', 'All fields are required')
      return
    }

    try {
      setIsSaving(true)
      const token = await requireAuthToken('Session expired. Please sign in again.')

      const formData = new FormData()
      formData.append('firstName', firstName)
      formData.append('lastName', lastName)
      formData.append('phoneNumber', phoneNumber)

      if (imageUri) {
        formData.append('profileImage', {
          uri: imageUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        })
      }

      const response = await fetch(`${BASE_URL}/api/profile/edit`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) throw new Error('Update failed')

      const data = await safeFetchJSON(response)
      const updatedUser = normalizeUser(data, user ?? {})

      applyUserState(updatedUser)

      if (imageUri) {
        await SecureStore.setItemAsync('profileImage', imageUri)
      }

      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser))
      setEditModalVisible(false)
      Alert.alert('Success', 'Profile updated successfully')
    } catch (error) {
      console.log('UPDATE ERROR:', error.message)
      const updatedUser = {
        ...user,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        phoneNumber,
      }
      applyUserState(updatedUser)
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser))
      setEditModalVisible(false)
      Alert.alert('Success', 'Profile updated locally')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Do you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true)
            await clearAuthSession()
            setIsLoggingOut(false)
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          } catch (err) {
            console.log('LOGOUT ERROR:', err.message)
            setIsLoggingOut(false)
          }
        },
      },
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  const displayAvatar =
    imageUri || user?.profileImageUrl || DEFAULT_AVATAR

  const displayName = user?.fullName || ''
  const displayEmail = user?.email || ''
  const displayPhone = user?.phoneNumber || ''

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
          <Text style={styles.headerSubtitle}>
            Manage your profile and preferences
          </Text>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.85}
          onPress={() => setEditModalVisible(true)}
        >
          <View style={styles.avatarContainer}>
            <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayEmail}</Text>
            <Text style={styles.userPhone}>{displayPhone}</Text>

          </View>

          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Main Menu Options Group */}
        <View style={styles.menuGroup}>
          {/* My Bookings */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Bookings')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="ticket-outline" size={22} color="#2563EB" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>My Bookings</Text>
              <Text style={styles.menuSubtitle}>View and manage your bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Saved Travelers */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('TravelersScreen')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="people-outline" size={22} color="#EA580C" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Saved Travelers</Text>
              <Text style={styles.menuSubtitle}>Manage your saved passengers for faster booking</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>



          {/* Help Center */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Help')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="help-circle-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Help Center</Text>
              <Text style={styles.menuSubtitle}>Get help and support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>


        </View>

        {/* Logout Button Card */}
        <TouchableOpacity
          style={styles.logoutCard}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <View style={styles.logoutContent}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
            {isLoggingOut ? (
              <ActivityIndicator color="#EF4444" size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            )}
          </View>
        </TouchableOpacity>


      </ScrollView>

      {/* Modal 1: Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAvatarContainer}>
              <Image source={{ uri: displayAvatar }} style={styles.modalAvatar} />
              <TouchableOpacity style={styles.modalChangePhotoButton} onPress={pickImage}>
                <Ionicons name="camera-outline" size={16} color="#2563EB" />
                <Text style={styles.modalChangePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.modalInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.modalInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="Phone Number"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Payment Methods Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Methods</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.paymentCardItem}>
              <Ionicons name="card" size={28} color="#2563EB" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paymentCardName}>Visa ending in 4242</Text>
                <Text style={styles.paymentCardExpiry}>Expires 12/28</Text>
              </View>
              <Text style={styles.defaultBadge}>Default</Text>
            </View>
            <View style={styles.paymentCardItem}>
              <Ionicons name="wallet-outline" size={28} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paymentCardName}>PickNBook Wallet</Text>
                <Text style={styles.paymentCardExpiry}>Balance: ₹1,250.00</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addPaymentButton} onPress={() => setPaymentModalVisible(false)}>
              <Ionicons name="add" size={20} color="#2563EB" />
              <Text style={styles.addPaymentText}>Add New Payment Method</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                setSettingsModalVisible(false)
                navigation.navigate('ChangePassword')
              }}
            >
              <Ionicons name="lock-closed-outline" size={22} color="#64748B" />
              <Text style={styles.settingsRowText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <View style={styles.settingsRow}>
              <Ionicons name="notifications-outline" size={22} color="#64748B" />
              <Text style={styles.settingsRowText}>Push Notifications</Text>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <View style={styles.settingsRow}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#64748B" />
              <Text style={styles.settingsRowText}>Privacy & Security</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default ProfileScreen

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 30,
  },
  header: {
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '400',
  },
  profileCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#CBD5E1',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  memberBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberBadgeText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    flex: 1,
    marginLeft: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  modalChangePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalChangePhotoText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  paymentCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  paymentCardExpiry: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addPaymentText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsRowText: {
    flex: 1,
    marginLeft: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
})
