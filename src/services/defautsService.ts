import { DatabaseService } from './database';
import { Operator } from '../types/Operator';

/**
 * Service for managing quality defects (défauts qualité)
 * This service extends the operators collection functionality
 * with specific methods for the Centre de Formation dashboard
 */
class DefautsQualiteService extends DatabaseService {
  constructor() {
    super('operators'); // Using the same collection as operators
  }

  /**
   * Get defects grouped by operator name
   * @param filters Optional filters for date range, category, etc.
   * @returns Array of defects with operator information
   */
  async getDefectsByOperator(filters?: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
    operatorName?: string;
  }): Promise<Operator[]> {
    try {
      const allDefects = await this.getAll() as Operator[];
      
      // Filter out unknown operators and virtual data
      let filteredDefects = allDefects.filter(defect => {
        // Exclude if no operator name
        if (!defect.operateurNom) return false;
        
        // Exclude if operator name is "Opérateur inconnu"
        if (defect.operateurNom === 'Opérateur inconnu') return false;
        
        // Exclude virtual/test operators
        const virtualOperators = [
          'Ahmed M.', 'Fatima Z.', 'Youssef K.', 'Salma B.', 'Omar T.',
          'Nadia H.', 'Karim L.', 'Amina S.', 'Hassan R.', 'Leila F.',
          'Mohamed A.', 'Zineb M.', 'Test Operator', 'Test User'
        ];
        if (virtualOperators.includes(defect.operateurNom)) return false;
        
        return true;
      });

      // Apply additional filters
      if (filters) {
        filteredDefects = filteredDefects.filter(defect => {
          // Filter by date range
          if (filters.startDate || filters.endDate) {
            const defectDate = defect.dateDetection instanceof Date 
              ? defect.dateDetection 
              : new Date(defect.dateDetection);
            
            if (filters.startDate && defectDate < filters.startDate) return false;
            if (filters.endDate && defectDate > filters.endDate) return false;
          }

          // Filter by category
          if (filters.category && defect.category !== filters.category) {
            return false;
          }

          // Filter by operator name
          if (filters.operatorName && defect.operateurNom !== filters.operatorName) {
            return false;
          }

          return true;
        });
      }

      return filteredDefects;
    } catch (error) {
      console.error('Error fetching defects by operator:', error);
      throw error;
    }
  }

  /**
   * Get aggregated statistics for the dashboard
   * Groups defects by operator and defect type
   */
  async getOperatorDefectStats(filters?: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
  }): Promise<{
    operatorName: string;
    defectType: string;
    defectCount: number;
    lastUpdated: Date;
    projet?: string;
  }[]> {
    try {
      const defects = await this.getDefectsByOperator(filters);
      
      // Group by operator and defect type
      const statsMap = new Map<string, {
        operatorName: string;
        defectType: string;
        defectCount: number;
        lastUpdated: Date;
        projet?: string;
      }>();

      defects.forEach(defect => {
        const operatorName = defect.operateurNom || 'Opérateur inconnu';
        const defectType = defect.natureDefaut || defect.category || 'Type inconnu';
        const key = `${operatorName}-${defectType}`;
        
        const occurrences = defect.nombreOccurrences || 1;
        const defectDate = defect.dateDetection instanceof Date 
          ? defect.dateDetection 
          : new Date(defect.dateDetection);

        if (statsMap.has(key)) {
          const existing = statsMap.get(key)!;
          existing.defectCount += occurrences;
          // Update to most recent date
          if (defectDate > existing.lastUpdated) {
            existing.lastUpdated = defectDate;
          }
        } else {
          statsMap.set(key, {
            operatorName,
            defectType,
            defectCount: occurrences,
            lastUpdated: defectDate,
            projet: defect.projet
          });
        }
      });

      return Array.from(statsMap.values());
    } catch (error) {
      console.error('Error calculating operator defect stats:', error);
      throw error;
    }
  }

  /**
   * Get unique operator names from defects
   */
  async getUniqueOperatorNames(): Promise<string[]> {
    try {
      const defects = await this.getAll() as Operator[];
      const names = new Set<string>();
      
      defects.forEach(defect => {
        if (defect.operateurNom) {
          names.add(defect.operateurNom);
        }
      });

      return Array.from(names).sort();
    } catch (error) {
      console.error('Error fetching unique operator names:', error);
      throw error;
    }
  }

  /**
   * Get unique defect types
   */
  async getUniqueDefectTypes(): Promise<string[]> {
    try {
      const defects = await this.getAll() as Operator[];
      const types = new Set<string>();
      
      defects.forEach(defect => {
        const defectType = defect.natureDefaut || defect.category;
        if (defectType) {
          types.add(defectType);
        }
      });

      return Array.from(types).sort();
    } catch (error) {
      console.error('Error fetching unique defect types:', error);
      throw error;
    }
  }

  /**
   * Check if an operator has reached alert thresholds
   * Returns the alert level (3, 5, or 7) or null if no alert
   */
  checkAlertThreshold(defectCount: number): 3 | 5 | 7 | null {
    if (defectCount >= 7) return 7;
    if (defectCount >= 5) return 5;
    if (defectCount >= 3) return 3;
    return null;
  }
}

// Export singleton instance
export const defautsQualiteService = new DefautsQualiteService();
