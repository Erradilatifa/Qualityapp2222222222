import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { notificationService } from './notificationService';

// Generic interface for database items
export interface DatabaseItem {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

// Utility to remove undefined fields
function removeUndefinedFields(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

// Database service class
export class DatabaseService {
  private collectionName: string;
  private storageKey: string;
  // Removed: private isFirebaseConfigured: boolean;
  // Removed: private firestoreInstance: any;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.storageKey = `local_${collectionName}`;
  }

  // Create a new document
  async create(data: DatabaseItem): Promise<string> {
    let createdId: string;
    
    if (db) { // Directly check if db is available
      try {
        const docData = removeUndefinedFields({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('Trying Firebase create with data:', docData);
        const docRef = await addDoc(collection(db, this.collectionName), docData);
        console.log('Firebase create successful, ID:', docRef.id);
        createdId = docRef.id;
        
        // Mirror into local cache to keep consistency if reads fallback locally
        try {
          const localData = await this.getLocalData();
          localData.push({
            ...docData,
            id: docRef.id,
          });
          await AsyncStorage.setItem(this.storageKey, JSON.stringify(localData));
        } catch (e) {
          // Ignore local cache mirror errors
        }
      } catch (error) {
        console.error('Firebase create failed:', error);
        console.log('Falling back to local storage for create due to Firebase error.');
        // Continue to local storage logic below
        createdId = await this.createLocal(data);
      }
    } else {
      console.log('Firebase not configured, using local storage for create.');
      createdId = await this.createLocal(data);
    }
    
    // Create notification if this is an operator (defaut)
    if (this.collectionName === 'operators' && createdId) {
      try {
        await this.createDefautNotification(data, createdId);
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    }
    
    return createdId;
  }

  // Helper method for local storage creation
  private async createLocal(data: DatabaseItem): Promise<string> {
    const newTask = {
      ...data,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const existingData = await this.getLocalData();
    existingData.push(newTask);
    
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(existingData));
    console.log('Local data saved successfully, new ID:', newTask.id);
    
    return newTask.id!;
  }

  // Create notification for new defaut
  private async createDefautNotification(data: any, defautId: string): Promise<void> {
    try {
      if (data.matricule && data.nom && data.referenceProduit) {
        await notificationService.notifyDefautAdded({
          matricule: data.matricule,
          nom: data.nom,
          codeDefaut: data.codeDefaut,
          referenceProduit: data.referenceProduit,
          posteTravail: data.posteTravail || 'Non spécifié',
          dateDetection: data.dateDetection || new Date(),
          defautId: defautId,
          defautSnapshot: data
        });
        console.log('Notification created for new defaut:', defautId);
      }
    } catch (error) {
      console.error('Error creating defaut notification:', error);
    }
  }

  // Get all documents
  async getAll(): Promise<DatabaseItem[]> {
    if (db) { // Directly check if db is available
      try {
        const querySnapshot = await getDocs(collection(db, this.collectionName));
        const firebaseData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Firebase getAll successful, count:', firebaseData.length);
        return firebaseData;
      } catch (error) {
        console.error('Firebase getAll failed:', error);
        console.log('Falling back to local storage for getAll due to Firebase error.');
        // Fallback to local storage
      }
    } else {
      console.log('Firebase not configured, using local storage for getAll.');
    }
    const localData = await this.getLocalData();
    console.log('Local getAll successful, count:', localData.length);
    return localData;
  }

  // Get a single document by ID
  async getById(id: string): Promise<DatabaseItem | null> {
    if (db) { // Directly check if db is available
      try {
        const docRef = doc(db, this.collectionName, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...docSnap.data()
          };
        } else {
          return null;
        }
      } catch (error) {
        console.error('Firebase getById failed:', error);
        console.log('Falling back to local storage for getById due to Firebase error.');
        // Fallback to local storage
      }
    } else {
      console.log('Firebase not configured, using local storage for getById.');
    }
    const localData = await this.getLocalData();
    return localData.find(task => task.id === id) || null;
  }

  // Update a document
  async update(id: string, data: Partial<DatabaseItem>): Promise<void> {
    if (db) { // Directly check if db is available
      try {
        const docRef = doc(db, this.collectionName, id);
        const updateData = {
          ...data,
          updatedAt: new Date()
        };
        await updateDoc(docRef, updateData);
        console.log('Firebase update successful, ID:', id);
        // Mirror into local cache as well to keep consistency if reads fallback locally
        try {
          const localData = await this.getLocalData();
          const index = localData.findIndex(item => item.id === id);
          if (index !== -1) {
            localData[index] = {
              ...localData[index],
              ...updateData,
            };
          } else {
            // If not present, insert a merged version with id
            localData.push({ id, ...updateData } as DatabaseItem);
          }
          await AsyncStorage.setItem(this.storageKey, JSON.stringify(localData));
        } catch (e) {
          // Ignore local cache mirror errors
        }
        return;
      } catch (error) {
        console.error('Firebase update failed:', error);
        console.log('Falling back to local storage for update due to Firebase error.');
        // Fallback to local storage
      }
    } else {
      console.log('Firebase not configured, using local storage for update.');
    }
    const localData = await this.getLocalData();
    const taskIndex = localData.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      localData[taskIndex] = {
        ...localData[taskIndex],
        ...data,
        updatedAt: new Date()
      };
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(localData));
      console.log('Local data updated successfully, ID:', id);
    }
  }

  // Delete a document
  async delete(id: string): Promise<void> {
    if (db) { // Directly check if db is available
      try {
        const docRef = doc(db, this.collectionName, id);
        await deleteDoc(docRef);
        console.log('Firebase delete successful, ID:', id);
        // Also remove from local cache if present to keep consistency
        try {
          const localData = await this.getLocalData();
          const filteredData = localData.filter(task => task.id !== id);
          await AsyncStorage.setItem(this.storageKey, JSON.stringify(filteredData));
        } catch (e) {
          // ignore local cache errors
        }
        return;
      } catch (error) {
        console.error('Firebase delete failed:', error);
        console.log('Falling back to local storage for delete due to Firebase error.');
        // Fallback to local storage
      }
    } else {
      console.log('Firebase not configured, using local storage for delete.');
    }
    const localData = await this.getLocalData();
    const filteredData = localData.filter(task => task.id !== id);
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(filteredData));
    console.log('Local data deleted successfully, ID:', id);
  }

