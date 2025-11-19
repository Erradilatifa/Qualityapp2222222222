import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  Platform, 
  Dimensions,
  StatusBar,
  ScrollView,
  Modal,
  PermissionsAndroid
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import DatePickerWeb from './common/DatePickerWeb';
import EnhancedDateRangePicker from './common/EnhancedDateRangePicker';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { Operator, CATEGORIES, CODES_DEFAUT_PAR_CATEGORIE } from '../types/Operator';
import { operatorService } from '../services/database';
import { useFocusEffect } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Rect, Path, Text as SvgText, Line, Circle, G } from 'react-native-svg';
import CustomNavbar from './CustomNavbar';
import { useNotificationBadge } from '../context/NotificationBadgeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT_BASE = spacing.lg * 2 + 24; // Base height for the content inside the navbar (padding + icon size)

const formatDateInput = (date: Date | null) => {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
};

interface DefautType {
  code: string;
  nature: string;
  count: number;
  percentage: number;
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

interface FilsInverseStats {
  repere: string;
  count: number;
  color: string;
}

interface WorkstationStats {
  posteTravail: string;
  count: number;
  color: string;
}

interface LineStats {
  ligne: string;
  count: number;
  color: string;
}

interface DefautStats {
  totalDefauts: number;
  defautsByType: DefautType[];
  mostFrequentDefauts: DefautType[];
  pieChartData: any[];
  legendData: any[];
  categoryStats: CategoryStats[];
  categoryPieChartData: any[];
  filsInverseStats: FilsInverseStats[]; 
  totalFilsInverseDefauts: number; 
  workstationStats: WorkstationStats[]; 
  lineStats: LineStats[];
  totalLineDefauts: number;
}

const Dashboard = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<DefautStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [selectedOperator, setSelectedOperator] = useState('all');
  const [selectedNature, setSelectedNature] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [natures, setNatures] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  
  const natureChartRef = useRef<View>(null);
  const categoryChartRef = useRef<View>(null);
  const paretoChartRef = useRef<View>(null);
  const filsInversesChartRef = useRef<View>(null);

  // Get screen dimensions for responsive layout
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const isDesktop = screenDimensions.width >= 768;

