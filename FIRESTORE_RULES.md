# Firestore security rules

`firestore.rules` is the deployable Firestore ruleset for this project.

## Deploy

1. Install and authenticate the Firebase CLI if necessary: `npm install -g firebase-tools` and `firebase login`.
2. From this repository, select the Firebase project: `firebase use al-ambar-perfume-company`.
3. Deploy the rules: `firebase deploy --only firestore:rules`.

The storefront can read product, category, hero-slide, and settings documents. Anonymous users can create/update only their own likes and ratings and can update only the aggregate `likeCount` / `ratingCount` fields on a product. All catalogue, settings, and Base64 image changes require a non-anonymous Firebase Authentication account, which is the account used by `admin.html`.

For a multi-staff setup, replace the `isAdmin()` provider check in `firestore.rules` with a Firebase custom claim check such as `request.auth.token.admin == true` before granting staff access.
