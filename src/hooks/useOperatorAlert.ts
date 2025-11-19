import { useEffect, useRef } from 'react';
import { operatorService } from '../services/database';

// Configuration
const API_SERVER_URL = 'http://localhost:3001'; // Change this to your deployed URL
const ALERT_ENDPOINT = '/api/alert-operator';

/**
 * Custom hook to monitor operator defects and send alerts
 * This hook watches for changes in operator data and triggers alerts
 */
export const useOperatorAlert = () => {
  const previousDataRef = useRef<Map<string, number>>(new Map());

  /**
   * Send alert to API server
   */
  const sendAlert = async (operatorData: {
    id?: string;
    operateurNom: string;
    nombreOccurrences: number;
    previousOccurrences?: number;
  }) => {
    try {
      console.log('📤 Sending alert to API server:', operatorData);

      const response = await fetch(`${API_SERVER_URL}${ALERT_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: operatorData.id,
          operateurNom: operatorData.operateurNom,
          nombreOccurrences: operatorData.nombreOccurrences,
          previousOccurrences: operatorData.previousOccurrences || 0,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Alert sent successfully:', result);
      } else {
        console.error('❌ Alert failed:', result);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending alert:', error);
      throw error;
    }
  };

  /**
   * Check if operator data has changed and trigger alert if needed
   */
  const checkOperatorChange = async (operatorData: {
    id?: string;
    operateurNom: string;
    nombreOccurrences: number;
  }) => {
    const operatorKey = operatorData.operateurNom;
    const currentOccurrences = operatorData.nombreOccurrences;
    const previousOccurrences = previousDataRef.current.get(operatorKey) || 0;

    // Update the reference with current data
    previousDataRef.current.set(operatorKey, currentOccurrences);

    // Check if alert should be triggered
    if (currentOccurrences > 3 && previousOccurrences <= 3) {
      console.log(`🚨 Threshold crossed for ${operatorKey}: ${previousOccurrences} → ${currentOccurrences}`);
      
      await sendAlert({
        ...operatorData,
        previousOccurrences,
      });
    }
  };

  /**
   * Monitor all operators for changes
   */
  const monitorOperators = async () => {
    try {
      const operators = await operatorService.getAll();
      
      for (const operator of operators) {
        if (operator.operateurNom && typeof operator.nombreOccurrences === 'number') {
          await checkOperatorChange({
            id: operator.id,
            operateurNom: operator.operateurNom,
            nombreOccurrences: operator.nombreOccurrences,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error monitoring operators:', error);
    }
  };

  /**
   * Manually trigger alert for specific operator
   */
  const triggerAlert = async (operatorData: {
    id?: string;
    operateurNom: string;
    nombreOccurrences: number;
  }) => {
    return await sendAlert({
      ...operatorData,
      previousOccurrences: 0, // Force alert
    });
  };

  return {
    sendAlert,
    checkOperatorChange,
    monitorOperators,
    triggerAlert,
  };
};

/**
 * Utility function to set up periodic monitoring
 */
export const setupOperatorMonitoring = (intervalMinutes: number = 5) => {
  const { monitorOperators } = useOperatorAlert();
  
  // Monitor immediately
  monitorOperators();
  
  // Set up periodic monitoring
  const interval = setInterval(() => {
    monitorOperators();
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => clearInterval(interval);
};