  // Query documents with filters
  async query(filters: { field: string; operator: any; value: any }[] = []): Promise<DatabaseItem[]> {
    if (db) { // Directly check if db is available
      try {
        const querySnapshot = await getDocs(collection(db, this.collectionName));
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Firebase query failed:', error);
        console.log('Falling back to local storage for query due to Firebase error.');
        // Fallback to local storage
      }
    } else {
      console.log('Firebase not configured, using local storage for query.');
    }
    return await this.getLocalData();
  }

  // Get local data from AsyncStorage
  private async getLocalData(): Promise<DatabaseItem[]> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Convert date strings back to Date objects
        return data.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          dateDetection: item.dateDetection ? new Date(item.dateDetection) : undefined
        }));
      }
      return [];
    } catch (error) {
      console.log('Error reading local data:', error);
      return [];
    }
  }

  // Méthode pour enregistrer une connexion utilisateur
  async logUserConnection(matricule: string): Promise<void> {
    if (db) { // Directly check if db is available
      try {
        const connectionData = {
          matricule,
          timestamp: new Date(),
          date: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
        };
        
        await addDoc(collection(db, 'user_connections'), connectionData);
        console.log('User connection logged successfully via Firebase.');
        return;
      } catch (error) {
        console.error('Firebase logUserConnection failed:', error);
        console.log('Falling back to local storage for logUserConnection due to Firebase error.');
        // Fallback to local storage if Firebase failed
      }
    } else {
      console.log('Firebase not configured, using local storage for logUserConnection.');
    }
    // Local storage fallback logic
    const connections = await this.getStoredConnections();
    connections.push({
      matricule,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    });
    await AsyncStorage.setItem('user_connections', JSON.stringify(connections));
    console.log('User connection logged successfully via local storage.');
  }

  // Méthode pour obtenir les agents connectés aujourd'hui
  async getActiveUsersToday(): Promise<string[]> {
    if (db) { // Directly check if db is available
      try {
        const today = new Date().toISOString().split('T')[0];
        const connectionsRef = collection(db, 'user_connections');
        const q = query(
          connectionsRef,
          where('date', '==', today)
        );
        
        const querySnapshot = await getDocs(q);
        const activeUsers = new Set<string>();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.matricule) {
            activeUsers.add(data.matricule);
          }
        });
        
        return Array.from(activeUsers);
      } catch (error) {
        console.error('Firebase getActiveUsersToday failed:', error);
        console.log('Falling back to local storage for getActiveUsersToday due to Firebase error.');
        // Fallback to local storage
      }
    } else {
      console.log('Firebase not configured, using local storage for getActiveUsersToday.');
    }
    // Local storage fallback logic
    const connections = await this.getStoredConnections();
    const today = new Date().toISOString().split('T')[0];
    const todayConnections = connections.filter(conn => conn.date === today);
    const activeUsers = new Set(todayConnections.map(conn => conn.matricule));
    return Array.from(activeUsers);
  }

  // Méthode helper pour récupérer les connexions stockées
  private async getStoredConnections(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('user_connections');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting stored connections:', error);
      return [];
    }
  }
}

// Example usage for different collections
export const userService = new DatabaseService('users');
export const taskService = new DatabaseService('tasks');
export const noteService = new DatabaseService('notes');
export const operatorService = new DatabaseService('operators'); 