# Case Tracker Chrome Extension

![Version](https://img.shields.io/badge/version-1.0-blue) ![Manifest](https://img.shields.io/badge/manifest-v3-green)

A specialized productivity tool designed to track work case URLs, manage queues, and analyze performance metrics with a modern, dark-themed dashboard.

## 🚀 Features

### 1. Workflow Automation
* **Auto-Capture:** Automatically detects job details pages on `thejobcompany.in` and adds them to a processing queue.
* **Queue Management:** Replaces the Chrome "New Tab" page with your active Case Queue for immediate access.
* **Duplicate Prevention:** Smart logic prevents the same case link from being added twice.

### 2. Case Management
* **Actionable Queue:** Open cases directly from the dashboard.
* **History Tracking:** Logs every completed case with `Opened At` and `Completed At` timestamps.
* **Case Types:** Categorize cases (e.g., "Claim Reason", "Counterfeit", "Abort-PIV").

### 3. Performance Analytics (AHT)
* **Visual Dashboard:** Powered by **Chart.js**.
* **Metrics:** Tracks Queue Load, Total Completed, and **Average Handling Time (AHT)**.
* **Abort Logic:** Automatically detects and isolates "Abort" cases (e.g., "Abort-MULTI") from success metrics.
* **Trend Analysis:** Line chart showing completed cases over the last 14 days.
* **Date Range Filter:** Filter stats by specific dates (Default: Current Day).

### 4. Data Management
* **CSV Export:** Download full reports (`queue.csv` or `history.csv`) including calculated "Time Taken" durations.
* **Settings:** Add or remove custom Case Types dynamically.

---

## 🛠️ Installation Guide

Since this is a custom local extension, you must install it in **Developer Mode**.

### Prerequisites
1.  Ensure you have downloaded `chart.umd.js` (Chart.js v4.4.1) and placed it in the root folder (or alongside `performance.js`).

### Steps
1.  **Download/Clone** this project to a folder on your computer.
2.  Open Google Chrome and navigate to: `chrome://extensions/`
3.  Toggle **Developer mode** (top right corner).
4.  Click **Load unpacked**.
5.  Select the folder containing the `manifest.json` file.
6.  The extension is now active! The icon should appear in your toolbar.

---

## 📂 Project Structure

```text
/case-tracker-root
│
├── manifest.json            # Extension configuration
├── background.js            # Service worker (event handling)
├── chart.umd.js             # Chart.js library (Must be downloaded manually)
│
├── assets/                  # Icons
│   └── icon.png             # 128x128 icon
│
├── styles/
│   └── main.css             # Global Dark Slate theme & Glassmorphism
│
├── pages/                   # UI HTML Files
│   ├── queued.html          # (Default New Tab) Active queue
│   ├── history.html         # Completed cases log
│   ├── performance.html     # Charts & AHT Stats
│   └── settings.html        # Configuration & Export
│
├── scripts/                 # Logic JS Files
│   ├── queued.js
│   ├── history.js
│   ├── performance.js
│   └── settings.js
│
└── content/
    └── capture.js           # Script injected into target website
````

-----

## 🎨 UI & Design System

The extension uses a custom **Dark Slate** theme designed for long working hours.

  * **Font:** Inter (via Google Fonts).
  * **Colors:**
      * Background: `#0f172a` (Slate 900)
      * Surface: `#1e293b` (Slate 800)
      * Primary: `#3b82f6` (Blue 500)
      * Success: `#10b981` (Emerald 500)
      * Text: `#f8fafc` (Slate 50)
  * **Effects:** Glassmorphism on headers (Blur 12px) and subtle drop shadows.

-----

## 📊 CSV Export Format

When exporting data via the Settings page, the CSVs are formatted as follows:

**Queue Export:**
`URL, Case Type, Opened`

**History Export:**
`URL, Case Type, Opened, Completed, Time Taken`

> **Note:** "Time Taken" is calculated automatically as the duration between `Opened` and `Completed` timestamps.

-----

## 🔒 Permissions Explained

  * `tabs`: To open and manipulate case tabs.
  * `storage`: To save the queue and history locally on your machine.
  * `scripting`: To inject the capture script into the work website.
  * `host_permissions`: Strictly limited to `https://thejobcompany.in/*`.

-----

## 👤 Author

**Sk Md Rohan**
[LinkedIn Profile](https://www.linkedin.com/in/rohan2by1)
[Github](https://www.github.com/rohan2by1)

-----

**License:** Personal Use / Internal Tool.

