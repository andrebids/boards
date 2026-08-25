FROM cryptpad/cryptpad:version-2026.5.1@sha256:1f89dcdd28c1375f675e47b1d0cf07a51f3e9a07a79dc93c8cddb3295b98a34d

COPY patch-onlyoffice-integration.js patch-static-cache.js /opt/planka/

# The upstream Integration API omits the data argument for GET_BLOB. Message
# ports cannot clone the callback function, so Office integrations remain on
# their loading screen whenever the server-side document fetch is unavailable.
RUN node -e 'const fs=require("fs");const path="/cryptpad/www/integration/main.js";const source=fs.readFileSync(path,"utf8");const q=String.fromCharCode(39);const before="chan.send("+q+"GET_BLOB"+q+", obj => {";const after="chan.send("+q+"GET_BLOB"+q+", null, obj => {";const next=source.replace(before,after).replace("cb(obj?.blob);","cb(null, obj?.blob);");if(next===source||!next.includes("cb(null, obj?.blob);"))throw new Error("CryptPad GET_BLOB patch no longer applies");fs.writeFileSync(path,next)'

# CryptPad stores presentation images as encrypted media. Redirect OnlyOffice's
# regular local-image command to the CryptPad picker instead of its unavailable
# document-server upload endpoint.
RUN node /opt/planka/patch-onlyoffice-integration.js

# The base entrypoint installs OnlyOffice before running this command. Prepare
# the persisted distribution on every start so existing and fresh volumes use
# the same patches without changing the production HTTP cache policy.
CMD ["bash", "-lc", "node /opt/planka/patch-static-cache.js --assets-only && node /opt/planka/patch-onlyoffice-integration.js && exec npm start"]
