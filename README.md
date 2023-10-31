# does-it-glider
Import a seed for Conway's Life from Discord (or others in the future) and see if it creates a glider.

# Getting Started
This project uses firebase cloud functions and database.

1. Create a Firebase Project
1. Add realtime database, firestore database, and (cloud) functions
1. Example: https://console.firebase.google.com/project/does-it-glider/overview
1. $ npm install -g firebase
1. $ npm install -g firebase-tools (to get the CLI)
1. $ cd Github project directory (Ex: ~/GitHub/does-it-glider)
1. $ firebase login (will open a browser window for Auth)
1. $ firebase init
    1. I selected 'y' to automatic deploys with GitHub
    1. configured secrets at https://github.com/duppypro/does-it-glider/settings/secrets/actions
    1. Created branch 'web-live' instead of default 'main'
    1. ```Error: Cloud resource location is not set for this project but the operation you are attempting to perform in Cloud Storage requires it. Please see this documentation for more details: https://firebase.google.com/docs/projects/locations```
        1. Fixed: Must configure Storage on https://console.firebase.google.com/project/does-it-glider/storage
    1. now getting ```Error: Failed to get or create a stack using the given initialization details: FirebaseError: Unable to parse JSON: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON```
    2. Trying this fix: https://github.com/firebase/firebase-tools/issues/6472
        3. ```firebase experiments:disable internalframeworks
firebase experiments:enable webframeworks```
    3. trying firebase init yet again: I skipped GitHub actions and it worked

