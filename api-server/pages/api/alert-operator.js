const nodemailer = require('nodemailer');
const Cors = require('cors');

// Configuration CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://reworkqualityleonisystem.netlify.app',
      'https://qualityapp-v2.vercel.app',
      'https://zesty-paprenjak-741d94.netlify.app',
      'http://localhost:3000' // Pour le développement local
    ];
    
    // Autoriser les requêtes sans origine (comme Postman) en développement
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200 // Pour les anciens navigateurs
};

const cors = Cors(corsOptions);

// Helper pour exécuter le middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Create Gmail transporter with direct credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fatimzahraelhansali@gmail.com',
    pass: 'zovc fdrx wqsj ugsb'
  }
});

// Suppression de l'ancien middleware CORS personnalisé

/**
 * Get email configuration based on escalation level
 */
function getEmailConfigForLevel(level, operatorName) {
  // Define the recipients for all levels
  const recipients = 'mehdifadil2103@gmail.com, erradilatifa6@gmail.com';
  
  const configs = {
    3: {
      recipients: recipients,
      subject: `RE: Notification – Sensibilisation opérateur ${operatorName} – 3 défauts internes_Escalation_Niveau 1`,
      message: `
        Bonjour,<br><br>
        L'opérateur <strong>${operatorName}</strong> a atteint <strong>3 défauts internes</strong> aujourd'hui.<br><br>
        Conformément à notre procédure, une sensibilisation sur terrain est requise, incluant :<br>
        • Une reformation immédiate par le formateur ligne,<br>
        • Un entretien avec le Shift Leader, l'agent qualité, et le coordinateur formateur,<br>
        • La signature d'un engagement écrit par l'opérateur.<br><br>
        Merci de planifier cette action dans les plus brefs délais.<br><br>
        Cordialement,<br>
        <strong>Service qualité</strong>
      `
    },
    5: {
      recipients: recipients,
      subject: `RE: Notification – Sensibilisation opérateur ${operatorName} – 5 défauts internes_Escalation_Niveau 2`,
      message: `
        Bonjour,<br><br>
        L'opérateur <strong>${operatorName}</strong> a atteint <strong>5 défauts internes</strong> aujourd'hui.<br><br>
        Il doit être orienté vers l'École de formation pour une requalification, incluant :<br>
        • Un test de vigilance validé par l'agent qualité,<br>
        • Un entretien avec le responsable segment, le responsable qualité, et le coordinateur formateur,<br>
        • La signature d'un engagement écrit par l'opérateur.<br><br>
        Merci de coordonner cette requalification rapidement.<br><br>
        Cordialement,<br>
        <strong>Service qualité</strong>
      `
    },
    7: {
      recipients: recipients,
      subject: `RE: Notification – Sensibilisation opérateur ${operatorName} – 7 défauts internes_Escalation_Niveau 3`,
      message: `
        Bonjour,<br><br>
        L'opérateur <strong>${operatorName}</strong> a atteint <strong>7 défauts internes</strong> aujourd'hui.<br><br>
        Une 2ème requalification à l'École de formation est requise, accompagnée de :<br>
        • Un entretien avec le PSM, le Responsable Qualité Site, le Responsable Formation École, et le Head of HR,<br>
        • Une décision à prendre :<br>
        &nbsp;&nbsp;→ Si l'opérateur montre un engagement clair → 3ème chance accordée,<br>
        &nbsp;&nbsp;→ Sinon → réorientation ou fin de contrat.<br><br>
        Merci de traiter ce dossier avec attention et diligence.<br><br>
        Cordialement,<br>
        <strong>Service qualité</strong>
      `
    }
  };

  return configs[level] || configs[3]; // Default to level 3 if level not found
}

/**
 * Send escalation alert based on defect level
 */
