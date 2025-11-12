
# Al Ambar Perfume Company

Premium Arabic Perfumes & Luxury Fragrances E-commerce Website

## 🌟 Features

- Modern, responsive design with Tailwind CSS
- Firebase Authentication for admin access
- Real-time Firestore database
- Firebase Storage for images and media
- Product catalog with categories
- Featured products showcase
- WhatsApp integration for orders
- Admin dashboard for content management
- Video section (YouTube or direct upload)
- Contact page with Google Maps

## 🚀 Deployment on Vercel

### Prerequisites
- Node.js 16+ installed
- Firebase account with project created
- GitHub account
- Vercel account

### Step 1: Local Setup

```bash
# Clone or create project folder
mkdir al-ambar-perfume
cd al-ambar-perfume

# Initialize npm
npm init -y

# Install dependencies
npm install react react-dom firebase
npm install -D react-scripts
```

### Step 2: Project Structure

Create the following structure:
```
al-ambar-perfume/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx
│   └── index.js
├── .gitignore
├── package.json
└── README.md
```

### Step 3: Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable Authentication (Email/Password)
4. Create Firestore Database
5. Enable Storage
6. Copy your config and update in `src/App.jsx`

### Step 4: GitHub Setup

```bash
# Initialize git
git init

# Add files
git add .
git commit -m "Initial commit"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/al-ambar-perfume.git
git branch -M main
git push -u origin main
```

### Step 5: Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and deploy to production
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Vercel auto-detects React app
6. Click "Deploy"

## 🔧 Configuration

### Firebase Rules

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /artifacts/{appId}/public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Admin Account Setup

```bash
# Use Firebase Console Authentication tab
# Add new user with email/password
# Or use Firebase CLI:
firebase auth:import users.json
```

## 📱 Features Overview

### Public Pages
- **Home**: Hero section, video, categories, featured products
- **Products**: Filterable product catalog
- **Product Detail**: Individual product page
- **Contact**: Contact information with map

### Admin Dashboard
- **Settings**: Site branding, contact info, video
- **Categories**: Add/delete categories
- **Products**: Add/delete products with images

## 🛠️ Development

```bash
# Start development server
npm start

# Build for production
npm run build

# Test production build locally
npx serve -s build
```

## 📦 Technologies Used

- **React 18** - UI Framework
- **Firebase 10** - Backend (Auth, Firestore, Storage)
- **Tailwind CSS** - Styling
- **Vercel** - Hosting

## 🌐 Environment Variables

No environment variables needed! Firebase config is in the code.
(For production, consider using environment variables for security)

## 📝 License

Private - All Rights Reserved

## 👨‍💻 Support

For support, contact: admin@alambar.com
