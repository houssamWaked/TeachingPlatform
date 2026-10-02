import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';

/// Serves the packaged React UI on a stable loopback origin and proxies its
/// same-origin `/api` requests to the existing production API deployment.
///
/// Keeping the loopback origin stable preserves the WebView's local storage
/// and HttpOnly session cookies across app restarts. The listener is bound to
/// IPv4 loopback only; it is not exposed to the local network.
class LocalPlatformServer {
  LocalPlatformServer._(this._server, this._files);

  static const int port = 49381;
  static const String origin = 'http://127.0.0.1:$port';
  static const String startUrl = '$origin/';
  static const String _apiOrigin = String.fromEnvironment(
    'PLATFORM_API_ORIGIN',
    defaultValue: 'https://teaching-platform-one.vercel.app',
  );

  static const String _assetRoot = 'assets/platform/';
  static const String _manifestAsset = '${_assetRoot}asset-manifest.json';
  static const String _productionOrigin =
      'https://teaching-platform-one.vercel.app';

  final HttpServer _server;
  final Set<String> _files;
  final HttpClient _client = HttpClient()..autoUncompress = false;

  static Future<LocalPlatformServer> start() async {
    final manifestData = await rootBundle.load(_manifestAsset);
    final manifestText = utf8.decode(
      manifestData.buffer.asUint8List(
        manifestData.offsetInBytes,
        manifestData.lengthInBytes,
      ),
    );
    final paths = (jsonDecode(manifestText) as List<dynamic>)
        .whereType<String>()
        .toSet();
    if (!paths.contains('index.html')) {
      throw StateError('The packaged React app is missing index.html.');
    }

    final server = await HttpServer.bind(
      InternetAddress.loopbackIPv4,
      port,
      shared: false,
    );
    final instance = LocalPlatformServer._(server, paths);
    server.listen(instance._handle, onError: (Object _) {});
    return instance;
  }

  Future<void> close() async {
    _client.close(force: true);
    await _server.close(force: true);
  }

  Future<void> _handle(HttpRequest request) async {
    try {
      if (_isApiPath(request.uri.path)) {
        await _proxyApi(request);
      } else {
        await _serveAsset(request);
      }
    } catch (_) {
      try {
        request.response.statusCode = HttpStatus.badGateway;
        request.response.headers.contentType = ContentType.text;
        request.response.write(
          'The app could not reach its service. Check your internet connection and try again.',
        );
        await request.response.close();
      } catch (_) {
        // The connection may already have been closed by the WebView.
      }
    }
  }

  bool _isApiPath(String path) => path == '/api' || path.startsWith('/api/');

  Future<void> _proxyApi(HttpRequest request) async {
    final requestOrigin = request.headers.value('origin');
    if (requestOrigin != null && requestOrigin != origin) {
      request.response.statusCode = HttpStatus.forbidden;
      await request.response.close();
      return;
    }

    final apiBase = Uri.parse('$_apiOrigin/');
    final upstreamUri = apiBase.resolveUri(request.uri);
    final upstreamRequest = await _client.openUrl(request.method, upstreamUri);
    upstreamRequest.followRedirects = false;
    request.headers.forEach((name, values) {
      final normalized = name.toLowerCase();
      if (normalized == HttpHeaders.hostHeader ||
          normalized == HttpHeaders.connectionHeader ||
          normalized == HttpHeaders.contentLengthHeader ||
          normalized == HttpHeaders.transferEncodingHeader ||
          normalized == 'origin' ||
          normalized == HttpHeaders.refererHeader ||
          normalized == HttpHeaders.acceptEncodingHeader) {
        return;
      }
      for (final value in values) {
        upstreamRequest.headers.add(name, value);
      }
    });
    upstreamRequest.headers.set('origin', _productionOrigin);
    upstreamRequest.headers.set(HttpHeaders.acceptEncodingHeader, 'identity');
    if (request.contentLength >= 0) {
      upstreamRequest.contentLength = request.contentLength;
    }

    await request.forEach(upstreamRequest.add);
    final upstreamResponse = await upstreamRequest.close();
    final response = request.response;
    response.statusCode = upstreamResponse.statusCode;
    upstreamResponse.headers.forEach((name, values) {
      final normalized = name.toLowerCase();
      if (normalized == HttpHeaders.connectionHeader ||
          normalized == HttpHeaders.transferEncodingHeader ||
          normalized == 'keep-alive') {
        return;
      }
      if (normalized == HttpHeaders.setCookieHeader) {
        for (final value in values) {
          response.headers.add(name, _localCookie(value));
        }
      } else {
        response.headers.set(name, values.join(', '));
      }
    });
    await upstreamResponse.pipe(response);
  }

