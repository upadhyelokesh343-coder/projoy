import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

signInWithPopup(auth, provider).then(() => {
  console.log("SUCCESS");
  process.exit(0);
}).catch(e => {
  console.error("ERROR", e.code);
  process.exit(1);
});
