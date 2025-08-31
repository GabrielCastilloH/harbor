// globals.js

import * as Crypto from "expo-crypto";

globalThis.crypto = {
  subtle: {
    digest: (algorithm, message) => Crypto.digest(algorithm, message),
  },
};
global.TextEncoder = require("text-encoding").TextEncoder;
