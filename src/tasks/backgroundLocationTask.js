import * as TaskManager from 'expo-task-manager';
import { saveLocationApi, BACKGROUND_LOCATION_TASK_NAME } from '../services/locationService';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocationTask] Task error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      // Get the latest coordinates from the updates array
      const latestLocation = locations[locations.length - 1];
      const { latitude, longitude } = latestLocation.coords;
      
      console.log(`[BackgroundLocationTask] Received background update: lat=${latitude}, lng=${longitude}`);
      
      // Attempt to save the location (the API will throttle/deduplicate automatically)
      await saveLocationApi(latitude, longitude, 'background');
    }
  }
});
