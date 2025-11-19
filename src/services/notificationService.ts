import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Notification {
  id?: string;
  type: 'defaut_ajoute' | 'defaut_modifie' | 'defaut_supprime' | 'system' | 'alerte' | 'info';
  title: string;
  message: string;
  matricule?: string;
  nom?: string;
  codeDefaut?: string;
  referenceProduit?: string;
  posteTravail?: string;
  dateDetection?: Date; // Date de détection du défaut
  timestamp: Date; // Date de création de la notification
  read: boolean;
  action?: 'view_defaut' | 'edit_defaut' | 'delete_defaut' | 'none';
  actionData?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'qualite' | 'system' | 'maintenance' | 'securite';
  icon?: string;
  color?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    defaut_ajoute: number;
    defaut_modifie: number;
    defaut_supprime: number;
    system: number;
    alerte: number;
    info: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

function removeUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value as any;
  if (value === null) return value as any;
  if (value instanceof Date) return value as any;
  if (Array.isArray(value)) {
    return value
      .map(v => removeUndefinedDeep(v))
      .filter(v => v !== undefined) as any;
  }
  if (typeof value === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      const cleaned = removeUndefinedDeep(v as any);
      if (cleaned !== undefined) result[k] = cleaned;
    }
    return result;
  }
  return value;
}

class NotificationService {
  private collectionName = 'notifications';
  private storageKey = 'local_notifications';

  constructor() {}

  // Créer une nouvelle notification
  async createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> {
    const newNotification: Notification = {
      ...notification,
      timestamp: new Date(),
      read: false,
    };

    const cleaned = removeUndefinedDeep(newNotification);
    return await this.createNotificationRecord(cleaned);
  }

