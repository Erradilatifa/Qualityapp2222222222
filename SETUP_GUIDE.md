# 🚀 Quick Setup Guide - Quality Dashboard System

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Expo CLI (for mobile development)

---

## 📦 Installation

### 1. Install Dependencies

```bash
cd Qualityapp-version-2
npm install
```

### 2. Firebase Configuration

The Firebase configuration is already set up in `src/config/firebase.ts`. Verify the configuration:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyDUtu4JI4DlJx0l1tZsi899YNyEOHk0R4A",
  authDomain: "quality-app-cc875.firebaseapp.com",
  projectId: "quality-app-cc875",
  storageBucket: "quality-app-cc875.appspot.com",
  messagingSenderId: "763450654093",
  appId: "1:763450654093:web:80388b7d79da7785bf91c4"
};
```

### 3. Firestore Database Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `quality-app-cc875`
3. Navigate to **Firestore Database**
4. Ensure the `operators` collection exists

### 4. Firestore Security Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /operators/{document} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

---

## 🏃 Running the Application

### Web Development

```bash
npm run web
```

The app will open at `http://localhost:19006`

### Mobile Development (iOS)

```bash
npm run ios
```

### Mobile Development (Android)

```bash
npm run android
```

---

## 🧪 Testing the System

### Step 1: Create Test Data

1. Launch the application
2. Log in with your credentials
3. Navigate to **"Nouveau Défaut Qualité"**
4. Fill in the form:
   - **Nom et Prénom de l'opérateur**: "Test Operator"
   - **Poste de travail**: "Poste 1"
   - **Référence produit**: "TEST-001"
   - **Catégorie**: Select any category
   - **Code défaut**: Select any code
   - **Nombre d'occurrences**: 3 (to trigger yellow alert)
5. Submit the form

### Step 2: View Dashboard

1. Navigate to **"Qualité Dashboard"** (Centre de Formation card)
2. Verify the operator appears in the chart
3. Check the bar color (should be yellow for 3 defects)
4. Check console logs for alert notification

### Step 3: Test Filtering

1. Use the **"Type de défaut"** filter
2. Use the **"Opérateur"** filter
3. Verify the chart updates correctly

### Step 4: Test Alert Levels

Create multiple defects for the same operator to test different alert levels:

- **3 defects** → Yellow alert (Level 1)
- **5 defects** → Orange alert (Level 2)
- **7 defects** → Red alert (Level 3)

Check console logs for detailed email content.

---

## 🔧 Configuration

### Email Recipients

Update email addresses in `src/services/emailService.ts`:

```typescript
const EMAIL_ADDRESSES = {
  level3: 'supervisor@yourcompany.com',
  level5: 'manager@yourcompany.com',
  level7: 'director@yourcompany.com',
};
```

### Cloudinary (Photo Upload)

The app uses Cloudinary for photo uploads. Configuration is in `src/components/OperatorForm.tsx`:

```typescript
const uploadPromise = new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.cloudinary.com/v1_1/dt6sq0zub/image/upload', true);
  
  const formData = new FormData();
  formData.append('file', photoUri);
  formData.append('upload_preset', 'mehdi234');
  
  xhr.send(formData);
});
```

---

## 📊 Database Schema

### Collection: `operators`

Each document represents a quality defect:

```json
{
  "id": "auto-generated",
  "matricule": "USER123",
  "nom": "John Doe",
  "operateurNom": "Jane Smith",
  "projet": "Project Name",
  "section": "Section 1",
  "equipe": "Matinée",
  "dateDetection": "2025-11-05T10:00:00.000Z",
  "ligne": 4,
  "posteTravail": "Poste 12",
  "referenceProduit": "PROD-001",
  "category": "Connexion / Encliquetage",
  "codeDefaut": "101",
  "natureDefaut": "Connexion non encliquetée",
  "nombreOccurrences": 4,
  "codeBoitier": "BOX-123",
  "commentaire": "Optional comment",
  "photoUri": "https://cloudinary.com/...",
  "createdAt": "2025-11-05T10:00:00.000Z",
  "updatedAt": "2025-11-05T10:00:00.000Z"
}
```

