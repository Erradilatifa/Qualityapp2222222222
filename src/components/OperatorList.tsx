import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  Platform, 
  Image, 
  Modal,
  Dimensions,
  StatusBar,
  TextInput,
  ScrollView
} from 'react-native';
import DatePickerWeb from './common/DatePickerWeb';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { Operator, PROJETS_SECTIONS, CODES_DEFAUT_PAR_CATEGORIE, CATEGORIES } from '../types/Operator';
import { operatorService } from '../services/database';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomNavbar from './CustomNavbar';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationService } from '../services/notificationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT_BASE = spacing.lg * 2 + 24; // Base height for the content inside the navbar (padding + icon size)

const formatDateInput = (date: Date | null) => {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
};

const OperatorList: React.FC = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null); // State to hold the selected operator for detailed view
  const [showDetailModal, setShowDetailModal] = useState(false); // State to control the visibility of the detail modal
  
  // Nouveaux états pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShiftLeader, setSelectedShiftLeader] = useState('');
  const [selectedProjet, setSelectedProjet] = useState('');
  const [selectedCodeDefaut, setSelectedCodeDefaut] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  
  // États pour la pagination
  const [displayedCount, setDisplayedCount] = useState(10);
  const INITIAL_LOAD = 10;
  const LOAD_MORE_COUNT = 10;
  
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const durationOptions = [
    { key: 'today', label: 'Aujourd\'hui', days: 0 },
    { key: 'yesterday', label: 'Hier', days: 1 },
    { key: 'week', label: 'Cette semaine', days: 7 },
    { key: 'month', label: 'Ce mois', days: 30 },
    { key: 'quarter', label: 'Ce trimestre', days: 90 },
  ];

  const loadOperators = async () => {
    try {
      setLoading(true);
      console.log('Loading operators...');
      const fetchedOperators = await operatorService.getAll();
      console.log('Fetched operators:', fetchedOperators);
      
      // Sort by dateDetection (most recent first) with precise time sorting
      const sortedOperators = fetchedOperators.sort((a, b) => {
        let dateA: Date;
        let dateB: Date;
        
        // Handle different date formats
        if (a.dateDetection instanceof Date) {
          dateA = a.dateDetection;
        } else if (a.dateDetection && typeof a.dateDetection === 'string') {
          dateA = new Date(a.dateDetection);
        } else if (a.dateDetection && (a.dateDetection as any).toDate) {
          dateA = (a.dateDetection as any).toDate();
        } else {
          dateA = new Date();
        }
        
        if (b.dateDetection instanceof Date) {
          dateB = b.dateDetection;
        } else if (b.dateDetection && typeof b.dateDetection === 'string') {
          dateB = new Date(b.dateDetection);
        } else if (b.dateDetection && (b.dateDetection as any).toDate) {
          dateB = (b.dateDetection as any).toDate();
        } else {
          dateB = new Date();
        }
        
        // Sort by timestamp (most recent first)
        return dateB.getTime() - dateA.getTime();
      });
      
      setOperators(sortedOperators as Operator[]);
      console.log('Operators set in state, count:', sortedOperators.length);
    } catch (error) {
      console.error('Error loading operators:', error);
      Alert.alert('Erreur', 'Échec du chargement des défauts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperators();
  }, [(route.params as any)?.reload]);

  useFocusEffect(
    React.useCallback(() => {
      loadOperators();
    }, [])
  );

  // Filtrage par date et autres critères
  const allFilteredOperators = operators.filter((op) => {
    // Filtre par date de détection
    if (selectedDate) {
      const opDate = op.dateDetection instanceof Date ? op.dateDetection : (op.dateDetection && (op.dateDetection as any).toDate ? (op.dateDetection as any).toDate() : new Date(op.dateDetection || Date.now()));
      if (!opDate) return false;
      
      // Normaliser les dates pour comparer seulement le jour
      const opDateNormalized = new Date(opDate.getFullYear(), opDate.getMonth(), opDate.getDate());
      const selectedDateNormalized = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      
      if (opDateNormalized.getTime() !== selectedDateNormalized.getTime()) return false;
    }

    // Filtre par shift leader
    if (selectedShiftLeader && op.shiftLeaderName !== selectedShiftLeader) return false;

    // Filtre par projet
    if (selectedProjet && op.projet !== selectedProjet) return false;

    // Filtre par code défaut
    if (selectedCodeDefaut && op.codeDefaut !== selectedCodeDefaut) return false;

    // Filtre par recherche textuelle
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const searchableFields = [
        op.matricule,
        op.nom,
        op.referenceProduit,
        op.codeDefaut,
        op.natureDefaut,
        op.commentaire,
        op.shiftLeaderName,
        op.projet,
        op.section
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableFields.includes(term)) return false;
    }

    return true;
  });

  // Limiter l'affichage avec pagination
  const filteredOperators = allFilteredOperators.slice(0, displayedCount);
  
  // Calculer le total des défauts en tenant compte des occurrences
  const totalDefautsWithOccurrences = allFilteredOperators.reduce((total, op) => {
    const occurrences = op.nombreOccurrences || 1; // Si pas d'occurrences, compter comme 1
    return total + occurrences;
  }, 0);

  const totalDefautsUniques = allFilteredOperators.length;
  
  // Fonction pour charger plus de défauts
  const loadMoreDefects = () => {
    setDisplayedCount(prev => prev + LOAD_MORE_COUNT);
  };
  
  // Vérifier s'il y a plus de défauts à afficher
  const hasMoreDefects = displayedCount < allFilteredOperators.length;

  const formatDate = (date: any) => {
    if (!date) return 'Date inconnue';
    
    let dateObj: Date;
    
    try {
      if (date instanceof Date) {
        dateObj = date;
      } else if (date && typeof date === 'object' && date.toDate) {
        // Firebase Timestamp
        dateObj = date.toDate();
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
      
      return dateObj.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.log('Erreur lors du formatage de la date:', error, 'Date originale:', date);
      return 'Erreur date';
    }
  };

  const handleDelete = async (op: Operator) => {
    console.log('=== handleDelete appelé ===');
    console.log('Opérateur reçu:', op);
    console.log('ID de l\'opérateur:', op.id);
    
    // Utiliser window.confirm pour le web, Alert.alert pour mobile
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(`Êtes-vous sûr de vouloir supprimer le défaut de ${op.nom} ?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirmation',
            `Êtes-vous sûr de vouloir supprimer le défaut de ${op.nom} ?`,
            [
              { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });
    
    if (!confirmDelete) {
      console.log('Suppression annulée par l\'utilisateur');
      return;
    }
    
    console.log('=== Confirmation de suppression ===');
    console.log('Début du processus de suppression...');
    try {
              let targetId: string | undefined = op.id;
              console.log('targetId initial:', targetId);
              if (!targetId) {
                const all = await operatorService.getAll();
                const sameDay = (a: any, b: any) => {
                  try {
                    const ad = a instanceof Date ? a : (a && (a as any).toDate ? (a as any).toDate() : new Date(a));
                    const bd = b instanceof Date ? b : (b && (b as any).toDate ? (b as any).toDate() : new Date(b));
                    return ad.getFullYear() === bd.getFullYear() && ad.getMonth() === bd.getMonth() && ad.getDate() === bd.getDate();
                  } catch {
                    return false;
                  }
                };
                const toDate = (d: any) => (d instanceof Date ? d : (d && (d as any).toDate ? (d as any).toDate() : new Date(d)));
                // Try match including same day
                let candidates = (all as Operator[]).filter((it) =>
                  it.matricule === op.matricule &&
                  it.nom === op.nom &&
                  it.referenceProduit === op.referenceProduit &&
                  it.codeDefaut === op.codeDefaut &&
                  it.posteTravail === op.posteTravail &&
                  sameDay(it.dateDetection, op.dateDetection)
                );
                if (candidates.length === 0) {
                  // Fallback: ignore date match, pick most recent
                  candidates = (all as Operator[]).filter((it) =>
                    it.matricule === op.matricule &&
                    it.nom === op.nom &&
                    it.referenceProduit === op.referenceProduit &&
                    it.codeDefaut === op.codeDefaut &&
                    it.posteTravail === op.posteTravail
                  ).sort((a, b) => toDate(b.dateDetection).getTime() - toDate(a.dateDetection).getTime());
                }
                if (candidates.length > 0) {
                  targetId = candidates[0].id;
                }
              }

              // Optimistic UI: remove locally right away
              const sameDay = (a: any, b: any) => {
                const ad = new Date(a);
                const bd = new Date(b);
                return ad.getFullYear() === bd.getFullYear() && ad.getMonth() === bd.getMonth() && ad.getDate() === bd.getDate();
              };
              setOperators((prev) => prev.filter((it) => {
                if (targetId && it.id) return it.id !== targetId;
                return !(
                  it.matricule === op.matricule &&
                  it.nom === op.nom &&
                  it.referenceProduit === op.referenceProduit &&
                  it.codeDefaut === op.codeDefaut &&
                  sameDay(it.dateDetection, op.dateDetection)
                );
              }));

              if (!targetId) {
                console.log('ATTENTION: ID manquant');
                Alert.alert('Info', 'ID manquant; tentative de suppression locale uniquement.');
              } else {
                console.log('Suppression de l\'opérateur avec ID:', targetId);
                await operatorService.delete(targetId);
                console.log('Opérateur supprimé de la base de données');
                
                console.log('Envoi de la notification de suppression...');
                await notificationService.notifyDefautDeleted({
                  matricule: op.matricule,
                  nom: op.nom,
                  codeDefaut: op.codeDefaut,
                  referenceProduit: op.referenceProduit || 'N/A',
                  posteTravail: op.posteTravail || 'N/A',
                  dateDetection: op.dateDetection || new Date(),
                });
                console.log('Notification envoyée');
              }

      console.log('Suppression réussie, affichage du message de succès');
      if (Platform.OS === 'web') {
        alert('Défaut supprimé avec succès');
      } else {
        Alert.alert('Succès', 'Défaut supprimé avec succès');
      }
      console.log('Rechargement de la liste des opérateurs...');
      // Toujours rafraîchir la liste pour refléter l'état réel
      loadOperators();
    } catch (error) {
      console.error('ERREUR lors de la suppression:', error);
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Message d\'erreur:', msg);
      if (Platform.OS === 'web') {
        alert(`Échec de la suppression: ${msg}`);
      } else {
        Alert.alert('Erreur', `Échec de la suppression: ${msg}`);
      }
      // Recharger depuis la source pour rétablir l'état si nécessaire
      loadOperators();
    }
  };

  const showPhoto = (photoUri: string) => {
    setSelectedPhoto(photoUri);
    setShowPhotoModal(true);
  };

  // Fonction pour effacer tous les filtres
  const clearAllFilters = () => {
    setSelectedDate(null);
    setSearchTerm('');
    setSelectedShiftLeader('');
    setSelectedProjet('');
    setSelectedCodeDefaut('');
  };

  // Fonction pour vérifier s'il y a des filtres actifs
  const hasActiveFilters = () => {
    return selectedDate || searchTerm.trim() || selectedShiftLeader || selectedProjet || selectedCodeDefaut;
  };

  const renderOperator = ({ item }: { item: Operator }) => (
    <View style={[styles.operatorCard, { backgroundColor: theme.surface }]}>
      <TouchableOpacity
        style={styles.operatorCardTouchable}
        onPress={() => { setSelectedOperator(item); setShowDetailModal(true); }}
      >
        {/* Photo section */}
        {item.photoUri && (
          <View style={styles.operatorThumbnailContainer}>
            <Image 
              source={{ uri: item.photoUri }} 
              style={styles.operatorThumbnail}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.operatorInfoContainer}>
          <View style={styles.operatorLines}>
            <Text style={[styles.linePrimary, { color: theme.textPrimary }]}>
              {item.nom}
            </Text>
            <Text style={[styles.lineSecondary, { color: theme.textSecondary }]}>
              Matricule: {item.matricule}
            </Text>
            {item.codeDefaut && (
              <Text style={[styles.lineSecondary, { color: theme.textPrimary }]}>
                Défaut: {item.codeDefaut} - {item.natureDefaut || 'Nature non spécifiée'}
              </Text>
            )}
            {item.referenceProduit && (
              <Text style={[styles.lineSecondary, { color: theme.textSecondary }]}>
                Produit: {item.referenceProduit}
              </Text>
            )}
            {item.nombreOccurrences && item.nombreOccurrences > 1 && (
              <Text style={[styles.lineSecondary, { color: theme.primary }]}>
                Occurrences: {item.nombreOccurrences}
              </Text>
            )}
            <Text style={[styles.lineSecondary, { color: theme.textSecondary }]}>
              Date: {formatDate(item.dateDetection)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceSecondary }]}>
        <Feather name="inbox" size={48} color={theme.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
        Aucun défaut trouvé
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {hasActiveFilters()
          ? 'Aucun défaut ne correspond aux critères de recherche'
          : 'Commencez par ajouter votre premier défaut'
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      
      <CustomNavbar 
        title="Défauts détectés"
        leftContent={
          <Feather name="list" size={24} color="white" style={{ marginRight: 12 }} />
        }
        rightContent={
          <View style={styles.headerCountContainer}>
            <Text style={styles.headerCount}>
              {totalDefautsWithOccurrences} défaut{totalDefautsWithOccurrences !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.headerCountSubtext}>
              (avec occurrences)
            </Text>
          </View>
        }
      />

      {/* Section de recherche et filtres (affichée conditionnellement) */}
      {showSearchFilters && (
        <View style={[styles.searchFiltersSection, { backgroundColor: theme.surface, paddingTop: insets.top + HEADER_HEIGHT_BASE }]}>
          {/* En-tête de la section */}
          <View style={styles.searchFiltersHeader}>
            <Feather name="search" size={18} color={theme.primary} />
            <Text style={[styles.searchFiltersTitle, { color: theme.textPrimary }]}>
              Recherche & Filtres
            </Text>
            {hasActiveFilters() && (
              <View style={styles.activeFiltersIndicator}>
                <Text style={styles.activeFiltersCount}>
                  {[searchTerm, selectedShiftLeader, selectedProjet, selectedCodeDefaut].filter(Boolean).length}
                </Text>
              </View>
            )}
          </View>

          {/* Barre de recherche principale */}
          <View style={styles.searchBarContainer}>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.surfaceSecondary }]}>
              <Feather name="search" size={16} color={theme.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Rechercher par matricule, nom, référence, défaut..."
                placeholderTextColor={theme.textTertiary}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchButton}>
                  <Feather name="x" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtres de date */}
          <View style={styles.dateFiltersRow}>
            <View style={styles.dateFilterItem}>
              <Text style={[styles.dateFilterLabel, { color: theme.textSecondary }]}>
                Date détection {selectedDate && '(Filtre actif)'}
              </Text>
              <TouchableOpacity
                style={[styles.dateFilterButton, { 
                  backgroundColor: selectedDate ? theme.primary : theme.surfaceSecondary,
                  borderColor: selectedDate ? theme.primary : theme.border 
                }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateFilterText, { 
                  color: selectedDate ? 'white' : theme.textPrimary 
                }]}>
                  {selectedDate ? formatDateInput(selectedDate) : 'Sélectionner une date'}
                </Text>
                <Feather name="calendar" size={14} color={selectedDate ? 'white' : theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton filtres avancés */}
          <View style={styles.advancedFiltersToggle}>
            <TouchableOpacity
              style={[styles.advancedFiltersButton, { 
                backgroundColor: showFilters ? theme.primary : theme.surfaceSecondary,
                borderColor: theme.border 
              }]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Feather name="filter" size={16} color={showFilters ? 'white' : theme.textSecondary} />
              <Text style={[styles.advancedFiltersText, { 
                color: showFilters ? 'white' : theme.textSecondary 
              }]}>
                Filtres avancés
              </Text>
              <Feather 
                name={showFilters ? "chevron-up" : "chevron-down"} 
                size={14} 
                color={showFilters ? 'white' : theme.textSecondary} 
              />
            </TouchableOpacity>

            {/* Bouton effacer tous les filtres */}
            {hasActiveFilters() && (
              <TouchableOpacity
                style={[styles.clearAllFiltersButton, { backgroundColor: theme.surfaceSecondary }]}
                onPress={clearAllFilters}
              >
                <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
                <Text style={[styles.clearAllFiltersText, { color: theme.textSecondary }]}>
                  Effacer
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filtres avancés */}
          {showFilters && (
            <View style={styles.advancedFiltersContent}>
              {/* Grille de filtres */}
              <View style={styles.filtersGrid}>
                {/* Shift Leader */}
                <View style={styles.filterCategory}>
                  <Text style={[styles.filterCategoryLabel, { color: theme.textSecondary }]}>
                    Shift Leader
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.filterOptionsScroll}
                    contentContainerStyle={styles.filterOptionsContainer}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        !selectedShiftLeader && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => setSelectedShiftLeader('')}
                    >
                      <Text style={[styles.filterOptionText, { 
                        color: !selectedShiftLeader ? 'white' : theme.textPrimary 
                      }]}>
                        Tous
                      </Text>
                    </TouchableOpacity>
                    {Array.from(new Set(operators.map(op => op.shiftLeaderName).filter(Boolean))).map((shiftLeader) => (
                      <TouchableOpacity
                        key={shiftLeader}
                        style={[
                          styles.filterOption,
                          selectedShiftLeader === shiftLeader && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => setSelectedShiftLeader(selectedShiftLeader === shiftLeader ? '' : shiftLeader || '')}
                      >
                        <Text style={[styles.filterOptionText, { 
                          color: selectedShiftLeader === shiftLeader ? 'white' : theme.textPrimary 
                        }]}>
                          {shiftLeader}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Projet */}
                <View style={styles.filterCategory}>
                  <Text style={[styles.filterCategoryLabel, { color: theme.textSecondary }]}>
                    Projet
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.filterOptionsScroll}
                    contentContainerStyle={styles.filterOptionsContainer}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        !selectedProjet && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => setSelectedProjet('')}
                    >
                      <Text style={[styles.filterOptionText, { 
                        color: !selectedProjet ? 'white' : theme.textPrimary 
                      }]}>
                        Tous
                      </Text>
                    </TouchableOpacity>
                    {Object.keys(PROJETS_SECTIONS).map((projet) => (
                      <TouchableOpacity
                        key={projet}
                        style={[
                          styles.filterOption,
                          selectedProjet === projet && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => setSelectedProjet(selectedProjet === projet ? '' : projet)}
                      >
                        <Text style={[styles.filterOptionText, { 
                          color: selectedProjet === projet ? 'white' : theme.textPrimary 
                        }]}>
                          {projet}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Liste des défauts */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Chargement des défauts...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOperators}
          renderItem={renderOperator}
          keyExtractor={(item) => {
            if (item.id) return item.id;
            const toDate = (d: any) => (d instanceof Date ? d : (d && (d as any).toDate ? (d as any).toDate() : new Date(d)));
            const ts = toDate(item.dateDetection || new Date()).getTime();
            return `${item.matricule}-${ts}-${item.referenceProduit || ''}`;
          }}
          contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT_BASE, paddingHorizontal: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 100 : 90 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={() => (
            hasMoreDefects ? (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity
                  style={[styles.loadMoreButton, { backgroundColor: theme.primary }]}
                  onPress={loadMoreDefects}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreText}>
                    Afficher plus ({allFilteredOperators.length - displayedCount} restants)
                  </Text>
                  <Feather name="chevron-down" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : null
          )}
        />
      )}

      {/* Modales de sélection de date */}
      {showDatePicker && (
        <DatePickerWeb
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setSelectedDate(selectedDate);
            }
          }}
        />
      )}

      {/* Modal pour afficher la photo */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={() => setShowPhotoModal(false)}
            >
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
            {selectedPhoto && (
              <Image source={{ uri: selectedPhoto }} style={styles.photoModalImage} />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal pour afficher les détails du défaut */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.detailModalHeader, { backgroundColor: theme.surface }]}>
              <Text style={[styles.detailModalTitle, { color: theme.textPrimary }]}>Détails du Défaut</Text>
              <TouchableOpacity
                style={styles.detailModalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Feather name="x" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailModalBody}>
              {selectedOperator?.photoUri && (
                <Image source={{ uri: selectedOperator.photoUri }} style={styles.detailModalPhoto} />
              )}
              
              {/* Nom de l'opérateur - Style proéminent */}
              <View style={[styles.operatorNameSection, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <Text style={[styles.operatorNameLabel, { color: theme.textSecondary }]}>Nom et Prénom de l'opérateur</Text>
                <Text style={[styles.operatorNameValue, { color: theme.primary }]}>{selectedOperator?.nom}</Text>
              </View>
              
              <View style={styles.detailModalRow}>
                <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Matricule:</Text>
                <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator?.matricule}</Text>
              </View>
              <View style={styles.detailModalRow}>
                <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Poste de travail:</Text>
                <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator?.posteTravail}</Text>
              </View>
              <View style={styles.detailModalRow}>
                <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Référence produit:</Text>
                <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator?.referenceProduit}</Text>
              </View>
              <View style={styles.detailModalRow}>
                <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Date détection:</Text>
                <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{formatDate(selectedOperator?.dateDetection)}</Text>
              </View>
              {selectedOperator?.shiftLeaderName && (
                <View style={styles.detailModalRow}>
                  <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Shift Leader:</Text>
                  <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator.shiftLeaderName}</Text>
                </View>
              )}
              {selectedOperator?.projet && (
                <View style={styles.detailModalRow}>
                  <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Projet:</Text>
                  <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator.projet}</Text>
                </View>
              )}
              {selectedOperator?.section && (
                <View style={styles.detailModalRow}>
                  <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Section:</Text>
                  <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator.section}</Text>
                </View>
              )}
              {selectedOperator?.codeDefaut && (
                <View style={styles.detailModalRow}>
                  <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Code défaut:</Text>
                  <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator.codeDefaut}</Text>
                </View>
              )}
              {selectedOperator?.natureDefaut && (
                <View style={styles.detailModalRow}>
                  <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Nature défaut:</Text>
                  <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator.natureDefaut}</Text>
                </View>
              )}
              {selectedOperator?.commentaire && (
                <View style={styles.detailModalRow}>
                  <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Commentaire:</Text>
                  <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator.commentaire}</Text>
                </View>
              )}
              {selectedOperator?.nombreOccurrences && (
                <View style={styles.detailModalRow}>
                  <Text style={[styles.detailModalLabel, { color: theme.textSecondary }]}>Occurrences:</Text>
                  <Text style={[styles.detailModalValue, { color: theme.textPrimary }]}>{selectedOperator.nombreOccurrences}</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.detailModalActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.addDefautButton, { 
                  borderColor: theme.primary, 
                  backgroundColor: `${theme.primary}15`,
                  minWidth: 140,
                  justifyContent: 'center',
                  marginRight: spacing.sm
                }]}
                onPress={() => {
                  console.log('=== BOUTON AJOUTER DÉFAUT CLIQUÉ ===');
                  if (selectedOperator) {
                    setShowDetailModal(false);
                    navigation.navigate('Ajouter un défaut', {
                      operatorName: selectedOperator.nom,
                      matricule: selectedOperator.matricule
                    });
                  }
                }}
              >
                <Feather name="plus-circle" size={18} color={theme.primary} />
                <Text style={[styles.addDefautButtonText, { color: theme.primary, fontWeight: '600' }]}>
                  Nouveau défaut
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.deleteButton, { 
                  borderColor: '#FF3B30', 
                  backgroundColor: 'rgba(255, 59, 48, 0.1)',
                  minWidth: 120,
                  justifyContent: 'center'
                }]}
                onPress={async () => {
                  console.log('=== BOUTON SUPPRIMER CLIQUÉ ===');
                  
                  if (!selectedOperator) {
                    console.error('ERREUR: selectedOperator est null');
                    Alert.alert('Erreur', 'Aucun opérateur sélectionné');
                    return;
                  }
                  
                  console.log('Opérateur à supprimer:', selectedOperator);
                  
                  // Fermer la modal immédiatement
                  setShowDetailModal(false);
                  
                  // Appeler handleDelete directement
                  handleDelete(selectedOperator);
                }}
              >
                <Feather name="trash-2" size={18} color="#FF3B30" />
                <Text style={[styles.deleteButtonText, { color: '#FF3B30', fontWeight: '600' }]}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            </View>
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
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90,
  },
  operatorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  operatorCardTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md, // Add padding to avoid overlap with delete button
  },
  operatorThumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  operatorThumbnail: {
    width: '100%',
    height: '100%',
  },
  operatorInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  operatorLines: {
    flexDirection: 'column',
    gap: 2,
  },
  linePrimary: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  lineSecondary: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  operatorName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  matriculeContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  operatorMatricule: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
  },
  cardContent: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    width: 120,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    flex: 1,
    color: '#111827',
  },
  photoSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  photoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: '#6b7280',
  },
  photoThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActions: {
    marginLeft: spacing.md,
  },
  addDefautButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  addDefautButtonText: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  deleteButtonText: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  photoModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  photoModalContent: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.7,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  photoModalClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  separator: {
    height: spacing.md,
  },
  searchFiltersSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  searchFiltersTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  activeFiltersIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  activeFiltersCount: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: 'white',
  },
  searchBarContainer: {
    marginBottom: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    fontSize: typography.fontSize.sm,
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  dateFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dateFilterItem: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  dateFilterLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderColor: '#e0e0e0',
  },
  dateFilterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  advancedFiltersToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  advancedFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  advancedFiltersText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  advancedFiltersContent: {
    marginTop: spacing.sm,
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  filterCategory: {
    marginBottom: spacing.sm,
  },
  filterCategoryLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  filterOptionsScroll: {
    // Styles pour ScrollView
  },
  filterOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterOptionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  clearAllFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  clearAllFiltersText: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  searchFiltersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginLeft: spacing.sm,
  },
  activeFiltersBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.xs,
    minWidth: 16,
    alignItems: 'center',
  },
  activeFiltersBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  filterTypeButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  filterTypeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  durationFiltersContainer: {
    marginBottom: spacing.sm,
  },
  durationOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  durationOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  durationOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  detailModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  detailModalContent: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#111827',
  },
  detailModalCloseButton: {
    padding: spacing.xs,
  },
  detailModalBody: {
    padding: spacing.md,
  },
  detailModalRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  detailModalLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: '#4B5563',
    width: 140,
  },
  detailModalValue: {
    fontSize: typography.fontSize.md,
    color: '#111827',
    flex: 1,
  },
  detailModalPhoto: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  operatorNameSection: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  operatorNameLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  operatorNameValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailModalActions: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerCountContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerCount: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  headerCountSubtext: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.md,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  loadMoreText: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.md,
  },
});

export default OperatorList;