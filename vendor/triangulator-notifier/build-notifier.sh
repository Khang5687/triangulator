#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

ICON_SRC=../../assets-triangulator-icon.png
APP=TriangulatorNotifier.app
CONTENTS="$APP/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
ICONSET=TriangulatorIcon.iconset
ICNS=TriangulatorIcon.icns
IDENTITY="${CODESIGN_ID:-Developer ID Application: Peter Steinberger (Y5PE65HELJ)}"
ZIP="/tmp/TriangulatorNotifierNotarize.zip"

NOTARY_KEY_P8="${APP_STORE_CONNECT_API_KEY_P8:-}"
NOTARY_KEY_ID="${APP_STORE_CONNECT_KEY_ID:-}"
NOTARY_ISSUER_ID="${APP_STORE_CONNECT_ISSUER_ID:-}"
DITTO_BIN=${DITTO_BIN:-/usr/bin/ditto}

cleanup() {
  rm -f "$ZIP" /tmp/triangulator-notifier-api-key.p8
}
trap cleanup EXIT

rm -rf "$APP" "$ICONSET" "$ICNS"
mkdir -p "$MACOS" "$RESOURCES"

# Build ICNS from PNG
mkdir "$ICONSET"
for sz in 16 32 64 128 256 512; do
  sips -z $sz $sz "$ICON_SRC" --out "$ICONSET/icon_${sz}x${sz}.png" >/dev/null
  sips -z $((sz*2)) $((sz*2)) "$ICON_SRC" --out "$ICONSET/icon_${sz}x${sz}@2x.png" >/dev/null
done
iconutil -c icns --output "$ICNS" "$ICONSET"
mv "$ICNS" "$RESOURCES/TriangulatorIcon.icns"
rm -rf "$ICONSET"

# Write Info.plist
cat > "$CONTENTS/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.steipete.triangulator.notifier</string>
  <key>CFBundleName</key>
  <string>TriangulatorNotifier</string>
  <key>CFBundleDisplayName</key>
  <string>Triangulator Notifier</string>
  <key>CFBundleExecutable</key>
  <string>TriangulatorNotifier</string>
  <key>CFBundleIconFile</key>
  <string>TriangulatorIcon</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
</dict>
</plist>
PLIST

# Compile Swift helper (arm64)
swiftc -target arm64-apple-macos13 -o "$MACOS/TriangulatorNotifier" TriangulatorNotifier.swift -framework Foundation -framework UserNotifications

echo "Signing with $IDENTITY"
if ! codesign --force --deep --options runtime --timestamp --sign "$IDENTITY" "$APP"; then
  echo "codesign failed. Set CODESIGN_ID to a valid Developer ID Application certificate." >&2
  exit 1
fi

# Notarize if credentials are provided
if [[ -n "$NOTARY_KEY_P8" && -n "$NOTARY_KEY_ID" && -n "$NOTARY_ISSUER_ID" ]]; then
  echo "$NOTARY_KEY_P8" | sed 's/\\n/\n/g' > /tmp/triangulator-notifier-api-key.p8
  echo "Packaging for notarization"
  "$DITTO_BIN" -c -k --keepParent --sequesterRsrc "$APP" "$ZIP"

  echo "Submitting for notarization"
  xcrun notarytool submit "$ZIP" \
    --key /tmp/triangulator-notifier-api-key.p8 \
    --key-id "$NOTARY_KEY_ID" \
    --issuer "$NOTARY_ISSUER_ID" \
    --wait

  echo "Stapling ticket"
  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
else
  echo "Skipping notarization (APP_STORE_CONNECT_* env vars not set)."
fi

spctl -a -t exec -vv "$APP" || true

echo "Built $APP"