---

## 🎯 Key Features

### ✅ Form Submission
- Captures all defect information
- Validates required fields
- Uploads photos to Cloudinary
- Saves to Firebase Firestore

### ✅ Real-Time Dashboard
- Fetches live data from database
- Groups by operator and defect type
- Color-coded thresholds
- Interactive filtering

### ✅ Email Alerts
- Automatic threshold detection
- Three-level alert system
- Detailed action plans
- Prevents duplicate alerts

---

## 🐛 Troubleshooting

### Issue: Dashboard shows no data

**Solution:**
1. Check Firebase Console → Firestore → `operators` collection
2. Verify data exists
3. Check browser console for errors
4. Verify Firebase configuration

### Issue: Form submission fails

**Solution:**
1. Check network connection
2. Verify Firebase authentication
3. Check Firestore security rules
4. Review console logs for errors

### Issue: Photos not uploading

**Solution:**
1. Verify Cloudinary configuration
2. Check upload preset: `mehdi234`
3. Check network connection
4. Review console logs for upload errors

### Issue: Email alerts not appearing

**Solution:**
1. Check console logs (emails are logged, not sent in development)
2. Verify defect count >= 3
3. Check if alert was already sent for this operator/defect type

---

## 📁 Project Structure

```
Qualityapp-version-2/
├── src/
│   ├── components/
│   │   ├── CentreFormationDashboard.tsx  # Main dashboard
│   │   ├── OperatorForm.tsx              # Defect form
│   │   └── ...
│   ├── services/
│   │   ├── defautsService.ts             # Defect data service
│   │   ├── emailService.ts               # Email alert service
│   │   └── database.ts                   # Firebase service
│   ├── types/
│   │   └── Operator.ts                   # Type definitions
│   ├── config/
│   │   └── firebase.ts                   # Firebase config
│   └── ...
├── QUALITY_DASHBOARD_DOCUMENTATION.md    # Full documentation
├── API_REFERENCE.md                      # API reference
├── SETUP_GUIDE.md                        # This file
└── package.json
```

---

## 🔐 Security Best Practices

1. **Never commit Firebase credentials** to public repositories
2. **Use environment variables** for sensitive data
3. **Implement proper Firestore rules** to restrict access
4. **Validate all user inputs** on both client and server
5. **Use HTTPS** for all API calls

---

## 🚀 Deployment

### Web Deployment (Netlify)

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Netlify:
   ```bash
   netlify deploy --prod
   ```

### Mobile Deployment

#### iOS (App Store)

```bash
expo build:ios
```

#### Android (Google Play)

```bash
expo build:android
```

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## 🆘 Support

For issues or questions:

1. Check the [QUALITY_DASHBOARD_DOCUMENTATION.md](./QUALITY_DASHBOARD_DOCUMENTATION.md)
2. Review the [API_REFERENCE.md](./API_REFERENCE.md)
3. Check Firebase Console logs
4. Review browser/app console for errors

---

## ✅ Checklist

Before going to production:

- [ ] Update Firebase security rules
- [ ] Configure email service with real SMTP
- [ ] Update email recipient addresses
- [ ] Test all alert levels (3, 5, 7 defects)
- [ ] Test filtering functionality
- [ ] Test photo upload
- [ ] Verify data persistence
- [ ] Test on multiple devices
- [ ] Review and optimize Firestore queries
- [ ] Set up monitoring and logging
- [ ] Create backup strategy
- [ ] Document user workflows
- [ ] Train end users

---

## 🎉 You're Ready!

The Quality Dashboard system is now set up and ready to use. Create some test defects and explore the dashboard to see the system in action!

For detailed information about the system architecture and API, refer to:
- [QUALITY_DASHBOARD_DOCUMENTATION.md](./QUALITY_DASHBOARD_DOCUMENTATION.md)
- [API_REFERENCE.md](./API_REFERENCE.md)
