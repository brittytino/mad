# iRetard Chrome Extension

iRetard is a strict local-only Manifest V3 Chrome extension for Instagram discipline.

## Strict Default Policy

- No user override controls in popup
- Daily Instagram budget is fixed to 30 minutes
- Every 5 minutes of active Instagram use shows a mandatory math challenge modal
- Emergency unlock flow is disabled

## Network Blocking

The extension blocks this request pattern:

- /feed/timeline/

## Tab Redirect

- Reels tab routes are redirected to Direct Messages
- Fragment requests targeting fragment_clips are intercepted and redirected to DMs

## What Gets Disabled

- Feed posts: blocked at network layer
- Reels tab: redirected to DMs + blocked fragment loading

## What Still Works

- Stories
- Direct Messages
- Profile
- Reels in DMs
- Search
- Notifications

## Load Unpacked

1. Open chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select this folder
