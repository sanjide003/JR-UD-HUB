# JR-UD-HUB Admin Setup Guide

ഈ project-ൽ admin access secure ആക്കുന്നത് Firebase Authentication ഉപയോഗിച്ചാണ്. Admin ആയി തിരിച്ചറിയാൻ രണ്ട് മാർഗമുണ്ട്: Firebase custom claim (`admin: true`) അല്ലെങ്കിൽ Firestore `admins/{uid}` document-ൽ `active: true`.

## 1. Firebase Console-ൽ admin user create ചെയ്യുക

1. Firebase Console തുറക്കുക.
2. Project തിരഞ്ഞെടുക്കുക.
3. **Authentication** → **Users** തുറക്കുക.
4. **Add user** click ചെയ്യുക.
5. Admin email/password നൽകി user create ചെയ്യുക.
6. ഈ email/password ആണ് `admin.html` login-ൽ ഉപയോഗിക്കേണ്ടത്.

## 2. Admin custom claim set ചെയ്യുക

Firestore rules അനുസരിച്ച് login മാത്രം മതിയല്ല. ആ user-ന് custom claim (`admin: true`) അല്ലെങ്കിൽ Firestore `admins/{uid}` document (`active: true`) വേണം. Custom claim frontend-ൽ നിന്ന് ചെയ്യാൻ പാടില്ല; Firebase Admin SDK ഉപയോഗിക്കുന്ന trusted machine/backend/Cloud Function വഴി ചെയ്യണം.


## 2A. Firebase Console Data tab വഴി admin add ചെയ്യാമോ?

അതെ, ചെയ്യാം. ഈ repo-യിലെ Firestore rules ഇപ്പോൾ രണ്ട് രീതിയിൽ admin തിരിച്ചറിയും:

1. Firebase Auth custom claim: `admin: true`
2. Firestore `admins/{uid}` document-ൽ `active: true`

Console Data tab വഴി admin add ചെയ്യാൻ:

1. Firebase Console → **Authentication** → **Users** തുറക്കുക.
2. Admin ആക്കേണ്ട user-ന്റെ **UID** copy ചെയ്യുക. Email അല്ല; UID ആണ് document ID ആയി വേണം.
3. Firebase Console → **Firestore Database** → **Data** തുറക്കുക.
4. **Start collection** click ചെയ്യുക.
5. Collection ID: `admins`
6. Document ID: Authentication-ൽ നിന്ന് copy ചെയ്ത admin user **UID** paste ചെയ്യുക.
7. താഴെ fields add ചെയ്യുക:

| Field | Type | Value |
| --- | --- | --- |
| `active` | boolean | `true` |
| `email` | string | admin email |
| `name` | string | admin name |
| `role` | string | `admin` |
| `createdAt` | timestamp | current time |

8. **Save** click ചെയ്യുക.
9. Admin user logout ചെയ്ത് വീണ്ടും login ചെയ്യുക.

> ശ്രദ്ധിക്കുക: `admins` collection-ൽ document ID ആയി email കൊടുക്കരുത്. Firebase Auth UID തന്നെയാണ് കൊടുക്കേണ്ടത്.

ഈ method ഉപയോഗിച്ചാൽ Admin SDK script ആവശ്യമില്ല. പക്ഷേ കൂടുതൽ secure production setup-ൽ custom claim method ആണ് best.

### Option A: Local one-time script ഉപയോഗിച്ച് set ചെയ്യുക

> ഈ command/script നിങ്ങളുടെ local machine-ലോ trusted server-ലോ മാത്രം run ചെയ്യുക. Service account key public repo-യിൽ commit ചെയ്യരുത്.

1. Firebase Console → **Project settings** → **Service accounts**.
2. **Generate new private key** download ചെയ്യുക.
3. Download ചെയ്ത file repo-യിൽ ഇടരുത്. ഉദാഹരണത്തിന് computer-ൽ safe folder-ൽ സൂക്ഷിക്കുക.
4. താഴെ script `set-admin-claim.js` എന്ന പേരിൽ local-ൽ create ചെയ്യുക:

```js
const admin = require('firebase-admin');

const serviceAccount = require('/absolute/path/to/service-account-key.json');
const adminEmail = 'admin@example.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setAdminClaim() {
  const user = await admin.auth().getUserByEmail(adminEmail);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Admin claim added for ${adminEmail}`);
}

setAdminClaim().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

5. Script run ചെയ്യുക:

```bash
npm install firebase-admin
node set-admin-claim.js
```

6. Admin user logout ചെയ്ത് വീണ്ടും login ചെയ്യുക. Custom claim token refresh ആകാൻ re-login വേണം.

### Option B: Cloud Function ഉപയോഗിച്ച് set ചെയ്യുക

Project-ൽ backend/Cloud Functions ഉപയോഗിക്കുന്നുണ്ടെങ്കിൽ, super-admin protected callable/HTTP function വഴി `setCustomUserClaims(uid, { admin: true })` call ചെയ്യാം.
ഈ app നിലവിൽ static frontend ആയതിനാൽ one-time local script ആണ് simple option.