  // Listen for dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Function to download charts as PNG images
  const downloadChart = async (chartType: string) => {
    console.log('📊 Starting chart download:', chartType);
    
    try {
      setDownloadingChart(chartType);
      
      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
        return;
      }

      // Get the chart reference based on type
      let chartRef;
      let filename;
      
      switch (chartType) {
        case 'nature-pie-chart':
          chartRef = natureChartRef;
          filename = 'defects_by_nature_analysis.png';
          break;
        case 'category-pie-chart':
          chartRef = categoryChartRef;
          filename = 'defects_by_category_analysis.png';
          break;
        case 'pareto-chart':
          chartRef = paretoChartRef;
          filename = 'pareto_chart_analysis.png';
          break;
        case 'fils-inverses-chart':
          chartRef = filsInversesChartRef;
          filename = 'inverted_wires_analysis.png';
          break;
        default:
          throw new Error('Unknown chart type');
      }

      if (!chartRef?.current) {
        Alert.alert('Error', 'Chart not found. Please wait for the chart to load completely.');
        return;
      }

      console.log('📸 Capturing chart:', filename);
      
      // Wait a moment to ensure chart is fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture the chart with high quality settings
      const uri = await captureRef(chartRef.current, {
        format: 'png',
        quality: 1.0, // Maximum quality
        result: 'tmpfile',
        snapshotContentContainer: false,
      });

      console.log('✅ Chart captured successfully:', uri);

      // Save to gallery
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      // Try to organize in album
      try {
        const albumName = 'Quality Analysis Charts';
        let album = await MediaLibrary.getAlbumAsync(albumName);
        
        if (!album) {
          album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
          console.log('📁 Created new album:', albumName);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          console.log('📁 Added to existing album:', albumName);
        }
      } catch (albumError) {
        console.log('📁 Album creation failed, saved to main gallery:', albumError);
      }

      Alert.alert(
        'Download Successful! ✅',
        `Chart saved as "${filename}" in your gallery.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Download failed:', error);
      
      // Try alternative method with JPEG format
      try {
        console.log('🔄 Trying alternative download method...');
        
        let chartRef;
        let filename;
        
        switch (chartType) {
          case 'nature-pie-chart':
            chartRef = natureChartRef;
            filename = 'defects_by_nature_analysis.jpg';
            break;
          case 'category-pie-chart':
            chartRef = categoryChartRef;
            filename = 'defects_by_category_analysis.jpg';
            break;
          case 'pareto-chart':
            chartRef = paretoChartRef;
            filename = 'pareto_chart_analysis.jpg';
            break;
          case 'fils-inverses-chart':
            chartRef = filsInversesChartRef;
            filename = 'inverted_wires_analysis.jpg';
            break;
        }
        
        if (chartRef?.current) {
          const uri = await captureRef(chartRef.current, {
            format: 'jpg',
            quality: 0.9,
          });
          
          await MediaLibrary.createAssetAsync(uri);
          Alert.alert(
            'Download Successful! ✅',
            `Chart saved as "${filename}" (JPEG format) in your gallery.`
          );
        }
      } catch (alternativeError) {
        console.error('❌ Alternative method also failed:', alternativeError);
        Alert.alert(
          'Download Failed',
          'Unable to download the chart. Please ensure the chart is fully loaded and try again.'
        );
      }
    } finally {
      setDownloadingChart(null);
    }
  };
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [downloadingChart, setDownloadingChart] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { refresh: refreshNotifications } = useNotificationBadge();

  const colors = [
    '#FF6700', '#0A2342', '#19376D', '#FF8C42', '#2ECC71',
    '#FFC300', '#FF3B30', '#9B59B6', '#3498DB', '#E74C3C',
    '#1ABC9C', '#F39C12', '#E67E22', '#95A5A6', '#34495E'
  ];

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
      const fetchedOperators = await operatorService.getAll();
      
      const sortedOperators = fetchedOperators.sort((a, b) => {
        let dateA: Date;
        let dateB: Date;
        
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
        
        return dateB.getTime() - dateA.getTime();
      });
      
      setOperators(sortedOperators as Operator[]);
      
      // Rafraîchir les notifications après le chargement des opérateurs
      try {
        await refreshNotifications();
      } catch (error) {
        console.error('Error refreshing notifications:', error);
      }
    } catch (error) {
      console.error('Error loading operators:', error);
      Alert.alert('Erreur', 'Échec du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperators();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadOperators();
    }, [])
  );

  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const opDate = op.dateDetection instanceof Date ? op.dateDetection : (op.dateDetection && (op.dateDetection as any).toDate ? (op.dateDetection as any).toDate() : new Date(op.dateDetection || Date.now()));
      if (!opDate) return false;

      // Si aucune date n'est sélectionnée, afficher tous les opérateurs
      if (!startDate && !endDate) return true;
      
      const opTime = opDate.getTime();
      const startTime = startDate ? startDate.getTime() : null;
      const endTime = endDate ? endDate.getTime() : null;
        
      if (startTime && opTime < startTime) return false;
      if (endTime && opTime > endTime) return false;
      return true;
    });
  }, [operators, startDate, endDate]);

  const calculateStats = useMemo(() => {
    const totalDefauts = filteredOperators.reduce((total, op) => {
      const occurrences = op.nombreOccurrences || 1;
      return total + occurrences;
    }, 0);
    
    const defautsByNature: { [key: string]: number } = {};
    filteredOperators.forEach(op => {
      const nature = op.natureDefaut || 'Sans nature';
      const occurrences = op.nombreOccurrences || 1;
      defautsByNature[nature] = (defautsByNature[nature] || 0) + occurrences;
    });

    const defautsByCategory: { [key: string]: number } = {};
    filteredOperators.forEach(op => {
      const category = op.category || 'Sans catégorie';
      const occurrences = op.nombreOccurrences || 1;
      defautsByCategory[category] = (defautsByCategory[category] || 0) + occurrences;
    });

    const defautsByType: DefautType[] = Object.entries(defautsByNature)
      .map(([nature, count]) => ({
        code: nature,
        nature: nature,
        count,
        percentage: totalDefauts > 0 ? Math.round((count / totalDefauts) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const mostFrequentDefauts = defautsByType.slice(0, 10);

    const pieChartData = defautsByType.map((defaut, index) => ({
      name: defaut.nature.length > 20 ? defaut.nature.substring(0, 20) + '...' : defaut.nature,
      population: defaut.count,
      color: colors[index % colors.length],
      legendFontColor: theme.textPrimary,
      legendFontSize: 12
    }));

    const legendData = defautsByType.map((defaut, index) => ({
      nature: defaut.nature,
      count: defaut.count,
      percentage: defaut.percentage,
      color: colors[index % colors.length]
    }));

    const categoryStats: CategoryStats[] = Object.entries(defautsByCategory)
      .map(([category, count], index) => ({
        category: category === 'Sans catégorie' ? 'Non classé' : category,
        count,
        percentage: totalDefauts > 0 ? Math.round((count / totalDefauts) * 100) : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);

    const categoryPieChartData = categoryStats.map((stat, index) => ({
      name: stat.category.length > 12 ? stat.category.substring(0, 12) + '...' : stat.category,
      population: stat.count,
      color: stat.color,
      legendFontColor: theme.textPrimary,
      legendFontSize: 12
    }));

    const filsInverseDefauts = filteredOperators.filter(op => op.codeDefaut === '210');

    const filsInverseByRepere: { [key: string]: number } = {};
    filsInverseDefauts.forEach(op => {
      const repereKey = `${op.repere1 || 'N/A'} - ${op.repere2 || 'N/A'}`;
      const occurrences = op.nombreOccurrences || 1;
      filsInverseByRepere[repereKey] = (filsInverseByRepere[repereKey] || 0) + occurrences;
    });

    const totalFilsInverseDefauts = filsInverseDefauts.reduce((total, op) => {
      const occurrences = op.nombreOccurrences || 1;
      return total + occurrences;
    }, 0);

    const filsInverseStats: FilsInverseStats[] = Object.entries(filsInverseByRepere)
      .map(([repere, count], index) => ({
        repere,
        count,
        percentage: totalFilsInverseDefauts > 0 ? Math.round((count / totalFilsInverseDefauts) * 100) : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate workstation statistics
    const defautsByWorkstation: { [key: string]: number } = {};
    filteredOperators.forEach(op => {
      const workstation = op.posteTravail || 'Poste non défini';
      const occurrences = op.nombreOccurrences || 1;
      defautsByWorkstation[workstation] = (defautsByWorkstation[workstation] || 0) + occurrences;
    });

    const workstationStats: WorkstationStats[] = Object.entries(defautsByWorkstation)
      .map(([posteTravail, count], index) => ({
        posteTravail,
        count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate line statistics for section 4
    const section4Operators = filteredOperators.filter(op => op.section === 'Section 4');
    const defautsByLine: { [key: string]: number } = {};
    section4Operators.forEach(op => {
      const ligne = op.ligne ? `Ligne ${op.ligne}` : 'Ligne non définie';
      const occurrences = op.nombreOccurrences || 1;
      defautsByLine[ligne] = (defautsByLine[ligne] || 0) + occurrences;
    });

    const totalLineDefauts = section4Operators.reduce((total, op) => {
      const occurrences = op.nombreOccurrences || 1;
      return total + occurrences;
    }, 0);

    const lineStats: LineStats[] = Object.entries(defautsByLine)
      .map(([ligne, count], index) => ({
        ligne,
        count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalDefauts,
      defautsByType,
      mostFrequentDefauts,
      pieChartData,
      legendData,
      categoryStats,
      categoryPieChartData,
      filsInverseStats,
      totalFilsInverseDefauts,
      workstationStats,
      lineStats,
      totalLineDefauts
    } as DefautStats;
  }, [filteredOperators, theme.textPrimary]);

  useEffect(() => {
    setStats(calculateStats);
  }, [calculateStats]);

  const handleStartDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  }, []);

  const handleEndDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
  }, []);

  return (
    <>
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      
      <CustomNavbar 
        title="Dashboard Qualité"
        leftContent={
          <Feather name="bar-chart-2" size={24} color="white" style={{ marginRight: 12 }} />
        }
        rightContent={
          <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}>
            <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold',
                marginRight: 4,
              }}>
              {stats?.totalDefauts || 0} défaut{stats?.totalDefauts !== 1 ? 's' : ''}
            </Text>
            <Text style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: 12,
              }}>
              (avec occurrences)
            </Text>
          </View>
        }
      />

      <ScrollView 
        style={[styles.scrollView, { paddingTop: insets.top + HEADER_HEIGHT_BASE }]} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <EnhancedDateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClearFilters={clearFilters}
        />

        <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Statistiques générales
          </Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{stats?.totalDefauts || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total défauts (avec occurrences)</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{stats?.defautsByType.length || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Types de défauts</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{stats?.categoryStats.length || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Catégories</Text>
            </View>
          </View>
        </View>

        {/* Charts Grid Container for PC Display */}
        <View style={[styles.chartsGridContainer, isDesktop ? styles.chartsGridDesktop : styles.chartsGridMobile]}>
          {stats && stats.pieChartData.length > 0 && (
            <View ref={natureChartRef} style={[styles.chartCard, isDesktop ? styles.chartCardDesktop : styles.chartCardMobile, { backgroundColor: theme.surface }]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
                  Répartition des défauts par nature
                </Text>
                <TouchableOpacity
                  style={[styles.downloadButton, { backgroundColor: theme.primary }]}
                  onPress={() => downloadChart('nature-pie-chart')}
                  activeOpacity={0.7}
                  disabled={downloadingChart === 'nature-pie-chart'}
                >
                  {downloadingChart === 'nature-pie-chart' ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Feather name="download" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Compact SVG Pie Chart for Defects by Nature */}
              <View style={styles.compactPieChartContainer}>
                <Svg width={200} height={200} style={{ alignSelf: 'center' }}>
                  {/* Background circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke={theme.borderLight}
                    strokeWidth="2"
                  />
                
                  {/* Pie chart segments */}
                  {(() => {
                    const centerX = 100;
                    const centerY = 100;
                    const radius = 70;
                    let currentAngle = -90; // Start from top
                    
                      return stats.pieChartData.map((segment, index) => {
                        const total = stats.pieChartData.reduce((sum, d) => sum + d.population, 0);
                        const percentage = total > 0 ? segment.population / total : 0;
                        const angle = percentage * 360;
                        
                        if (percentage === 0) return null;
                        
                        const startAngleRad = (currentAngle * Math.PI) / 180;
                        const endAngleRad = ((currentAngle + angle) * Math.PI) / 180;
                        
                        // Calculate arc points
                        const x1 = centerX + radius * Math.cos(startAngleRad);
                        const y1 = centerY + radius * Math.sin(startAngleRad);
                        const x2 = centerX + radius * Math.cos(endAngleRad);
                        const y2 = centerY + radius * Math.sin(endAngleRad);
                        
                        // Determine if arc is larger than 180 degrees
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        
                        // Create path for pie segment
                        const pathData = [
                          `M ${centerX} ${centerY}`,
                          `L ${x1} ${y1}`,
                          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                          'Z'
                        ].join(' ');
                        
                        // Create label position (middle of the segment)
                        const labelAngleRad = (currentAngle + angle / 2) * Math.PI / 180;
                        const labelRadius = radius * 0.7;
                        const labelX = centerX + labelRadius * Math.cos(labelAngleRad);
                        const labelY = centerY + labelRadius * Math.sin(labelAngleRad);
                        
                        const result = (
                          <G key={index}>
                            <Path
                              d={pathData}
                              fill={segment.color}
                              stroke={theme.surface}
                              strokeWidth="2"
                            />
                            {/* Percentage label */}
                            {percentage > 0.05 && (
                              <SvgText
                                x={labelX}
                                y={labelY}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                fontSize="12"
                                fontWeight="bold"
                                fill="white"
                                stroke="rgba(0,0,0,0.3)"
                                strokeWidth="0.5"
                              >
                                {Math.round(percentage * 100)}%
                              </SvgText>
                            )}
                          </G>
                        );
                        
                        currentAngle += angle;
                        return result;
                      });
                    })()}
                
                  {/* Center circle for info */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="30"
                    fill={theme.surface}
                    stroke={theme.primary}
                    strokeWidth="3"
                  />
                  
                  {/* Center text */}
                  <SvgText
                    x="100"
                    y="95"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill={theme.primary}
                  >
                    {stats.pieChartData.reduce((sum, d) => sum + d.population, 0)}
                  </SvgText>
                  <SvgText
                    x="100"
                    y="110"
                    textAnchor="middle"
                    fontSize="12"
                    fill={theme.textSecondary}
                  >
                    Total
                  </SvgText>
                </Svg>
              </View>
            
            {/* Enhanced Legend */}
            <View style={styles.enhancedLegendContainer}>
              <View style={styles.legendHeader}>
                <Text style={[styles.legendTitle, { color: theme.textPrimary }]}>
                  Détail par nature de défaut
                </Text>
                <View style={styles.legendStats}>
                  <Text style={[styles.legendStatsText, { color: theme.textSecondary }]}>
                    Total: {stats.totalDefauts} défauts
                  </Text>
                </View>
              </View>
              
              <ScrollView 
                style={styles.enhancedLegendScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {stats.pieChartData.map((item, index) => {
                  const total = stats.pieChartData.reduce((sum, d) => sum + d.population, 0);
                  const percentage = total > 0 ? (item.population / total) * 100 : 0;
                  
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.enhancedLegendItem,
                        { backgroundColor: theme.surfaceSecondary }
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.legendItemTop}>
                        <View style={styles.legendItemLeft}>
                          <View style={[
                            styles.enhancedLegendColor, 
                            { backgroundColor: item.color }
                          ]} />
                          <View style={styles.legendItemContent}>
                            <Text style={[styles.enhancedLegendLabel, { color: theme.textPrimary }]}>
                              {item.name} ({item.population})
                            </Text>
                            <Text style={[styles.enhancedLegendSubtext, { color: theme.textTertiary }]}>
                              Nature #{index + 1}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.legendItemRight}>
                          <Text style={[styles.percentageText, { color: item.color }]}>
                            {percentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.legendItemPercentage}>
                        <View style={styles.percentageBarBackground}>
                          <View style={[
                            styles.percentageBar, 
                            { 
                              backgroundColor: item.color,
                              width: `${(percentage / 100) * 100}%`
                            }
                          ]} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            </View>
          )}

          {stats && stats.categoryPieChartData.length > 0 && (
            <View ref={categoryChartRef} style={[styles.chartCard, isDesktop ? styles.chartCardDesktop : styles.chartCardMobile, { backgroundColor: theme.surface }]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
                  Répartition des défauts par catégorie
                </Text>
                <TouchableOpacity
                  style={[styles.downloadButton, { backgroundColor: theme.primary }]}
                  onPress={() => downloadChart('category-pie-chart')}
                  activeOpacity={0.7}
                  disabled={downloadingChart === 'category-pie-chart'}
                >
                  {downloadingChart === 'category-pie-chart' ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Feather name="download" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Compact SVG Pie Chart */}
              <View style={styles.compactPieChartContainer}>
                <Svg width={200} height={200} style={{ alignSelf: 'center' }}>
                  {/* Background circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke={theme.borderLight}
                    strokeWidth="2"
                  />
                
                  {/* Pie chart segments */}
                  {(() => {
                    const centerX = 100;
                    const centerY = 100;
                    const radius = 70;
                    let currentAngle = -90; // Start from top
                    
                      return stats.categoryPieChartData.map((segment, index) => {
                        const total = stats.categoryPieChartData.reduce((sum, d) => sum + d.population, 0);
                        const percentage = total > 0 ? segment.population / total : 0;
                        const angle = percentage * 360;
                        
                        if (percentage === 0) return null;
                        
                        const startAngleRad = (currentAngle * Math.PI) / 180;
                        const endAngleRad = ((currentAngle + angle) * Math.PI) / 180;
                    
                    // Calculate arc points
                    const x1 = centerX + radius * Math.cos(startAngleRad);
                    const y1 = centerY + radius * Math.sin(startAngleRad);
                    const x2 = centerX + radius * Math.cos(endAngleRad);
                    const y2 = centerY + radius * Math.sin(endAngleRad);
                    
                    // Determine if arc is larger than 180 degrees
                    const largeArcFlag = angle > 180 ? 1 : 0;
                    
                    // Create path for pie segment
                    const pathData = [
                      `M ${centerX} ${centerY}`,
                      `L ${x1} ${y1}`,
                      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                      'Z'
                    ].join(' ');
                    
                    // Create label position (middle of the segment)
                    const labelAngleRad = (currentAngle + angle / 2) * Math.PI / 180;
                    const labelRadius = radius * 0.7;
                    const labelX = centerX + labelRadius * Math.cos(labelAngleRad);
                    const labelY = centerY + labelRadius * Math.sin(labelAngleRad);
                    
                    const result = (
                      <G key={index}>
                        <Path
                          d={pathData}
                          fill={segment.color}
                          stroke={theme.surface}
                          strokeWidth="2"
                        />
                        {/* Percentage label */}
                        {percentage > 0.05 && (
                          <SvgText
                            x={labelX}
                            y={labelY}
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            fontSize="12"
                            fontWeight="bold"
                            fill="white"
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth="0.5"
                          >
                            {Math.round(percentage * 100)}%
                          </SvgText>
                        )}
                      </G>
                    );
                    
                    currentAngle += angle;
                    return result;
                  });
                })()}
                
                {/* Center circle for info */}
                <Circle
                  cx="140"
                  cy="140"
                  r="40"
                  fill={theme.surface}
                  stroke={theme.primary}
                  strokeWidth="3"
                />
                
                {/* Center text */}
                <SvgText
                  x="140"
                  y="130"
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="bold"
                  fill={theme.primary}
                >
                  {stats.totalDefauts}
                </SvgText>
                <SvgText
                  x="140"
                  y="150"
                  textAnchor="middle"
                  fontSize="12"
                  fill={theme.textSecondary}
                >
                  Total
                </SvgText>
              </Svg>
            </View>

            {/* Enhanced Legend with Interactive Features */}
            <View style={styles.enhancedLegendContainer}>
              <View style={styles.legendHeader}>
                <Text style={[styles.legendTitle, { color: theme.textPrimary }]}>
                  Détail par catégorie
                </Text>
                <View style={styles.legendStats}>
                  <Text style={[styles.legendStatsText, { color: theme.textSecondary }]}>
                    Total: {stats.totalDefauts} défauts
                  </Text>
                </View>
              </View>
              
              <ScrollView 
                style={styles.enhancedLegendScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {stats.categoryStats.map((category, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.enhancedLegendItem,
                      { backgroundColor: theme.surfaceSecondary }
                    ]}
                    onPress={() => {/* Handle category selection */}}
                    activeOpacity={0.7}
                  >
                    <View style={styles.legendItemTop}>
                      <View style={styles.legendItemLeft}>
                        <View style={[
                          styles.enhancedLegendColor, 
                          { backgroundColor: category.color }
                        ]} />
                        <View style={styles.legendItemContent}>
                          <Text style={[styles.enhancedLegendLabel, { color: theme.textPrimary }]}>
                            {category.category} ({category.count})
                          </Text>
                          <Text style={[styles.enhancedLegendSubtext, { color: theme.textTertiary }]}>
                            Catégorie #{index + 1}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.legendItemRight}>
                        <Text style={[styles.percentageText, { color: category.color }]}>
                          {category.percentage}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.legendItemPercentage}>
                      <View style={styles.percentageBarBackground}>
                        <View style={[
                          styles.percentageBar, 
                          { 
                            backgroundColor: category.color,
                            width: `${(category.percentage / 100) * 100}%`
                          }
                        ]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            </View>
          )}
        </View>

        {stats && stats.totalDefauts > 0 && stats.categoryPieChartData.length === 0 && (
          <View style={[styles.enhancedChartContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.emptyChartContainer}>
              <View style={[styles.emptyChartIcon, { backgroundColor: theme.surfaceSecondary }]}>
                <Feather name="pie-chart" size={32} color={theme.textTertiary} />
              </View>
              <Text style={[styles.emptyChartTitle, { color: theme.textPrimary }]}>
                Aucune catégorie assignée
              </Text>
              <Text style={[styles.emptyChartSubtitle, { color: theme.textSecondary }]}>
                Les défauts détectés n'ont pas de catégorie assignée
              </Text>
              <TouchableOpacity 
                style={[styles.emptyChartAction, { backgroundColor: theme.primary }]}
                onPress={() => {/* Navigate to add category */}}
              >
                <Feather name="plus" size={16} color="white" />
                <Text style={styles.emptyChartActionText}>Assigner des catégories</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===== WORKSTATION CHART ===== */}
        {stats && stats.workstationStats.length > 0 && (
          <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Défauts par poste de travail
            </Text>
            
            <View style={[styles.paretoContainer, { paddingBottom: 30 }]}>
                
                {/* ===== CANVAS SVG PRINCIPAL ===== */}
                <Svg width={screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40)} height={310} style={{ alignSelf: 'center' }}>
                  
                  {/* ===== LIGNES DE GRILLE HORIZONTALES ===== */}
                  {[0, 25, 50, 75, 100].map((percent, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const maxCount = Math.max(...stats.workstationStats.map(d => d.count));
                    return (
                      <Line
                        key={`grid-h-${index}`}
                        x1="60"
                        y1={180 - (percent / 100) * 160}
                        x2={chartWidth - 40}
                        y2={180 - (percent / 100) * 160}
                        stroke={theme.borderLight}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity={0.6}
                      />
                    );
                  })}
                  
                  {/* ===== AXE Y GAUCHE (COMPTEURS) ===== */}
                  <Line
                    x1="60"
                    y1="20"
                    x2="60"
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== LABELS AXE Y GAUCHE (COMPTEURS) ===== */}
                  {(() => {
                    if (!Array.isArray(stats.workstationStats)) return null;
                    const maxCount = Math.max(...stats.workstationStats.map(d => d.count));
                    return [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                      <SvgText
                        key={`y-count-label-${index}`}
                        x="50"
                        y={180 - (ratio * 160) + 5}
                        textAnchor="end"
                        fontSize="11"
                        fill={theme.textSecondary}
                        fontWeight="500"
                      >
                        {Math.round(maxCount * ratio)}
                      </SvgText>
                    ));
                  })()}
                  
                  {/* ===== AXE X (POSTES DE TRAVAIL) ===== */}
                  <Line
                    x1="60"
                    y1="180"
                    x2={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== BARRES VERTICALES (DÉFAUTS PAR POSTE) ===== */}
                  {Array.isArray(stats.workstationStats) && stats.workstationStats.map((workstation, index) => {
                    const maxCount = Math.max(...stats.workstationStats.map(d => d.count));
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.workstationStats.length;
                    const barHeight = (workstation.count / maxCount) * 140;
                    const x = 60 + (index * barWidth) + (barWidth * 0.1);
                    const width = barWidth * 1.04;
                    
                    return (
                      <React.Fragment key={`bar-workstation-${index}`}>
                        {/* Barre principale */}
                        <Rect
                          key={`bar-rect-${index}`}
                          x={x}
                          y={180 - barHeight}
                          width={width}
                          height={barHeight}
                          fill={workstation.color}
                          opacity={0.9}
                          rx={2}
                        />
                        {/* Label de valeur sur la barre */}
                        <SvgText
                          key={`bar-value-${index}`}
                          x={x + width / 2}
                          y={180 - barHeight - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fill={theme.textPrimary}
                          fontWeight="bold"
                        >
                          {workstation.count}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* ===== LABELS AXE X (NOMS DES POSTES) ===== */}
                  {Array.isArray(stats.workstationStats) && stats.workstationStats.map((workstation, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.workstationStats.length;
                    const x = 60 + (index * barWidth) + (barWidth * 0.5);
                    
                    return (
                      <SvgText
                        key={`x-workstation-label-${index}`}
                        x={x}
                        y={250}
                        textAnchor="middle"
                        fontSize="14"
                        fill={theme.textPrimary}
                        fontWeight="bold"
                        transform={`rotate(-90 ${x} ${250})`}
                      >
                        {workstation.posteTravail}
                      </SvgText>
                    );
                  })}
                </Svg>
            </View>
          </View>
        )}

        {stats && stats.categoryStats.length > 0 && (
          <View ref={paretoChartRef} style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Diagramme de Pareto - Défauts par catégorie
              </Text>
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: theme.primary }]}
                onPress={() => downloadChart('pareto-chart')}
                activeOpacity={0.7}
                disabled={downloadingChart === 'pareto-chart'}
              >
                {downloadingChart === 'pareto-chart' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Feather name="download" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={[styles.paretoContainer, { paddingBottom: 30 }]}>
                
                {/* ===== CANVAS SVG PRINCIPAL ===== */}
                <Svg width={screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40)} height={310} style={{ alignSelf: 'center' }}>
                  
                  {/* ===== LIGNES DE GRILLE HORIZONTALES ===== */}
                  {[0, 25, 50, 75, 100].map((percent, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    return (
                      <Line
                        key={`grid-h-${index}`}
                        x1="60"
                        y1={180 - (percent / 100) * 160}
                        x2={chartWidth - 40}
                        y2={180 - (percent / 100) * 160}
                        stroke={theme.borderLight}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity={0.6}
                      />
                    );
                  })}
                  
                  {/* ===== AXE Y GAUCHE (COMPTEURS) ===== */}
                  <Line
                    x1="60"
                    y1="20"
                    x2="60"
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== LABELS AXE Y GAUCHE (COMPTEURS) ===== */}
                  {(() => {
                    if (!Array.isArray(stats.categoryStats)) return null;
                    const maxCount = Math.max(...stats.categoryStats.map(d => d.count));
                    return [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                      <SvgText
                        key={`y-count-label-${index}`}
                        x="50"
                        y={180 - (ratio * 160) + 5}
                        textAnchor="end"
                        fontSize="11"
                        fill={theme.textSecondary}
                        fontWeight="500"
                      >
                        {Math.round(maxCount * ratio)}
                      </SvgText>
                    ));
                  })()}
                  
                  {/* ===== AXE Y DROITE (POURCENTAGES) ===== */}
                  <Line
                    x1={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y1="20"
                    x2={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y2="180"
                    stroke="#FF6700"
                    strokeWidth="2"
                  />
                  
                  {/* ===== LABELS AXE Y DROITE (POURCENTAGES) ===== */}
                  {[0, 20, 40, 60, 80, 100].map((percent, index) => (
                    <SvgText
                      key={`y-percent-label-${index}`}
                      x={screenWidth >= 768 ? (screenWidth * 0.45) - 30 : screenWidth - 70}
                      y={180 - (percent / 100) * 160 + 5}
                      textAnchor="start"
                      fontSize="11"
                      fill="#FF6700"
                      fontWeight="500"
                    >
                      {percent}%
                    </SvgText>
                  ))}
                  
                  {/* ===== AXE X (CATÉGORIES) ===== */}
                  <Line
                    x1="60"
                    y1="180"
                    x2={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== BARRES VERTICALES (DÉFAUTS PAR CATÉGORIE) ===== */}
                  {Array.isArray(stats.categoryStats) && stats.categoryStats.map((category, index) => {
                    const maxCount = Math.max(...stats.categoryStats.map(d => d.count));
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.categoryStats.length;
                    const barHeight = (category.count / maxCount) * 140;
                    const x = 60 + (index * barWidth) + (barWidth * 0.1);
                    const width = barWidth * 1.04;
                    
                    return (
                      <React.Fragment key={`bar-category-${index}`}>
                        {/* Barre principale */}
                        <Rect
                          key={`bar-rect-${index}`}
                          x={x}
                          y={180 - barHeight}
                          width={width}
                          height={barHeight}
                          fill={category.color}
                          opacity={0.9}
                          rx={2}
                        />
                        {/* Label de valeur sur la barre */}
                        <SvgText
                          key={`bar-value-${index}`}
                          x={x + width / 2}
                          y={180 - barHeight - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fill={theme.textPrimary}
                          fontWeight="bold"
                        >
                          {category.count}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* ===== COURBE CUMULATIVE (LIGNE ORANGE) ===== */}
                  {(() => {
                    if (!Array.isArray(stats.categoryStats)) return null;
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.categoryStats.length;
                    const points = stats.categoryStats.map((category, index) => {
                      const cumulativeCount = stats.categoryStats
                        .slice(0, index + 1)
                        .reduce((sum, d) => sum + d.count, 0);
                      const percentage = (cumulativeCount / stats.totalDefauts) * 100;
                      const x = 60 + (index * barWidth) + (barWidth * 0.5);
                      const y = 180 - (percentage / 100) * 160;
                      return { x, y };
                    });
                    
                    const pathData = points.map((point, index) => 
                      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                    ).join(' ');
                    
                    return (
                      <Path
                        d={pathData}
                        stroke="#FF6700"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })()}
                  
                  {/* ===== POINTS SUR LA COURBE CUMULATIVE ===== */}
                  {(() => {
                    if (!Array.isArray(stats.categoryStats)) return null;
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.categoryStats.length;
                    return stats.categoryStats.map((category, index) => {
                      const cumulativeCount = stats.categoryStats
                        .slice(0, index + 1)
                        .reduce((sum, d) => sum + d.count, 0);
                      const percentage = (cumulativeCount / stats.totalDefauts) * 100;
                      const x = 60 + (index * barWidth) + (barWidth * 0.5);
                      const y = 180 - (percentage / 100) * 160;
                      
                      return (
                        <Circle
                          key={`cumulative-point-${index}`}
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#FF6700"
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                  
                  {/* ===== LABELS AXE X (NOMS DES CATÉGORIES) ===== */}
                  {Array.isArray(stats.categoryStats) && stats.categoryStats.map((category, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.categoryStats.length;
                    const x = 60 + (index * barWidth) + (barWidth * 0.5);
                    
                    return (
                      <SvgText
                        key={`x-category-label-${index}`}
                        x={x}
                        y={250}
                        textAnchor="middle"
                        fontSize="14"
                        fill={theme.textPrimary}
                        fontWeight="bold"
                        transform={`rotate(-90 ${x} ${250})`}
                      >
                        {category.category}
                      </SvgText>
                    );
                  })}
                </Svg>
            </View>
          </View>
        )}

        {stats && stats.filsInverseStats.length > 0 && (
          <View ref={filsInversesChartRef} style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Diagramme de Pareto - Fils inversés par repère
              </Text>
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: theme.primary }]}
                onPress={() => downloadChart('fils-inverses-chart')}
                activeOpacity={0.7}
                disabled={downloadingChart === 'fils-inverses-chart'}
              >
                {downloadingChart === 'fils-inverses-chart' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Feather name="download" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={[styles.paretoContainer, { paddingBottom: 30 }]}>
                
                {/* ===== CANVAS SVG PRINCIPAL ===== */}
                <Svg width={screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40)} height={310} style={{ alignSelf: 'center' }}>
                  
                  {/* ===== LIGNES DE GRILLE HORIZONTALES ===== */}
                  {[0, 25, 50, 75, 100].map((percent, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    return (
                      <Line
                        key={`grid-h-${index}`}
                        x1="60"
                        y1={180 - (percent / 100) * 160}
                        x2={chartWidth - 40}
                        y2={180 - (percent / 100) * 160}
                        stroke={theme.borderLight}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity={0.6}
                      />
                    );
                  })}
                  
                  {/* ===== AXE Y GAUCHE (COMPTEURS) ===== */}
                  <Line
                    x1="60"
                    y1="20"
                    x2="60"
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== LABELS AXE Y GAUCHE (COMPTEURS) ===== */}
                  {(() => {
                    if (!Array.isArray(stats.filsInverseStats)) return null;
                    const maxCount = Math.max(...stats.filsInverseStats.map(d => d.count));
                    return [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                      <SvgText
                        key={`y-count-label-${index}`}
                        x="50"
                        y={180 - (ratio * 160) + 5}
                        textAnchor="end"
                        fontSize="11"
                        fill={theme.textSecondary}
                        fontWeight="500"
                      >
                        {Math.round(maxCount * ratio)}
                      </SvgText>
                    ));
                  })()}
                  
                  {/* ===== AXE Y DROITE (POURCENTAGES) ===== */}
                  <Line
                    x1={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y1="20"
                    x2={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y2="180"
                    stroke="#FF6700"
                    strokeWidth="2"
                  />
                  
                  {/* ===== LABELS AXE Y DROITE (POURCENTAGES) ===== */}
                  {[0, 20, 40, 60, 80, 100].map((percent, index) => (
                    <SvgText
                      key={`y-percent-label-${index}`}
                      x={screenWidth >= 768 ? (screenWidth * 0.45) - 30 : screenWidth - 70}
                      y={180 - (percent / 100) * 160 + 5}
                      textAnchor="start"
                      fontSize="11"
                      fill="#FF6700"
                      fontWeight="500"
                    >
                      {percent}%
                    </SvgText>
                  ))}
                  
                  {/* ===== AXE X (FILS INVERSÉS) ===== */}
                  <Line
                    x1="60"
                    y1="180"
                    x2={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== BARRES VERTICALES (FILS INVERSÉS PAR REPÈRE) ===== */}
                  {Array.isArray(stats.filsInverseStats) && stats.filsInverseStats.map((item, index) => {
                    const maxCount = Math.max(...stats.filsInverseStats.map(d => d.count));
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.filsInverseStats.length;
                    const barHeight = (item.count / maxCount) * 140;
                    const x = 60 + (index * barWidth) + (barWidth * 0.1);
                    const width = barWidth * 1.04;
                    
                    return (
                      <React.Fragment key={`bar-fils-${index}`}>
                        {/* Barre principale */}
                        <Rect
                          key={`bar-rect-${index}`}
                          x={x}
                          y={180 - barHeight}
                          width={width}
                          height={barHeight}
                          fill={item.color}
                          opacity={0.9}
                          rx={2}
                        />
                        {/* Label de valeur sur la barre */}
                        <SvgText
                          key={`bar-value-${index}`}
                          x={x + width / 2}
                          y={180 - barHeight - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fill={theme.textPrimary}
                          fontWeight="bold"
                        >
                          {item.count}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* ===== COURBE CUMULATIVE (LIGNE ORANGE) ===== */}
                  {(() => {
                    if (!Array.isArray(stats.filsInverseStats)) return null;
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.filsInverseStats.length;
                    const points = stats.filsInverseStats.map((item, index) => {
                      const cumulativeCount = stats.filsInverseStats
                        .slice(0, index + 1)
                        .reduce((sum, d) => sum + d.count, 0);
                      const percentage = (cumulativeCount / stats.totalFilsInverseDefauts) * 100;
                      const x = 60 + (index * barWidth) + (barWidth * 0.5);
                      const y = 180 - (percentage / 100) * 160;
                      return { x, y };
                    });
                    
                    const pathData = points.map((point, index) => 
                      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                    ).join(' ');
                    
                    return (
                      <Path
                        d={pathData}
                        stroke="#FF6700"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })()}
                  
                  {/* ===== POINTS SUR LA COURBE CUMULATIVE ===== */}
                  {(() => {
                    if (!Array.isArray(stats.filsInverseStats)) return null;
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.filsInverseStats.length;
                    return stats.filsInverseStats.map((item, index) => {
                      const cumulativeCount = stats.filsInverseStats
                        .slice(0, index + 1)
                        .reduce((sum, d) => sum + d.count, 0);
                      const percentage = (cumulativeCount / stats.totalFilsInverseDefauts) * 100;
                      const x = 60 + (index * barWidth) + (barWidth * 0.5);
                      const y = 180 - (percentage / 100) * 160;
                      
                      return (
                        <Circle
                          key={`cumulative-point-${index}`}
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#FF6700"
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                  
                  {/* ===== LABELS AXE X (NOMS DES REPÈRES) ===== */}
                  {Array.isArray(stats.filsInverseStats) && stats.filsInverseStats.map((item, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.filsInverseStats.length;
                    const barX = 60 + (index * barWidth) + (barWidth * 0.1);
                    const barWidthActual = barWidth * 1.04;
                    const x = barX + (barWidthActual / 2);
                    
                    return (
                      <SvgText
                        key={`x-repere-label-${index}`}
                        x={x}
                        y={250}
                        textAnchor="middle"
                        fontSize="14"
                        fill={theme.textPrimary}
                        fontWeight="bold"
                        transform={`rotate(-90 ${x} ${250})`}
                      >
                        {item.repere}
                      </SvgText>
                    );
                  })}
                </Svg>
            </View>
          </View>
        )}

        {/* ===== LINE PARETO CHART FOR SECTION 4 ===== */}
        {stats && stats.lineStats.length > 0 && (
          <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Diagramme de Pareto - Défauts par ligne (Section 4)
            </Text>
            
            <View style={[styles.paretoContainer, { paddingBottom: 30 }]}>
                
                {/* ===== CANVAS SVG PRINCIPAL ===== */}
                <Svg width={screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40)} height={310} style={{ alignSelf: 'center' }}>
                  
                  {/* ===== LIGNES DE GRILLE HORIZONTALES ===== */}
                  {[0, 25, 50, 75, 100].map((percent, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    return (
                      <Line
                        key={`grid-h-${index}`}
                        x1="60"
                        y1={180 - (percent / 100) * 160}
                        x2={chartWidth - 40}
                        y2={180 - (percent / 100) * 160}
                        stroke={theme.borderLight}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity={0.6}
                      />
                    );
                  })}
                  
                  {/* ===== AXE Y GAUCHE (COMPTEURS) ===== */}
                  <Line
                    x1="60"
                    y1="20"
                    x2="60"
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== LABELS AXE Y GAUCHE (COMPTEURS) ===== */}
                  {(() => {
                    if (!Array.isArray(stats.lineStats)) return null;
                    const maxCount = Math.max(...stats.lineStats.map(d => d.count));
                    return [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                      <SvgText
                        key={`y-count-label-${index}`}
                        x="50"
                        y={180 - (ratio * 160) + 5}
                        textAnchor="end"
                        fontSize="11"
                        fill={theme.textSecondary}
                        fontWeight="500"
                      >
                        {Math.round(maxCount * ratio)}
                      </SvgText>
                    ));
                  })()}
                  
                  {/* ===== AXE Y DROITE (POURCENTAGES) ===== */}
                  <Line
                    x1={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y1="20"
                    x2={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y2="180"
                    stroke="#FF6700"
                    strokeWidth="2"
                  />
                  
                  {/* ===== LABELS AXE Y DROITE (POURCENTAGES) ===== */}
                  {[0, 20, 40, 60, 80, 100].map((percent, index) => (
                    <SvgText
                      key={`y-percent-label-${index}`}
                      x={screenWidth >= 768 ? (screenWidth * 0.45) - 30 : screenWidth - 70}
                      y={180 - (percent / 100) * 160 + 5}
                      textAnchor="start"
                      fontSize="11"
                      fill="#FF6700"
                      fontWeight="500"
                    >
                      {percent}%
                    </SvgText>
                  ))}
                  
                  {/* ===== AXE X (LIGNES) ===== */}
                  <Line
                    x1="60"
                    y1="180"
                    x2={screenWidth >= 768 ? (screenWidth * 0.45) - 40 : screenWidth - 80}
                    y2="180"
                    stroke={theme.textSecondary}
                    strokeWidth="2"
                  />
                  
                  {/* ===== BARRES VERTICALES (DÉFAUTS PAR LIGNE) ===== */}
                  {Array.isArray(stats.lineStats) && stats.lineStats.map((line, index) => {
                    const maxCount = Math.max(...stats.lineStats.map(d => d.count));
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.lineStats.length;
                    const barHeight = (line.count / maxCount) * 140;
                    const x = 60 + (index * barWidth) + (barWidth * 0.1);
                    const width = barWidth * 1.04;
                    
                    return (
                      <React.Fragment key={`bar-line-${index}`}>
                        {/* Barre principale */}
                        <Rect
                          key={`bar-rect-${index}`}
                          x={x}
                          y={180 - barHeight}
                          width={width}
                          height={barHeight}
                          fill={line.color}
                          opacity={0.9}
                          rx={2}
                        />
                        {/* Label de valeur sur la barre */}
                        <SvgText
                          key={`bar-value-${index}`}
                          x={x + width / 2}
                          y={180 - barHeight - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fill={theme.textPrimary}
                          fontWeight="bold"
                        >
                          {line.count}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* ===== COURBE CUMULATIVE (LIGNE ORANGE) ===== */}
                  {(() => {
                    if (!Array.isArray(stats.lineStats)) return null;
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.lineStats.length;
                    const points = stats.lineStats.map((line, index) => {
                      const cumulativeCount = stats.lineStats
                        .slice(0, index + 1)
                        .reduce((sum, d) => sum + d.count, 0);
                      const percentage = (cumulativeCount / stats.totalLineDefauts) * 100;
                      const x = 60 + (index * barWidth) + (barWidth * 0.5);
                      const y = 180 - (percentage / 100) * 160;
                      return { x, y };
                    });
                    
                    const pathData = points.map((point, index) => 
                      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                    ).join(' ');
                    
                    return (
                      <Path
                        d={pathData}
                        stroke="#FF6700"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })()}
                  
                  {/* ===== POINTS SUR LA COURBE CUMULATIVE ===== */}
                  {(() => {
                    if (!Array.isArray(stats.lineStats)) return null;
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.lineStats.length;
                    return stats.lineStats.map((line, index) => {
                      const cumulativeCount = stats.lineStats
                        .slice(0, index + 1)
                        .reduce((sum, d) => sum + d.count, 0);
                      const percentage = (cumulativeCount / stats.totalLineDefauts) * 100;
                      const x = 60 + (index * barWidth) + (barWidth * 0.5);
                      const y = 180 - (percentage / 100) * 160;
                      
                      return (
                        <Circle
                          key={`cumulative-point-${index}`}
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#FF6700"
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                  
                  {/* ===== LABELS AXE X (NOMS DES LIGNES) ===== */}
                  {Array.isArray(stats.lineStats) && stats.lineStats.map((line, index) => {
                    const chartWidth = screenWidth >= 768 ? (screenWidth * 0.45) : (screenWidth - 40);
                    const barWidth = (chartWidth - 140) / stats.lineStats.length;
                    const x = 60 + (index * barWidth) + (barWidth * 0.5);
                    
                    return (
                      <SvgText
                        key={`x-line-label-${index}`}
                        x={x}
                        y={250}
                        textAnchor="middle"
                        fontSize="14"
                        fill={theme.textPrimary}
                        fontWeight="bold"
                        transform={`rotate(-90 ${x} ${250})`}
                      >
                        {line.ligne}
                      </SvgText>
                    );
                  })}
                </Svg>
            </View>
          </View>
        )}

        {!loading && (!stats || stats.totalDefauts === 0) && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceSecondary }]}>
              <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              Aucune donnée disponible
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {startDate || endDate
                ? 'Aucun défaut ne correspond au filtre de date'
                : 'Ajoutez des défauts pour voir les statistiques'
              }
            </Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Chargement des statistiques...
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Remove marginTop and marginBottom as SafeAreaView handles this
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  filtersContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filterModeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  filterModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterItem: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateButtonPlaceholder: {
    fontSize: 14,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  clearFiltersText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  statsContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    width: '31%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  chartContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center', // Added for centering content
  },
  barChartContainer: {
    paddingVertical: 10,
  },
  barChartSegment: {
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  barChartSegmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barChartSegmentColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  barChartSegmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  barChartSegmentBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barChartSegmentBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  barChartSegmentValue: {
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '500',
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
    minHeight: 280, // Increased height to ensure enough space
    overflow: 'visible', // Ensure no clipping
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 240, // Fixed height for the wrapper
    marginLeft: 20, // Add left margin to center the chart
  },
  chartHolder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 240, // Fixed height for the chart holder
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '48%',
    minWidth: 140,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 14,
  },
  legendValue: {
    fontSize: 10,
    opacity: 0.8,
    lineHeight: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  barChartScrollView: {
    maxHeight: 400,
    paddingRight: 8, 
  },
  legendScrollView: {
    maxHeight: 200,
    paddingRight: 8, 
  },
  paretoScrollView: {
    maxHeight: 250,
    paddingRight: 8,
  },
  paretoContainer: {
    flexDirection: 'column',
    paddingVertical: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  paretoChartArea: {
    flexDirection: 'row',
    position: 'relative',
    width: '100%',
    height: 200,
    marginBottom: 10,
  },
  paretoYAxisLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paretoYAxisRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paretoYAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  paretoMainArea: {
    flex: 1,
    position: 'relative',
    marginLeft: 40,
    marginRight: 40,
    height: 200,
  },
  paretoBarsArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  paretoBarItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  paretoBarContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 200,
  },
  paretoBarVertical: {
    width: 20,
    borderRadius: 2,
    minHeight: 2,
  },
  paretoBarLabel: {
    fontSize: 8,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  paretoCurveArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  paretoCurvePoint: {
    position: 'absolute',
    width: 6,
    height: 6,
  },
  paretoCurveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    marginLeft: -3,
    marginBottom: -3,
  },
  paretoCurveLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 2,
    backgroundColor: '#FF6700',
  },
  paretoLabelsArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingHorizontal: 40,
  },
  paretoDefautLabel: {
    fontSize: 8,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 10,
    flex: 1,
    marginHorizontal: 2,
  },
  paretoLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  paretoLegendItem: {
    alignItems: 'center',
  },
  paretoLegendBar: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  paretoLegendLine: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  paretoLegendText: {
    fontSize: 10,
    textAlign: 'center',
  },
  enhancedChartContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9', // Added background for enhanced charts
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chartTitleContent: {
    flex: 1,
  },
  enhancedSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
    lineHeight: 22,
  },
  enhancedSectionSubtitle: {
    fontSize: 12,
  },
  chartControls: {
    flexDirection: 'row',
    gap: 8,
  },
  chartControlButton: {
    padding: 8,
    borderRadius: 6,
  },
  enhancedPieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
    minHeight: 280, // Increased height to ensure enough space
    overflow: 'visible', // Ensure no clipping
  },
  enhancedParetoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
    minHeight: 280,
    overflow: 'visible',
  },
  pieChartCenterInfo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
  },
  centerInfoNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  centerInfoLabel: {
    fontSize: 14,
  },
  enhancedLegendContainer: {
    marginBottom: 16,
  },
  chartsGridContainer: {
    marginBottom: 20,
  },
  chartsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartsGridMobile: {
    flexDirection: 'column',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartCardDesktop: {
    width: '48%',
  },
  chartCardMobile: {
    width: '100%',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  compactPieChartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  enhancedParetoLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  paretoSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  legendStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendStatsText: {
    fontSize: 12,
  },
  enhancedLegendScrollView: {
    maxHeight: 200,
    paddingRight: 8,
  },
  enhancedLegendItem: {
    flexDirection: 'column',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  legendItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  enhancedLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendItemContent: {
    flex: 1,
  },
  enhancedLegendLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  enhancedLegendSubtext: {
    fontSize: 11,
  },
  legendItemRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 100,
    maxWidth: 120,
  },
  legendItemStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
    flexWrap: 'nowrap',
  },
  legendItemCount: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 30,
  },
  legendItemUnit: {
    fontSize: 11,
    marginLeft: 4,
  },
  legendItemPercentage: {
    width: '100%',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 4,
  },
  percentageBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  percentageBar: {
    height: '100%',
    borderRadius: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyChartIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyChartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyChartSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyChartAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyChartActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Dashboard;
