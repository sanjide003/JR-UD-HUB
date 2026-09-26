# Firestore security rules

`firestore.rules` is the deployable ruleset for this project. It now separates customer data from administrator data.

## Required Firebase Console steps after merging this PR

1. Open **Firebase Console → Firestore Database → Rules**.
2. Replace the existing rules with the complete contents of `firestore.rules` from this repository and click **Publish**.
3. Open **Firebase Console → Authentication → Sign-in method** and enable **Email/Password**, **Google**, and **Phone**. For Google, choose the support email and save.
4. In **Authentication → Settings → Authorized domains**, add the exact GitHub Pages domain that hosts this website (for example `your-github-name.github.io`).
5. Make the existing admin account an administrator:
   - Open **Authentication → Users**, open the existing admin user and copy its **User UID**.
   - Open **Firestore Database → Data** and create collection **`admins`**.
   - Create a document whose **Document ID is exactly that UID**. It may contain one field such as `createdAt: "manual"`.
   - Do not create `admins` documents for customer accounts.

## Access model

- A customer can read and change only their own profile, saved addresses, and orders.
- Customers may create a new order only with a `Pending` order status and `pending` payment status.
- The `admins/{uid}` document is the only administrator permission source. Only Firebase Console/server tools can create or change it; website users cannot.
- Administrators can manage products, settings, customers, and order status from `admin.html`.

## Optional CLI deployment

If using Firebase CLI instead of the Console: `firebase deploy --only firestore:rules`.