  // Create notification record in database
  private async createNotificationRecord(data: Notification): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, this.collectionName), {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return docRef.id;
      } catch (error) {
        console.error('Firebase create failed:', error);
      }
    }
    
    // Fallback to local storage
    const localData = await this.getLocalData();
    const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localData.push({ ...data, id: newId });
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(localData));
    return newId;
  }

  // Get local data from AsyncStorage
  private async getLocalData(): Promise<Notification[]> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return data.map((item: any) => ({
          ...item,
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
          dateDetection: item.dateDetection ? new Date(item.dateDetection) : undefined
        }));
      }
      return [];
    } catch (error) {
      console.log('Error reading local data:', error);
      return [];
    }
  }

  // Get all notifications
  private async getAllNotificationsFromDB(): Promise<Notification[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, this.collectionName));
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
      } catch (error) {
        console.error('Firebase getAll failed:', error);
      }
    }
    return await this.getLocalData();
  }

  // Obtenir toutes les notifications
  async getAllNotifications(): Promise<Notification[]> {
    const notifications = await this.getAllNotificationsFromDB();
    const safeToDate = (value: any) => {
      try {
        if (!value) return new Date(0);
        if (value instanceof Date) return value;
        if (typeof value === 'object' && typeof (value as any).toDate === 'function') return (value as any).toDate();
        if (typeof value === 'string' || typeof value === 'number') {
          const d = new Date(value);
          return isNaN(d.getTime()) ? new Date(0) : d;
        }
        return new Date(0);
      } catch {
        return new Date(0);
      }
    };

    return (notifications as Notification[]).sort((a, b) => {
      const dateA = safeToDate(a.dateDetection ?? a.timestamp);
      const dateB = safeToDate(b.dateDetection ?? b.timestamp);
      return dateB.getTime() - dateA.getTime(); // Plus récent d'abord selon date de détection
    });
  }

  // Obtenir les notifications non lues
  async getUnreadNotifications(): Promise<Notification[]> {
    const allNotifications = await this.getAllNotifications();
    return allNotifications.filter(notification => !notification.read);
  }

  // Marquer une notification comme lue
  async markAsRead(notificationId: string): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, this.collectionName, notificationId);
        await updateDoc(docRef, { read: true, updatedAt: new Date() });
        return;
      } catch (error) {
        console.error('Firebase update failed:', error);
      }
    }
    
    // Fallback to local storage
    const localData = await this.getLocalData();
    const index = localData.findIndex(item => item.id === notificationId);
    if (index !== -1) {
      localData[index].read = true;
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(localData));
    }
  }

  // Marquer toutes les notifications comme lues
  async markAllAsRead(): Promise<void> {
    const unreadNotifications = await this.getUnreadNotifications();
    for (const notification of unreadNotifications) {
      if (notification.id) {
        await this.markAsRead(notification.id);
      }
    }
  }

  // Supprimer une notification
  async deleteNotification(notificationId: string): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, this.collectionName, notificationId);
        await deleteDoc(docRef);
        return;
      } catch (error) {
        console.error('Firebase delete failed:', error);
      }
    }
    
    // Fallback to local storage
    const localData = await this.getLocalData();
    const filteredData = localData.filter(item => item.id !== notificationId);
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(filteredData));
  }

  // Supprimer toutes les notifications
  async deleteAllNotifications(): Promise<void> {
    const allNotifications = await this.getAllNotifications();
    for (const notification of allNotifications) {
      if (notification.id) {
        await this.deleteNotification(notification.id);
      }
    }
  }

  // Supprimer les notifications lues
  async deleteReadNotifications(): Promise<void> {
    const allNotifications = await this.getAllNotifications();
    for (const notification of allNotifications) {
      if (notification.read && notification.id) {
        await this.deleteNotification(notification.id);
      }
    }
  }

  // Obtenir les statistiques des notifications
  async getNotificationStats(): Promise<NotificationStats> {
    const allNotifications = await this.getAllNotifications();
    
    const stats: NotificationStats = {
      total: allNotifications.length,
      unread: allNotifications.filter(n => !n.read).length,
      byType: {
        defaut_ajoute: 0,
        defaut_modifie: 0,
        defaut_supprime: 0,
        system: 0,
        alerte: 0,
        info: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
    };

    allNotifications.forEach(notification => {
      stats.byType[notification.type]++;
      stats.byPriority[notification.priority]++;
    });

    return stats;
  }

  // Filtrer les notifications par type
  async getNotificationsByType(type: Notification['type']): Promise<Notification[]> {
    const allNotifications = await this.getAllNotifications();
    return allNotifications.filter(notification => notification.type === type);
  }

  // Filtrer les notifications par priorité
  async getNotificationsByPriority(priority: Notification['priority']): Promise<Notification[]> {
    const allNotifications = await this.getAllNotifications();
    return allNotifications.filter(notification => notification.priority === priority);
  }

  // Filtrer les notifications par catégorie
  async getNotificationsByCategory(category: Notification['category']): Promise<Notification[]> {
    const allNotifications = await this.getAllNotifications();
    return allNotifications.filter(notification => notification.category === category);
  }

  // Rechercher dans les notifications
  async searchNotifications(searchTerm: string): Promise<Notification[]> {
    const allNotifications = await this.getAllNotifications();
    const term = searchTerm.toLowerCase();
    
    return allNotifications.filter(notification => 
      notification.title.toLowerCase().includes(term) ||
      notification.message.toLowerCase().includes(term) ||
      notification.nom?.toLowerCase().includes(term) ||
      notification.matricule?.toLowerCase().includes(term) ||
      notification.codeDefaut?.toLowerCase().includes(term) ||
      notification.referenceProduit?.toLowerCase().includes(term) ||
      notification.posteTravail?.toLowerCase().includes(term)
    );
  }

  // Notifications spécifiques pour les défauts

  // Notification d'ajout de défaut
  async notifyDefautAdded(defautData: {
    matricule: string;
    nom: string;
    codeDefaut?: string;
    referenceProduit: string;
    posteTravail: string;
    dateDetection?: Date;
    defautId: string; // Add defautId
    defautSnapshot?: any; // Optional snapshot to allow viewing if deleted later
  }): Promise<string> {
    return await this.createNotification(removeUndefinedDeep({
      type: 'defaut_ajoute',
      title: 'Nouveau défaut détecté',
      message: `L'agent ${defautData.nom} (${defautData.matricule}) a détecté un défaut sur le produit ${defautData.referenceProduit} au poste ${defautData.posteTravail}`,
      matricule: defautData.matricule,
      nom: defautData.nom,
      codeDefaut: defautData.codeDefaut,
      referenceProduit: defautData.referenceProduit,
      posteTravail: defautData.posteTravail,
      dateDetection: defautData.dateDetection || new Date(),
      priority: 'high',
      category: 'qualite',
      action: 'view_defaut',
      actionData: { defautId: defautData.defautId, defautSnapshot: defautData.defautSnapshot },
      icon: 'alert-triangle',
      color: '#FF6700',
    }));
  }

  // Notification de modification de défaut
  async notifyDefautModified(defautData: {
    matricule: string;
    nom: string;
    codeDefaut?: string;
    referenceProduit: string;
    posteTravail: string;
    defautId: string;
    dateDetection?: Date;
    defautSnapshot?: any; // Optional snapshot at modification time
  }): Promise<string> {
    return await this.createNotification(removeUndefinedDeep({
      type: 'defaut_modifie',
      title: 'Défaut modifié',
      message: `Le défaut ${defautData.codeDefaut || 'sans code'} sur ${defautData.referenceProduit} a été modifié par ${defautData.nom}`,
      matricule: defautData.matricule,
      nom: defautData.nom,
      codeDefaut: defautData.codeDefaut,
      referenceProduit: defautData.referenceProduit,
      posteTravail: defautData.posteTravail,
      dateDetection: defautData.dateDetection || new Date(),
      priority: 'medium',
      category: 'qualite',
      action: 'view_defaut',
      actionData: { defautId: defautData.defautId, defautSnapshot: defautData.defautSnapshot },
      icon: 'edit',
      color: '#3498DB',
    }));
  }

  // Notification de suppression de défaut
  async notifyDefautDeleted(defautData: {
    matricule: string;
    nom: string;
    codeDefaut?: string;
    referenceProduit: string;
    posteTravail: string;
    dateDetection?: Date;
  }): Promise<string> {
    return await this.createNotification({
      type: 'defaut_supprime',
      title: 'Défaut supprimé',
      message: `Le défaut ${defautData.codeDefaut || 'sans code'} sur ${defautData.referenceProduit} a été supprimé par ${defautData.nom}`,
      matricule: defautData.matricule,
      nom: defautData.nom,
      codeDefaut: defautData.codeDefaut,
      referenceProduit: defautData.referenceProduit,
      posteTravail: defautData.posteTravail,
      dateDetection: defautData.dateDetection || new Date(),
      priority: 'medium',
      category: 'qualite',
      action: 'none',
      icon: 'trash-2',
      color: '#E74C3C',
    });
  }

  // Notifications système
  async notifySystem(message: string, priority: Notification['priority'] = 'medium'): Promise<string> {
    return await this.createNotification({
      type: 'system',
      title: 'Notification système',
      message,
      priority,
      category: 'system',
      action: 'none',
      icon: 'settings',
      color: '#95A5A6',
    });
  }

  // Notifications d'alerte
  async notifyAlert(title: string, message: string, priority: Notification['priority'] = 'high'): Promise<string> {
    return await this.createNotification({
      type: 'alerte',
      title,
      message,
      priority,
      category: 'securite',
      action: 'none',
      icon: 'alert-circle',
      color: '#F39C12',
    });
  }

  // Notifications d'information
  async notifyInfo(title: string, message: string): Promise<string> {
    return await this.createNotification({
      type: 'info',
      title,
      message,
      priority: 'low',
      category: 'system',
      action: 'none',
      icon: 'info',
      color: '#3498DB',
    });
  }

  // Notifications de maintenance
  async notifyMaintenance(title: string, message: string): Promise<string> {
    return await this.createNotification({
      type: 'system',
      title,
      message,
      priority: 'medium',
      category: 'maintenance',
      action: 'none',
      icon: 'tool',
      color: '#9B59B6',
    });
  }

  // Obtenir les notifications récentes (dernières 24h)
  async getRecentNotifications(): Promise<Notification[]> {
    const allNotifications = await this.getAllNotifications();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return allNotifications.filter(notification => {
      const date = notification.timestamp instanceof Date ? notification.timestamp : new Date(notification.timestamp);
      return date >= yesterday;
    });
  }

  // Obtenir les notifications urgentes
  async getUrgentNotifications(): Promise<Notification[]> {
    const allNotifications = await this.getAllNotifications();
    return allNotifications.filter(notification => notification.priority === 'urgent');
  }

  // Compter les notifications non lues par type
  async getUnreadCountByType(): Promise<{ [key in Notification['type']]: number }> {
    const unreadNotifications = await this.getUnreadNotifications();
    const counts = {
      defaut_ajoute: 0,
      defaut_modifie: 0,
      defaut_supprime: 0,
      system: 0,
      alerte: 0,
      info: 0,
    };

    unreadNotifications.forEach(notification => {
      counts[notification.type]++;
    });

    return counts;
  }

  // Exporter les notifications (pour sauvegarde)
  async exportNotifications(): Promise<Notification[]> {
    return await this.getAllNotifications();
  }

  // Importer des notifications (pour restauration)
  async importNotifications(notifications: Notification[]): Promise<void> {
    for (const notification of notifications) {
      await this.createNotification(notification);
    }
  }
}

export const notificationService = new NotificationService(); 