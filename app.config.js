const baseExpoConfig = {
  "name": "PickNbook",
  "slug": "PickNBook",
  "scheme": "picknbook",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/App-Icon-Square.png",
  "userInterfaceStyle": "light",
  "splash": {
    "image": "./assets/Splash-Icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#ffffff"
  },
  "ios": {
    "supportsTablet": true
  },
  "android": {
    "package": "com.picknbook.com",
    "versionCode": 5,
    "config": {
      "googleMaps": {
        "apiKey": "AIzaSyB9xc0jsXjB47ClikNaJ4Po0cQRLYaONio"
      }
    },
    "adaptiveIcon": {
      "backgroundColor": "#ffffff",
      "foregroundImage": "./assets/App-Icon-Square.png"
    },
    "permissions": [
      "INTERNET",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION"
    ],
    "blockedPermissions": [
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_LOCATION"
    ]
  },
  "web": {
    "favicon": "./assets/favicon.png"
  },
  "plugins": [
    "@react-native-community/datetimepicker",
    "expo-secure-store",
    [
      "expo-location",
      {
        "locationWhenInUsePermission": "Allow PickNbook to access your location while using the app.",
        "isAndroidBackgroundLocationEnabled": false,
        "isAndroidForegroundServiceEnabled": false
      }
    ]
  ],
  "extra": {
    "eas": {
      "projectId": "da0b7bca-5e66-408e-a791-cadfb95f1661"
    }
  }
};

module.exports = {
  expo: {
    ...baseExpoConfig,
    extra: {
      ...baseExpoConfig.extra,
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
  },
};

