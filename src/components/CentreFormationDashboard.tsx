import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius } from '../theme/spacing';
import CustomNavbar from './CustomNavbar';
import { defautsQualiteService } from '../services/defautsService';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';

const { width: screenWidth } = Dimensions.get('window');
const HEADER_HEIGHT_BASE = spacing.lg * 2 + 24;

// Data structure for operator defects statistics
interface OperatorDefect {
  operatorName: string;
  defectType: string;
  defectCount: number;
  lastUpdated: Date;
  projet?: string;
}

const CentreFormationDashboard: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [leftContent, setLeftContent] = useState<React.ReactNode>(null);
  const [rightContent, setRightContent] = useState<React.ReactNode>(null);
  const [data, setData] = useState<OperatorDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDefectType, setSelectedDefectType] = useState<string>('all');
  const [operatorSearch, setOperatorSearch] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState<boolean>(false);
  const [isDefectTypeDropdownOpen, setIsDefectTypeDropdownOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const chartRef = useRef<View>(null);

  // Load data and check for alerts
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build filters object
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      // Fetch real data from backend with filters
      const realData = await defautsQualiteService.getOperatorDefectStats(filters);
      setData(realData);
      
      // Check for alerts and log warnings based on thresholds
      realData.forEach(item => {
        const alertLevel = defautsQualiteService.checkAlertThreshold(item.defectCount);
        if (alertLevel) {
          console.warn(`Alert: ${item.operatorName} has ${item.defectCount} defects - ${alertLevel}`);
        }
      });
      
      console.log('✅ Real data loaded successfully:', realData.length, 'records');
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  // Get unique defect types from data
  const dataDefectTypes = Array.from(new Set(data.map(d => d.defectType).filter(Boolean)));
  
  // Types de défauts par défaut (exemples courants)
  const defaultDefectTypes = [
    'Longueur NC',
    'Non serré',
    'Témoin de découpe NC',
    'Manque matière',
    'Corps étranger dans connecteur (joint..)',
    'Mauvais positionnement',
    'Défaut d\'aspect',
    'Rayure',
    'Fissure',
    'Déformation'
  ];
  
  // Combiner les types de données avec les types par défaut
  const allDefectTypes = [...new Set([...dataDefectTypes, ...defaultDefectTypes])];
  const defectTypes = ['all', ...allDefectTypes.sort()];
  
  // Debug: Afficher les types de défauts trouvés
  console.log('📊 Data length:', data.length);
  console.log('📊 Data defect types:', dataDefectTypes);
  console.log('📊 All defect types:', defectTypes);
  console.log('📊 Sample data:', data.slice(0, 3));
  
  // Segments/projets pour le filtrage
  const segments = [
    'all',
    'CRA',
    'WPA',
    'X1310 PDB',
    'X1310 LOWDASH',
    'X1310 EGR ICE',
    'X1310 EGR HEV',
    'X1310 ENGINE',
    'X1310 Smalls',
    'P13A SMALLS',
    'P13A EGR',
    'P13A MAIN & BODY'
  ];

  // Mapping projet vers section
  const getSection = (projet: string | undefined): string => {
    if (!projet) return 'Section 01';
    switch (projet) {
      case 'CRA': return 'Section 01';
      case 'WPA': return 'Section 02';
      case 'X1310 PDB': return 'Section 03';
      case 'X1310 LOWDASH': return 'Section 04';
      case 'X1310 EGR ICE':
      case 'X1310 EGR HEV': return 'Section 05';
      case 'X1310 ENGINE': return 'Section 06';
      case 'X1310 Smalls':
      case 'P13A SMALLS':
      case 'P13A EGR':
      case 'P13A MAIN & BODY': return 'Section 07';
      default: return 'Section 01';
    }
  };

  // Filter data by operator search, color, and segment
  const filteredData = data.filter(d => {
    const matchesOperator = operatorSearch === '' || d.operatorName.toLowerCase().includes(operatorSearch.toLowerCase());
    const matchesSegment = selectedSection === 'all' || d.projet === selectedSection;
    
    // Filter by color (based on defect count)
    let matchesColor = true;
    if (selectedColor !== 'all') {
      if (selectedColor === 'red' && d.defectCount < 7) matchesColor = false;
      if (selectedColor === 'orange' && (d.defectCount < 5 || d.defectCount >= 7)) matchesColor = false;
      if (selectedColor === 'yellow' && (d.defectCount < 3 || d.defectCount >= 5)) matchesColor = false;
    }
    
    return matchesOperator && matchesColor && matchesSegment;
  });

  // Group by operator and defect type
  const groupedData = filteredData.reduce((acc, item) => {
    const key = `${item.operatorName}-${item.defectType}`;
    if (!acc[key]) {
      acc[key] = item;
    }
    return acc;
  }, {} as Record<string, OperatorDefect>);

  // Sort by defect count (highest first) and filter out operators with less than 3 defects
  const chartData = Object.values(groupedData)
    .filter(item => item.defectCount >= 3)
    .sort((a, b) => b.defectCount - a.defectCount);

  // Get color based on defect count
  const getBarColor = (count: number): string => {
    if (count >= 7) return '#E74C3C'; // Red
    if (count >= 5) return '#E67E22'; // Orange
    return '#F1C40F'; // Yellow (3-4 defects)
  };

  // Get alert level text
  const getAlertLevel = (count: number): string => {
    if (count >= 7) return 'CRITIQUE';
    if (count >= 5) return 'ÉLEVÉ';
    return 'ATTENTION';
  };

  // Export chart as image
  const exportChart = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Info', 'L\'export n\'est pas disponible sur web');
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Impossible de sauvegarder l\'image');
        return;
      }

      if (chartRef.current) {
        const uri = await captureRef(chartRef.current, {
          format: 'png',
          quality: 1,
        });

        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Succès', 'Graphique exporté avec succès');
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le graphique');
    }
  };

  // Render bar chart
  const renderBarChart = () => {
    if (chartData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const chartWidth = Math.max(screenWidth - 40, chartData.length * 100);
    const chartHeight = 280;
    const chartTopPadding = 40;
    const maxDefects = 7;
    const barWidth = 60;
    const barSpacing = 40;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ width: chartWidth, height: chartHeight + chartTopPadding + 120 }}>
          <Svg width={chartWidth} height={chartHeight + chartTopPadding + 100}>
            {/* Y-axis labels supprimés */}

            {/* Bars */}
            {chartData.map((item, index) => {
              const x = 50 + index * (barWidth + barSpacing);
              const barHeight = (item.defectCount / maxDefects) * chartHeight;
              const y = chartTopPadding + chartHeight - barHeight;
              const color = getBarColor(item.defectCount);

              return (
                <G key={`bar-${index}`}>
                  {/* Bar */}
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    rx="4"
                  />
                  
                  {/* Count label INSIDE the bar - Pour TOUTES les barres */}
                  <Rect
                    x={x + barWidth / 2 - 18}
                    y={Math.max(y + 10, chartTopPadding + 5)}
                    width="36"
                    height="24"
                    fill="white"
                    rx="6"
                    opacity="0.95"
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={Math.max(y + 27, chartTopPadding + 22)}
                    fontSize="18"
                    fill="#000000"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {item.defectCount}
                  </SvgText>
                  
                  {/* Operator name - Taille agrandie */}
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartTopPadding + chartHeight + 35}
                    fontSize="16"
                    fill={theme.textPrimary}
                    textAnchor="middle"
                    fontWeight="bold"
                    transform={`rotate(45, ${x + barWidth / 2}, ${chartTopPadding + chartHeight + 35})`}
                  >
                    {item.operatorName}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
        <CustomNavbar
          title="Qualité Dashboard"
          leftContent={leftContent}
          rightContent={rightContent}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Chargement des données...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <CustomNavbar
        title="Qualité Dashboard"
        leftContent={leftContent}
        rightContent={rightContent}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.md, paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters Row - All three filters on the same line */}
        <View style={styles.filtersRow}>

          {/* Filter Section - Operator (Search Input) */}
          <View style={[styles.filterCardInline, { backgroundColor: theme.surface }]}>
            <Text style={[styles.filterTitleInline, { color: theme.textPrimary }]}>
              Recherche par matricule opérateur
            </Text>
            <View style={[styles.searchContainerInline, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <Feather name="search" size={16} color={theme.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInputInline, { color: theme.textPrimary }]}
                placeholder="Matricule..."
                placeholderTextColor={theme.textSecondary}
                value={operatorSearch}
                onChangeText={setOperatorSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {operatorSearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setOperatorSearch('')}
                  style={styles.clearSearchButton}
                >
                  <Feather name="x" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Section - Section (Dropdown) */}
          <View style={[styles.filterCardInline, { backgroundColor: theme.surface }]}>
            <Text style={[styles.filterTitleInline, { color: theme.textPrimary }]}>
              Section
            </Text>
            
            <View style={styles.sectionDropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.sectionDropdownButtonInline,
                  { 
                    backgroundColor: theme.surfaceSecondary,
                    borderColor: theme.border
                  }
                ]}
                onPress={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
              >
                <Text style={[
                  styles.sectionDropdownButtonTextInline, 
                  { color: theme.textPrimary }
                ]}>
                  {selectedSection === 'all' ? 'Toutes' : selectedSection}
                </Text>
                <Feather 
                  name={isSectionDropdownOpen ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

        {/* Legend */}
        <View style={[styles.legendCard, { backgroundColor: theme.surface, marginBottom: spacing.xl }]}>
          <Text style={[styles.legendTitle, { color: theme.textPrimary }]}>
            Niveaux d'alerte
          </Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F1C40F' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                  3 défauts → Entretien avec Shift leader et AQL et Formateur ligne / Reformation par le formateur ligne
                </Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#E67E22' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                  5 défauts → Entretien avec Responsable segment & Responsable qualité Segment & HRBP Section / Renvoi à l'école pour requalification (à notifier le responsable formation Ecole automatiquement)
                </Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#E74C3C' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                  7 défauts → à notifier le responsable formation Ecole automatiquement
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chart Section */}
        <View style={[styles.chartCard, { backgroundColor: theme.surface }]} ref={chartRef}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
              Défauts par Opérateur
            </Text>
            <TouchableOpacity onPress={exportChart} style={styles.exportButton}>
              <Feather name="download" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {renderBarChart()}
        </View>

        {/* Operator List */}
        <View style={[styles.listCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.listTitle, { color: theme.textPrimary }]}>
            Détails des Opérateurs
          </Text>
          
          {/* Filter buttons for operator list */}
          <View style={styles.listFilterButtons}>
            <TouchableOpacity
              style={[
                styles.listFilterButton,
                { backgroundColor: theme.surface },
                selectedColor === 'all' && { 
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                  elevation: 3,
                  shadowOpacity: 0.2
                }
              ]}
              onPress={() => setSelectedColor('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.listFilterText, { color: selectedColor === 'all' ? 'white' : theme.textPrimary }]}>
                Tous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.listFilterButton,
                { backgroundColor: theme.surface },
                selectedColor === 'red' && { 
                  backgroundColor: '#E74C3C',
                  borderColor: '#E74C3C',
                  elevation: 3,
                  shadowOpacity: 0.2
                }
              ]}
              onPress={() => setSelectedColor('red')}
              activeOpacity={0.7}
            >
              <Text style={[styles.listFilterText, { color: selectedColor === 'red' ? 'white' : theme.textPrimary }]}>
                🔴 Rouge
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.listFilterButton,
                { backgroundColor: theme.surface },
                selectedColor === 'orange' && { 
                  backgroundColor: '#E67E22',
                  borderColor: '#E67E22',
                  elevation: 3,
                  shadowOpacity: 0.2
                }
              ]}
              onPress={() => setSelectedColor('orange')}
              activeOpacity={0.7}
            >
              <Text style={[styles.listFilterText, { color: selectedColor === 'orange' ? 'white' : theme.textPrimary }]}>
                🟠 Orange
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.listFilterButton,
                { backgroundColor: theme.surface },
                selectedColor === 'yellow' && { 
                  backgroundColor: '#F1C40F',
                  borderColor: '#F1C40F',
                  elevation: 3,
                  shadowOpacity: 0.2
                }
              ]}
              onPress={() => setSelectedColor('yellow')}
              activeOpacity={0.7}
            >
              <Text style={[styles.listFilterText, { color: selectedColor === 'yellow' ? 'white' : theme.textPrimary }]}>
                🟡 Jaune
              </Text>
            </TouchableOpacity>
          </View>

          {chartData.map((item, index) => (
            <View key={index} style={[styles.operatorItem, { borderBottomColor: theme.border }]}>
              <View style={styles.operatorInfo}>
                <Text style={[styles.operatorName, { color: theme.textPrimary }]}>
                  {item.operatorName}
                </Text>
                <Text style={[styles.defectTypeText, { color: theme.textSecondary }]}>
                  {item.defectType}
                </Text>
              </View>
              <View style={styles.operatorStats}>
                <View style={[styles.countBadge, { backgroundColor: getBarColor(item.defectCount) }]}>
                  <Text style={styles.countText}>{item.defectCount}</Text>
                </View>
                <Text style={[
                  styles.alertText,
                  { color: item.defectCount >= 3 ? getBarColor(item.defectCount) : theme.textSecondary }
                ]}>
                  {getAlertLevel(item.defectCount)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.primary }]}
          onPress={loadData}
        >
          <Feather name="refresh-cw" size={20} color="white" />
          <Text style={styles.refreshButtonText}>Actualiser les données</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Modal pour le dropdown des sections */}
      <Modal
        visible={isSectionDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSectionDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsSectionDropdownOpen(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Sélectionner une Section
            </Text>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedSection === 'all' && { backgroundColor: theme.surfaceSecondary }
                ]}
                onPress={() => {
                  setSelectedSection('all');
                  setIsSectionDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  { 
                    color: selectedSection === 'all' ? theme.primary : theme.textPrimary,
                    fontWeight: selectedSection === 'all' ? '600' : '400'
                  }
                ]}>
                  Toutes les Sections
                </Text>
                {selectedSection === 'all' && (
                  <Feather name="check" size={16} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              {segments.filter(s => s !== 'all').map((segment) => (
                <TouchableOpacity
                  key={segment}
                  style={[
                    styles.modalItem,
                    selectedSection === segment && { backgroundColor: theme.surfaceSecondary }
                  ]}
                  onPress={() => {
                    setSelectedSection(segment);
                    setIsSectionDropdownOpen(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { 
                      color: selectedSection === segment ? theme.primary : theme.textPrimary,
                      fontWeight: selectedSection === segment ? '600' : '400'
                    }
                  ]}>
                    {segment}
                  </Text>
                  {selectedSection === segment && (
                    <Feather name="check" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Modal pour le dropdown des types de défauts */}
      <Modal
        visible={isDefectTypeDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDefectTypeDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsDefectTypeDropdownOpen(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Sélectionner un Type de Défaut
            </Text>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedDefectType === 'all' && { backgroundColor: theme.surfaceSecondary }
                ]}
                onPress={() => {
                  setSelectedDefectType('all');
                  setIsDefectTypeDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  { 
                    color: selectedDefectType === 'all' ? theme.primary : theme.textPrimary,
                    fontWeight: selectedDefectType === 'all' ? '600' : '400'
                  }
                ]}>
                  Tous les types
                </Text>
                {selectedDefectType === 'all' && (
                  <Feather name="check" size={16} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              {defectTypes.filter(type => type !== 'all').map((defectType) => (
                <TouchableOpacity
                  key={defectType}
                  style={[
                    styles.modalItem,
                    selectedDefectType === defectType && { backgroundColor: theme.surfaceSecondary }
                  ]}
                  onPress={() => {
                    setSelectedDefectType(defectType);
                    setIsDefectTypeDropdownOpen(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { 
                      color: selectedDefectType === defectType ? theme.primary : theme.textPrimary,
                      fontWeight: selectedDefectType === defectType ? '600' : '400'
                    }
                  ]}>
                    {defectType}
                  </Text>
                  {selectedDefectType === defectType && (
                    <Feather name="check" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {defectTypes.length <= 1 && (
              <Text style={[styles.modalItemText, { color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic' }]}>
                Aucun type de défaut trouvé dans les données
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  headerCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  filterCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    marginTop: spacing.xl * 2,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: '#f0f0f0',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  legendCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  legendItems: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  exportButton: {
    padding: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  listCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  listFilterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  listFilterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#F5F5F5',
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listFilterText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  operatorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  defectTypeText: {
    fontSize: 12,
    marginTop: 4,
  },
  operatorStats: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    minWidth: 30,
    alignItems: 'center',
  },
  countText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // New Filter Styles
  selectContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectText: {
    fontSize: 16,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  
  // Section Dropdown Styles
  sectionDropdownContainer: {
    marginTop: spacing.sm,
  },
  sectionDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  sectionDropdownButtonText: {
    fontSize: 16,
    flex: 1,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  modalItemText: {
    fontSize: 16,
    flex: 1,
  },
  // Styles pour la mise en page en ligne des filtres
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl * 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterCardInline: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 80,
  },
  filterTitleInline: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  searchContainerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    height: 40,
  },
  searchInputInline: {
    flex: 1,
    fontSize: 14,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionDropdownButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    height: 40,
  },
  sectionDropdownButtonTextInline: {
    fontSize: 14,
    flex: 1,
  },
});

export default CentreFormationDashboard;
