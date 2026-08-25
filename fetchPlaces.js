const axios = require('axios');
const fs = require('fs');

async function fetchPlaces() {
  try {
    const response = await axios.get('https://paycheck-baton-overfull.ngrok-free.dev/api/Places?query=Chennai&tripType=bus');
    fs.writeFileSync('places_response.json', JSON.stringify(response.data, null, 2));
    console.log('Successfully wrote places_response.json');
  } catch (error) {
    console.error('Error fetching places:', error.message);
  }
}

fetchPlaces();
