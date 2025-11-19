# 🚀 Simple Setup - No Environment Files Needed

## ✅ **SMTP Credentials Already Configured**

The Gmail SMTP credentials are **hardcoded directly** in the API routes:
- **From**: fatimzahraelhansali@gmail.com
- **Password**: zovc fdrx wqsj ugsb  
- **To**: feetyer53@gmail.com

## 📋 **Quick Start (3 Steps)**

### 1. Install Dependencies
```bash
cd api-server
npm install
```

### 2. Start Server
```bash
npm run dev
```
✅ Server starts at: **http://localhost:3001**

### 3. Test Email
Visit: **http://localhost:3001/api/test-email**

## 🎯 **API Endpoints Ready to Use**

### 📧 Send Alert
**POST** `http://localhost:3001/api/alert-operator`

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/alert-operator \
  -H "Content-Type: application/json" \
  -d '{
    "operateurNom": "John Doe",
    "nombreOccurrences": 4,
    "previousOccurrences": 2
  }'
```

### 🧪 Test Email
**GET** `http://localhost:3001/api/test-email`

## 🔗 **React Native Integration**

### Quick Integration Example:
```typescript
// Send alert when operator exceeds 3 defects
const sendAlert = async (operatorName: string, defectCount: number) => {
  try {
    const response = await fetch('http://localhost:3001/api/alert-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operateurNom: operatorName,
        nombreOccurrences: defectCount,
        previousOccurrences: 0
      })
    });
    
    const result = await response.json();
    console.log('Alert result:', result);
  } catch (error) {
    console.error('Alert failed:', error);
  }
};

// Usage
await sendAlert("John Doe", 4);
```

## 🌐 **Free Deployment**

### Deploy to Vercel (Recommended):
1. Push code to GitHub
2. Connect to Vercel
3. Deploy (no environment variables needed!)
4. Update API URL in your React Native app

### Deploy to Netlify:
1. `npm run build`
2. Upload `dist` folder to Netlify
3. Done!

## ✅ **What Works Out of the Box:**

- ✅ **Gmail SMTP** configured
- ✅ **Email alerts** when defects > 3
- ✅ **No environment setup** needed
- ✅ **Ready for deployment**
- ✅ **React Native integration** ready

## 🧪 **Test Commands:**

```bash
# Test email functionality
curl http://localhost:3001/api/test-email

# Test alert (will send email)
curl -X POST http://localhost:3001/api/alert-operator \
  -H "Content-Type: application/json" \
  -d '{"operateurNom":"Test User","nombreOccurrences":4}'
```

---

## 🎉 **Ready to Use!**

Your API server is **fully configured** and ready to send email alerts without any additional setup!
