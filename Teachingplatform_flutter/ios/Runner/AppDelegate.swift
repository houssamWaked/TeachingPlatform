import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate, FlutterStreamHandler {
  private var captureEventSink: FlutterEventSink?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "ScreenCaptureProtection")
    let channel = FlutterEventChannel(
      name: "teachingplatform/screen_capture_events",
      binaryMessenger: registrar.messenger()
    )
    channel.setStreamHandler(self)
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(screenCaptureChanged),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
  }

  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    captureEventSink = events
    events(isScreenCaptured)
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    captureEventSink = nil
    return nil
  }

  private var isScreenCaptured: Bool {
    window?.windowScene?.screen.isCaptured ?? UIScreen.main.isCaptured
  }

  @objc private func screenCaptureChanged() {
    captureEventSink?(isScreenCaptured)
  }
}
