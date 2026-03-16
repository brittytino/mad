# MAD Lab Exam Repository (Android Studio Ready)

This repository now contains a complete Android Studio project configuration.

## Project Structure

- Root Gradle files: `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`
- Android module: `app/`
- Kotlin source: `app/src/main/java/com/example/madlabexam/...`
- Resources: `app/src/main/res/...`
- Manifest: `app/src/main/AndroidManifest.xml`

The original question-wise folders (`01_...` to `11_...`) are kept as reference notes.

## What Runs

All implemented modules are wired into a single launcher screen:
- `HomeActivity` (launcher)
- Exercise 1 and Exercise 2
- PS2, PS3, PS4, PS5, PS6, PS7
- Mock Test 1 (menu app + music service + theme toggle)

## Open In Android Studio

1. Open this folder as a project.
2. Let Gradle sync.
3. Run app on emulator/device.
4. From home screen, tap any module to test that question flow.

## Notes

- Required permissions and OTP dependency are already added.
- Placeholder drawables for logo/happy/unhappy are included.
- Validation and intent flows are included for all form-based questions.