## 3. Firestore rules deploy ചെയ്യുക

Repo-യിലെ `firestore.rules` Firebase Console-ലോ Firebase CLI-ലോ deploy ചെയ്യണം.

### Firebase Console വഴി

1. Firebase Console → **Firestore Database** → **Rules**.
2. `firestore.rules` file ഉള്ളടക്കം paste ചെയ്യുക.
3. **Publish** click ചെയ്യുക.

### Firebase CLI വഴി

`firebase.json` rules config ഉണ്ടെങ്കിൽ:

```bash
firebase deploy --only firestore:rules
```

## 4. Storage rules deploy ചെയ്യുക

ഈ project ഇപ്പോൾ product images Firebase Storage-ൽ save ചെയ്യുന്നില്ല. അതിനാൽ `storage.rules` എല്ലാം deny ആണ്.

### Firebase Console വഴി

1. Firebase Console → **Storage** → **Rules**.
2. `storage.rules` file ഉള്ളടക്കം paste ചെയ്യുക.
3. **Publish** click ചെയ്യുക.

### Firebase CLI വഴി

```bash
firebase deploy --only storage
```

## 5. Admin panel ഉപയോഗിക്കുക

1. `admin.html` തുറക്കുക.
2. Authentication-ൽ create ചെയ്ത admin email/password ഉപയോഗിച്ച് login ചെയ്യുക.
3. Login ചെയ്ത user-ന് `admin: true` custom claim ഉണ്ടെങ്കിൽ products/categories/settings save ചെയ്യാൻ കഴിയും.
4. Custom claim ഇല്ലെങ്കിൽ read നടക്കാം, പക്ഷേ add/edit/delete/upload/save actions permission error കാണിക്കും.

## 6. Free Firebase plan ശ്രദ്ധിക്കേണ്ട കാര്യങ്ങൾ

- Product images ഇപ്പോൾ Firebase Storage-ലേക്ക് upload ചെയ്യുന്നതല്ല.
- Admin തിരഞ്ഞെടുക്കുന്ന image file browser-ൽ data URL image link ആക്കിയാണ് product document-ൽ save ചെയ്യുന്നത്.
- Free mode-ൽ ഓരോ image-നും 200 KB limit ഉണ്ട്.
- Product-ന് maximum 3 images ആണ് നല്ലത്, കാരണം Firestore document size limit ഉണ്ട്.
- കൂടുതൽ images വേണമെങ്കിൽ image URL paste option ഉപയോഗിക്കുക.

## 7. Admin claim remove ചെയ്യേണ്ടിവന്നാൽ

```js
await admin.auth().setCustomUserClaims(user.uid, { admin: false });
```

അല്ലെങ്കിൽ claims മുഴുവനായി clear ചെയ്യാൻ:

```js
await admin.auth().setCustomUserClaims(user.uid, null);
```

Claim മാറ്റിയ ശേഷം user logout/login ചെയ്യണം.

## 8. Admin login ചെയ്തിട്ടും add/edit/delete നടക്കാത്തപ്പോൾ പരിശോധിക്കേണ്ടത്

1. **Rules publish ചെയ്തിട്ടുണ്ടോ?** Repo-യിലെ `firestore.rules` file മാത്രം മാറ്റിയാൽ മതി വരില്ല. Firebase Console → Firestore → Rules-ൽ paste ചെയ്ത് **Publish** ചെയ്യണം.
2. **Admin document ID ശരിയാണോ?** `admins` collection-ൽ document ID ആയി Firebase Auth **UID** വേണം. Email കൊടുത്താൽ permission കിട്ടില്ല.
3. **active field boolean ആണോ?** `active` field type `boolean` ആയിരിക്കണം; value `true`. String ആയി `"true"` കൊടുത്താൽ admin access കിട്ടില്ല.
4. **അതേ Firebase project തന്നെയാണോ?** App-ലെ `firebase-config.js` ഉള്ള project-ലാണ് Authentication user/admins document/rules എല്ലാം വേണം.
5. **Logout/login ചെയ്തോ?** Custom claim ഉപയോഗിക്കുന്നുവെങ്കിൽ token refresh വേണം. Firestore admin document method-ൽ സാധാരണ ഉടൻ work ചെയ്യും, പക്ഷേ logout/login ചെയ്താൽ ഉറപ്പാകും.
6. **Browser console permission error നോക്കുക.** `Missing or insufficient permissions` കണ്ടാൽ admin document/rules publish ആണ് ആദ്യം പരിശോധിക്കേണ്ടത്.

## 9. Admin അല്ലാത്തവർ admin page കാണുന്നത് തടയൽ

Admin UI ഇപ്പോൾ login ചെയ്ത user-നെ തുറക്കുന്നതിനു മുൻപ് admin permission check ചെയ്യും. User-ന് custom claim `admin: true` അല്ലെങ്കിൽ `admins/{uid}.active == true` ഇല്ലെങ്കിൽ admin panel കാണിക്കാതെ sign out ചെയ്യും.
