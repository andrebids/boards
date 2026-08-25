#!/bin/sh
set -eu

themes_root=/onlyoffice-dist/v9/sdkjs/slide/themes

if [ ! -f "$themes_root/themes.js" ]; then
  echo "OnlyOffice has not finished its first install; start CryptPad, wait for /checkup/, then run theme-sync again." >&2
  exit 1
fi

cp /themes/themes.js "$themes_root/themes.js"
cp -R /themes/theme7 "$themes_root/theme7"
cp -R /themes/theme8 "$themes_root/theme8"

echo "Installed the two Planka presentation themes. Restart CryptPad to invalidate its static-resource cache."
