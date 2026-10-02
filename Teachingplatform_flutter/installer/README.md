# Windows installer

From the Flutter project root, build the Windows app with the React platform UI bundled into its assets:

```powershell
.\tool\package_platform_ui.ps1
& 'D:\puro-cache-Teachingplatform\shared\flutter\bin\flutter.bat' build windows --release --dart-define=PLATFORM_API_ORIGIN=https://teaching-platform-one.vercel.app
```

Then compile the user-facing setup installer:

```powershell
& 'D:\Teachingplatform\tools\InnoSetup\ISCC.exe' .\installer\deeb-center.iss
```

The setup executable is written to `D:\Teachingplatform\Releases`. It installs Microsoft's WebView2 Evergreen Runtime when missing and adds Start menu and optional desktop shortcuts. The app serves the packaged platform UI locally and forwards `/api` requests to the existing production API origin.

For public downloads, sign the setup with a code-signing certificate. The current setup is unsigned.
