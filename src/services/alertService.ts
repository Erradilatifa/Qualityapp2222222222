import { operatorService } from './database';

// Configuration - Update these URLs for production
const API_SERVER_URL = process.env.NODE_ENV === 'production' 
  ? 'https://reworkqualityleonisystem.netlify.app'
  : 'http://localhost:3001';
const ALERT_ENDPOINT = '/api/alert-operator';

/**
 * Service for handling operator alerts via API server
 */
export class AlertService {
  private static instance: AlertService;
  private previousData: Map<string, number> = new Map();

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * Send alert to API server
   */
  async sendAlert(operatorData: {
    id?: string;
    operateurNom: string;
    nombreOccurrences: number;
    previousOccurrences?: number;
  }): Promise<any> {
    try {
      console.log('📤 Sending alert to API server:', operatorData);

      const response = await fetch(`${API_SERVER_URL}${ALERT_ENDPOINT}`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          operatorId: operatorData.id,
          operateurNom: operatorData.operateurNom,
          nombreOccurrences: operatorData.nombreOccurrences,
          previousOccurrences: operatorData.previousOccurrences || 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Alert sent successfully:', result.message);
      } else {
        console.error('❌ Alert failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending alert:', error);
      throw error;
    }
  }

  /**
   * Monitor operator and send alert if threshold is crossed
   */
  async monitorOperator(operatorData: {
    id?: string;
    operateurNom: string;
    nombreOccurrences: number;
  }): Promise<void> {
    const operatorKey = operatorData.operateurNom;
    const currentOccurrences = operatorData.nombreOccurrences;
    const previousOccurrences = this.previousData.get(operatorKey) || 0;

    console.log(`🔍 Monitoring ${operatorKey}: ${previousOccurrences} → ${currentOccurrences}`);

    // Update tracking data
    this.previousData.set(operatorKey, currentOccurrences);

    // Check if alert should be triggered (threshold crossed from <=3 to >3)
    if (currentOccurrences > 3 && previousOccurrences <= 3) {
      console.log(`🚨 THRESHOLD CROSSED: ${operatorKey} exceeded 3 defects!`);
      
      await this.sendAlert({
        ...operatorData,
        previousOccurrences,
      });
    }
  }

  /**
   * Monitor all operators for changes
   */
  async monitorAllOperators(): Promise<void> {
    try {
      console.log('🔍 Monitoring all operators...');
      
      const operators = await operatorService.getAll();
      
      for (const operator of operators) {
        if (operator.operateurNom && typeof operator.nombreOccurrences === 'number') {
          await this.monitorOperator({
            id: operator.id,
            operateurNom: operator.operateurNom,
            nombreOccurrences: operator.nombreOccurrences,
          });
        }
      }
      
      console.log(`✅ Monitored ${operators.length} operators`);
    } catch (error) {
      console.error('❌ Error monitoring operators:', error);
      throw error;
    }
  }

  /**
   * Force send alert (for testing)
   */
  async forceAlert(operatorData: {
    id?: string;
    operateurNom: string;
    nombreOccurrences: number;
  }): Promise<any> {
    return await this.sendAlert({
      ...operatorData,
      previousOccurrences: 0, // Force alert by setting previous to 0
    });
  }

  /**
   * Get current tracking data (for debugging)
   */
  getTrackingData(): Map<string, number> {
    return new Map(this.previousData);
  }

  /**
   * Clear tracking data
   */
  clearTrackingData(): void {
    this.previousData.clear();
    console.log('🗑️ Tracking data cleared');
  }
}

// Export singleton instance
export const alertService = AlertService.getInstance();
