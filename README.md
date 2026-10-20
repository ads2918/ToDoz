# To Doz

A groovy to-do list for Android: a floating bubble over any app, reminders with
Mark done / Snooze, repeating tasks, categories, and psychedelic moving backgrounds.

Built with plain HTML/CSS/JavaScript (`www/`) wrapped as an Android app with
[Capacitor](https://capacitorjs.com/), plus a small native plugin for the floating bubble.

## Project layout

| Path | What's there |
|---|---|
| `www/` | The app itself: `index.html`, `app.js`, `livebg.js` (WebGL backgrounds), `style.css` |
| `android/` | Android project. Custom native code: `app/src/main/java/com/astephens/todobubble/` (`BubbleService`, `BubblePlugin`, `MainActivity`) |
| `assets/` | Source artwork for the app icon |
| `store/` | Google Play listing images and text |

## Try it in a browser

Serve `www/` with any static server, e.g. `npx http-server www -p 8080 -c-1`, and open
http://localhost:8080. (The floating bubble over other apps and real notifications only
work in the Android app.)

## Build the Android app

Requires Node.js and Android Studio (for its JDK and the Android SDK).

```sh
npm install
npx cap sync android
cd android
# Windows (Git Bash): export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
./gradlew assembleDebug    # test APK  -> app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease    # Play AAB  -> app/build/outputs/bundle/release/app-release.aab
```

- **Package names:** Play/release builds are `com.astephens.todoz`. Debug test builds stay
  `com.astephens.todobubble` so they update the test copy on the phone in place.
- **Versions:** bump `versionCode` (and usually `versionName`) in `android/app/build.gradle`
  for every build you upload.
- **Signing:** release builds read the upload key from `~/.gradle/gradle.properties`
  (`TODOBUBBLE_UPLOAD_STORE_FILE`, `..._KEY_ALIAS`, `..._STORE_PASSWORD`, `..._KEY_PASSWORD`).
  The key file and passwords are deliberately **not** in this repo.
- Don't delete or regenerate `android/` with `npx cap add android`: it contains the
  hand-written bubble code.
