import React, { useContext, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import AuthContext from '../../../context/AuthContext'
import { requireAuthToken, clearAuthSession } from '../../../utils/authSession'
import AppHeader from '../../../components/AppHeader'
import { useNavigation } from '@react-navigation/native'

const BASE_URL =
  'https://paycheck-baton-overfull.ngrok-free.dev'

const PROFILE_API_URL = `${BASE_URL}/api/profile`

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
      ? `${BASE_URL}${raw.profileImageUrl}`
      : fallback.profileImageUrl ?? null,
    fullName: buildFullName(
      firstName,
      lastName,
      raw.fullName ?? root.fullName ?? fallback.fullName
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
  const [isEditing, setIsEditing] = useState(false)

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

  const safeFetchJSON = async (response) => {
    const text = await response.text()
    console.log('RAW RESPONSE:', text)

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

      if (!token) {
        if (!hasUserData(cachedUser)) {
          throw new Error('No login session found')
        }
        return
      }

      const response = await fetch(PROFILE_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch profile')

      const data = await safeFetchJSON(response)

      const formattedUser = normalizeUser(data, cachedUser ?? {})

      applyUserState(formattedUser)

      await SecureStore.setItemAsync('user', JSON.stringify(formattedUser))
    } catch (error) {
      console.log('PROFILE ERROR:', error.message)

      if (!hasUserData(cachedUser)) {
        Alert.alert('Error', error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync()

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
    }
  }

  const handleUpdateProfile = async () => {
    if (!firstName || !lastName || !phoneNumber) {
      Alert.alert('Validation', 'All fields are required')
      return
    }

    try {
      setIsSaving(true)

      const token = await requireAuthToken(
        'Session expired. Please sign in again.'
      )

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

      setIsEditing(false)

      Alert.alert('Success', 'Profile updated')
    } catch (error) {
      console.log('UPDATE ERROR:', error.message)
      Alert.alert('Error', error.message)
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
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Profile" />
      <View style={styles.card}>

        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{
              uri:
                imageUri ||
                user?.profileImageUrl ||
                'https://via.placeholder.com/100',
            }}
            style={styles.image}
          />
          <Text style={styles.changeText}>Change Photo</Text>
        </TouchableOpacity>

        {isEditing ? (
          <>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
            <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} />

            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.name}>{user?.fullName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.phone}>Phone: {user?.phoneNumber}</Text>

            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <Text style={styles.buttonText}>Change Password</Text>
            </TouchableOpacity> */}
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          {isLoggingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default ProfileScreen

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  image: { width: 100, height: 100, borderRadius: 50 },
  changeText: { color: '#2563eb', marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    padding: 12,
    borderRadius: 10,
  },
  editButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  changePasswordButton: {
    backgroundColor: '#7c3aed',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: { color: '#fff', textAlign: 'center' },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
  },
  email: {
    color: '#4b5563',
    marginTop: 4,
  },
  phone: {
    color: '#4b5563',
    marginTop: 4,
  },
})
