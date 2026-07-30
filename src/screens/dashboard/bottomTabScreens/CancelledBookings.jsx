import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { requireAuthToken } from '../../../utils/authSession'
import { getMyBusBookings, cancelBusBooking } from '../../../services/busService'

const CancelledBookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBookings = async () => {
    try {
      const token = await requireAuthToken(
        'Please sign in again to view your bookings.'
      )
      const data = await getMyBusBookings(token)

      // Filter only cancelled bookings
      const cancelled = (Array.isArray(data) ? data : []).filter(
        (item) => item.tripState === 'Cancelled' || item.status === 'Cancelled'
      )

      setBookings(cancelled)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (bookingId) => {
    try {
      const token = await requireAuthToken(
        'Please sign in again to manage your bookings.'
      )
      await cancelBusBooking(bookingId, token)

      // Refresh list after cancellation
      fetchBookings()
    } catch (error) {
      console.error(
        error?.message || error?.response?.data?.message || 'Cancellation failed'
      )
    }
  }


  useEffect(() => {
    fetchBookings()
  }, [])

  const renderItem = ({ item }) => {
    const showCancelButton =
      item.canCancel === true && item.tripState === 'Upcoming'

    return (
      <View style={styles.card}>
        <Text style={styles.title}>Booking ID: {item.bookingId}</Text>

        {/* Trip State Badge */}
        <Text style={styles.badge}>
          {item.tripState === 'Upcoming' && 'Upcoming'}
          {item.tripState === 'Completed' && 'Completed / Departed'}
          {item.tripState === 'Cancelled' && 'Cancelled'}
        </Text>

        {/* Cancel Button */}
        {showCancelButton && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item.bookingId)}
          >
            <Text style={styles.cancelText}>Cancel Ticket</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.bookingId.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>No Cancelled Bookings</Text>
        }
      />
    </View>
  )
}

export default CancelledBookings

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    marginTop: 8,
    fontSize: 14,
    color: 'red',
  },
  cancelBtn: {
    marginTop: 10,
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 6,
  },
  cancelText: {
    color: '#fff',
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
})
