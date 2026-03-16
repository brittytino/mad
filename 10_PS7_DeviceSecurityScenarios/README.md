# Problem Sheet 7 - Device Security Scenarios

## Important exam point
Android apps cannot directly force-toggle many secure system settings like internet, USB debugging, and location due to OS restrictions.
Expected practical solution is to open corresponding settings screens.

## Covered
1. OTP auto fill starter using SMS Retriever API
2. Internet settings shortcut
3. USB debugging (Developer options) shortcut
4. Keyboard settings shortcut
5. Location settings shortcut

## Dependency for OTP
implementation "com.google.android.gms:play-services-auth-api-phone:18.0.1"
