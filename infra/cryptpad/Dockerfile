FROM cryptpad/cryptpad:version-2026.5.1

# The upstream Integration API omits the data argument for GET_BLOB. Message
# ports cannot clone the callback function, so Office integrations remain on
# their loading screen whenever the server-side document fetch is unavailable.
RUN node -e 'const fs=require("fs");const path="/cryptpad/www/integration/main.js";const source=fs.readFileSync(path,"utf8");const q=String.fromCharCode(39);const before="chan.send("+q+"GET_BLOB"+q+", obj => {";const after="chan.send("+q+"GET_BLOB"+q+", null, obj => {";const next=source.replace(before,after).replace("cb(obj?.blob);","cb(null, obj?.blob);");if(next===source||!next.includes("cb(null, obj?.blob);"))throw new Error("CryptPad GET_BLOB patch no longer applies");fs.writeFileSync(path,next)'
