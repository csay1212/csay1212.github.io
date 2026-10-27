// Every AdMob ID, in one place. This is the only file to change when the AdMob account exists.
// The Android build reads appId from here too (android/app/admob.gradle puts it into
// AndroidManifest.xml), so it's written once. Keep each ID on its own line, in quotes.
//
// For now these are Google's public test IDs: they always show "Test Ad" ads and never pay.
// https://developers.google.com/admob/android/test-ads
//
// To go live, in AdMob (apps.admob.com):
//   1. Apps → Add app → Android, then copy its App ID (it has a ~) into appId.
//   2. Ad units → Add: one "Banner" and one "Interstitial", and copy their IDs (they have a /).
//   3. Set testMode to false, then build a release.
// Debug builds always ask for test ads, whatever is set here: clicking your own real ads
// can get the AdMob account suspended.

// Google's sample ad units for Android. They serve test ads to anyone, on any app.
export const TEST_UNITS = {
  banner: 'ca-app-pub-3940256099942544/9214589741',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};

export const ADS = {
  // The AdMob App ID: ca-app-pub-0000000000000000~0000000000 (yours goes here)
  appId: 'ca-app-pub-3940256099942544~3347511713',
  // The ad unit IDs: ca-app-pub-0000000000000000/0000000000 (yours go here)
  banner: 'ca-app-pub-3940256099942544/9214589741',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  // true: release builds also show test ads. Set to false once the IDs above are yours.
  testMode: true,
};
