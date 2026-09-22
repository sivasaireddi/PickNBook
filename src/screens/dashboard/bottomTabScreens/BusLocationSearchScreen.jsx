import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, StyleSheet, FlatList, 
  TouchableOpacity, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { searchCities } from '../../../services/busService';

const BusLocationSearchScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const {
    type,
    currentValue,
    currentSource,
    currentDestination,
    returnTo,
    selectionRequestId,
  } = route.params || {};
  
  const [query, setQuery] = useState(currentValue || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const searchSequence = React.useRef(0);
  
  const isFrom = type === 'from';
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query);
      } else if (query.trim().length === 0) {
        setResults([]);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    
    const requestId = ++searchSequence.current;
    setLoading(true);
    try {
      const data = await searchCities(trimmed);
      const suggestions = Array.isArray(data) ? data : [];

      // Do not let a slower response for an older query overwrite the latest
      // results (this is especially noticeable while typing on mobile).
      if (requestId !== searchSequence.current) return;
      
      console.log(`[BusLocationSearch] API Response count: ${suggestions.length}`);
      
      const grouped = {};
      
      suggestions.forEach(item => {
        let city = item?.city || "";
        let locality = item?.name || item?.label || item?.description || "";
        const description = item?.description || item?.label || item?.cityName || "";
        const cityId = String(item?.cityCode || item?.cityId || item?.code || item?.place_id || "").trim();
        const stateName = String(item?.stateName || item?.state || "").trim();

        if (!city && description) {
          const parts = description.split(',').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            locality = parts[0];
            city = parts[1];
          } else {
            city = parts[0];
          }
        }

        if (!city) {
          const parts = (item?.cityName || "").split(',').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            locality = parts[0];
            city = parts[1];
          } else {
            city = parts[0] || locality;
          }
        }

        city = city.trim();
        locality = locality.trim();
        
        if (!city) return;
        
        const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        
        if (!grouped[cityName]) {
          grouped[cityName] = {
            city: cityName,
            state: stateName,
            cityPayload: {
              cityId: cityId, 
              cityName: cityName,
              label: cityName,
              stateName: stateName,
            },
            subLocations: []
          };
        }
        
        // If locality is different from city name, add to subLocations
        if (locality && locality.toLowerCase() !== cityName.toLowerCase()) {
          const displayLabel = locality;
          const exists = grouped[cityName].subLocations.some(sub => sub.cityId === cityId || sub.label === displayLabel);
          if (!exists) {
            grouped[cityName].subLocations.push({
              cityId: cityId,
              cityName: cityName,
              label: displayLabel,
              stateName: stateName,
            });
          }
        }
      });
      
      const groupedArray = Object.values(grouped);
      
      groupedArray.sort((a, b) => a.city.localeCompare(b.city));
      
      console.log(`[BusLocationSearch] Grouped Locations length: ${groupedArray.length}`);
      setResults(groupedArray);
    } catch (error) {
      console.log("[BusLocationSearch] Error:", error);
    } finally {
      if (requestId === searchSequence.current) setLoading(false);
    }
  };

  const handleSelect = (payload) => {
    console.log(`[BusLocationSearch] Selected Sub Location:`, payload);
    if (returnTo) {
      navigation.navigate(returnTo, {
        busLocationSelection: payload,
        busLocationSelectionType: type,
        busLocationSelectionRequestId: selectionRequestId || String(Date.now()),
        busLocationSource: currentSource,
        busLocationDestination: currentDestination,
      });
      return;
    }

    // Keep a safe fallback for callers from older navigation state.
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.groupContainer}>
        {/* Parent City Row */}
        <TouchableOpacity 
          style={styles.cityRow} 
          onPress={() => handleSelect(item.cityPayload)}
          activeOpacity={0.7}
        >
          <View style={styles.cityIconWrap}>
            <MaterialCommunityIcons name="city-variant-outline" size={24} color="#374151" />
          </View>
          <View style={styles.cityTextContainer}>
            <View style={styles.cityRowHeader}>
              <Text style={styles.cityName}>{item.city}</Text>
              <Text style={styles.allPointsText}>(All boarding points)</Text>
            </View>
            {item.state ? <Text style={styles.stateName}>{item.state}</Text> : null}
          </View>
          <MaterialCommunityIcons name="arrow-top-right" size={20} color="#9CA3AF" style={styles.cityArrowRight} />
        </TouchableOpacity>

        {/* Sub-locations */}
        {item.subLocations.length > 0 && (
          <View style={styles.subLocationsContainer}>
            <View style={styles.dashedSeparatorFull} />
            {item.subLocations.map((sub, index) => {
              const isLast = index === item.subLocations.length - 1;
              return (
                <View key={sub.cityId || index}>
                  <TouchableOpacity 
                    style={styles.subLocationRow}
                    onPress={() => handleSelect({...sub, label: `${sub.label}, ${item.city}`})}
                    activeOpacity={0.7}
                  >
                    <View style={styles.subLocationIconWrap}>
                      <Ionicons name="return-down-forward" size={18} color="#9CA3AF" style={{ transform: [{ scaleY: -1 }] }} />
                    </View>
                    <View style={styles.subLocationTextContainer}>
                      <Text style={styles.subLocationName}>{sub.label}</Text>
                      <Text style={styles.subLocationCity}>{item.city}</Text>
                    </View>
                    <Ionicons name="bus-outline" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  {!isLast && <View style={styles.dashedSeparatorFull} />}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={isFrom ? "Search Source City" : "Search Destination City"}
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus={true}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {loading && results.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#D11A2A" />
              <Text style={styles.statusText}>Searching locations...</Text>
            </View>
          ) : query.length >= 2 && results.length === 0 && !loading ? (
            <View style={styles.centerContainer}>
              <MaterialCommunityIcons name="map-search-outline" size={48} color="#D11A2A" opacity={0.3} />
              <Text style={styles.noResultsText}>No locations found</Text>
              <Text style={styles.statusText}>Try searching for another city or boarding point.</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.city}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.groupSeparator} />}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 10,
  },
  backButton: {
    paddingRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  clearButton: {
    paddingLeft: 8,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  noResultsText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  groupContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  groupSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  cityIconWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  cityTextContainer: {
    flex: 1,
  },
  cityRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  allPointsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  stateName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cityArrowRight: {
    marginLeft: 8,
  },
  subLocationsContainer: {
    backgroundColor: '#FFFFFF',
  },
  subLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subLocationIconWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  subLocationTextContainer: {
    flex: 1,
  },
  subLocationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  subLocationCity: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dashedSeparatorFull: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginLeft: 16,
    marginRight: 16,
  },
});

export default BusLocationSearchScreen;
