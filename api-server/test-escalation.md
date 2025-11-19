# 🧪 Test Escalation Email System

## Test Commands

### Test Level 3 Escalation (3 defects)
```bash
curl -X POST http://localhost:3001/api/alert-operator \
  -H "Content-Type: application/json" \
  -d '{
    "operateurNom": "John Doe",
    "nombreOccurrences": 3,
    "previousOccurrences": 2
  }'
```

**Expected Recipients:** lamiaa.ityel@leoni.com, amina.rajouh@leoni.com

### Test Level 5 Escalation (5 defects)
```bash
curl -X POST http://localhost:3001/api/alert-operator \
  -H "Content-Type: application/json" \
  -d '{
    "operateurNom": "Jane Smith", 
    "nombreOccurrences": 5,
    "previousOccurrences": 4
  }'
```

**Expected Recipients:** badr.fatih@leoni.com, lamiaa.ityel@leoni.com, hicham.kissou2@leoni.com, maha.elbadissi2@leoni.com, housny.yacine@leoni.com, adil.bouchrai@leoni.com, ilham.oughanou@leoni.com, sanaa.boutmir@leoni.com

### Test Level 7 Escalation (7 defects)
```bash
curl -X POST http://localhost:3001/api/alert-operator \
  -H "Content-Type: application/json" \
  -d '{
    "operateurNom": "Bob Wilson",
    "nombreOccurrences": 7,
    "previousOccurrences": 6
  }'
```

**Expected Recipients:** lamiaa.ityel@leoni.com

### Test No Alert (threshold not crossed)
```bash
curl -X POST http://localhost:3001/api/alert-operator \
  -H "Content-Type: application/json" \
  -d '{
    "operateurNom": "Alice Johnson",
    "nombreOccurrences": 4,
    "previousOccurrences": 5
  }'
```

**Expected:** No email sent (threshold not crossed)

## PowerShell Commands (Windows)

### Test Level 3
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/alert-operator" -Method POST -ContentType "application/json" -Body '{"operateurNom":"John Doe","nombreOccurrences":3,"previousOccurrences":2}'
```

### Test Level 5
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/alert-operator" -Method POST -ContentType "application/json" -Body '{"operateurNom":"Jane Smith","nombreOccurrences":5,"previousOccurrences":4}'
```

### Test Level 7
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/alert-operator" -Method POST -ContentType "application/json" -Body '{"operateurNom":"Bob Wilson","nombreOccurrences":7,"previousOccurrences":6}'
```

## Expected Email Content

### Level 3 (3 defects)
- **Subject:** RE: Notification – Sensibilisation opérateur [Name] – 3 défauts internes_Escalation_Niveau 1
- **Recipients:** lamiaa.ityel@leoni.com, amina.rajouh@leoni.com
- **Content:** Sensibilisation sur terrain requise

### Level 5 (5 defects)  
- **Subject:** RE: Notification – Sensibilisation opérateur [Name] – 5 défauts internes_Escalation_Niveau 2
- **Recipients:** 8 email addresses (management team)
- **Content:** Orientation vers École de formation

### Level 7 (7 defects)
- **Subject:** RE: Notification – Sensibilisation opérateur [Name] – 7 défauts internes_Escalation_Niveau 3
- **Recipients:** lamiaa.ityel@leoni.com only
- **Content:** 2ème requalification + entretien PSM/HR

## Verification Checklist

- [ ] ✅ **feetyer53@gmail.com completely removed**
- [ ] ✅ **Level 3:** Correct recipients and message
- [ ] ✅ **Level 5:** Correct recipients and message  
- [ ] ✅ **Level 7:** Correct recipients and message
- [ ] ✅ **HTML formatting** working properly
- [ ] ✅ **French content** displaying correctly
- [ ] ✅ **Operator name** substitution working
- [ ] ✅ **No alert** when threshold not crossed
