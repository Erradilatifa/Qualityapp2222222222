# 🔌 API Reference - Quality Defect Management System

## Overview

This document provides detailed API reference for the Quality Defect Management System services.

---

## 📦 DefautsQualiteService

**Location:** `src/services/defautsService.ts`

### Methods

#### `getDefectsByOperator(filters?)`

Retrieves all defects with optional filtering.

**Parameters:**
```typescript
filters?: {
  startDate?: Date;      // Filter records after this date
  endDate?: Date;        // Filter records before this date
  category?: string;     // Filter by defect category
  operatorName?: string; // Filter by operator name
}
```

**Returns:** `Promise<Operator[]>`

**Example:**
```typescript
import { defautsQualiteService } from '../services/defautsService';

// Get all defects
const allDefects = await defautsQualiteService.getDefectsByOperator();

// Get defects for specific operator
const operatorDefects = await defautsQualiteService.getDefectsByOperator({
  operatorName: 'Youssef El Amrani'
});

// Get defects in date range
const dateRangeDefects = await defautsQualiteService.getDefectsByOperator({
  startDate: new Date('2025-11-01'),
  endDate: new Date('2025-11-30')
});
```

---

#### `getOperatorDefectStats(filters?)`

Gets aggregated statistics grouped by operator and defect type.

**Parameters:**
```typescript
filters?: {
  startDate?: Date;
  endDate?: Date;
  category?: string;
}
```

**Returns:** 
```typescript
Promise<{
  operatorName: string;
  defectType: string;
  defectCount: number;
  lastUpdated: Date;
}[]>
```

**Example:**
```typescript
const stats = await defautsQualiteService.getOperatorDefectStats();

// Result:
// [
//   {
//     operatorName: "Youssef El Amrani",
//     defectType: "Connexion non encliquetée",
//     defectCount: 4,
//     lastUpdated: Date
//   },
//   ...
// ]
```

---

#### `getUniqueOperatorNames()`

Retrieves list of all unique operator names.

**Returns:** `Promise<string[]>`

**Example:**
```typescript
const operators = await defautsQualiteService.getUniqueOperatorNames();
// ["Youssef El Amrani", "Ahmed Mohamed", "Fatima Zahra", ...]
```

---

#### `getUniqueDefectTypes()`

Retrieves list of all unique defect types.

**Returns:** `Promise<string[]>`

**Example:**
```typescript
const types = await defautsQualiteService.getUniqueDefectTypes();
// ["Connexion non encliquetée", "Fils inversé", "Erreur de connecteur", ...]
```

---

#### `checkAlertThreshold(defectCount)`

Checks if a defect count has reached an alert threshold.

**Parameters:**
- `defectCount: number` - The number of defects

**Returns:** `3 | 5 | 7 | null`
- `3` - Yellow alert (3 defects)
- `5` - Orange alert (5 defects)
- `7` - Red alert (7 defects)
- `null` - No alert

**Example:**
```typescript
const alertLevel = defautsQualiteService.checkAlertThreshold(5);
// Returns: 5 (Orange alert)

if (alertLevel) {
  console.log(`Alert level ${alertLevel} triggered!`);
}
```

---

## 📧 EmailService

**Location:** `src/services/emailService.ts`

### Methods

#### `sendAlert(alert)`

Sends an email alert based on defect count threshold.

**Parameters:**
```typescript
alert: {
  operatorName: string;
  defectCount: number;
  defectType: string;
  timestamp: Date;
}
```

**Returns:** `Promise<boolean>` - Success status

**Example:**
```typescript
import { emailService } from '../services/emailService';

const success = await emailService.sendAlert({
  operatorName: 'Youssef El Amrani',
  defectCount: 5,
  defectType: 'Connexion non encliquetée',
  timestamp: new Date()
});

if (success) {
  console.log('Email alert sent successfully');
}
```

**Behavior:**
- Only sends email if threshold (3, 5, or 7) is reached
- Prevents duplicate emails for same operator/defect type/level
- Logs detailed email content to console (production: sends actual email)

---

#### `updateEmailAddress(level, email)`

Updates the email address for a specific alert level.

**Parameters:**
- `level: 3 | 5 | 7` - Alert level
- `email: string` - New email address

**Returns:** `void`

**Example:**
```typescript
emailService.updateEmailAddress(3, 'supervisor@company.com');
emailService.updateEmailAddress(5, 'manager@company.com');
emailService.updateEmailAddress(7, 'director@company.com');
```

---

