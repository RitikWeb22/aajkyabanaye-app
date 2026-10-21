=============================================================
AajKyaBanaye — Google Play Store Release Folder
=============================================================

This folder is for Google Play Store upload bundles (.aab).

Google Play Store submission requirement:
  Google Play Console requires an Android App Bundle (.aab) for publishing apps.

How to build a Play Store bundle:
  1. Open terminal in the project root.
  2. Run: npm run build:playstore
     (Or inside app/ run: npx eas-cli build -p android --profile production)
  3. When the build finishes on Expo cloud, you will receive a direct download link for the .aab file.
  4. Download the .aab file and place it in this folder.
  5. Go to Google Play Console -> "Create Release" -> Upload this .aab file!
