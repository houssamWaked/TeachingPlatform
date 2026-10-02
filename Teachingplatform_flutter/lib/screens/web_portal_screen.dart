import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/screen_protection.dart';
import '../services/local_platform_server.dart';

class WebPortalScreen extends StatefulWidget {
  const WebPortalScreen({
    super.key,
    this.environment,
    this.startupError,
    this.localPlatformServer,
  });

  final WebViewEnvironment? environment;
  final String? startupError;
  final LocalPlatformServer? localPlatformServer;

  @override
  State<WebPortalScreen> createState() => _WebPortalScreenState();
}

class _WebPortalScreenState extends State<WebPortalScreen> {
  InAppWebViewController? _controller;
  String? _pageError;
  bool _loading = true;
  bool _canGoBack = false;

  @override
  Widget build(BuildContext context) {
    final startupError = widget.startupError;
    final error =
        startupError ??
        (widget.localPlatformServer == null
            ? 'The Deeb Center app content could not start.'
            : null);

    return PopScope<Object?>(
      canPop: !_canGoBack,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _goBack();
      },
      child: ScreenProtected(
        child: Scaffold(
          body: error != null
              ? _MessageScreen(message: error)
              : Stack(
                  fit: StackFit.expand,
                  children: [
                    SafeArea(
                      child: InAppWebView(
                        webViewEnvironment: widget.environment,
                        initialUrlRequest: URLRequest(
                          url: WebUri(LocalPlatformServer.startUrl),
                        ),
                        initialSettings: InAppWebViewSettings(
                          javaScriptEnabled: true,
                          javaScriptCanOpenWindowsAutomatically: true,
                          useShouldOverrideUrlLoading: true,
                          supportMultipleWindows: true,
                          allowsInlineMediaPlayback: true,
                          mediaPlaybackRequiresUserGesture: true,
                          isInspectable: false,
                        ),
                        onWebViewCreated: (controller) =>
                            _controller = controller,
                        onLoadStart: (_, _) {
                          if (!mounted) return;
                          setState(() {
                            _loading = true;
                            _pageError = null;
                          });
                        },
                        onLoadStop: (controller, _) async {
                          final canGoBack = await controller.canGoBack();
                          if (mounted) {
                            setState(() {
                              _loading = false;
                              _canGoBack = canGoBack;
                            });
                          }
                        },
                        onUpdateVisitedHistory: (controller, _, _) async {
                          final canGoBack = await controller.canGoBack();
                          if (mounted) setState(() => _canGoBack = canGoBack);
                        },
                        onReceivedError: (_, request, error) {
                          if (request.isForMainFrame == true && mounted) {
                            setState(() {
                              _loading = false;
                              _pageError =
                                  'Could not load Deeb Center. Check your connection and try again.';
                            });
                          }
                        },
                        onCreateWindow: (_, action) async {
                          final url = action.request.url;
                          if (url != null && _controller != null) {
                            await _controller!.loadUrl(
                              urlRequest: URLRequest(url: url),
                            );
                          }
                          return false;
                        },
                        shouldOverrideUrlLoading: (_, action) async {
                          final uri = action.request.url;
                          if (uri == null) return NavigationActionPolicy.CANCEL;
                          if (uri.scheme == 'http' || uri.scheme == 'https') {
                            return NavigationActionPolicy.ALLOW;
                          }
                          if (uri.scheme == 'mailto' || uri.scheme == 'tel') {
                            await launchUrl(uri);
                          }
                          return NavigationActionPolicy.CANCEL;
                        },
                      ),
                    ),
                    if (_loading)
                      const ColoredBox(
                        color: Color(0xfff7f5f0),
                        child: Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2.2),
                          ),
                        ),
                      ),
                    if (_pageError != null)
                      _MessageScreen(
                        message: _pageError!,
                        onRetry: () => _controller?.reload(),
                      ),
                  ],
                ),
        ),
      ),
    );
  }

  Future<void> _goBack() async {
    final controller = _controller;
    if (controller != null && await controller.canGoBack()) {
      await controller.goBack();
    }
  }
}

class _MessageScreen extends StatelessWidget {
  const _MessageScreen({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: const Color(0xfff7f5f0),
    child: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.school_outlined,
                size: 44,
                color: Color(0xff5a7f69),
              ),
              const SizedBox(height: 20),
              const Text(
                'Deeb Center',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: Color(0xff29372f),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(height: 1.5, color: Color(0xff66716a)),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 20),
                FilledButton(onPressed: onRetry, child: const Text('Retry')),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}
