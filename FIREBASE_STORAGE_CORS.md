# Firebase Storage CORS Setup

Your app is currently blocked by Firebase Storage CORS for localhost.

## What to do

### Option 1: Use Google Cloud Console
1. Open https://console.cloud.google.com/storage/browser
2. Select bucket `lodging-system-a7d6b.appspot.com`
3. Click the **Settings** tab or the **CORS configuration** section
4. Paste this JSON and save:

```json
[
  {
    "origin": ["http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

### Option 2: Use `gsutil` if installed
Run this from the project root:

```powershell
gsutil cors set storage-cors.json gs://lodging-system-a7d6b.appspot.com
```

### Option 3: Use Firebase CLI if installed and configured
If you have `firebase` CLI installed and logged in, run:

```powershell
firebase use --add
firebase deploy --only storage
```

This project does not currently include a `firebase.json`, so the preferred fix is the Cloud Console or `gsutil`.

## Why this is needed

The browser error is:

- `blocked by CORS policy`
- `Response to preflight request doesn't pass access control check`

This means the Firebase bucket is rejecting requests from `http://localhost:3000`.

After applying the CORS JSON, reload the app and try uploading again.
