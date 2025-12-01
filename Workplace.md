
Kasm UI Login Credentials

------------------------------------
  username: admin@kasm.local
  password: SnZ4mewWHCqPC
------------------------------------
  username: user@kasm.local
  password: KwW3TOsMebUiX
------------------------------------

Kasm Database Credentials
------------------------------------
  username: kasmapp
  password: H7sTkVX6EChykppBtvg2
------------------------------------

Kasm Manager Token
------------------------------------
  password: sVUTYa8kioZ2BRQTColZ
------------------------------------

Service Registration Token
------------------------------------
  password: bzz2dFuE550UTlzdzDBy
------------------------------------




Great — here are Chrome-specific fixes to stop Kasm audio from muting when the tab is switched. Follow them in order (Fix 1 is the most important).


---

✅ Fix 1 — Disable Chrome’s background audio throttling

Chrome pauses WebRTC audio/video streams in background tabs.

Step A — Disable Window Occlusion

Open this in Chrome:

chrome://flags/#calculate-native-win-occlusion

Set → Disabled
Restart Chrome.

Step B — Disable Tab Throttling Flags

Open:

chrome://flags/#expensive-background-timer-throttling
chrome://flags/#intensive-wake-up-throttling

Set both → Disabled
Restart Chrome again.


---

✅ Fix 2 — Allow background audio in Chrome Settings

1. Go to:

chrome://settings/content/sound


2. Under Allowed to play sound, add your Kasm URL (example):

https://<your-kasm-domain>




---

✅ Fix 3 — Change Kasm Streaming Settings

Inside your Kasm session:

1. Click ⚙️ Settings


2. Go to Streaming


3. Turn OFF:

Pause video when tab is not visible

Idle stream throttling
(Names may vary by version)




Turn ON:

Keep audio active



---

✅ Fix 4 — Allow Chrome to run in background

On Windows:

Chrome Settings → System → Continue running background apps → ON

On Linux: Chrome already supports background processes.


---

❗ If audio still mutes — your Chrome version changed the throttling behavior

Chrome 115+ became more aggressive with WebRTC throttling.

If none of the above fixes it, the last working option is:

✅ Fix 5 — Use a PWA window (forces continuous media)

1. Open your Kasm URL


2. Click Chrome menu → Install App


3. Open Kasm in the standalone window (PWA mode)



This stops Chrome from pausing WebRTC in background.


---

If you want, tell me your:

➡️ Chrome version
➡️ Your Kasm version (or cloud / self-hosted)

I will give you the exact fix for your version.
