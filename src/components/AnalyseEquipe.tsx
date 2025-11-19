import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius } from '../theme/spacing';
import { operatorService } from '../services/database';
import { Operator } from '../types/Operator';
import Feather from '@expo/vector-icons/Feather';
import CustomNavbar from './CustomNavbar';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import DatePickerWeb from './common/DatePickerWeb';

const { width: screenWidth } = Dimensions.get('window');
const NAVBAR_HEIGHT = spacing.lg * 2 + 24;

// Composant de carte moderne pour Analyse Équipe
interface EquipeCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

const EquipeCard: React.FC<EquipeCardProps> = ({ title, value, subtitle, icon, color, onPress }) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[styles.equipeCardStyle, { backgroundColor: theme.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${color}15` }]}>
          <Feather name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>{title}</Text>
          <Text style={[styles.cardValue, { color: theme.textPrimary }]}>{value}</Text>
          {subtitle && (
            <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Composant de carte de performance d'équipe
interface PerformanceCardProps {
  title: string;
  data: Array<{ label: string; value: number; color: string; trend?: 'up' | 'down' | 'stable' }>;
  icon: string;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({ title, data, icon }) => {
  const { theme } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <View style={[styles.performanceCard, { backgroundColor: theme.surface }]}>
      <View style={styles.performanceHeader}>
        <View style={styles.performanceHeaderLeft}>
          <Feather name={icon as any} size={20} color={theme.primary} />
          <Text style={[styles.performanceTitle, { color: theme.textPrimary }]}>{title}</Text>
        </View>
        <Text style={[styles.performanceTotal, { color: theme.textSecondary }]}>Total: {total}</Text>
      </View>
      
      <View style={styles.performanceContent}>
        {data.slice(0, 4).map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const getTrendIcon = () => {
            switch (item.trend) {
              case 'up': return 'trending-up';
              case 'down': return 'trending-down';
              default: return 'minus';
            }
          };
          
          return (
            <View key={index} style={styles.performanceItem}>
              <View style={styles.performanceItemLeft}>
                <View style={[styles.performanceIndicator, { backgroundColor: item.color }]} />
                <Text style={[styles.performanceLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <View style={styles.performanceItemRight}>
                <View style={styles.performanceValueRow}>
                  <Text style={[styles.performanceValue, { color: theme.textPrimary }]}>{item.value}</Text>
                  {item.trend && (
                    <Feather 
                      name={getTrendIcon() as any} 
                      size={12} 
                      color={item.trend === 'up' ? '#E74C3C' : item.trend === 'down' ? '#2ECC71' : theme.textTertiary} 
                    />
                  )}
                </View>
                <Text style={[styles.performancePercentage, { color: theme.textSecondary }]}>
                  {percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Composant de tag/badge moderne pour Analyse Équipe
interface EquipeTagProps {
  label: string;
  value?: string | number;
  color: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'soft';
  icon?: string;
  onPress?: () => void;
}

const EquipeTag: React.FC<EquipeTagProps> = ({ 
  label, 
  value, 
  color, 
  size = 'medium', 
  variant = 'soft',
  icon,
  onPress 
}) => {
  const { theme } = useTheme();
  
  const getTagStyle = () => {
    const baseStyle = {
      paddingHorizontal: size === 'small' ? spacing.xs : size === 'large' ? spacing.md : spacing.sm,
      paddingVertical: size === 'small' ? spacing.xs / 2 : size === 'large' ? spacing.sm : spacing.xs,
      borderRadius: size === 'small' ? borderRadius.sm : size === 'large' ? borderRadius.lg : borderRadius.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
    };

    switch (variant) {
      case 'filled':
        return { ...baseStyle, backgroundColor: color };
      case 'outlined':
        return { ...baseStyle, backgroundColor: 'transparent', borderWidth: 1, borderColor: color };
      case 'soft':
      default:
        return { ...baseStyle, backgroundColor: `${color}15` };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'filled':
        return 'white';
      case 'outlined':
      case 'soft':
      default:
        return color;
    }
  };

  const fontSize = size === 'small' ? 10 : size === 'large' ? 14 : 12;

  return (
    <TouchableOpacity 
      style={getTagStyle()} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {icon && (
        <Feather 
          name={icon as any} 
          size={fontSize + 2} 
          color={getTextColor()} 
          style={{ marginRight: spacing.xs / 2 }} 
        />
      )}
      <Text style={{ 
        fontSize, 
        fontWeight: '600', 
        color: getTextColor() 
      }}>
        {label}
      </Text>
      {value && (
        <Text style={{ 
          fontSize, 
          fontWeight: 'bold', 
          color: getTextColor(),
          marginLeft: spacing.xs / 2 
        }}>
          {value}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// Composant de conteneur de tags pour équipe
interface EquipeTagsContainerProps {
  title?: string;
  children: React.ReactNode;
}

const EquipeTagsContainer: React.FC<EquipeTagsContainerProps> = ({ title, children }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.equipeTagsContainer}>
      {title && (
        <Text style={[styles.equipeTagsTitle, { color: theme.textPrimary }]}>{title}</Text>
      )}
      <View style={styles.equipeTagsWrapper}>
        {children}
      </View>
    </View>
  );
};

interface DefectTypeStats {
  defectType: string;
  defectCount: number;
  color: string;
  percentage: number;
}

interface DefectTypeByDate {
  defectType: string;
  date: string;
  defectCount: number;
  color: string;
}

interface ShiftLeaderStats {
  shiftLeader: string;
  defectCount: number;
  color: string;
  lignes: Set<string>;
}

interface ShiftLeaderByDate {
  shiftLeader: string;
  ligne: string;
  date: string;
  defectCount: number;
  color: string;
  defectType: string;
}

const AnalyseEquipe: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [defectTypeStats, setDefectTypeStats] = useState<DefectTypeStats[]>([]);
  const [defectTypeByDateStats, setDefectTypeByDateStats] = useState<{ [date: string]: DefectTypeByDate[] }>({});
  const [currentDate, setCurrentDate] = useState('');

  // États pour le filtrage par date
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [dateFin, setDateFin] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerMode, setDatePickerMode] = useState<'debut' | 'fin'>('debut');
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);

  // Refs pour la capture des graphiques
  const paretoChartRef = useRef<View>(null);

  // Fonction de téléchargement des graphiques
  const downloadChart = async (chartRef: React.RefObject<View | null>, chartName: string) => {
    try {
      // Vérifier si le ref existe
      if (!chartRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer le graphique. Veuillez réessayer.');
        return;
      }

      // Demander les permissions pour MediaLibrary
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'application a besoin d\'accéder à la galerie pour sauvegarder le graphique.');
        return;
      }

      console.log('Début de la capture du graphique:', chartName);

      // Attendre un peu pour s'assurer que le graphique est rendu
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturer le graphique avec des options optimisées pour SVG
      const uri = await captureRef(chartRef.current, {
        format: 'png',
        quality: 0.8,
        result: 'tmpfile',
        snapshotContentContainer: false,
      });

      console.log('Graphique capturé avec succès:', uri);

      // Sauvegarder dans la galerie
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('Asset créé:', asset);
      
      // Essayer de créer un album ou ajouter à l'album existant
      try {
        const album = await MediaLibrary.getAlbumAsync('Quality Charts');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          console.log('Image ajoutée à l\'album existant');
        } else {
          await MediaLibrary.createAlbumAsync('Quality Charts', asset, false);
          console.log('Nouvel album créé avec l\'image');
        }
      } catch (albumError) {
        console.log('Album non créé, image sauvée dans la galerie principale:', albumError);
      }
        
      Alert.alert(
        'Téléchargement réussi ✅',
        `Le graphique "${chartName}" a été sauvegardé dans votre galerie.`
      );

    } catch (error) {
      console.error('Erreur détaillée lors du téléchargement:', error);
      
      // Essayer une méthode alternative si la première échoue
      try {
        console.log('Tentative de capture alternative...');
        if (chartRef.current) {
          const uri = await captureRef(chartRef.current, {
            format: 'jpg',
            quality: 0.7,
          });
          
          const asset = await MediaLibrary.createAssetAsync(uri);
          Alert.alert(
            'Téléchargement réussi (format alternatif)',
            `Le graphique "${chartName}" a été sauvegardé en JPEG.`
          );
        }
      } catch (alternativeError) {
        console.error('Erreur avec méthode alternative:', alternativeError);
        Alert.alert(
          'Erreur de téléchargement', 
          `Impossible de télécharger le graphique. Vérifiez que le graphique est complètement chargé et réessayez.`
        );
      }
    }
  };

  const loadOperators = async () => {
    // Afficher "Toutes périodes" pour indiquer qu'on affiche toutes les données
    setCurrentDate('(Toutes périodes)');
    try {
      setLoading(true);
      const fetchedOperators = await operatorService.getAll();
      setOperators(fetchedOperators as Operator[]);
      
      // Initialiser filteredOperators avec toutes les données si aucun filtre n'est actif
      if (!dateDebut && !dateFin) {
        setFilteredOperators(fetchedOperators as Operator[]);
      }
      
      // Log pour déboguer
      console.log(`📊 Total opérateurs chargés: ${fetchedOperators.length}`);
      const dates = new Set(fetchedOperators.map(op => {
        if (op.dateDetection instanceof Date) {
          return op.dateDetection.toLocaleDateString('fr-FR');
        }
        return 'Date inconnue';
      }));
      console.log(`📅 Dates uniques: ${Array.from(dates).join(', ')}`);
    } catch (error) {
      console.error('Error loading operators:', error);
      Alert.alert('Erreur', 'Échec du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour filtrer les opérateurs par date
  const filterOperators = useMemo(() => {
    let filtered = [...operators];

    if (dateDebut || dateFin) {
      filtered = filtered.filter((operator) => {
        const operatorDate = operator.dateDetection || operator.createdAt;
        if (!operatorDate) return true;

        let opDate;
        try {
          if (operatorDate instanceof Date) {
            opDate = operatorDate;
          } else if (typeof operatorDate === 'string') {
            opDate = new Date(operatorDate);
          } else if (operatorDate && typeof operatorDate === 'object' && (operatorDate as any).seconds) {
            opDate = new Date((operatorDate as any).seconds * 1000);
          } else {
            return true;
          }
          
          if (!opDate || isNaN(opDate.getTime())) return true;
        } catch (error) {
          return true;
        }
        
        const normalizeDate = (date: Date) => {
          const normalized = new Date(date);
          normalized.setHours(0, 0, 0, 0);
          return normalized;
        };

        const normalizedOpDate = normalizeDate(opDate);
        
        if (dateDebut && dateFin) {
          const normalizedDateDebut = normalizeDate(dateDebut);
          const normalizedDateFin = normalizeDate(dateFin);
          return normalizedOpDate >= normalizedDateDebut && normalizedOpDate <= normalizedDateFin;
        } else if (dateDebut) {
          const normalizedDateDebut = normalizeDate(dateDebut);
          return normalizedOpDate >= normalizedDateDebut;
        } else if (dateFin) {
          const normalizedDateFin = normalizeDate(dateFin);
          return normalizedOpDate <= normalizedDateFin;
        }
        
        return true;
      });
    }

    return filtered;
  }, [operators, dateDebut, dateFin]);

  // Mettre à jour les opérateurs filtrés
  useEffect(() => {
    setFilteredOperators(filterOperators);
  }, [filterOperators]);

  // Fonctions utilitaires pour les dates
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR');
  };

  const handleDateChange = (date: Date) => {
    if (datePickerMode === 'debut') {
      setDateDebut(date);
    } else {
      setDateFin(date);
    }
    setShowDatePicker(false);
  };

  const openDatePicker = (mode: 'debut' | 'fin') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const clearDateFilter = () => {
    setDateDebut(null);
    setDateFin(null);
  };

  useEffect(() => {
    loadOperators();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadOperators();
    }, [])
  );

  // Calculer les statistiques par shift leader ET ligne pour le petit graphique
  const calculateShiftLeaderStats = useMemo(() => {
    const defectsByLeaderAndLine: { [key: string]: { shiftLeader: string; ligne: string; count: number } } = {};
    const colors = ['#0A2342', '#19376D', '#3498DB', '#2ECC71', '#FFC300', '#FF8C42', '#E74C3C', '#9B59B6', '#FF6700'];
    const leaderLineColorMap: { [key: string]: string } = {};

    filteredOperators.forEach((op) => {
      const shiftLeader = op.shiftLeaderName || 'Non défini';
      const occurrences = op.nombreOccurrences || 1;
      const ligne = op.ligne ? `L${op.ligne}` : 'Ligne inconnue';
      
      // Ignorer les entrées sans nom de shift leader
      if (shiftLeader === 'Non défini' || !shiftLeader.trim()) {
        return; // Ignorer ces entrées
      }
      
      // Créer une clé unique pour chaque combinaison shift leader + ligne
      const key = `${shiftLeader}-${ligne}`;
      
      if (!defectsByLeaderAndLine[key]) {
        defectsByLeaderAndLine[key] = { shiftLeader, ligne, count: 0 };
      }
      defectsByLeaderAndLine[key].count += occurrences;
      
      // Assigner une couleur à chaque combinaison
      if (!leaderLineColorMap[key]) {
        const colorIndex = Object.keys(leaderLineColorMap).length;
        leaderLineColorMap[key] = colors[colorIndex % colors.length];
      }
    });

    const stats: ShiftLeaderStats[] = Object.entries(defectsByLeaderAndLine)
      .map(([key, data]) => ({
        shiftLeader: data.shiftLeader,
        defectCount: data.count,
        color: leaderLineColorMap[key],
        lignes: new Set([data.ligne]),
      }))
      // Trier par ligne d'abord, puis par nombre de défauts
      .sort((a, b) => {
        const ligneA = parseInt(Array.from(a.lignes)[0].replace('L', '')) || 0;
        const ligneB = parseInt(Array.from(b.lignes)[0].replace('L', '')) || 0;
        
        if (ligneA === ligneB) {
          return b.defectCount - a.defectCount;
        }
        return ligneA - ligneB;
      });

    return stats;
  }, [filteredOperators]);

  // Calculer les statistiques par type de défaut (Pareto)
  const calculateDefectTypeStats = useMemo(() => {
    const defectsByType: { [key: string]: number } = {};
    const colors = ['#0A2342', '#19376D', '#3498DB', '#2ECC71', '#FFC300', '#FF8C42', '#E74C3C', '#9B59B6', '#FF6700'];

    filteredOperators.forEach((op) => {
      // Utiliser uniquement natureDefaut (nom du défaut), pas le code
      const defectType = op.natureDefaut;
      const occurrences = op.nombreOccurrences || 1;
      
      // Ignorer les défauts non définis
      if (!defectType || defectType.trim() === '') {
        return;
      }
      
      if (!defectsByType[defectType]) {
        defectsByType[defectType] = 0;
      }
      defectsByType[defectType] += occurrences;
    });

    const totalDefects = Object.values(defectsByType).reduce((sum, count) => sum + count, 0);

    const stats: DefectTypeStats[] = Object.entries(defectsByType)
      .map(([defectType, defectCount], index) => ({
        defectType,
        defectCount,
        color: colors[index % colors.length],
        percentage: totalDefects > 0 ? (defectCount / totalDefects) * 100 : 0,
      }))
      .sort((a, b) => b.defectCount - a.defectCount);

    return stats;
  }, [filteredOperators]);

  // Calculer les défauts par ligne, shift leader et défaut (TOUTES LES DATES)
  const calculateShiftLeaderByDateStats = useMemo(() => {
    const defectsByLineLeaderDefect: { [key: string]: { count: number; shiftLeader: string; ligne: string; defectType: string } } = {};
    const colors = ['#0A2342', '#19376D', '#3498DB', '#2ECC71', '#FFC300', '#FF8C42', '#E74C3C', '#9B59B6', '#FF6700'];
    const leaderLineColorMap: { [key: string]: string } = {};

    filteredOperators.forEach((op) => {
      const shiftLeader = op.shiftLeaderName || 'Non défini';
      const ligne = op.ligne ? `L${op.ligne}` : 'Ligne inconnue';
      // Utiliser natureDefaut si disponible, sinon codeDefaut, sinon "Défaut non défini"
      const defectType = op.natureDefaut || op.codeDefaut || 'Défaut non défini';
      
      // Ignorer les entrées sans nom de shift leader
      if (shiftLeader === 'Non défini' || !shiftLeader.trim()) {
        return;
      }

      const occurrences = op.nombreOccurrences || 1;
      // Créer une clé unique pour chaque combinaison ligne + défaut + shift leader
      const key = `${ligne}-${defectType}-${shiftLeader}`;
      const colorKey = `${shiftLeader}-${ligne}`;
      
      if (!defectsByLineLeaderDefect[key]) {
        defectsByLineLeaderDefect[key] = { count: 0, shiftLeader, ligne, defectType };
      }
      
      defectsByLineLeaderDefect[key].count += occurrences;

      // Assigner une couleur à chaque combinaison shift leader + ligne
      if (!leaderLineColorMap[colorKey]) {
        const colorIndex = Object.keys(leaderLineColorMap).length;
        leaderLineColorMap[colorKey] = colors[colorIndex % colors.length];
      }
    });

    // Créer un seul groupe avec toutes les données (pas de séparation par date)
    const allData: ShiftLeaderByDate[] = Object.entries(defectsByLineLeaderDefect)
      .map(([key, data]) => {
        const colorKey = `${data.shiftLeader}-${data.ligne}`;
        return {
          shiftLeader: data.shiftLeader,
          ligne: data.ligne,
          date: 'Toutes périodes',
          defectCount: data.count,
          color: leaderLineColorMap[colorKey],
          defectType: data.defectType,
        };
      })
      // Trier d'abord par ligne, puis par nombre de défauts
      .sort((a, b) => {
        // Extraire le numéro de ligne
        const ligneA = parseInt(a.ligne.replace('L', '')) || 0;
        const ligneB = parseInt(b.ligne.replace('L', '')) || 0;
        
        // Si même ligne, trier par nombre de défauts décroissant
        if (ligneA === ligneB) {
          return b.defectCount - a.defectCount;
        }
        // Sinon, trier par numéro de ligne croissant
        return ligneA - ligneB;
      });

    // Retourner un objet avec une seule clé "Toutes périodes" contenant toutes les données
    const result: { [date: string]: ShiftLeaderByDate[] } = { 'Toutes périodes': allData };
    return result;
  }, [filteredOperators]);

  // Calculer les défauts par type et par date
  const calculateDefectTypeByDateStats = useMemo(() => {
    const defectsByTypeAndDate: { [date: string]: { [defectType: string]: number } } = {};
    const colors = ['#0A2342', '#19376D', '#3498DB', '#2ECC71', '#FFC300', '#FF8C42', '#E74C3C', '#9B59B6', '#FF6700'];
    const defectTypeColorMap: { [defectType: string]: string } = {};

    filteredOperators.forEach((op) => {
      const defectType = op.natureDefaut || op.codeDefaut || 'Défaut non défini';
      
      // Extraire la date
      let dateStr = 'Date inconnue';
      if (op.dateDetection) {
        let opDate: Date;
        if (op.dateDetection instanceof Date) {
          opDate = op.dateDetection;
        } else if (typeof op.dateDetection === 'string') {
          opDate = new Date(op.dateDetection);
        } else if ((op.dateDetection as any).toDate) {
          opDate = (op.dateDetection as any).toDate();
        } else {
          opDate = new Date();
        }
        dateStr = opDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }

      const occurrences = op.nombreOccurrences || 1;
      
      if (!defectsByTypeAndDate[dateStr]) {
        defectsByTypeAndDate[dateStr] = {};
      }
      
      if (!defectsByTypeAndDate[dateStr][defectType]) {
        defectsByTypeAndDate[dateStr][defectType] = 0;
      }
      
      defectsByTypeAndDate[dateStr][defectType] += occurrences;

      // Assigner une couleur à chaque type de défaut
      if (!defectTypeColorMap[defectType]) {
        const colorIndex = Object.keys(defectTypeColorMap).length;
        defectTypeColorMap[defectType] = colors[colorIndex % colors.length];
      }
    });

    const result: { [date: string]: DefectTypeByDate[] } = {};
    
    Object.entries(defectsByTypeAndDate).forEach(([date, defectTypes]) => {
      result[date] = Object.entries(defectTypes)
        .map(([defectType, defectCount]) => ({
          defectType,
          date,
          defectCount,
          color: defectTypeColorMap[defectType],
        }))
        .sort((a, b) => b.defectCount - a.defectCount);
    });

    return result;
  }, [filteredOperators]);

  useEffect(() => {
    setDefectTypeStats(calculateDefectTypeStats);
    setDefectTypeByDateStats(calculateDefectTypeByDateStats);
  }, [calculateDefectTypeStats, calculateDefectTypeByDateStats]);

  // Render Pareto chart (vertical bars like in AnalyseDashboard)
  const renderParetoChart = () => {
    if (defectTypeStats.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxDefects = Math.max(...defectTypeStats.map((s) => s.defectCount), 10);
    const chartWidth = screenWidth - 40;
    const chartHeight = 400;
    const barWidth = 35;
    const barSpacing = 10;
    const leftMargin = 50;
    const bottomMargin = 100;
    const topMargin = 40;
    const availableHeight = chartHeight - bottomMargin - topMargin;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(chartWidth, defectTypeStats.length * (barWidth + barSpacing) + leftMargin + 20)} height={chartHeight}>
          {/* Title */}
          <SvgText x={leftMargin + 10} y={25} fontSize="14" fill={theme.textPrimary} fontWeight="bold">
            Pareto des défauts {currentDate}
          </SvgText>

          {/* Axes */}
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={Math.max(chartWidth, defectTypeStats.length * (barWidth + barSpacing) + leftMargin + 20)} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          
          {/* Y-axis labels */}
          {[0, 5, 10, 15, 20, 25, 30].map((value) => {
            const y = chartHeight - bottomMargin - (value / maxDefects) * availableHeight;
            return (
              <G key={value}>
                <Line x1={leftMargin - 5} y1={y} x2={leftMargin} y2={y} stroke={theme.border} strokeWidth="1" />
                <SvgText x={leftMargin - 10} y={y + 4} fontSize="10" fill={theme.textSecondary} textAnchor="end">
                  {value}
                </SvgText>
              </G>
            );
          })}

          {defectTypeStats.map((stat, index) => {
            const barHeight = (stat.defectCount / maxDefects) * availableHeight;
            const x = leftMargin + index * (barWidth + barSpacing) + barSpacing;
            const y = chartHeight - bottomMargin - barHeight;

            return (
              <G key={index}>
                {/* Bar */}
                <Rect x={x} y={y} width={barWidth} height={barHeight} fill={stat.color} rx={4} />
                
                {/* Count on top of bar */}
                <SvgText x={x + barWidth / 2} y={y - 5} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                  {stat.defectCount}
                </SvgText>
                
                {/* Équipe name (rotated) */}
                <SvgText 
                  x={x + barWidth / 2} 
                  y={chartHeight - bottomMargin + 20} 
                  fontSize="9" 
                  fill={theme.textSecondary} 
                  textAnchor="middle" 
                  transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 20})`}
                >
                  {stat.defectType}
                </SvgText>
              </G>
            );
          })}

          {/* Date label */}
          <SvgText 
            x={leftMargin + (defectTypeStats.length * (barWidth + barSpacing)) / 2} 
            y={chartHeight - 20} 
            fontSize="11" 
            fill={theme.textSecondary} 
            textAnchor="middle"
          >
            {currentDate}
          </SvgText>
        </Svg>
      </ScrollView>
    );
  };

  // Render small équipe chart (top right in image) - Défauts par Shift Leader
  const renderSmallEquipeChart = () => {
    if (calculateShiftLeaderStats.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxDefects = Math.max(...calculateShiftLeaderStats.map((s) => s.defectCount), 10);
    const chartWidth = screenWidth - 80;
    const chartHeight = 300;
    const barWidth = 30;
    const barSpacing = 8;
    const leftMargin = 60;
    const bottomMargin = 80;
    const topMargin = 30;
    const availableHeight = chartHeight - bottomMargin - topMargin;

    // Prendre seulement les 6 premiers shift leaders
    const topLeaders = calculateShiftLeaderStats.slice(0, 6);

    // Grouper les barres par ligne
    const lineGroups: { [ligne: string]: { startX: number; endX: number } } = {};
    let currentX = leftMargin + barSpacing + 10;
    let lineStartX = currentX;

    return (
      <Svg width={chartWidth} height={chartHeight}>
        {/* Axes */}
        <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
        <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={chartWidth - 20} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
        
        {/* Y-axis labels */}
        {[0, 5, 10, 15, 20, 25, 30].map((value) => {
          const y = chartHeight - bottomMargin - (value / maxDefects) * availableHeight;
          return (
            <G key={value}>
              <Line x1={leftMargin - 5} y1={y} x2={leftMargin} y2={y} stroke={theme.border} strokeWidth="1" />
              <SvgText x={leftMargin - 10} y={y + 4} fontSize="9" fill={theme.textSecondary} textAnchor="end">
                {value}
              </SvgText>
            </G>
          );
        })}

        {topLeaders.map((stat, index) => {
          const barHeight = (stat.defectCount / maxDefects) * availableHeight;
          
          // Ajouter un espace entre les groupes de lignes
          const lignesArray = Array.from(stat.lignes);
          const currentLigne = lignesArray[0];
          const isNewLine = index > 0 && Array.from(topLeaders[index - 1].lignes)[0] !== currentLigne;
          
          if (isNewLine) {
            // Enregistrer la fin du groupe de ligne précédent
            const prevLigne = Array.from(topLeaders[index - 1].lignes)[0];
            if (!lineGroups[prevLigne]) {
              lineGroups[prevLigne] = { startX: lineStartX, endX: currentX };
            }
            
            currentX += 20; // Espace entre les groupes
            lineStartX = currentX;
          }
          
          const x = currentX;
          currentX += barWidth + barSpacing;
          const y = chartHeight - bottomMargin - barHeight;

          // Si c'est la dernière barre ou la dernière barre de cette ligne
          if (index === topLeaders.length - 1 || 
              (index < topLeaders.length - 1 && Array.from(topLeaders[index + 1].lignes)[0] !== currentLigne)) {
            lineGroups[currentLigne] = { startX: lineStartX, endX: currentX };
          }

          return (
            <G key={index}>
              {/* Bar */}
              <Rect x={x} y={y} width={barWidth} height={barHeight} fill={stat.color} rx={3} />
              
              {/* Count on top */}
              <SvgText x={x + barWidth / 2} y={y - 5} fontSize="11" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                {stat.defectCount}
              </SvgText>
              
              {/* Shift Leader name */}
              <SvgText 
                x={x + barWidth / 2} 
                y={chartHeight - bottomMargin + 15} 
                fontSize="8" 
                fill={stat.color} 
                textAnchor="middle" 
                fontWeight="bold"
                transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 15})`}
              >
                {stat.shiftLeader}
              </SvgText>
            </G>
          );
        })}

        {/* Lignes pointillées de séparation entre les groupes */}
        {Object.entries(lineGroups).map(([ligne, positions], index) => {
          // Ne pas dessiner de ligne après le dernier groupe
          if (index === Object.keys(lineGroups).length - 1) return null;
          
          const separatorX = positions.endX + 10; // Position de la ligne de séparation
          return (
            <Line 
              key={`separator-${ligne}`}
              x1={separatorX} 
              y1={topMargin} 
              x2={separatorX} 
              y2={chartHeight - bottomMargin} 
              stroke={theme.textTertiary || '#CCCCCC'} 
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Labels de ligne groupés */}
        {Object.entries(lineGroups).map(([ligne, positions]) => {
          const centerX = (positions.startX + positions.endX) / 2;
          return (
            <SvgText 
              key={`line-label-${ligne}`}
              x={centerX} 
              y={chartHeight - bottomMargin + 45} 
              fontSize="10" 
              fill={theme.textPrimary} 
              textAnchor="middle"
              fontWeight="bold"
            >
              {ligne}
            </SvgText>
          );
        })}

        {/* Date label */}
        <SvgText 
          x={chartWidth / 2} 
          y={chartHeight - 15} 
          fontSize="10" 
          fill={theme.textSecondary} 
          textAnchor="middle"
        >
          {currentDate}
        </SvgText>
      </Svg>
    );
  };

  // Render détails par ligne, défaut et shift leader
  const renderDetailedLineDefectChart = () => {
    // Grouper les données par ligne, puis par défaut, puis par shift leader
    interface LineDefectDetail {
      ligne: string;
      defects: {
        defectType: string;
        leaders: {
          shiftLeader: string;
          count: number;
          color: string;
        }[];
        totalCount: number;
      }[];
    }

    const lineDefectMap: { [ligne: string]: { [defectType: string]: { [leader: string]: number } } } = {};
    const colors = ['#0A2342', '#19376D', '#3498DB', '#2ECC71', '#FFC300', '#FF8C42', '#E74C3C', '#9B59B6', '#FF6700'];
    const leaderColorMap: { [leader: string]: string } = {};

    filteredOperators.forEach((op) => {
      const shiftLeader = op.shiftLeaderName || 'Non défini';
      const ligne = op.ligne ? `L${op.ligne}` : 'Ligne inconnue';
      const defectType = op.natureDefaut || op.codeDefaut || 'Défaut non défini';
      
      // Ignorer les entrées sans nom de shift leader
      if (shiftLeader === 'Non défini' || !shiftLeader.trim()) {
        return;
      }

      const occurrences = op.nombreOccurrences || 1;

      if (!lineDefectMap[ligne]) {
        lineDefectMap[ligne] = {};
      }
      if (!lineDefectMap[ligne][defectType]) {
        lineDefectMap[ligne][defectType] = {};
      }
      if (!lineDefectMap[ligne][defectType][shiftLeader]) {
        lineDefectMap[ligne][defectType][shiftLeader] = 0;
      }
      lineDefectMap[ligne][defectType][shiftLeader] += occurrences;

      // Assigner une couleur à chaque shift leader
      if (!leaderColorMap[shiftLeader]) {
        const colorIndex = Object.keys(leaderColorMap).length;
        leaderColorMap[shiftLeader] = colors[colorIndex % colors.length];
      }
    });

    // Convertir en tableau structuré
    const lineDetails: LineDefectDetail[] = Object.entries(lineDefectMap)
      .map(([ligne, defects]) => ({
        ligne,
        defects: Object.entries(defects)
          .map(([defectType, leaders]) => {
            const leadersList = Object.entries(leaders).map(([leader, count]) => ({
              shiftLeader: leader,
              count,
              color: leaderColorMap[leader],
            }));
            const totalCount = leadersList.reduce((sum, l) => sum + l.count, 0);
            return {
              defectType,
              leaders: leadersList.sort((a, b) => b.count - a.count),
              totalCount,
            };
          })
          .sort((a, b) => b.totalCount - a.totalCount),
      }))
      .sort((a, b) => {
        const ligneA = parseInt(a.ligne.replace('L', '')) || 0;
        const ligneB = parseInt(b.ligne.replace('L', '')) || 0;
        return ligneA - ligneB;
      });

    if (lineDetails.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="list" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={{ maxHeight: 500 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
        {lineDetails.map((lineDetail, lineIndex) => (
          <View key={lineIndex} style={{ backgroundColor: theme.surfaceSecondary, marginBottom: 15, padding: 15, borderRadius: 8 }}>
            {/* Titre de la ligne */}
            <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
              {lineDetail.ligne}
            </Text>
            
            {/* Liste des défauts pour cette ligne */}
            {lineDetail.defects.map((defect, defectIndex) => (
              <View key={defectIndex} style={{ marginBottom: 12, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: theme.border }}>
                <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 5 }}>
                  {defect.defectType} ({defect.totalCount})
                </Text>
                
                {/* Liste des shift leaders pour ce défaut */}
                {defect.leaders.map((leader, leaderIndex) => (
                  <View key={leaderIndex} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15, marginBottom: 3 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: leader.color, marginRight: 8 }} />
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {leader.shiftLeader}: {leader.count}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  // Render défauts par shift leader et ligne par date
  const renderEquipeByDateChart = () => {
    const allDates = Object.keys(calculateShiftLeaderByDateStats).sort();
    
    if (allDates.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="calendar" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const allShiftLeaders: ShiftLeaderByDate[] = [];
    Object.values(calculateShiftLeaderByDateStats).forEach(leaders => {
      allShiftLeaders.push(...leaders);
    });

    const maxDefects = Math.max(...allShiftLeaders.map((s: ShiftLeaderByDate) => s.defectCount), 10);
    const chartHeight = 550;
    const barWidth = 35;
    const barSpacing = 10;
    const leftMargin = 50;
    const bottomMargin = 180;
    const topMargin = 40;
    const availableHeight = chartHeight - bottomMargin - topMargin;
    const dateSeparationSpace = 60;

    let totalWidth = leftMargin + barSpacing;
    let currentDate = '';
    const separators: number[] = [];

    allDates.forEach((date) => {
      const leaders = calculateShiftLeaderByDateStats[date];
      if (currentDate !== '') {
        separators.push(totalWidth + dateSeparationSpace / 2);
        totalWidth += dateSeparationSpace;
      }
      currentDate = date;
      totalWidth += leaders.length * (barWidth + barSpacing);
    });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(screenWidth - 40, totalWidth + 20)} height={chartHeight}>
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={totalWidth} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />

          {(() => {
            let currentX = leftMargin + barSpacing;
            const dateLabels: { date: string; startX: number; endX: number }[] = [];
            let dateStartX = currentX;

            return (
              <>
                {allDates.map((date, dateIndex) => {
                  const leaders = calculateShiftLeaderByDateStats[date];
                  const dateStartXPos = currentX;

                  // Grouper les barres par ligne pour afficher le label de ligne
                  const lineGroups: { [ligne: string]: { startX: number; endX: number } } = {};
                  let lineStartX = currentX;

                  const lineSeparators: number[] = [];
                  
                  const bars = leaders.map((leader, leaderIndex) => {
                    const barHeightCalc = (leader.defectCount / maxDefects) * availableHeight;
                    const x = currentX;
                    const y = chartHeight - bottomMargin - barHeightCalc;
                    
                    // Ajouter un espace supplémentaire entre les groupes de lignes
                    const isNewLine = leaderIndex > 0 && leaders[leaderIndex - 1].ligne !== leader.ligne;
                    if (isNewLine) {
                      // Enregistrer la fin du groupe de ligne précédent
                      const prevLigne = leaders[leaderIndex - 1].ligne;
                      if (!lineGroups[prevLigne]) {
                        lineGroups[prevLigne] = { startX: lineStartX, endX: currentX };
                      }
                      
                      // Ajouter un séparateur de ligne
                      lineSeparators.push(currentX + 15);
                      
                      currentX += 30; // Espace entre les groupes de lignes (augmenté pour le label)
                      lineStartX = currentX; // Nouveau début de groupe
                    }
                    
                    const xWithSpacing = currentX;
                    currentX += barWidth + barSpacing;

                    // Si c'est la dernière barre ou la dernière barre de cette ligne
                    if (leaderIndex === leaders.length - 1 || 
                        (leaderIndex < leaders.length - 1 && leaders[leaderIndex + 1].ligne !== leader.ligne)) {
                      lineGroups[leader.ligne] = { startX: lineStartX, endX: currentX };
                    }

                    return (
                      <G key={`${date}-${leader.shiftLeader}-${leader.ligne}-${leader.defectType}-${leaderIndex}`}>
                        <Rect x={xWithSpacing} y={y} width={barWidth} height={barHeightCalc} fill={leader.color} rx={4} />
                        <SvgText x={xWithSpacing + barWidth / 2} y={y - 5} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                          {leader.defectCount}
                        </SvgText>
                        {/* Defect name inside the bar with white color for visibility */}
                        <SvgText 
                          x={xWithSpacing + barWidth / 2} 
                          y={y + barHeightCalc / 2} 
                          fontSize="9" 
                          fill="white" 
                          textAnchor="middle"
                          fontWeight="bold"
                          transform={`rotate(-90, ${xWithSpacing + barWidth / 2}, ${y + barHeightCalc / 2})`}
                        >
                          {leader.defectType}
                        </SvgText>
                        {/* Shift Leader name - avec beaucoup plus d'espace */}
                        <SvgText x={xWithSpacing + barWidth / 2} y={chartHeight - bottomMargin + 60} fontSize="11" fill={leader.color} textAnchor="middle" fontWeight="bold">
                          {leader.shiftLeader}
                        </SvgText>
                      </G>
                    );
                  });

                  // Ajouter les labels de ligne en bas avec plus d'espace
                  const lineLabels = Object.entries(lineGroups).map(([ligne, positions]) => {
                    const centerX = (positions.startX + positions.endX) / 2;
                    return (
                      <SvgText 
                        key={`line-label-${ligne}`}
                        x={centerX} 
                        y={chartHeight - bottomMargin + 100} 
                        fontSize="14" 
                        fill={theme.textPrimary} 
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {ligne}
                      </SvgText>
                    );
                  });

                  dateLabels.push({
                    date,
                    startX: dateStartXPos,
                    endX: currentX - barSpacing,
                  });

                  if (dateIndex < allDates.length - 1) {
                    separators.push(currentX + dateSeparationSpace / 2);
                    currentX += dateSeparationSpace;
                  }

                  // Séparateurs de lignes pour cette date
                  const lineSeparatorElements = lineSeparators.map((xPos, idx) => (
                    <G key={`line-separator-${date}-${idx}`}>
                      <Line 
                        x1={xPos} 
                        y1={topMargin} 
                        x2={xPos} 
                        y2={chartHeight - bottomMargin} 
                        stroke={theme.textTertiary || '#CCCCCC'} 
                        strokeWidth="1" 
                        strokeDasharray="4,4" 
                      />
                    </G>
                  ));

                  return (
                    <>
                      {bars}
                      {lineLabels}
                      {lineSeparatorElements}
                    </>
                  );
                })}

                {/* Séparateurs de dates - plus visibles */}
                {separators.map((xPos, idx) => (
                  <G key={`date-separator-${idx}`}>
                    <Rect 
                      x={xPos - 30} 
                      y={topMargin} 
                      width={60} 
                      height={chartHeight - bottomMargin - topMargin} 
                      fill={theme.background} 
                      opacity={0.3} 
                    />
                    <Line 
                      x1={xPos} 
                      y1={topMargin} 
                      x2={xPos} 
                      y2={chartHeight - bottomMargin} 
                      stroke={theme.border} 
                      strokeWidth="4" 
                      strokeDasharray="10,5" 
                      opacity={0.8} 
                    />
                  </G>
                ))}

                {dateLabels.map((label, idx) => (
                  <G key={`date-label-${idx}`}>
                    <Rect 
                      x={label.startX} 
                      y={chartHeight - bottomMargin + 130} 
                      width={label.endX - label.startX} 
                      height={25} 
                      fill={theme.primary} 
                      opacity={0.1}
                      rx={4}
                    />
                    <SvgText 
                      x={(label.startX + label.endX) / 2} 
                      y={chartHeight - bottomMargin + 145} 
                      fontSize="12" 
                      fill={theme.textPrimary} 
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {label.date}
                    </SvgText>
                  </G>
                ))}
              </>
            );
          })()}
        </Svg>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <CustomNavbar title="Analyse Équipe" />
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomNavbar title="Analyse Équipe" />
      <ScrollView style={[styles.scrollView, { paddingTop: insets.top + NAVBAR_HEIGHT }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerSection}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Analyse des Défauts par Type
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Suivi en temps réel des types de défauts
          </Text>
        </View>

        {/* Filtrage par date */}
        <View style={[styles.dateFilterContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.dateFilterHeader}>
            <Feather name="calendar" size={20} color={theme.primary} />
            <Text style={[styles.dateFilterTitle, { color: theme.textPrimary }]}>Filtres par date</Text>
            {(dateDebut || dateFin) && (
              <TouchableOpacity onPress={clearDateFilter} style={styles.clearButton}>
                <Feather name="x" size={16} color={theme.textSecondary} />
                <Text style={[styles.clearButtonText, { color: theme.textSecondary }]}>Effacer</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.dateFilterContent}>
            <View style={styles.dateRow}>
              <View style={styles.dateInputContainer}>
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Date de début</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                  onPress={() => openDatePicker('debut')}
                >
                  <Feather name="calendar" size={16} color={theme.textSecondary} />
                  <Text style={[styles.dateButtonText, { color: theme.textPrimary }]}>
                    {dateDebut ? formatDate(dateDebut) : 'Sélectionner'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputContainer}>
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Date de fin</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                  onPress={() => openDatePicker('fin')}
                >
                  <Feather name="calendar" size={16} color={theme.textSecondary} />
                  <Text style={[styles.dateButtonText, { color: theme.textPrimary }]}>
                    {dateFin ? formatDate(dateFin) : 'Sélectionner'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {(dateDebut || dateFin) && (
              <View style={styles.dateFilterSummary}>
                <Text style={[styles.dateFilterSummaryText, { color: theme.textSecondary }]}>
                  {filteredOperators.length} défaut(s) trouvé(s)
                  {dateDebut && dateFin && ` entre ${formatDate(dateDebut)} et ${formatDate(dateFin)}`}
                  {dateDebut && !dateFin && ` depuis ${formatDate(dateDebut)}`}
                  {!dateDebut && dateFin && ` jusqu'au ${formatDate(dateFin)}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Pareto Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Pareto des défauts par type</Text>
            <View style={styles.chartHeaderButtons}>
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: theme.primary, marginRight: 10 }]}
                onPress={() => downloadChart(paretoChartRef, 'Pareto des défauts par type')}
                activeOpacity={0.7}
              >
                <Feather name="download" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={loadOperators}>
                <Feather name="refresh-cw" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View 
            ref={paretoChartRef}
            style={{ 
              backgroundColor: theme.surface,
              padding: 10,
              borderRadius: 8,
            }}
          >
            {renderParetoChart()}
          </View>
        </View>

        {/* Nombre de défauts par type */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.chartHeader}>
            <Feather name="users" size={24} color={theme.primary} />
            <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Nombre de défauts par Shift Leader {currentDate}</Text>
          </View>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
            Défauts groupés par responsable et lignes
          </Text>
          {renderSmallEquipeChart()}
        </View>

        {/* Défauts par shift leader et ligne par date */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.chartHeader}>
            <Feather name="layers" size={24} color={theme.primary} />
            <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Pareto des défauts par Shift Leader et Ligne</Text>
          </View>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
            Visualisation groupée par date, shift leader et ligne
          </Text>
          {renderEquipeByDateChart()}
        </View>


      </ScrollView>
      
      {/* Modal pour le sélecteur de date */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Sélectionner la date de {datePickerMode === 'debut' ? 'début' : 'fin'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <DatePickerWeb
              value={datePickerMode === 'debut' ? (dateDebut || new Date()) : (dateFin || new Date())}
              onChange={(event: any, selectedDate?: Date) => {
                if (selectedDate) {
                  handleDateChange(selectedDate);
                }
              }}
            />
            
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: theme.surfaceSecondary }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  headerSection: { 
    padding: spacing.lg, 
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  chartContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  chartSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  detailsContainer: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  equipeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defectType: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  defectTypeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defectCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  percentage: {
    fontSize: 14,
  },
  emptyChartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  emptyChartText: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  // Styles pour les cartes équipe
  cardsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  equipeCardStyle: {
    flex: 1,
    marginHorizontal: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Styles pour les cartes de performance
  performanceCardsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  performanceCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: spacing.md,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  performanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  performanceTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  performanceContent: {
    gap: spacing.sm,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  performanceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  performanceIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  performanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  performanceItemRight: {
    alignItems: 'flex-end',
  },
  performanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  performancePercentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Styles pour les tags équipe
  equipeTagsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  equipeTagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  equipeTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  // Date Filter Styles
  dateFilterContainer: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateFilterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  clearButtonText: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  dateFilterContent: {
    gap: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  dateButtonText: {
    fontSize: 14,
    flex: 1,
  },
  dateFilterSummary: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dateFilterSummaryText: {
    fontSize: 12,
    fontStyle: 'italic',
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalCancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Download Button Styles
  chartHeaderButtons: {
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default AnalyseEquipe;
