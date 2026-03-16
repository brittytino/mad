# Manifest and Dependency Notes

## Common manifest declarations
```xml
<application>
    <activity android:name=".exercise1.ConverterActivity" />
    <activity android:name=".exercise2.CookieActivity" />
    <activity android:name=".ps2.VisitingCardActivity" />
    <activity android:name=".ps2.BasicCalculatorActivity" />
    <activity android:name=".ps3.FeedbackActivity" />
    <activity android:name=".ps3.FeedbackResultActivity" />
    <activity android:name=".ps3.CalcToastActivity" />
    <activity android:name=".ps4.PS4FormActivity" />
    <activity android:name=".ps4.PS4ResultActivity" />
    <activity android:name=".ps5.StudentRegistrationActivity" />
    <activity android:name=".ps5.StudentResultActivity" />
    <activity android:name=".ps6.HospitalDirectoryActivity" />
    <activity android:name=".ps7.SecurityScenariosActivity" />
    <activity android:name=".mock1.MainMenuActivity" />
    <activity android:name=".mock1.WhatsAppMessageActivity" />

    <service android:name=".mock1.MusicService" />
</application>
```

## Permissions
```xml
<uses-permission android:name="android.permission.CALL_PHONE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
```

## Dependency (for OTP retriever)
```gradle
implementation "com.google.android.gms:play-services-auth-api-phone:18.0.1"
```