#### `getEmailAddresses()`

Gets current email addresses for all alert levels.

**Returns:** 
```typescript
{
  level3: string;
  level5: string;
  level7: string;
}
```

**Example:**
```typescript
const addresses = emailService.getEmailAddresses();
console.log(addresses);
// {
//   level3: 'alert.level3@example.com',
//   level5: 'alert.level5@example.com',
//   level7: 'alert.level7@example.com'
// }
```

---

#### `resetAlerts()`

Resets the sent alerts tracking (useful for testing).

**Returns:** `void`

**Example:**
```typescript
// Reset all sent alerts
emailService.resetAlerts();

// Now emails can be sent again for previously alerted operators
```

---

## 🗄️ OperatorService (DatabaseService)

**Location:** `src/services/database.ts`

### Methods

#### `create(data)`

Creates a new defect record in the database.

**Parameters:**
```typescript
data: CreateOperatorData = {
  matricule: string;
  nom: string;
  operateurNom: string;        // Required: Operator full name
  dateDetection: Date;
  posteTravail: string;
  referenceProduit: string;
  projet?: string;
  section?: string;
  equipe?: string;
  ligne?: number;
  category?: string;
  codeDefaut?: string;
  natureDefaut?: string;
  nombreOccurrences?: number;
  codeBoitier?: string;
  commentaire?: string;
  photoUri?: string;
}
```

**Returns:** `Promise<string>` - Document ID

**Example:**
```typescript
import { operatorService } from '../services/database';

const defectId = await operatorService.create({
  matricule: 'ILYASS',
  nom: 'Ilyass',
  operateurNom: 'Youssef El Amrani',
  dateDetection: new Date(),
  posteTravail: 'Poste 12',
  referenceProduit: 'REF123',
  category: 'Connexion / Encliquetage',
  codeDefaut: '101',
  natureDefaut: 'Connexion non encliquetée',
  nombreOccurrences: 4
});

console.log('Created defect with ID:', defectId);
```

---

#### `getAll()`

Retrieves all defect records.

**Returns:** `Promise<Operator[]>`

**Example:**
```typescript
const allDefects = await operatorService.getAll();
console.log(`Total defects: ${allDefects.length}`);
```

---

#### `getById(id)`

Retrieves a single defect by ID.

**Parameters:**
- `id: string` - Document ID

**Returns:** `Promise<Operator | null>`

**Example:**
```typescript
const defect = await operatorService.getById('abc123');
if (defect) {
  console.log('Operator:', defect.operateurNom);
  console.log('Defect:', defect.natureDefaut);
}
```

---

#### `update(id, data)`

Updates a defect record.

**Parameters:**
- `id: string` - Document ID
- `data: Partial<Operator>` - Fields to update

**Returns:** `Promise<void>`

**Example:**
```typescript
await operatorService.update('abc123', {
  nombreOccurrences: 5,
  commentaire: 'Updated after review'
});
```

---

#### `delete(id)`

Deletes a defect record.

**Parameters:**
- `id: string` - Document ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await operatorService.delete('abc123');
console.log('Defect deleted');
```

---

## 🎨 React Component Props

### CentreFormationDashboard

**Location:** `src/components/CentreFormationDashboard.tsx`

**Props:** None (standalone component)

**State:**
```typescript
{
  data: OperatorDefect[];           // Defect statistics
  loading: boolean;                 // Loading state
  selectedDefectType: string;       // Filter: defect type
  selectedOperator: string;         // Filter: operator name
  startDate: Date | null;           // Filter: start date
  endDate: Date | null;             // Filter: end date
}
```

**Usage:**
```tsx
import CentreFormationDashboard from './components/CentreFormationDashboard';

function App() {
  return <CentreFormationDashboard />;
}
```

---

### OperatorForm

**Location:** `src/components/OperatorForm.tsx`

**Props:**
```typescript
{
  visible: boolean;                 // Modal visibility
  onClose: () => void;              // Close handler
  onOperatorAdded: () => void;      // Success callback
  photoUri?: string | null;         // Initial photo URI
}
```

**Usage:**
```tsx
import OperatorForm from './components/OperatorForm';

function MyComponent() {
  const [showForm, setShowForm] = useState(false);
  
  return (
    <OperatorForm
      visible={showForm}
      onClose={() => setShowForm(false)}
      onOperatorAdded={() => {
        console.log('Defect added!');
        setShowForm(false);
      }}
    />
  );
}
```

---

## 🔄 Data Flow

### Creating a Defect

```
User fills form
    ↓
