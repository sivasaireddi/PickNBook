const fs = require('fs');
require('dotenv').config();

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!API_BASE_URL) throw new Error("EXPO_PUBLIC_API_BASE_URL is missing");

async function fetchPlaces() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/Places?query=Chennai&tripType=bus`);
    fs.writeFileSync('places_response.json', JSON.stringify(response.data, null, 2));
    console.log('Successfully wrote places_response.json');
  } catch (error) {
    console.error('Error fetching places:', error.message);
  }
}

fetchPlaces();
