import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ScreenProtection {
  ScreenProtection._();

  static const _methods = MethodChannel('teachingplatform/screen_protection');
  static const _events = EventChannel('teachingplatform/screen_capture_events');
  static Stream<bool>? _captureStream;

  static Stream<bool> get captureChanges => _captureStream ??= (Platform.isIOS
      ? _events
            .receiveBroadcastStream()
            .map((event) => event == true)
            .handleError((Object _) {})
      : const Stream<bool>.empty());

  static Future<void> enable() async {
    if (!Platform.isAndroid) return;
    try {
      await _methods.invokeMethod<void>('enableSecureWindow');
    } on PlatformException {
      // The Android manifest and FLAG_SECURE are also applied in MainActivity.
    }
  }
}

class ScreenProtected extends StatefulWidget {
  const ScreenProtected({required this.child, this.watermark, super.key});

  final Widget child;
  final String? watermark;

  @override
  State<ScreenProtected> createState() => _ScreenProtectedState();
}

class _ScreenProtectedState extends State<ScreenProtected>
    with WidgetsBindingObserver {
  bool _captured = false;
  bool _backgrounded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Desktop windows can briefly become inactive during ordinary focus
    // changes (for example, when interacting with native controls). Keep the
    // page visible in that state and obscure it only after the app is actually
    // paused or hidden.
    final shouldObscure = state == AppLifecycleState.hidden ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached;
    if (_backgrounded != shouldObscure) {
      setState(() => _backgrounded = shouldObscure);
    }
  }

  @override
  Widget build(BuildContext context) => StreamBuilder<bool>(
    stream: ScreenProtection.captureChanges,
    initialData: _captured,
    builder: (context, snapshot) {
      _captured = snapshot.data ?? _captured;
      final obscure = _captured || _backgrounded;
      return Stack(
        fit: StackFit.expand,
        children: [
          widget.child,
          if (!obscure && widget.watermark != null)
            IgnorePointer(
              child: CustomPaint(painter: _WatermarkPainter(widget.watermark!)),
            ),
          if (obscure)
            const ColoredBox(
              color: Color(0xff10141d),
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text(
                    'Protected content is hidden while screen recording or sharing is active.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 16),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}

class _WatermarkPainter extends CustomPainter {
  const _WatermarkPainter(this.label);
  final String label;

  @override
  void paint(Canvas canvas, Size size) {
    final style = TextStyle(
      color: Colors.white.withValues(alpha: .20),
      fontSize: 13,
      fontWeight: FontWeight.w600,
    );
    final text = TextPainter(
      textDirection: TextDirection.ltr,
      text: TextSpan(text: label, style: style),
    )..layout();
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.rotate(-.42);
    final stepX = text.width + 72;
    final stepY = 104.0;
    for (var y = -size.height * 1.6; y < size.height * 1.6; y += stepY) {
      for (var x = -size.width * 1.6; x < size.width * 1.6; x += stepX) {
        text.paint(canvas, Offset(x, y));
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _WatermarkPainter oldDelegate) =>
      oldDelegate.label != label;
}
