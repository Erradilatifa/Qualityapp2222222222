# Quality Mobile App

A React Native mobile application with Firebase database integration, built using Expo.

## Features

- ✅ **Task Management**: Create, read, update, and delete tasks
- ✅ **Firebase Integration**: Real-time database with Firestore
- ✅ **Modern UI**: Clean and intuitive user interface
- ✅ **TypeScript**: Full type safety
- ✅ **Priority Levels**: Low, medium, and high priority tasks
- ✅ **Categories**: Organize tasks by categories
- ✅ **Responsive Design**: Works on all screen sizes

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Firebase account

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Go to Project Settings > General
5. Scroll down to "Your apps" and add a web app
6. Copy the Firebase configuration

### 3. Configure Firebase

1. Open `src/config/firebase.ts`
2. Replace the placeholder configuration with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 4. Firestore Security Rules

In Firebase Console > Firestore Database > Rules, set up these rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // For development only
    }
  }
}
```

**⚠️ Important**: For production, implement proper authentication and security rules.

### 5. Run the App

#### Using Expo Go (Recommended for testing)

1. Install Expo Go on your phone from App Store/Google Play
2. Run the development server:

```bash
npm start
```

3. Scan the QR code with Expo Go app

#### Using Emulator

```bash
# For Android
npm run android

# For iOS (macOS only)
npm run ios

# For web
npm run web
```

## Project Structure

```
src/
├── components/          # React components
│   ├── TaskList.tsx    # Main task list component
│   ├── TaskItem.tsx    # Individual task component
│   └── AddTask.tsx     # Add task modal
├── config/
│   └── firebase.ts     # Firebase configuration
├── services/
│   └── database.ts     # Database service layer
└── types/
    └── Task.ts         # TypeScript interfaces
```

## Database Schema

### Tasks Collection

```typescript
interface Task {
  id: string;           // Auto-generated
  title: string;        // Required
  description?: string; // Optional
  completed: boolean;   // Default: false
  priority: 'low' | 'medium' | 'high'; // Default: 'medium'
  category?: string;    // Optional
  userId?: string;      // For future user authentication
  createdAt: Date;      // Auto-generated
  updatedAt: Date;      // Auto-generated
}
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser
- `npm run build` - Build for production

## Testing with Expo Go

1. **Install Expo Go** on your phone
2. **Run `npm start`** in the project directory
3. **Scan the QR code** with Expo Go
4. **Test the app** on your device

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check your Firebase configuration
2. **Expo Go not working**: Make sure your phone and computer are on the same network
3. **Build errors**: Clear cache with `expo r -c`

### Getting Help

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)

## Next Steps

- [ ] Add user authentication
- [ ] Implement offline support
- [ ] Add push notifications
- [ ] Create task categories management
- [ ] Add task search and filtering
- [ ] Implement task sharing
- [ ] Add data export/import

## License

MIT License - feel free to use this project for your own applications! 