async function sendEscalationAlert(operatorName, defectCount, level, defectType, alertTimestamp) {
  try {
    console.log(`📧 Sending Level ${level} escalation alert for operator: ${operatorName}`);

    // Get email configuration based on escalation level
    const emailConfig = getEmailConfigForLevel(level, operatorName);

    const mailOptions = {
      from: 'fatimzahraelhansali@gmail.com',
      to: emailConfig.recipients,
      subject: emailConfig.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #dc3545;">
              <h1 style="color: #dc3545; margin: 0; font-size: 24px;">⚠️ ESCALATION NIVEAU ${level}</h1>
              <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 14px;">Système de Gestion Qualité - Notification Automatique</p>
            </div>

            <!-- Alert Level Badge -->
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="background-color: ${level === 7 ? '#dc3545' : level === 5 ? '#fd7e14' : '#ffc107'}; 
                               color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 16px;">
                ${defectCount} Défauts Internes
              </span>
            </div>

            <!-- Main Content -->
            <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 25px;">
              ${emailConfig.message}
            </div>

            <!-- Operator Info -->
            <div style="background-color: #e9ecef; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #495057; width: 150px;">Opérateur:</td>
                  <td style="padding: 5px 0; color: #495057;">${operatorName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #495057;">Type de défaut:</td>
                  <td style="padding: 5px 0; color: #495057;">${defectType}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #495057;">Nombre de défauts:</td>
                  <td style="padding: 5px 0; color: #dc3545; font-weight: bold; font-size: 18px;">${defectCount}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #495057;">Niveau d'escalation:</td>
                  <td style="padding: 5px 0; color: #495057;">Niveau ${level}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #495057;">Date et heure:</td>
                  <td style="padding: 5px 0; color: #495057;">${alertTimestamp.toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })}</td>
                </tr>
              </table>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="font-size: 12px; color: #6c757d; margin: 0;">
                Notification automatique générée par le Système de Gestion Qualité<br>
                LEONI Wiring Systems - ${alertTimestamp.toLocaleDateString('fr-FR', { timeZone: 'Africa/Casablanca' })}
              </p>
            </div>

          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Level ${level} email sent successfully:`, result.messageId);
    console.log(`📧 Recipients: ${emailConfig.recipients}`);

    return result;
  } catch (error) {
    console.error(`❌ Error sending Level ${level} email:`, error);
    throw error;
  }
}

/**
 * API Route: /api/alert-operator
 * Method: POST
 * Purpose: Send email alert when operator exceeds defect threshold
 */
async function handler(req, res) {
  // Set CORS headers for the main request
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    console.log('🔍 Received alert request:', JSON.stringify(req.body, null, 2));

    // Extract data from request body with defaults
    const { 
      operateurNom, 
      nombreOccurrences = 0, 
      previousOccurrences = 0,
      operatorId,
      timestamp,
      defectType = 'Non spécifié'
    } = req.body;

    // Ensure we have valid numbers
    const currentCount = Number.isInteger(Number(nombreOccurrences)) ? Number(nombreOccurrences) : 0;
    const prevCount = Number.isInteger(Number(previousOccurrences)) ? Number(previousOccurrences) : 0;

    // Validate required fields
    if (!operateurNom) {
      return res.status(400).json({
        success: false,
        error: 'Le nom de l\'opérateur est requis (operateurNom)'
      });
    }

    // Ensure we have valid dates
    let alertTimestamp;
    try {
      alertTimestamp = timestamp ? new Date(timestamp) : new Date();
      if (isNaN(alertTimestamp.getTime())) {
        alertTimestamp = new Date();
      }
    } catch (e) {
      alertTimestamp = new Date();
    }

    console.log(`👤 Operator: ${operateurNom}`);
    console.log(`📊 Previous occurrences: ${previousOccurrences}`);
    console.log(`📊 Current occurrences: ${nombreOccurrences}`);

    // Check if alert should be sent based on defect thresholds
    let alertLevel = null;
    let emailResult = null;

    // Determine which threshold was crossed
    if (currentCount >= 7 && prevCount < 7) {
      alertLevel = 7;
    } else if (currentCount >= 5 && prevCount < 5) {
      alertLevel = 5;
    } else if (currentCount >= 3 && prevCount < 3) {
      alertLevel = 3;
    }

    if (alertLevel) {
      console.log(`🚨 ALERT TRIGGERED: ${operateurNom} reached ${currentCount} defects! (Level ${alertLevel} escalation)`);

      // Send email alert for the appropriate level
      emailResult = await sendEscalationAlert(operateurNom, currentCount, alertLevel, defectType, alertTimestamp);

      // Log success
      console.log(`✅ Level ${alertLevel} alert sent successfully for ${operateurNom} at ${alertTimestamp.toISOString()}`);

      return res.status(200).json({
        success: true,
        message: `Level ${alertLevel} escalation alert sent for operator ${operateurNom}`,
        emailId: emailResult.messageId,
        operator: operateurNom,
        defectCount: nombreOccurrences,
        escalationLevel: alertLevel,
        recipients: getEmailConfigForLevel(alertLevel, operateurNom).recipients,
        timestamp: alertTimestamp.toISOString()
      });

    } else {
      console.log(`✅ No alert needed. Occurrences: ${nombreOccurrences} (no threshold crossed)`);
      
      return res.status(200).json({
        success: true,
        message: 'No alert needed - no threshold crossed',
        operator: operateurNom,
        defectCount: currentCount,
        previousCount: prevCount,
        defectType: defectType,
        timestamp: alertTimestamp.toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error processing alert:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Exporter le handler avec le middleware CORS
module.exports = async (req, res) => {
  // Gérer les requêtes OPTIONS (prévol) directement
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Exécuter le middleware CORS pour les autres requêtes
  await runMiddleware(req, res, cors);
  
  // Gérer la requête
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Unhandled error in API route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
