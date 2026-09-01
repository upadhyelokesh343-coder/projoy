import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, "test@test.com", "password").then(() => {
  console.log("SUCCESS");
  process.exit(0);
}).catch(e => {
  console.error("ERROR", e.code);
  process.exit(1);
});
