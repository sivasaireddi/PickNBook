export const HOME_DESTINATIONS = [
  { id: "goa", name: "Goa", descriptor: "Beach escape", image: require("../../../../assets/home/goa.jpg") },
  { id: "manali", name: "Manali", descriptor: "Mountain retreat", image: require("../../../../assets/home/manali.jpg") },
  { id: "kerala", name: "Kerala", descriptor: "Backwater calm", image: require("../../../../assets/home/kerala.jpg") },
  { id: "dubai", name: "Dubai", descriptor: "City getaway", image: require("../../../../assets/home/dubai.jpg") },
];

// Mirrors the first routes in DEFAULT_POPULAR_BUS_ROUTES on the Pick&Book web homepage.
// City IDs are resolved at tap time through the existing bus Places endpoint.
export const HOME_POPULAR_ROUTES = [
  { id: "delhi-jaipur", from: "Delhi", to: "Jaipur" },
  { id: "hyderabad-vijayawada", from: "Hyderabad", to: "Vijayawada" },
  { id: "bengaluru-goa", from: "Bengaluru", to: "Goa" },
  { id: "hyderabad-bengaluru", from: "Hyderabad", to: "Bengaluru" },
  { id: "chennai-coimbatore", from: "Chennai", to: "Coimbatore" },
  { id: "mumbai-pune", from: "Mumbai", to: "Pune" },
];

export const HOME_BENEFITS = [
  { id: "search", icon: "search-outline", title: "Smart search", text: "Compare travel choices in one clear flow." },
  { id: "details", icon: "reader-outline", title: "Clear trip details", text: "Review fares and journey information before booking." },
  { id: "secure", icon: "shield-checkmark-outline", title: "Secure payments", text: "Complete your booking through the protected payment flow." },
  { id: "manage", icon: "ticket-outline", title: "Trips in one place", text: "Return to My Bookings for tickets and trip status." },
];

// Condensed from the published Online Bus Booking FAQs in the web homepage source.
export const HOME_FAQS = [
  {
    id: "book-online",
    question: "How do I book a bus ticket?",
    answer: "Choose your route and travel date, compare the available buses, select a seat and boarding point, then review passenger and fare details before payment.",
  },
  {
    id: "before-payment",
    question: "What should I check before payment?",
    answer: "Confirm the journey date, boarding and dropping points, passenger details, selected seats, fare, and the operator's cancellation rules.",
  },
  {
    id: "ticket-details",
    question: "Where can I find my ticket details?",
    answer: "Open My Bookings to review your confirmed trip and ticket information. Keep your booking reference ready for the journey.",
  },
];
