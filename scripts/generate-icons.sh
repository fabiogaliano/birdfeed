#!/usr/bin/env bash
# Regenerates every extension/app icon from icons/icon-source.png.
# Requires ImageMagick 7 (`magick` on PATH): `brew install imagemagick`.

set -euo pipefail

cd "$(dirname "$0")/.."

SRC="icons/icon-source.png"
[[ -f "$SRC" ]] || { echo "missing $SRC" >&2; exit 1; }

# iOS app-icon mask sits at ~17.5%; 18% reads iOS-like without feeling pill-shaped.
RADIUS_PCT=18

# Render one rounded master at high-res, then downscale from it. Rounding
# directly at 16px quantizes the curve into a visible stairstep.
MASTER=$(mktemp -t icon-master.XXXXXX).png
trap 'rm -f "$MASTER"' EXIT

MASTER_SIZE=1024
R=$(( MASTER_SIZE * RADIUS_PCT / 100 ))
magick "$SRC" -resize ${MASTER_SIZE}x${MASTER_SIZE} \
  \( +clone -alpha extract \
     -draw "fill black polygon 0,0 0,$R $R,0 fill white circle $R,$R $R,0" \
     \( +clone -flip \) -compose Multiply -composite \
     \( +clone -flop \) -compose Multiply -composite \
  \) -alpha off -compose CopyOpacity -composite \
  "$MASTER"

rounded() { magick "$MASTER" -resize ${1}x${1} "$2"; }
flat()    { magick "$SRC"    -resize ${1}x${1} "$2"; }

# Logo is already monochrome, so desaturating does nothing; alpha is the
# meaningful disabled signal for chrome.action.setIcon().
disabled() {
  magick "$MASTER" -resize ${1}x${1} \
    -alpha set -channel A -evaluate Multiply 0.4 +channel "$2"
}

for s in 16 32 48 64 96 128 256 512 600; do
  rounded $s "icons/icon${s}.png"
done
for s in 16 32 48 64 96 128; do
  disabled $s "icons/icon${s}-disabled.png"
done
for s in 16 19 32 38 48 72; do
  rounded $s "icons/toolbar-icon${s}.png"
done
rounded 128 "icons/chrome-web-store-icon.png"
rounded 32 "options-icon.png"

# Apple requires unrounded squares for App Store icons; iOS/macOS apply their
# own continuous-corner mask at display time. Pre-rounded PNGs get double-masked.
APPICON='safari/Shared (App)/Assets.xcassets/AppIcon.appiconset'
for s in 16 32 64 128 256 512 1024; do
  flat $s "$APPICON/appicon${s}.png"
done
flat 1024 "$APPICON/appicon1024-fullbleed.png"
flat 1024 "safari/Shared (App)/Resources/Icon.png"

echo "regenerated icons from $SRC"
