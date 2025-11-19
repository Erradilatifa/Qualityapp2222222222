import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotificationBadge } from '../context/NotificationBadgeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { notificationService, Notification, NotificationStats } from '../services/notificationService';
import { operatorService } from '../services/database';
import { Operator } from '../types/Operator';
import { useFocusEffect } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'urgent' | 'recent'>('all');
  const [selectedType, setSelectedType] = useState<Notification['type'] | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDefautDetails, setShowDefautDetails] = useState(false);
  const [selectedDefaut, setSelectedDefaut] = useState<Operator | null>(null);
  const [loadingDefaut, setLoadingDefaut] = useState(false);
  const { theme } = useTheme();

  // Charger les notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [allNotifications, notificationStats] = await Promise.all([
        notificationService.getAllNotifications(),
        notificationService.getNotificationStats(),
      ]);
      setNotifications(allNotifications);
      setStats(notificationStats);
      applyFilters(allNotifications, selectedFilter, selectedType, searchTerm);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  // Appliquer les filtres
  const applyFilters = useCallback((
    notifs: Notification[],
    filter: typeof selectedFilter,
    type: typeof selectedType,
    search: string
  ) => {
    let filtered = [...notifs];

    // Filtre par statut
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'urgent':
        filtered = filtered.filter(n => n.priority === 'urgent');
        break;
      case 'recent':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(n => {
          const date = n.timestamp instanceof Date ? n.timestamp : new Date(n.timestamp);
          return date >= yesterday;
        });
        break;
    }

    // Filtre par type
    if (type !== 'all') {
      filtered = filtered.filter(n => n.type === type);
    }

    // Recherche
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term) ||
        n.nom?.toLowerCase().includes(term) ||
        n.matricule?.toLowerCase().includes(term) ||
        n.codeDefaut?.toLowerCase().includes(term) ||
        n.referenceProduit?.toLowerCase().includes(term)
      );
    }

    // Tri final par date de détection (plus récent en premier)
    filtered.sort((a, b) => {
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

      const dateA = a.dateDetection ? safeToDate(a.dateDetection) : safeToDate(a.timestamp);
      const dateB = b.dateDetection ? safeToDate(b.dateDetection) : safeToDate(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredNotifications(filtered);
  }, []);

  // Mettre à jour les filtres
  useEffect(() => {
    applyFilters(notifications, selectedFilter, selectedType, searchTerm);
  }, [notifications, selectedFilter, selectedType, searchTerm, applyFilters]);

  const { 
    markAsRead: markAsReadContext, 
    markAllAsRead: markAllAsReadContext,
    autoMarkAsReadOnEntry,
    setAutoMarkAsReadOnEntry
  } = useNotificationBadge();

  // Charger au montage et au focus
  useEffect(() => {
      loadNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      // Marquer automatiquement toutes les notifications comme lues si l'option est activée
      if (autoMarkAsReadOnEntry) {
        markAllAsReadOnEntry();
      }
    }, [autoMarkAsReadOnEntry])
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  // Marquer comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      await markAsReadContext(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Erreur lors du marquage comme lue:', error);
    }
  };

  // Marquer toutes les notifications comme lues quand l'utilisateur entre dans la liste
  const markAllAsReadOnEntry = async () => {
    try {
      await markAllAsReadContext();
      await loadNotifications();
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  // Charger les détails du défaut
  const loadDefautDetails = async (notification: Notification) => {
    if (!notification.matricule || !notification.nom || !notification.referenceProduit) {
      Alert.alert('Erreur', 'Informations insuffisantes pour charger les détails du défaut');
      return;
    }

    try {
      setLoadingDefaut(true);
      setShowDefautDetails(true);

      let matchingDefaut: Operator | undefined;

      // Prioritize searching by defautId if available
      if (notification.actionData && notification.actionData.defautId) {
        const fetchedDefaut = await operatorService.getById(notification.actionData.defautId);
        if (fetchedDefaut) {
          matchingDefaut = fetchedDefaut as Operator;
        }
      } 
      
      // Fallback to searching by matricule, nom, and referenceProduit if defautId is not available or doesn't yield a result
      if (!matchingDefaut) {
        const allOperators = await operatorService.getAll();
        matchingDefaut = (allOperators as Operator[]).find((op: Operator) => 
          op.matricule === notification.matricule &&
          op.nom === notification.nom &&
          op.referenceProduit === notification.referenceProduit &&
          op.codeDefaut === notification.codeDefaut
        );
      }

      if (matchingDefaut) {
        setSelectedDefaut(matchingDefaut);
        // Marquer la notification comme lue
        if (notification.id) {
          await markAsRead(notification.id);
        }
      } else {
        // Try fallback: use snapshot embedded in notification
        const snapshot = notification.actionData && (notification.actionData as any).defautSnapshot;
        if (snapshot) {
          setSelectedDefaut(snapshot as any);
          if (notification.id) {
            await markAsRead(notification.id);
          }
        } else {
          Alert.alert('Information', 'Défaut non trouvé. Il a peut-être été supprimé.');
          setShowDefautDetails(false);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du défaut');
      setShowDefautDetails(false);
    } finally {
      setLoadingDefaut(false);
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    Alert.alert(
      'Marquer toutes comme lues',
      'Voulez-vous marquer toutes les notifications comme lues ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await markAllAsReadContext();
              await loadNotifications();
            } catch (error) {
              console.error('Erreur lors du marquage:', error);
            }
          },
        },
      ]
    );
  };

  // Supprimer une notification
  const deleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Supprimer la notification',
      'Voulez-vous supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await notificationService.deleteNotification(notificationId);
              await loadNotifications();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          },
        },
      ]
    );
  };

  // Supprimer toutes les notifications
  const deleteAllNotifications = async () => {
    Alert.alert(
      'Supprimer toutes les notifications',
      'Voulez-vous supprimer toutes les notifications ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteAllNotifications();
              await loadNotifications();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          },
        },
      ]
    );
  };

  // Obtenir l'icône et la couleur selon le type
  const getNotificationIcon = (notification: Notification) => {
    const iconMap: { [key in Notification['type']]: string } = {
      defaut_ajoute: 'alert-triangle',
      defaut_modifie: 'edit',
      defaut_supprime: 'trash-2',
      system: 'settings',
      alerte: 'alert-circle',
      info: 'info',
    };
    return notification.icon || iconMap[notification.type];
  };

  const getNotificationColor = (notification: Notification) => {
    return notification.color || '#3498DB';
  };

  // Formater la date avec indicateur de recence
  const formatDate = (date: Date) => {
    try {
      if (!date) return 'Date inconnue';
      
      let dateObj: Date;
      
      if (date instanceof Date) {
        dateObj = date;
      } else if (date && typeof date === 'object' && (date as any).toDate) {
        // Firebase Timestamp
        dateObj = (date as any).toDate();
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        console.log('Format de date non reconnu:', date);
        return 'Date invalide';
      }
      
      // Vérifier si la date est valide
      if (isNaN(dateObj.getTime())) {
        console.log('Date invalide:', date);
        return 'Date invalide';
      }
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);
      
      // Format relatif pour les notifications récentes
      if (diffInMinutes < 1) {
        return 'À l\'instant';
      } else if (diffInMinutes < 60) {
        return `Il y a ${diffInMinutes} min`;
      } else if (diffInHours < 24) {
        return `Il y a ${diffInHours}h`;
      } else if (diffInDays < 7) {
        return `Il y a ${diffInDays}j`;
      } else {
        // Format complet pour les notifications plus anciennes
        return dateObj.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (error) {
      console.log('Erreur lors du formatage de la date:', error, 'Date originale:', date);
      return 'Erreur date';
    }
  };

  // Vérifier si une notification est récente (moins de 24h)
  const isRecent = (date: Date) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
      return diffInHours < 24;
    } catch {
      return false;
    }
  };

  // Vérifier si une notification est très récente (moins de 1h)
  const isVeryRecent = (date: Date) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diffInMinutes = (now.getTime() - dateObj.getTime()) / (1000 * 60);
      return diffInMinutes < 60;
    } catch {
      return false;
    }
  };

  // Rendu d'une notification
  const renderNotification = ({ item }: { item: Notification }) => {
    const notificationDate = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
    const isNotificationRecent = isRecent(notificationDate);
    const isNotificationVeryRecent = isVeryRecent(notificationDate);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { 
            backgroundColor: item.read ? theme.surface : theme.surfaceSecondary,
            borderLeftColor: getNotificationColor(item),
            // Indicateur visuel pour les notifications récentes
            borderWidth: isNotificationRecent ? 2 : 1,
            borderColor: isNotificationRecent ? theme.primary : theme.border,
          },
        ]}
        onPress={() => {
          if (item.type === 'defaut_ajoute' || item.type === 'defaut_modifie') {
            loadDefautDetails(item);
          } else {
            markAsRead(item.id!);
          }
        }}
        onLongPress={() => deleteNotification(item.id!)}
      >
        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item) }]}>
            <Feather name={getNotificationIcon(item) as any} size={16} color="white" />
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationTitleRow}>
              <Text style={[styles.notificationTitle, { color: theme.textPrimary }]}>
                {item.title}
              </Text>
              {/* Indicateur de recence */}
              {isNotificationVeryRecent && (
                <View style={[styles.recentBadge, { backgroundColor: '#2ECC71' }]}>
                  <Text style={styles.recentText}>NOUVEAU</Text>
                </View>
              )}
              {isNotificationRecent && !isNotificationVeryRecent && (
                <View style={[styles.recentBadge, { backgroundColor: '#F39C12' }]}>
                  <Text style={styles.recentText}>RÉCENT</Text>
                </View>
              )}
            </View>
            <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>
              {item.message}
            </Text>
            <View style={styles.notificationMeta}>
              <View style={styles.notificationTimeContainer}>
                <Feather 
                  name="clock" 
                  size={12} 
                  color={isNotificationRecent ? theme.primary : theme.textTertiary} 
                />
                <Text style={[
                  styles.notificationTime, 
                  { 
                    color: isNotificationRecent ? theme.primary : theme.textTertiary,
                    fontWeight: isNotificationRecent ? '600' : '400'
                  }
                ]}>
                  {item.dateDetection 
                    ? `Détecté ${formatDate(item.dateDetection)}`
                    : formatDate(notificationDate)
                  }
                </Text>
              </View>
              <View style={styles.notificationBadges}>
                {item.priority === 'urgent' && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
                {item.priority === 'high' && (
                  <View style={[styles.priorityBadge, { backgroundColor: '#E74C3C' }]}>
                    <Text style={styles.priorityText}>HAUTE</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.notificationIndicators}>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
            {isNotificationRecent && (
              <View style={[styles.recentIndicator, { backgroundColor: theme.primary }]} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Rendu des statistiques
  const renderStats = () => (
    <Modal
      visible={showStats}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowStats(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Statistiques des notifications
            </Text>
            <TouchableOpacity onPress={() => setShowStats(false)}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            {stats && (
              <View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.textPrimary }]}>Total</Text>
                  <Text style={[styles.statValue, { color: theme.primary }]}>{stats.total}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.textPrimary }]}>Non lues</Text>
                  <Text style={[styles.statValue, { color: '#E74C3C' }]}>{stats.unread}</Text>
                </View>
                
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Par type</Text>
                {Object.entries(stats.byType).map(([type, count]) => (
                  <View key={type} style={styles.statRow}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      {type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>{count}</Text>
                  </View>
                ))}
                
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Par priorité</Text>
                {Object.entries(stats.byPriority).map(([priority, count]) => (
                  <View key={priority} style={styles.statRow}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      {priority.toUpperCase()}
                    </Text>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>{count}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Rendu des filtres
  const renderFilters = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Filtres
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Statut</Text>
            {(['all', 'unread', 'urgent', 'recent'] as const).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterOption,
                  selectedFilter === filter && { backgroundColor: theme.primary },
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: selectedFilter === filter ? 'white' : theme.textPrimary }
                ]}>
                  {filter === 'all' ? 'Toutes' :
                   filter === 'unread' ? 'Non lues' :
                   filter === 'urgent' ? 'Urgentes' : 'Récentes'}
                </Text>
              </TouchableOpacity>
            ))}
            
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Type</Text>
            {(['all', 'defaut_ajoute', 'defaut_modifie', 'defaut_supprime', 'system', 'alerte', 'info'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterOption,
                  selectedType === type && { backgroundColor: theme.primary },
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: selectedType === type ? 'white' : theme.textPrimary }
                ]}>
                  {type === 'all' ? 'Tous les types' :
                   type === 'defaut_ajoute' ? 'Défauts ajoutés' :
                   type === 'defaut_modifie' ? 'Défauts modifiés' :
                   type === 'defaut_supprime' ? 'Défauts supprimés' :
                   type === 'system' ? 'Système' :
                   type === 'alerte' ? 'Alertes' : 'Informations'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Calculer les statistiques des notifications récentes
  const getRecentNotificationsCount = () => {
    return notifications.filter(notification => {
      const date = notification.timestamp instanceof Date ? notification.timestamp : new Date(notification.timestamp);
      return isRecent(date);
    }).length;
  };

  const getVeryRecentNotificationsCount = () => {
    return notifications.filter(notification => {
      const date = notification.timestamp instanceof Date ? notification.timestamp : new Date(notification.timestamp);
      return isVeryRecent(date);
    }).length;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient 
        colors={['#0A2342', '#19376D']} 
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Feather name="bell" size={24} color="white" />
            <Text style={styles.headerTitle}>Notifications</Text>
            {/* Indicateurs de notifications récentes */}
            <View style={styles.headerIndicators}>
              {getVeryRecentNotificationsCount() > 0 && (
                <View style={[styles.headerBadge, { backgroundColor: '#2ECC71' }]}>
                  <Text style={styles.headerBadgeText}>{getVeryRecentNotificationsCount()}</Text>
                </View>
              )}
              {getRecentNotificationsCount() > 0 && getVeryRecentNotificationsCount() === 0 && (
                <View style={[styles.headerBadge, { backgroundColor: '#F39C12' }]}>
                  <Text style={styles.headerBadgeText}>{getRecentNotificationsCount()}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowStats(true)} style={styles.headerButton}>
              <Feather name="bar-chart-2" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.headerButton}>
              <Feather name="filter" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
              <Feather name="check-square" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setAutoMarkAsReadOnEntry(!autoMarkAsReadOnEntry)} 
              style={[styles.headerButton, { backgroundColor: autoMarkAsReadOnEntry ? 'rgba(255,255,255,0.2)' : 'transparent' }]}
            >
              <Feather 
                name={autoMarkAsReadOnEntry ? "eye" : "eye-off"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </View>
        {/* Sous-titre avec informations sur les notifications récentes */}
        {(getRecentNotificationsCount() > 0 || getVeryRecentNotificationsCount() > 0) && (
          <View style={styles.headerSubtitle}>
            <Text style={styles.headerSubtitleText}>
              {getVeryRecentNotificationsCount() > 0 
                ? `${getVeryRecentNotificationsCount()} nouvelle${getVeryRecentNotificationsCount() > 1 ? 's' : ''} notification${getVeryRecentNotificationsCount() > 1 ? 's' : ''} récente${getVeryRecentNotificationsCount() > 1 ? 's' : ''}`
                : `${getRecentNotificationsCount()} notification${getRecentNotificationsCount() > 1 ? 's' : ''} récente${getRecentNotificationsCount() > 1 ? 's' : ''}`
              }
            </Text>
          </View>
        )}
        {/* Indicateur de configuration automatique */}
        <View style={styles.autoMarkIndicator}>
          <Feather 
            name={autoMarkAsReadOnEntry ? "check-circle" : "circle"} 
            size={16} 
            color="white" 
          />
          <Text style={styles.autoMarkIndicatorText}>
            {autoMarkAsReadOnEntry ? "Marquage automatique activé" : "Marquage automatique désactivé"}
          </Text>
        </View>
      </LinearGradient>

      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Rechercher dans les notifications..."
          placeholderTextColor={theme.textTertiary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
            <Feather name="x" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

      {/* Filtres rapides */}
      <View style={[styles.quickFilters, { backgroundColor: theme.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'unread', 'urgent', 'recent'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.quickFilterButton,
                selectedFilter === filter && { backgroundColor: theme.primary },
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.quickFilterText,
                { color: selectedFilter === filter ? 'white' : theme.textPrimary }
              ]}>
                {filter === 'all' ? 'Toutes' :
                 filter === 'unread' ? 'Non lues' :
                 filter === 'urgent' ? 'Urgentes' : 'Récentes'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des notifications */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Chargement des notifications...
          </Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <Feather name="bell-off" size={48} color={theme.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              Aucune notification
            </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchTerm || selectedFilter !== 'all' || selectedType !== 'all'
              ? 'Aucune notification ne correspond aux critères'
              : 'Vous n\'avez pas encore de notifications'}
            </Text>
          </View>
        ) : (
          <FlatList
          data={filteredNotifications}
            renderItem={renderNotification}
          keyExtractor={(item) => item.id!}
          style={styles.notificationList}
          contentContainerStyle={styles.notificationListContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
            showsVerticalScrollIndicator={false}
          />
        )}

      {/* Bouton d'action flottant */}
      {filteredNotifications.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={deleteAllNotifications}
        >
          <Feather name="trash-2" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Modales */}
      {renderStats()}
      {renderFilters()}

      {/* Modal des détails du défaut */}
      <Modal
        visible={showDefautDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDefautDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Détails du défaut
              </Text>
              <TouchableOpacity onPress={() => setShowDefautDetails(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {loadingDefaut ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Chargement des détails...
                </Text>
              </View>
            ) : selectedDefaut ? (
              <ScrollView style={styles.modalScrollView}>
                {/* Photo du défaut */}
                {selectedDefaut.photoUri && (typeof selectedDefaut.photoUri === 'string') && (!selectedDefaut.photoUri.startsWith('file://') || Platform.OS !== 'web') && (
                  <View style={styles.defautPhotoContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                      Photo du défaut
                    </Text>
                    <Image 
                      source={{ uri: selectedDefaut.photoUri }} 
                      style={styles.defautPhoto}
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* Informations de base */}
                <View style={styles.defautSection}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    Informations de base
                  </Text>
                  
                  <View style={styles.defautDetailRow}>
                    <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                      Agent :
                    </Text>
                    <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                      {selectedDefaut.nom} ({selectedDefaut.matricule})
                    </Text>
                  </View>

                  <View style={styles.defautDetailRow}>
                    <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                      Date de détection :
                    </Text>
                    <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                      {formatDate(selectedDefaut.dateDetection)}
                    </Text>
                  </View>

                  <View style={styles.defautDetailRow}>
                    <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                      Poste de travail :
                    </Text>
                    <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                      {selectedDefaut.posteTravail}
                    </Text>
                  </View>

                  <View style={styles.defautDetailRow}>
                    <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                      Référence produit :
                    </Text>
                    <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                      {selectedDefaut.referenceProduit}
                    </Text>
                  </View>
                </View>

                {/* Détails du défaut */}
                <View style={styles.defautSection}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    Détails du défaut
                  </Text>
                  
                  {selectedDefaut.codeDefaut && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Code défaut :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.codeDefaut}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.natureDefaut && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Nature du défaut :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.natureDefaut}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.nombreOccurrences && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Occurrences :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.nombreOccurrences}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Informations supplémentaires */}
                <View style={styles.defautSection}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    Informations supplémentaires
                  </Text>
                  
                  {selectedDefaut.shiftLeaderName && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Shift Leader :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.shiftLeaderName}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.projet && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Projet :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.projet}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.section && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Section :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.section}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.codeBoitier && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Code boîtier :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.codeBoitier}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.codeRepere && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Code repère :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.codeRepere}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.repere1 && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Repère 1 :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.repere1}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.repere2 && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Repère 2 :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.repere2}
                      </Text>
                    </View>
                  )}

                  {selectedDefaut.commentaire && (
                    <View style={styles.defautDetailRow}>
                      <Text style={[styles.defautDetailLabel, { color: theme.textSecondary }]}>
                        Commentaire :
                      </Text>
                      <Text style={[styles.defautDetailValue, { color: theme.textPrimary }]}>
                        {selectedDefaut.commentaire}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  Défaut non trouvé
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Le défaut a peut-être été supprimé
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  headerGradient: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  quickFilters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notificationList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notificationListContainer: {
    paddingBottom: Platform.OS === 'ios' ? 80 : 70,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentBadge: {
    backgroundColor: '#F39C12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  recentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  notificationBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  urgentBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  urgentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationIndicators: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  modalScrollView: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterOptionText: {
    fontSize: 16,
  },
  defautPhotoContainer: {
    marginBottom: 20,
  },
  defautPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  defautSection: {
    marginBottom: 20,
  },
  defautDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  defautDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  defautDetailValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  headerIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  headerBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerSubtitleText: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
  },
  autoMarkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  autoMarkIndicatorText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.9,
  },
});

export default NotificationList; 