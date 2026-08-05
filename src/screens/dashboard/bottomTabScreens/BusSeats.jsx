import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';

const API_BASE_URL =
  'https://paycheck-baton-overfull.ngrok-free.dev/api/BusBookings';

const BusSeats = ({ route }) => {
  const busId = route?.params?.busId;
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // API CALL
  const fetchSeats = async () => {
    if (busId === undefined || busId === null || busId === '') {
      setSeats([]);
      setError('Bus not selected.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await axios.get(
        `${API_BASE_URL}/${encodeURIComponent(String(busId))}/seats`
      );

      const nextSeats = Array.isArray(response.data?.seats)
        ? response.data.seats
        : Array.isArray(response.data)
          ? response.data
          : [];

      setSeats(nextSeats);
    } catch (error) {
      console.log('Error fetching seats:', error);
      setError('Unable to load seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, [busId]);

  // Separate decks
  const lowerDeck = seats.filter((s) => s?.seatCode?.startsWith('L'));
  const upperDeck = seats.filter((s) => s?.seatCode?.startsWith('U'));

  // Sort properly (L1, L2... not L1, L10)
  const sortSeats = (arr) =>
    [...arr].sort(
      (a, b) =>
        parseInt(a.seatCode.slice(1)) -
        parseInt(b.seatCode.slice(1))
    );

  const renderSeat = (seat) => {
    return (
      <View
        key={seat.seatCode}
        style={[
          styles.seat,
          seat.isBooked && styles.booked,
        ]}
      >
        <Text style={styles.seatText}>{seat.seatCode}</Text>
      </View>
    );
  };

  const renderRows = (deckSeats) => {
    const rows = [];
    for (let i = 0; i < deckSeats.length; i += 4) {
      rows.push(
        <View key={i} style={styles.row}>
          {deckSeats[i] && renderSeat(deckSeats[i])}
          {deckSeats[i + 1] && renderSeat(deckSeats[i + 1])}

          <View style={styles.aisle} />

          {deckSeats[i + 2] && renderSeat(deckSeats[i + 2])}
          {deckSeats[i + 3] && renderSeat(deckSeats[i + 3])}
        </View>
      );
    }
    return rows;
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loader}>
        <Text style={styles.message}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {seats.length === 0 && (
        <Text style={styles.message}>No seats found for this bus.</Text>
      )}
      
      {/* LOWER DECK */}
      <Text style={styles.deckTitle}>Lower Deck</Text>
      <View style={styles.busContainer}>
        {renderRows(sortSeats(lowerDeck))}
      </View>

      {/* UPPER DECK */}
      <Text style={styles.deckTitle}>Upper Deck</Text>
      <View style={styles.busContainer}>
        {renderRows(sortSeats(upperDeck))}
      </View>
    </ScrollView>
  );
};

export default BusSeats;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 0,
    backgroundColor: '#f5f5f5',
  },

  deckTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
  },

  busContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },

  aisle: {
    width: 30,
  },

  seat: {
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },

  booked: {
    backgroundColor: '#999',
  },

  seatText: {
    fontSize: 12,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  message: {
    color: '#555',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
});
