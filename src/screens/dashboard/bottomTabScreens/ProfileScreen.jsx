import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { LinearGradient } from 'expo-linear-gradient'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import AuthContext from '../../../context/AuthContext'
import { requireAuthToken, clearAuthSession } from '../../../utils/authSession'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { API_BASE_URL } from '../../../constants/config'
import { getWalletSummary } from '../../../services/WalletService'
import { BUS_FLOW_COLORS } from '../../../constants/colors'
import AppHeader from '../../../components/AppHeader'
import LegalEntityFooter from '../../../components/common/LegalEntityFooter'

const PROFILE_API_URL = `${API_BASE_URL}/api/profile`
const PRIVACY_POLICY_URL = 'https://picknbook.in/legal/privacy-policy'

const getObjectValue = (value) =>
  value && typeof value === 'object' ? value : null

const buildFullName = (firstName, lastName, fallback = '') => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
  return fullName || fallback || ''
}

const firstDefined = (...values) => values.find((value) => value !== undefined)

const normalizeProfileImageUrl = (value) => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
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
  const profileImageValue = firstDefined(
    raw.profileImageUrl,
    raw.ProfileImageUrl,
    raw.profileImage,
    raw.ProfileImage,
    raw.profilePhotoUrl,
    raw.ProfilePhotoUrl,
    raw.profilePhoto,
    raw.profilePictureUrl,
    raw.ProfilePictureUrl,
    raw.profilePicture,
    raw.ProfilePicture,
    raw.avatar,
    raw.photo,
    raw.imageUrl,
    raw.image,
    root.profileImageUrl,
    root.ProfileImageUrl,
    root.profileImage,
    root.ProfileImage,
    root.profilePhotoUrl,
    root.ProfilePhotoUrl,
    root.profilePhoto,
    root.profilePictureUrl,
    root.ProfilePictureUrl,
    root.profilePicture,
    root.ProfilePicture,
    root.avatar,
    root.photo,
    root.imageUrl,
    root.image
  )

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
    profileImageUrl:
      profileImageValue === undefined
        ? fallback.profileImageUrl ?? null
        : normalizeProfileImageUrl(profileImageValue),
    profileImageVersion:
      raw.profileImageUpdatedAt ??
      raw.updatedAt ??
      root.profileImageUpdatedAt ??
      root.updatedAt ??
      fallback.profileImageVersion ??
      null,
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
  const [imageAsset, setImageAsset] = useState(null)
  const [imageVersion, setImageVersion] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [settingsModalVisible, setSettingsModalVisible] = useState(false)
  const [walletSummary, setWalletSummary] = useState(null)
  const [walletLoading, setWalletLoading] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const applyUserState = (nextUser) => {
    setUser(nextUser)
    setFirstName(nextUser?.firstName || '')
    setLastName(nextUser?.lastName || '')
    setPhoneNumber(nextUser?.phoneNumber || '')
  }

  useEffect(() => {
    loadUser()
  }, [])

  useFocusEffect(
    useCallback(() => {
      let active = true
      setWalletLoading(true)
      getWalletSummary()
        .then((summary) => {
          if (active) setWalletSummary(summary)
        })
        .catch((error) => {
          console.warn('[ProfileScreen] wallet summary failed:', error.message)
          if (active) setWalletSummary(null)
        })
        .finally(() => {
          if (active) setWalletLoading(false)
        })
      return () => { active = false }
    }, [])
  )

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

      const [token, storedUser] = await Promise.all([
        SecureStore.getItemAsync('token'),
        SecureStore.getItemAsync('user'),
      ])

      await SecureStore.deleteItemAsync('profileImage')

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
      setImageUri(null)
      setImageVersion(formattedUser.profileImageVersion || null)
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
      const selectedAsset = result.assets[0]
      setImageUri(selectedAsset.uri)
      setImageAsset(selectedAsset)
      setEditModalVisible(true)
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
      formData.append('FirstName', firstName)
      formData.append('LastName', lastName)
      formData.append('PhoneNumber', phoneNumber)

      if (imageUri) {
        formData.append('ProfileImage', {
          uri: imageUri,
          name: imageAsset?.fileName || `profile.${imageAsset?.mimeType === 'image/png' ? 'png' : 'jpg'}`,
          type: imageAsset?.mimeType || 'image/jpeg',
        })
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/edit`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Update failed (${response.status})${errorText ? `: ${errorText}` : ''}`)
      }

      const data = await safeFetchJSON(response)
      const updatedUser = normalizeUser(data, user ?? {})

      applyUserState(updatedUser)
      setImageUri(null)
      setImageAsset(null)
      setImageVersion(imageUri ? Date.now() : updatedUser.profileImageVersion || imageVersion)
      await SecureStore.deleteItemAsync('profileImage')

      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser))
      setEditModalVisible(false)
      Alert.alert('Success', 'Profile updated successfully')
    } catch (error) {
      console.log('UPDATE ERROR:', error.message)
      Alert.alert('Update failed', 'Your profile was not changed. Please try again.')
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

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL)
    } catch {
      Alert.alert('Unable to open', 'Please visit picknbook.in to view the privacy policy.')
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Account deletion is permanent. Please contact Pick&Book support to verify and complete this request.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Contact Support', onPress: () => navigation.navigate('Help') },
      ]
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  const serverAvatar = user?.profileImageUrl
    ? `${user.profileImageUrl}${user.profileImageUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(
        imageVersion || user.profileImageVersion || 'current'
      )}`
    : null
  const displayAvatar = imageUri || serverAvatar

  const displayName = user?.fullName || ''
  const displayEmail = user?.email || ''
  const displayPhone = user?.phoneNumber || ''
  const displayInitial = (displayName || displayEmail || 'P').trim().charAt(0).toUpperCase()
  const walletBalance = walletSummary
    ? walletSummary.availableBalance.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null

  const renderAvatar = (imageStyle, initialsStyle) =>
    displayAvatar ? (
      <Image source={{ uri: displayAvatar }} style={imageStyle} />
    ) : (
      <View style={[imageStyle, styles.initialsAvatar]}>
        <Text style={initialsStyle}>{displayInitial}</Text>
      </View>
    )

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Account" />
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#E83B49', '#C81525', '#8F0C17']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.accountTicket}
        >
          <View style={styles.ticketDecor} />
          <TouchableOpacity
            style={styles.profileSection}
            activeOpacity={0.85}
            onPress={() => setEditModalVisible(true)}
          >
            <View style={styles.avatarContainer}>
              {renderAvatar(styles.avatarImage, styles.avatarInitialText)}
              <TouchableOpacity style={styles.cameraBadge} onPress={pickImage} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={15} color={BUS_FLOW_COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{displayName || 'Pick&Book Traveller'}</Text>
              {displayEmail ? <Text style={styles.userEmail} numberOfLines={1}>{displayEmail}</Text> : null}
              {displayPhone ? <Text style={styles.userPhone} numberOfLines={1}>{displayPhone}</Text> : null}
            </View>

            <View style={styles.ticketArrowMuted}>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.ticketSeparator}>
            <View style={[styles.ticketCutout, styles.ticketCutoutLeft]} />
            <View style={[styles.ticketCutout, styles.ticketCutoutRight]} />
          </View>

          <TouchableOpacity
            style={styles.walletSection}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('WalletScreen')}
          >
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet-outline" size={23} color={BUS_FLOW_COLORS.primary} />
            </View>
            <View style={styles.walletContent}>
              <Text style={styles.walletLabel}>WALLET</Text>
              <View style={styles.walletAmountRow}>
                <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {walletLoading ? 'Loading…' : walletBalance ? `₹${walletBalance}` : 'Unavailable'}
                </Text>
                {!walletLoading && walletBalance ? <Text style={styles.walletAvailable}>available</Text> : null}
              </View>
              <Text style={styles.walletDescription} numberOfLines={2}>
                Manage your wallet balance and transactions
              </Text>
            </View>
            <View style={styles.ticketArrowLight}>
              <Ionicons name="chevron-forward" size={20} color={BUS_FLOW_COLORS.primary} />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionLabel}>MY JOURNEY</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Bookings')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="ticket-outline" size={21} color={BUS_FLOW_COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>My Bookings</Text>
              <Text style={styles.menuSubtitle}>View and manage your bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('TravelersScreen')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="people-outline" size={21} color={BUS_FLOW_COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Saved Travelers</Text>
              <Text style={styles.menuSubtitle}>Manage your saved passengers for faster booking</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Help')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="help-circle-outline" size={21} color={BUS_FLOW_COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Help Center</Text>
              <Text style={styles.menuSubtitle}>Get help and support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>PRIVACY & DATA</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={handlePrivacyPolicy}>
            <View style={styles.iconBox}>
              <Ionicons name="shield-checkmark-outline" size={21} color={BUS_FLOW_COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Privacy Policy</Text>
              <Text style={styles.menuSubtitle}>Read how we handle your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B9A9AD" />
          </TouchableOpacity>

          <View style={styles.privacyDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={handleDeleteAccount}>
            <View style={[styles.iconBox, styles.deleteIconBox]}>
              <Ionicons name="trash-outline" size={21} color={BUS_FLOW_COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.deleteTitle}>Delete Account</Text>
              <Text style={styles.menuSubtitle}>Permanently delete your account and data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B9A9AD" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutCard}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={20} color={BUS_FLOW_COLORS.primary} />
            <Text style={styles.logoutText}>Logout</Text>
            {isLoggingOut ? (
              <ActivityIndicator color={BUS_FLOW_COLORS.primary} size="small" />
            ) : null}
          </View>
        </TouchableOpacity>

        <LegalEntityFooter style={styles.legalFooter} />
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
              {renderAvatar(styles.modalAvatar, styles.modalAvatarInitialText)}
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
  walletMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  walletIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE8EB',
  },
  walletBalanceText: {
    fontSize: 12,
    color: '#E52332',
    fontWeight: '700',
    marginTop: 4,
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
    marginBottom: 12,
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
  legalFooter: {
    marginBottom: 4,
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

  // Premium Account screen
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF6F6',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FBF6F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  accountTicket: {
    overflow: 'hidden',
    borderRadius: 28,
    shadowColor: BUS_FLOW_COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 7,
  },
  ticketDecor: {
    position: 'absolute',
    top: -55,
    right: -45,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  profileSection: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    color: BUS_FLOW_COLORS.primary,
    fontSize: 34,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 15,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  userEmail: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11.5,
    fontWeight: '600',
  },
  userPhone: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11.5,
    fontWeight: '600',
  },
  ticketArrowMuted: {
    width: 35,
    height: 35,
    marginLeft: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ticketSeparator: {
    height: 1,
    marginHorizontal: 10,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ticketCutout: {
    position: 'absolute',
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FBF6F6',
  },
  ticketCutoutLeft: {
    left: -19,
  },
  ticketCutoutRight: {
    right: -19,
  },
  walletSection: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(82,0,8,0.23)',
  },
  walletIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  walletContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  walletAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  walletAmount: {
    maxWidth: '72%',
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  walletAvailable: {
    marginLeft: 7,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    fontWeight: '700',
  },
  walletDescription: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 10.5,
    lineHeight: 14,
  },
  ticketArrowLight: {
    width: 38,
    height: 38,
    marginLeft: 9,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 9,
    marginLeft: 4,
    color: BUS_FLOW_COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  menuGroup: {
    overflow: 'hidden',
    marginBottom: 0,
    paddingVertical: 4,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EBD5D7',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1216',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 17,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEE',
  },
  menuTextContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },
  menuTitle: {
    color: '#1A1216',
    fontSize: 15.5,
    fontWeight: '800',
  },
  deleteTitle: {
    color: BUS_FLOW_COLORS.primary,
    fontSize: 15.5,
    fontWeight: '800',
  },
  menuSubtitle: {
    marginTop: 3,
    color: '#6B6168',
    fontSize: 11,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    marginLeft: 75,
    marginRight: 17,
    backgroundColor: '#F1E4E5',
  },
  privacyDivider: {
    height: 1,
    marginHorizontal: 17,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E7C9CC',
  },
  deleteIconBox: {
    backgroundColor: '#FCE3E5',
  },
  logoutCard: {
    minHeight: 56,
    marginTop: 18,
    marginBottom: 16,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0B4B9',
    backgroundColor: '#FFFFFF',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    marginLeft: 9,
    color: BUS_FLOW_COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  legalFooter: {
    marginBottom: 2,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#FDECEE',
  },
  modalAvatarInitialText: {
    color: BUS_FLOW_COLORS.primary,
    fontSize: 32,
    fontWeight: '900',
  },
})
