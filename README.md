# iRetard Chrome Extension

iRetard is a local-only Manifest V3 Chrome extension that blocks Instagram Reels and Explore, allows core communication routes, and enforces a daily time budget with controlled emergency unlocks.

## Key Behavior

- Blocks routes: `/reels`, `/explore`
- Allows routes: `/stories`, `/direct/inbox`, `/direct/t`
- Blocks reels/explore network requests via `declarativeNetRequest`
- Enforces daily usage limit with midnight local reset
- Supports emergency mode: 3 uses per day, 5 minutes each
- Runs only on `https://www.instagram.com/*`

## UI and Theme

- Premium minimal popup UI with Inter-first typography
- Light theme (`#FFFFFF`) and dark theme (`#0B0B0C`)
- Auto theme from `prefers-color-scheme`
- Manual override in popup (`Auto`, `Light`, `Dark`)
- Strict, calm block screen for blocked routes and daily lockouts

## Test Matrix

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| T1 | Reels route block | Open `https://www.instagram.com/reels/` | Premium block screen appears, no redirect |
| T2 | Explore route block | Open `https://www.instagram.com/explore/` | Premium block screen appears, no redirect |
| T3 | DMs inbox allowed | Open `https://www.instagram.com/direct/inbox/` | Page works normally |
| T4 | DM thread allowed | Open `https://www.instagram.com/direct/t/` | Page works normally |
| T5 | Stories allowed | Open `https://www.instagram.com/stories/` | Page works normally |
| T6 | Daily limit lockout | Set low limit, spend time until exceeded | Instagram shows full lockout block screen |
| T7 | Emergency unlock | Trigger lockout, click emergency in popup | Access returns for 5 minutes |
| T8 | Emergency cap | Use emergency 3 times in one day | 4th emergency attempt is denied |
| T9 | Midnight reset | Wait for local day change | `usedToday`, `emergencyCount`, and active emergency reset |
| T10 | Non-Instagram isolation | Browse unrelated sites | No visual/script/network side effects |
| T11 | Network rule safety | Use DMs and stories during normal use | DMs/stories APIs remain functional |
| T12 | Network rule strictness | Navigate reels/explore + observe network requests | Reels/explore requests are blocked |

## Edge-Case Validation

### Multiple Instagram Tabs

- Open 2-3 Instagram tabs across routes.
- Rapidly switch active tabs.
- Confirm no visible time jumps and no duplicate counting.

### System Sleep / Resume

- Keep an allowed Instagram tab active.
- Put device to sleep and resume.
- Confirm usage updates remain stable and no UI break occurs.

### Timezone Changes

- Change system timezone while browser remains open.
- Trigger state refresh by reopening popup and loading Instagram.
- Confirm daily reset follows local date boundaries.

### Emergency Expiry During Session

- Activate emergency near timeout.
- Keep Instagram open past expiry.
- Confirm lockout returns immediately after emergency ends.

## Manual Verification Checklist

1. No uncaught errors in extension pages and service worker.
2. Popup opens instantly and reflects current state.
3. Theme override persists across popup reopen.
4. Block screen theme follows override and system theme when set to auto.
5. Browser back/forward remains functional on blocked routes.

## Strict Regression Scenarios

- Open `https://www.instagram.com/reels/` directly: blocked instantly with no flash.
- Spam back/forward between allowed and blocked routes: blocked routes stay blocked.
- Reload while on `/reels` or `/explore`: block overlay appears immediately.
- Open `/reels` in a new tab: blocked immediately.
- Set daily limit once: input becomes locked with `Locked for today` until next day.
- Popup visual quality: premium spacing, logo, icons, refined controls, no browser-default look.

## Load Unpacked

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select this folder.
5. Pin extension and open popup to configure daily limit.
