const VALID_TITLES = new Set(["Mr", "Ms", "Mrs"]);
const PLACEHOLDER_EMAILS = new Set([
  "test@pirnav.com",
  "test@example.com",
  "demo@example.com",
  "sample@example.com",
]);
const OPTIONAL_PASSENGER_FIELDS = [
  "MiddleName",
  "PAN",
  "PassportNo",
  "PassportExpDate",
  "PassportIssueCountry",
  "GSTNumber",
  "GSTCompanyName",
  "GSTCompanyAddress",
  "GSTCompanyEmail",
  "GSTCompanyContactNumber",
];
const SAFE_PAYLOAD_ERROR = "We couldn't validate the hotel booking details. Please review the guest and room information before payment.";

const clean = (value) => String(value ?? "").trim();

export const normalizeHotelTitle = (value) => {
  const title = clean(value).toLowerCase().replace(/\./g, "");
  if (title === "mr" || title === "mister") return "Mr";
  if (title === "ms" || title === "miss") return "Ms";
  if (title === "mrs" || title === "missus") return "Mrs";
  return "";
};

export const hotelGenderFromTitle = (title) => title === "Mr" ? "Male" : "Female";

export const deriveHotelSrdvIndex = (resultIndex) => {
  return parseHotelResultIndex(resultIndex).srdvIndex;
};

export const parseHotelResultIndex = (resultIndex) => {
  const normalized = clean(resultIndex);
  const separatorIndex = normalized.indexOf("_");
  const srdvIndex = separatorIndex > 0 ? normalized.slice(0, separatorIndex) : "";
  const supplierHotelCode = separatorIndex > 0 ? normalized.slice(separatorIndex + 1) : "";
  if (!srdvIndex || !supplierHotelCode) throw new Error(SAFE_PAYLOAD_ERROR);
  return { srdvIndex, supplierHotelCode };
};

export const resolveHotelSupplierCode = ({ blockRoomResult, hotelInfoHotelCode, resultIndex } = {}) => {
  const parsed = parseHotelResultIndex(resultIndex);
  const blockSupplierHotelCode = clean(
    blockRoomResult?.supplierHotelCode ?? blockRoomResult?.SupplierHotelCode ??
    blockRoomResult?.hotelCode ?? blockRoomResult?.HotelCode
  );

  if (blockSupplierHotelCode && blockSupplierHotelCode !== parsed.supplierHotelCode) {
    throw new Error("Hotel booking session information is inconsistent. Please select the hotel again.");
  }

  return {
    srdvIndex: parsed.srdvIndex,
    supplierHotelCode: blockSupplierHotelCode || clean(hotelInfoHotelCode) || parsed.supplierHotelCode,
    source: blockSupplierHotelCode ? "BlockRoom" : clean(hotelInfoHotelCode) ? "HotelInfo" : "ResultIndex",
  };
};

export const isPlaceholderHotelEmail = (email) => PLACEHOLDER_EMAILS.has(clean(email).toLowerCase());

const addOptionalString = (target, key, value, transform = (item) => item) => {
  const normalized = clean(value);
  if (normalized) target[key] = transform(normalized);
};

export const buildHotelPassenger = (pax = {}) => {
  const passenger = {
    Title: normalizeHotelTitle(pax.title),
    FirstName: clean(pax.firstName),
    LastName: clean(pax.lastName),
    PaxType: pax.isChild ? "2" : "1",
    Age: Number(pax.age),
    LeadPassenger: Boolean(pax.isLead),
  };

  if (passenger.LeadPassenger) {
    passenger.Phoneno = clean(pax.phone);
    passenger.Email = clean(pax.email).toLowerCase();
  }

  addOptionalString(passenger, "MiddleName", pax.middleName);
  addOptionalString(passenger, "PAN", pax.pan, (value) => value.toUpperCase());
  addOptionalString(passenger, "PassportNo", pax.passportNo ?? pax.passport, (value) => value.toUpperCase());
  addOptionalString(passenger, "PassportExpDate", pax.passportExpDate ?? pax.passportExpiry);
  addOptionalString(passenger, "PassportIssueCountry", pax.passportIssueCountry);
  addOptionalString(passenger, "GSTNumber", pax.gstNumber, (value) => value.toUpperCase());
  addOptionalString(passenger, "GSTCompanyName", pax.gstCompanyName);
  addOptionalString(passenger, "GSTCompanyAddress", pax.gstCompanyAddress);
  addOptionalString(passenger, "GSTCompanyEmail", pax.gstCompanyEmail, (value) => value.toLowerCase());
  addOptionalString(passenger, "GSTCompanyContactNumber", pax.gstCompanyContactNumber);

  return passenger;
};

export const assertHotelSupplierPayload = (payload = {}) => {
  const fail = () => { throw new Error(SAFE_PAYLOAD_ERROR); };
  const resultIndex = clean(payload.ResultIndex);
  let expectedSrdvIndex = "";
  let expectedSupplierHotelCode = "";
  try {
    const parsed = parseHotelResultIndex(resultIndex);
    expectedSrdvIndex = parsed.srdvIndex;
    expectedSupplierHotelCode = parsed.supplierHotelCode;
  } catch {
    fail();
  }

  if (
    payload.TraceId === null || payload.TraceId === undefined || clean(payload.TraceId) === "" ||
    !resultIndex || clean(payload.HotelCode) !== expectedSupplierHotelCode || clean(payload.SrdvIndex) !== expectedSrdvIndex ||
    !Number.isInteger(Number(payload.NoOfRooms)) || Number(payload.NoOfRooms) <= 0 ||
    !Array.isArray(payload.HotelRoomsDetails) || payload.HotelRoomsDetails.length !== Number(payload.NoOfRooms)
  ) fail();

  const passengers = [];
  payload.HotelRoomsDetails.forEach((room, roomIndex) => {
    if (
      clean(room?.RoomIndex) !== String(roomIndex + 1) ||
      !clean(room?.RoomTypeCode) || !clean(room?.OptionId) ||
      !Array.isArray(room?.HotelPassenger) || room.HotelPassenger.length === 0
    ) fail();
    room.HotelPassenger.forEach((passenger) => {
      if (
        !VALID_TITLES.has(passenger?.Title) || !clean(passenger?.FirstName) || !clean(passenger?.LastName) ||
        !["1", "2"].includes(clean(passenger?.PaxType)) || !Number.isFinite(Number(passenger?.Age)) ||
        OPTIONAL_PASSENGER_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(passenger, field) && clean(passenger[field]) === "")
      ) fail();
      passengers.push(passenger);
    });
  });

  const leads = passengers.filter((passenger) => passenger.LeadPassenger === true);
  const lead = leads[0];
  if (
    leads.length !== 1 || payload.HotelRoomsDetails[0]?.HotelPassenger?.[0] !== lead ||
    !/^\S+@\S+\.\S+$/.test(clean(lead?.Email)) || isPlaceholderHotelEmail(lead?.Email) ||
    !/^[6-9]\d{9}$/.test(clean(lead?.Phoneno)) ||
    clean(payload.GuestEmail).toLowerCase() !== clean(lead.Email).toLowerCase() ||
    clean(payload.GuestPhone) !== clean(lead.Phoneno) ||
    normalizeHotelTitle(payload.GuestTitle) !== lead.Title ||
    clean(payload.GuestGender) !== hotelGenderFromTitle(lead.Title)
  ) fail();

  return payload;
};

