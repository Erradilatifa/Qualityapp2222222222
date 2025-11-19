/**
 * Utility script to clean virtual/test data from Firebase
 * This removes all operators with unknown names or virtual test data
 */

import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * List of virtual/test operator names to remove
 */
const VIRTUAL_OPERATORS = [
  'Opérateur inconnu',
  'Ahmed M.',
  'Fatima Z.',
  'Youssef K.',
  'Salma B.',
  'Omar T.',
  'Nadia H.',
  'Karim L.',
  'Amina S.',
  'Hassan R.',
  'Leila F.',
  'Mohamed A.',
  'Zineb M.',
  'Test Operator',
  'Test User',
  'TEST',
  'test',
];

/**
 * List of virtual/test product references to remove
 */
const VIRTUAL_REFERENCES = [
  'TEST-001',
  'TEST',
  'test',
  'VIRTUAL',
  'MOCK',
];

/**
 * Clean all virtual data from Firebase
 */
export async function cleanAllVirtualData(): Promise<{
  success: boolean;
  deletedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let deletedCount = 0;

  try {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    console.log('🧹 Starting virtual data cleanup...');

    // Get all documents from operators collection
    const operatorsRef = collection(db, 'operators');
    const snapshot = await getDocs(operatorsRef);

    console.log(`📊 Found ${snapshot.size} total documents`);

    // Process each document
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      let shouldDelete = false;
      let reason = '';

      // Check if operator name is virtual/unknown
      if (data.operateurNom) {
        if (VIRTUAL_OPERATORS.includes(data.operateurNom)) {
          shouldDelete = true;
          reason = `Virtual operator: ${data.operateurNom}`;
        }
      } else {
        // No operator name - likely old/invalid data
        shouldDelete = true;
        reason = 'Missing operateurNom field';
      }

      // Check if product reference is virtual
      if (data.referenceProduit && VIRTUAL_REFERENCES.includes(data.referenceProduit)) {
        shouldDelete = true;
        reason = `Virtual reference: ${data.referenceProduit}`;
      }

      // Check if matricule is test data
      if (data.matricule && (data.matricule.toLowerCase().includes('test') || data.matricule === 'TEST123')) {
        shouldDelete = true;
        reason = `Test matricule: ${data.matricule}`;
      }

      // Delete if marked for deletion
      if (shouldDelete) {
        try {
          await deleteDoc(doc(db, 'operators', docId));
          deletedCount++;
          console.log(`✅ Deleted: ${docId} - ${reason}`);
        } catch (error) {
          const errorMsg = `Failed to delete ${docId}: ${error}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`✅ Deleted: ${deletedCount} documents`);
    console.log(`❌ Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      deletedCount,
      errors,
    };
  } catch (error) {
    const errorMsg = `Cleanup failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
    
    return {
      success: false,
      deletedCount,
      errors,
    };
  }
}

/**
 * Clean only documents with unknown operators
 */
export async function cleanUnknownOperators(): Promise<{
  success: boolean;
  deletedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let deletedCount = 0;

  try {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    console.log('🧹 Cleaning unknown operators...');

    const operatorsRef = collection(db, 'operators');
    const snapshot = await getDocs(operatorsRef);

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;

      // Check if operator is unknown or missing
      if (!data.operateurNom || data.operateurNom === 'Opérateur inconnu') {
        try {
          await deleteDoc(doc(db, 'operators', docId));
          deletedCount++;
          console.log(`✅ Deleted unknown operator: ${docId}`);
        } catch (error) {
          const errorMsg = `Failed to delete ${docId}: ${error}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }

    console.log(`\n✅ Deleted ${deletedCount} unknown operators`);

    return {
      success: errors.length === 0,
      deletedCount,
      errors,
    };
  } catch (error) {
    const errorMsg = `Cleanup failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
    
    return {
      success: false,
      deletedCount,
      errors,
    };
  }
}

/**
 * Get statistics about current data
 */
export async function getDataStatistics(): Promise<{
  total: number;
  withOperatorName: number;
  withoutOperatorName: number;
  virtualOperators: number;
  realOperators: number;
}> {
  try {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const operatorsRef = collection(db, 'operators');
    const snapshot = await getDocs(operatorsRef);

    let withOperatorName = 0;
    let withoutOperatorName = 0;
    let virtualOperators = 0;
    let realOperators = 0;

    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();

      if (data.operateurNom) {
        withOperatorName++;
        
        if (VIRTUAL_OPERATORS.includes(data.operateurNom)) {
          virtualOperators++;
        } else {
          realOperators++;
        }
      } else {
        withoutOperatorName++;
      }
    });

    const stats = {
      total: snapshot.size,
      withOperatorName,
      withoutOperatorName,
      virtualOperators,
      realOperators,
    };

    console.log('\n📊 Data Statistics:');
    console.log(`Total documents: ${stats.total}`);
    console.log(`With operator name: ${stats.withOperatorName}`);
    console.log(`Without operator name: ${stats.withoutOperatorName}`);
    console.log(`Virtual operators: ${stats.virtualOperators}`);
    console.log(`Real operators: ${stats.realOperators}`);

    return stats;
  } catch (error) {
    console.error('Failed to get statistics:', error);
    throw error;
  }
}
