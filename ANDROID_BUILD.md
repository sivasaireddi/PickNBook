# Local Android build

From `C:\Users\ADMIN\Documents\PickNBook`, connect and unlock the phone,
enable USB debugging, then run:

```cmd
npx expo run:android --device
```

Select `CPH2381`. To select this phone without the interactive prompt:

```cmd
npx expo run:android --device CPH2381
```

## Java and SDK configuration

This project uses Expo 54.0.37, React Native 0.81.5, Gradle 8.14.3, and
Android Gradle Plugin 8.11.0. Java 26 is too new for this Gradle version.

The portable Microsoft JDK 17.0.20.1 is installed in the ignored directory
`.android-toolchain/jdk-17.0.20.1+1`. Its ZIP was verified against Microsoft's
published SHA-256 checksum before extraction.

`android/gradle.properties` selects the build JVM with:

```properties
org.gradle.java.home=C:/Users/ADMIN/Documents/PickNBook/.android-toolchain/jdk-17.0.20.1+1
```

`android/local.properties` selects the existing Android SDK with:

```properties
sdk.dir=C:/Users/ADMIN/AppData/Local/Android/Sdk
```

Global Java 26, `JAVA_HOME`, `PATH`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT`
were left unchanged. `android\gradlew.bat -p android -version` can show Java 26 as the
**Launcher JVM**; the **Daemon JVM** must point to the local JDK 17 above.
The daemon runs the Android build.

ADB can be used without changing PATH:

```cmd
"C:\Users\ADMIN\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
```

The `android` directory and portable JDK are ignored by Git. If you move the
project or regenerate the native directory, restore these machine-specific
settings with the correct paths. Do not commit a machine-specific JDK path
to a shared native project.

## Verification

```cmd
android\gradlew.bat -p android -version
npx expo-doctor
npx expo run:android --device
```

Build diagnostics from this repair are kept under `.android-toolchain/`.
No dependency upgrades or forced npm audit fixes are needed for the Java issue.

Run Gradle from the `android` directory, or use `-p android` from the project
root as above. Invoking the wrapper from the root without `-p android` does
not load `android/gradle.properties`. Expo runs Gradle from the correct directory.

The first build installed missing SDK components into the existing SDK:
NDK 27.1.12297006, platforms 35 and 36, Build-Tools 35.0.0, and CMake 3.22.1.
Existing SDK components were preserved.
