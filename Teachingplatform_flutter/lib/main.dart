import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import 'core/screen_protection.dart';
import 'services/local_platform_server.dart';
import 'screens/web_portal_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ScreenProtection.enable();

  LocalPlatformServer? localPlatformServer;
  WebViewEnvironment? environment;
  String? startupError;
  try {
    localPlatformServer = await LocalPlatformServer.start();
  } catch (error) {
    startupError = 'The platform UI could not start: $error';
  }

  if (Platform.isWindows) {
    try {
      final availableVersion = await WebViewEnvironment.getAvailableVersion();
      final appData = Platform.environment['LOCALAPPDATA'];
      if (availableVersion == null) {
        startupError ??=
            'Install the Microsoft Edge WebView2 Runtime, then reopen Deeb Center.';
      } else if (appData == null) {
        startupError ??= 'Windows did not provide an application data folder.';
      } else {
        final userData = Directory('$appData\\DeebCenter\\WebView2');
        await userData.create(recursive: true);
        environment = await WebViewEnvironment.create(
          settings: WebViewEnvironmentSettings(userDataFolder: userData.path),
        );
      }
    } catch (error) {
      startupError ??= 'The embedded browser could not start: $error';
    }
  }

  runApp(
    TeachingPlatformApp(
      environment: environment,
      startupError: startupError,
      localPlatformServer: localPlatformServer,
    ),
  );
}

class TeachingPlatformApp extends StatelessWidget {
  const TeachingPlatformApp({
    super.key,
    this.environment,
    this.startupError,
    this.localPlatformServer,
  });

  final WebViewEnvironment? environment;
  final String? startupError;
  final LocalPlatformServer? localPlatformServer;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Deeb Center',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff5a7f69)),
      scaffoldBackgroundColor: const Color(0xfff7f5f0),
    ),
    home: WebPortalScreen(
      environment: environment,
      startupError: startupError,
      localPlatformServer: localPlatformServer,
    ),
  );
}