  String _localCookie(String value) {
    // WKWebView does not apply Chromium's localhost exception to Secure
    // cookies. The listener is loopback-only, so use a host-only, HttpOnly
    // SameSite=Lax cookie for the local app origin on Apple platforms. The
    // app then forwards the cookie over HTTPS to the existing API.
    if (!Platform.isIOS && !Platform.isMacOS) return value;
    return value
        .replaceAll(RegExp(r';\s*Secure', caseSensitive: false), '')
        .replaceAll(
          RegExp(r'SameSite=None', caseSensitive: false),
          'SameSite=Lax',
        );
  }

  Future<void> _serveAsset(HttpRequest request) async {
    final response = request.response;
    if (request.method != 'GET' && request.method != 'HEAD') {
      response.statusCode = HttpStatus.methodNotAllowed;
      response.headers.set(HttpHeaders.allowHeader, 'GET, HEAD');
      await response.close();
      return;
    }

    final requestedPath = Uri.decodeComponent(request.uri.path);
    if (requestedPath.split('/').any((segment) => segment == '..')) {
      response.statusCode = HttpStatus.badRequest;
      await response.close();
      return;
    }

    var assetPath = requestedPath == '/'
        ? 'index.html'
        : requestedPath.substring(1);
    if (!_files.contains(assetPath)) {
      final hasExtension = assetPath.split('/').last.contains('.');
      if (hasExtension) {
        response.statusCode = HttpStatus.notFound;
        await response.close();
        return;
      }
      assetPath = 'index.html';
    }

    final data = await rootBundle.load('$_assetRoot$assetPath');
    final bytes = data.buffer.asUint8List(
      data.offsetInBytes,
      data.lengthInBytes,
    );
    response.statusCode = HttpStatus.ok;
    response.headers.contentType = _contentType(assetPath);
    response.headers.set('x-content-type-options', 'nosniff');
    response.headers.set(
      HttpHeaders.cacheControlHeader,
      assetPath == 'index.html'
          ? 'no-cache'
          : 'public, max-age=31536000, immutable',
    );
    response.contentLength = bytes.length;
    if (request.method == 'GET') response.add(bytes);
    await response.close();
  }

  ContentType _contentType(String path) {
    final extension = path.split('.').last.toLowerCase();
    return switch (extension) {
      'html' => ContentType.html,
      'js' || 'mjs' => ContentType('text', 'javascript', charset: 'utf-8'),
      'css' => ContentType('text', 'css', charset: 'utf-8'),
      'json' || 'map' => ContentType.json,
      'svg' => ContentType('image', 'svg+xml'),
      'png' => ContentType('image', 'png'),
      'jpg' || 'jpeg' => ContentType('image', 'jpeg'),
      'webp' => ContentType('image', 'webp'),
      'gif' => ContentType('image', 'gif'),
      'ico' => ContentType('image', 'vnd.microsoft.icon'),
      'woff' => ContentType('font', 'woff'),
      'woff2' => ContentType('font', 'woff2'),
      'ttf' => ContentType('font', 'ttf'),
      'otf' => ContentType('font', 'otf'),
      'pdf' => ContentType('application', 'pdf'),
      'wasm' => ContentType('application', 'wasm'),
      _ => ContentType.binary,
    };
  }
}