OperatorForm.handleSubmit()
    ↓
operatorService.create(data)
    ↓
Firebase Firestore (operators collection)
    ↓
notificationService.notifyDefautAdded()
    ↓
Success message
```

### Loading Dashboard

```
CentreFormationDashboard mounts
    ↓
loadData()
    ↓
defautsQualiteService.getOperatorDefectStats()
    ↓
Firebase Firestore query
    ↓
Data aggregation & grouping
    ↓
Check alert thresholds
    ↓
emailService.sendAlert() (if threshold reached)
    ↓
Update chart display
```

---

## 🧪 Testing Utilities

### Mock Data Generator

For testing purposes, you can use the original mock data generator:

```typescript
const generateMockData = (): OperatorDefect[] => {
  const operators = [
    'Ahmed M.', 'Fatima Z.', 'Youssef K.', 'Salma B.'
  ];
  
  const defectTypes = [
    'Connexion non encliquetée',
    'Fils inversé',
    'Erreur de connecteur'
  ];
  
  const mockData: OperatorDefect[] = [];
  
  operators.forEach(operator => {
    defectTypes.forEach(defectType => {
      const count = Math.floor(Math.random() * 9);
      mockData.push({
        operatorName: operator,
        defectType,
        defectCount: count,
        lastUpdated: new Date()
      });
    });
  });
  
  return mockData;
};
```

---

## 🔐 Authentication Context

The system uses Firebase Authentication. User data is available via:

```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { userData } = useAuth();
  
  console.log(userData.matricule);  // User matricule
  console.log(userData.fullName);   // User full name
  console.log(userData.projet);     // User project
  console.log(userData.section);    // User section
}
```

---

## 📊 Type Definitions

### OperatorDefect

```typescript
interface OperatorDefect {
  operatorName: string;
  defectType: string;
  defectCount: number;
  lastUpdated: Date;
}
```

### Operator (Full Type)

```typescript
interface Operator extends DatabaseItem {
  id?: string;
  matricule: string;
  nom: string;
  operateurNom?: string;
  dateDetection: Date;
  posteTravail: string;
  referenceProduit: string;
  codeDefaut?: string;
  natureDefaut?: string;
  equipe?: string;
  projet?: string;
  section?: string;
  ligne?: number;
  commentaire?: string;
  nombreOccurrences?: number;
  photoUri?: string;
  category?: string;
  codeBoitier?: string;
  codeRepere?: string;
  repere1?: string;
  repere2?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

---

## 🚀 Quick Start Examples

### Example 1: Create and Display Defect

```typescript
// 1. Create a defect
const defectId = await operatorService.create({
  matricule: 'USER123',
  nom: 'John Doe',
  operateurNom: 'Jane Smith',
  dateDetection: new Date(),
  posteTravail: 'Poste 5',
  referenceProduit: 'PROD-001',
  nombreOccurrences: 3
});

// 2. Load dashboard data
const stats = await defautsQualiteService.getOperatorDefectStats();

// 3. Check for alerts
stats.forEach(stat => {
  const alertLevel = defautsQualiteService.checkAlertThreshold(stat.defectCount);
  if (alertLevel) {
    emailService.sendAlert({
      operatorName: stat.operatorName,
      defectCount: stat.defectCount,
      defectType: stat.defectType,
      timestamp: stat.lastUpdated
    });
  }
});
```

### Example 2: Filter Dashboard Data

```typescript
// Get defects for specific date range
const lastWeekStats = await defautsQualiteService.getOperatorDefectStats({
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  endDate: new Date()
});

// Get defects for specific category
const connectionDefects = await defautsQualiteService.getOperatorDefectStats({
  category: 'Connexion / Encliquetage'
});
```

---

## 📝 Notes

- All dates are stored as JavaScript `Date` objects
- Firebase automatically adds `createdAt` and `updatedAt` timestamps
- Email alerts are only sent once per operator/defect type/threshold level
- The system uses both Firebase (primary) and AsyncStorage (fallback) for data persistence

---

## 🆘 Error Handling

All service methods include try-catch blocks and will:
1. Log errors to console
2. Return appropriate error responses
3. Display user-friendly error messages via Alert

Example error handling:

```typescript
try {
  const stats = await defautsQualiteService.getOperatorDefectStats();
  // Process stats
} catch (error) {
  console.error('Error loading stats:', error);
  Alert.alert('Erreur', 'Impossible de charger les données');
}
```
