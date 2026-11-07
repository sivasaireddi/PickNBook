const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const babel = require("@babel/core");

const source = fs.readFileSync("src/utils/hotelGuestForm.js", "utf8");
const compiled = babel.transformSync(source, {
  filename: "src/utils/hotelGuestForm.js",
  presets: ["babel-preset-expo"],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
}).code;
const moduleUnderTest = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleUnderTest,
  exports: moduleUnderTest.exports,
  require: (request) => {
    if (request !== "./hotelSupplierPayload") return require(request);
    return {
      normalizeHotelTitle: (value) => ({ mr: "Mr", mrs: "Mrs", ms: "Ms" })[String(value || "").toLowerCase()] || "",
      isPlaceholderHotelEmail: (value) => ["test@example.com", "test@pirnav.com"].includes(String(value || "").toLowerCase()),
    };
  },
});

const h = moduleUnderTest.exports;
for (const value of ["Sarath", "Sai"]) assert.equal(h.isValidHotelGuestName(value), true);
for (const value of ["S", "S1", "S@", "123", "N4kka"]) assert.equal(h.isValidHotelGuestName(value), false);
for (const value of [18, 30, 99]) assert.equal(h.isValidHotelAdultAge(value), true);
for (const value of [17, 100, "abc", "30.5"]) assert.equal(h.isValidHotelAdultAge(value), false);
assert.equal(h.isValidHotelGuestEmail("sarath@example.org"), true);
assert.equal(h.isValidHotelGuestEmail("invalid"), false);
assert.equal(h.isValidHotelGuestEmail("test@example.com"), false);
assert.equal(h.isValidHotelGuestPhone("9398649798"), true);
for (const value of ["939864979", "93986497989", "abcdefghij"]) assert.equal(h.isValidHotelGuestPhone(value), false);

const base = { isLead: true, isChild: false, title: "Mr", firstName: "Sarath", lastName: "Nakka", age: "30", email: "sarath@example.org", phone: "9398649798" };
assert.deepEqual(Object.keys(h.getHotelGuestErrors(base)), []);
assert.ok(Object.keys(h.getHotelGuestErrors({ isLead: true, isChild: false })).length >= 6);
const travelerA = { id: 1, raw: { title: "Mr", firstName: "Sarath", lastName: "Nakka", age: 30, email: "a@example.org", phoneNo: "+919398649798" } };
const travelerB = { id: 2, raw: { title: "Ms", firstName: "Anita", lastName: "Kumar", age: 28, email: "b@example.org", phoneNo: "9876543210" } };
const mappedA = h.mapSavedTravelerToHotelGuest(travelerA);
const mappedB = h.mapSavedTravelerToHotelGuest(travelerB);
assert.deepEqual(mappedA, { title: "Mr", firstName: "Sarath", lastName: "Nakka", age: "30", email: "a@example.org", phone: "9398649798" });
assert.deepEqual(mappedB, { title: "Ms", firstName: "Anita", lastName: "Kumar", age: "28", email: "b@example.org", phone: "9876543210" });
assert.equal({ ...mappedB, email: "edited@example.org" }.email, "edited@example.org");
console.log("Hotel guest-form assertions: PASS");
