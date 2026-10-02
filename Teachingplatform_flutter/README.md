# Deeb Center desktop and mobile apps

The Flutter apps package the React platform UI from `platform_ui` and serve it from a loopback web server inside the app. The app screen therefore does not depend on the public website serving the platform UI. The React website can be changed to a marketing landing page while the apps keep their bundled platform screens.

The bundled UI sends its same-origin `/api` requests through the app's local server. That server forwards them to `PLATFORM_API_ORIGIN`, which must retain the existing `/api` rewrite to the Supabase Edge Function. This preserves the platform's HttpOnly session-cookie flow without putting Supabase service-role or Bunny secrets in the app. The Supabase Edge Function remains the authority for student and teacher operations.

## Update the bundled platform UI

Edit the React app under `platform_ui`, then package its production build into Flutter assets:

```powershell
.\tool\package_platform_ui.ps1
```

The script installs the locked npm dependencies, builds the React app, and copies the generated files into `assets/platform`. It does not read or package the original website's `.env` file.

## Build Windows release

```powershell
.\tool\package_platform_ui.ps1
flutter build windows --release --dart-define=PLATFORM_API_ORIGIN=https://teaching-platform-one.vercel.app
```

Compile the user-facing setup installer from `installer` with Inno Setup. It installs the WebView2 Evergreen Runtime when missing and creates Start menu and optional desktop shortcuts.

## Screen protection

- Android applies `FLAG_SECURE` to the app window.
- iOS covers the app while the operating system reports active capture; screenshot notification occurs after capture and cannot prevent a screenshot.
- Windows requests exclusion from supported capture APIs with `SetWindowDisplayAffinity`.
- macOS marks the window as non-shareable where the OS honors `NSWindow.sharingType`.
- Linux cannot reliably block desktop screenshots or recordings.

Capture protection depends on OS and capture method; it cannot prevent external cameras or every third-party tool.

## Platform prerequisites

- Windows: Visual Studio Desktop development with C++, Windows SDK, and WebView2 Runtime. The setup installer handles WebView2 when required.
- Android: Android Studio and Android SDK.
- iOS: macOS and Xcode.
- macOS: Xcode and the macOS desktop toolchain.
- Linux: Flutter Linux toolchain and the WPE WebKit libraries required by `flutter_inappwebview`.
