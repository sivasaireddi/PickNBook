module.exports = {
  expo: {
    name: "PickNbook",
    slug: "PickNBook",
    scheme: "picknbook",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/App-Icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/Splash-Icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: [
          "location",
          "fetch"
        ]
      }
    },
    android: {
      package: "com.picknbook.com",
      config: {
        googleMaps: {
          apiKey: "AIzaSyB9xc0jsXjB47ClikNaJ4Po0cQRLYaONio"
        }
      },
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/App-Icon.png"
      },
      permissions: [
        "INTERNET",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "@react-native-community/datetimepicker",
      "expo-secure-store",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow PickNbook to access your location even in the background.",
          locationAlwaysPermission: "Allow PickNbook to access your location always.",
          locationWhenInUsePermission: "Allow PickNbook to access your location while using the app.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ]
    ],
    extra: {
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      eas: {
        projectId: "a33e12df-a948-4dd8-8da8-015371c078bf"
      }
    },
    owner: "saireddyvenkata"
  }
};