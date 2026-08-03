import React, { createContext, useContext, useState, useCallback } from "react";

const HotelBookingContext = createContext(null);

const initialSessionState = {
  searchParams: {
    cityId: "725862",
    cityCode: "DEL",
    checkInDate: "",
    checkOutDate: "",
    rooms: 1,
    adults: 2,
    children: 0,
    roomGuests: [],
  },
  session: {
    traceId: "",
    srdvType: "MixAPI",
    srdvIndex: "15",
  },
  selectedHotel: null,
  hotelInfo: null,
  availableRooms: [],
  selectedRooms: [],
  blockedRoomResult: null,
  pricingPreview: null,
  passengers: [],
};

export const HotelBookingProvider = ({ children }) => {
  const [bookingState, setBookingState] = useState(initialSessionState);

  const setSearchSession = useCallback((searchParams, sessionData) => {
    setBookingState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, ...searchParams },
      session: {
        traceId: String(sessionData.traceId || sessionData.TraceId || ""),
        srdvType: String(sessionData.srdvType || sessionData.SrdvType || "MixAPI"),
        srdvIndex: String(sessionData.srdvIndex || sessionData.SrdvIndex || "15"),
      },
      selectedHotel: null,
      hotelInfo: null,
      availableRooms: [],
      selectedRooms: [],
      blockedRoomResult: null,
      pricingPreview: null,
      passengers: [],
    }));
  }, []);

  const setSelectedHotel = useCallback((hotel) => {
    setBookingState((prev) => ({
      ...prev,
      selectedHotel: hotel,
      hotelInfo: null,
      availableRooms: [],
      selectedRooms: [],
      blockedRoomResult: null,
      pricingPreview: null,
    }));
  }, []);

  const setHotelDetailsData = useCallback((info, rooms) => {
    setBookingState((prev) => ({
      ...prev,
      hotelInfo: info,
      availableRooms: rooms,
    }));
  }, []);

  const setSelectedRooms = useCallback((rooms) => {
    setBookingState((prev) => ({
      ...prev,
      selectedRooms: Array.isArray(rooms) ? rooms : [rooms],
      blockedRoomResult: null,
      pricingPreview: null,
    }));
  }, []);

  const setBlockedRoomResult = useCallback((blockedResult) => {
    setBookingState((prev) => ({
      ...prev,
      blockedRoomResult: blockedResult,
    }));
  }, []);

  const setPricingPreview = useCallback((preview) => {
    setBookingState((prev) => ({
      ...prev,
      pricingPreview: preview,
    }));
  }, []);

  const setPassengers = useCallback((passengersList) => {
    setBookingState((prev) => ({
      ...prev,
      passengers: passengersList,
    }));
  }, []);

  const clearSession = useCallback(() => {
    setBookingState(initialSessionState);
  }, []);

  return (
    <HotelBookingContext.Provider
      value={{
        ...bookingState,
        setSearchSession,
        setSelectedHotel,
        setHotelDetailsData,
        setSelectedRooms,
        setBlockedRoomResult,
        setPricingPreview,
        setPassengers,
        clearSession,
      }}
    >
      {children}
    </HotelBookingContext.Provider>
  );
};

export const useHotelBooking = () => {
  const context = useContext(HotelBookingContext);
  if (!context) {
    throw new Error("useHotelBooking must be used within a HotelBookingProvider");
  }
  return context;
};

export default HotelBookingContext;
