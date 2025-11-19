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
  PermissionsAndroid,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius } from '../theme/spacing';
import { operatorService } from '../services/database';
import { Operator, CODES_DEFAUT_PAR_CATEGORIE } from '../types/Operator';
import Feather from '@expo/vector-icons/Feather';
import CustomNavbar from './CustomNavbar';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import DatePickerWeb from './common/DatePickerWeb';

const { width: screenWidth } = Dimensions.get('window');
const NAVBAR_HEIGHT = spacing.lg * 2 + 24;

// Composant de carte moderne
interface AnalyseCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

const AnalyseCard: React.FC<AnalyseCardProps> = ({ title, value, subtitle, icon, color, onPress }) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[styles.analyseCard, { backgroundColor: theme.surface }]}
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

// Composant de carte statistique
interface StatsCardProps {
  title: string;
  data: Array<{ label: string; value: number; color: string }>;
  icon: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, data, icon }) => {
  const { theme } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
      <View style={styles.statsHeader}>
        <View style={styles.statsHeaderLeft}>
          <Feather name={icon as any} size={20} color={theme.primary} />
          <Text style={[styles.statsTitle, { color: theme.textPrimary }]}>{title}</Text>
        </View>
        <Text style={[styles.statsTotal, { color: theme.textSecondary }]}>Total: {total}</Text>
      </View>
      
      <View style={styles.statsContent}>
        {data.slice(0, 5).map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <View key={index} style={styles.statsItem}>
              <View style={styles.statsItemLeft}>
                <View style={[styles.statsIndicator, { backgroundColor: item.color }]} />
                <Text style={[styles.statsLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <View style={styles.statsItemRight}>
                <Text style={[styles.statsValue, { color: theme.textPrimary }]}>{item.value}</Text>
                <Text style={[styles.statsPercentage, { color: theme.textSecondary }]}>
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

// Composant de tag/badge moderne
interface TagProps {
  label: string;
  value?: string | number;
  color: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'soft';
  icon?: string;
  onPress?: () => void;
}

const Tag: React.FC<TagProps> = ({ 
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

// Composant de conteneur de tags
interface TagsContainerProps {
  title?: string;
  children: React.ReactNode;
}

const TagsContainer: React.FC<TagsContainerProps> = ({ title, children }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.tagsContainer}>
      {title && (
        <Text style={[styles.tagsTitle, { color: theme.textPrimary }]}>{title}</Text>
      )}
      <View style={styles.tagsWrapper}>
        {children}
      </View>
    </View>
  );
};

interface OperatorDefectStats {
  operatorName: string;
  defectCount: number;
  alertLevel: 'none' | 'warning' | 'danger' | 'critical';
  color: string;
}

interface PosteDefectStats {
  posteName: string;
  defectCount: number;
  color: string;
}

interface LigneDefectStats {
  ligneName: string;
  defectCount: number;
  color: string;
}

interface OperatorByLigneStats {
  operatorName: string;
  ligneName: string;
  defectCount: number;
  color: string;
}

interface ShiftLeaderByLigneStats {
  shiftLeaderName: string;
  ligneName: string;
  operators: OperatorByLigneStats[];
  totalDefectCount: number;
  color: string;
}

interface ParetoDefectStats {
  defectCode: string;
  defectName: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
  color: string;
}

interface MajorDefectByOperatorStats {
  defectCode: string;
  defectName: string;
  operators: {
    operatorName: string;
    count: number;
  }[];
  totalCount: number;
  color: string;
}

interface MajorDefectByPosteStats {
  defectCode: string;
  defectName: string;
  postes: {
    posteName: string;
    count: number;
  }[];
  totalCount: number;
  color: string;
}


const AnalyseDashboard: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorDefectStats[]>([]);
  const [posteStats, setPosteStats] = useState<PosteDefectStats[]>([]);
  const [ligneStats, setLigneStats] = useState<LigneDefectStats[]>([]);
  const [operatorsByLigne, setOperatorsByLigne] = useState<{ [ligne: string]: OperatorByLigneStats[] }>({});
  const [shiftLeadersByLigne, setShiftLeadersByLigne] = useState<{ [ligne: string]: ShiftLeaderByLigneStats[] }>({});
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [isSegmentDropdownOpen, setIsSegmentDropdownOpen] = useState<boolean>(false);
  const [paretoDefects, setParetoDefects] = useState<ParetoDefectStats[]>([]);
  const [majorDefectsByOperator, setMajorDefectsByOperator] = useState<MajorDefectByOperatorStats[]>([]);
  const [majorDefectsByPoste, setMajorDefectsByPoste] = useState<MajorDefectByPosteStats[]>([]);
  
  // États pour le filtrage par date
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [dateFin, setDateFin] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerMode, setDatePickerMode] = useState<'debut' | 'fin'>('debut');
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);

  // Refs pour la capture des graphiques
  const operatorsByLigneChartRef = useRef<View>(null);
  const majorDefectsByOperatorChartRef = useRef<View>(null);
  const majorDefectsByPosteChartRef = useRef<View>(null);

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
    try {
      const fetchedOperators = await operatorService.getAll();
      console.log('📊 Données chargées:', fetchedOperators.length, 'opérateurs');
      setOperators(fetchedOperators as Operator[]);
      
      // Initialiser filteredOperators avec toutes les données si aucun filtre n'est actif
      if (!dateDebut && !dateFin && selectedSegment === 'all') {
        console.log('🔄 Initialisation de filteredOperators avec toutes les données');
        setFilteredOperators(fetchedOperators as Operator[]);
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

  // Fonction pour filtrer les opérateurs par date SEULEMENT (global)
  const filterOperators = useMemo(() => {
    // Commencer avec toutes les données
    let filtered = [...operators];

    // Filtrage par date SEULEMENT si des dates sont sélectionnées
    if (dateDebut || dateFin) {
      filtered = filtered.filter((operator) => {
        // Utiliser dateDetection ou createdAt comme date de référence
        const operatorDate = operator.dateDetection || operator.createdAt;
        if (!operatorDate) return true; // Garder les opérateurs sans date

        // Convertir en objet Date de manière sécurisée
        let opDate;
        try {
          if (operatorDate instanceof Date) {
            opDate = operatorDate;
          } else if (typeof operatorDate === 'string') {
            opDate = new Date(operatorDate);
          } else if (operatorDate && typeof operatorDate === 'object' && 'seconds' in operatorDate && (operatorDate as any).seconds) {
            // Format Firebase Timestamp
            opDate = new Date((operatorDate as any).seconds * 1000);
          } else {
            return true; // Garder si format inconnu
          }
          
          // Vérifier si la date est valide
          if (!opDate || isNaN(opDate.getTime())) return true;
        } catch (error) {
          return true; // Garder en cas d'erreur de conversion
        }
        
        // Normaliser les dates pour comparer seulement les jours (ignorer l'heure)
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

  // Mettre à jour les opérateurs filtrés quand les filtres changent
  useEffect(() => {
    setFilteredOperators(filterOperators);
  }, [filterOperators]);

  const calculateOperatorStats = useMemo(() => {
    const defectsByOperator: { [key: string]: number } = {};

    filteredOperators.forEach((op) => {
      // IMPORTANT: Utiliser SEULEMENT operateurNom (le vrai opérateur)
      // PAS op.nom qui est le nom du chef/superviseur
      const operatorName = op.operateurNom;
      if (!operatorName || operatorName.trim() === '') return;
      
      if (!defectsByOperator[operatorName]) {
        defectsByOperator[operatorName] = 0;
      }
      
      const occurrences = op.nombreOccurrences || 1;
      defectsByOperator[operatorName] += occurrences;
    });

    const stats: OperatorDefectStats[] = Object.entries(defectsByOperator)
      .map(([operatorName, defectCount]) => {
        let alertLevel: 'none' | 'warning' | 'danger' | 'critical' = 'none';
        let color = '#2ECC71';

        if (defectCount >= 7) {
          alertLevel = 'critical';
          color = '#E74C3C';
        } else if (defectCount >= 5) {
          alertLevel = 'danger';
          color = '#FF8C42';
        } else if (defectCount >= 3) {
          alertLevel = 'warning';
          color = '#FFC300';
        }

        return { operatorName, defectCount, alertLevel, color };
      })
      .sort((a, b) => b.defectCount - a.defectCount);

    return stats;
  }, [filteredOperators]);

  const calculatePosteStats = useMemo(() => {
    const defectsByPoste: { [key: string]: number } = {};
    const colors = ['#FF6700', '#0A2342', '#19376D', '#FF8C42', '#2ECC71', '#FFC300', '#9B59B6', '#3498DB', '#E74C3C'];

    filteredOperators.forEach((op) => {
      const posteName = op.posteTravail || 'Poste non défini';
      const occurrences = op.nombreOccurrences || 1;
      
      if (!defectsByPoste[posteName]) {
        defectsByPoste[posteName] = 0;
      }
      defectsByPoste[posteName] += occurrences;
    });

    const stats: PosteDefectStats[] = Object.entries(defectsByPoste)
      .map(([posteName, defectCount], index) => ({
        posteName,
        defectCount,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.defectCount - a.defectCount);

    return stats;
  }, [filteredOperators]);

  const calculateLigneStats = useMemo(() => {
    const defectsByLigne: { [key: string]: number } = {};
    const colors = ['#FF6700', '#0A2342', '#19376D', '#FF8C42', '#2ECC71', '#FFC300', '#9B59B6', '#3498DB', '#E74C3C'];

    filteredOperators.forEach((op) => {
      const ligneName = op.ligne ? `Ligne ${op.ligne}` : 'Ligne non définie';
      const occurrences = op.nombreOccurrences || 1;
      
      if (!defectsByLigne[ligneName]) {
        defectsByLigne[ligneName] = 0;
      }
      defectsByLigne[ligneName] += occurrences;
    });

    const stats: LigneDefectStats[] = Object.entries(defectsByLigne)
      .map(([ligneName, defectCount], index) => ({
        ligneName,
        defectCount,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.defectCount - a.defectCount);

    return stats;
  }, [filteredOperators]);

  const calculateOperatorsByLigne = useMemo(() => {
    const operatorsByLigneMap: { [ligne: string]: { [operator: string]: number } } = {};
    const ligneColors = ['#FF6700', '#2ECC71', '#3498DB', '#FFC300', '#9B59B6', '#E74C3C', '#FF8C42', '#19376D', '#0A2342'];

    filteredOperators.forEach((op) => {
      const ligneName = op.ligne ? `Ligne ${op.ligne}` : 'Ligne non définie';
      const operatorName = op.operateurNom;
      
      if (!operatorName || operatorName.trim() === '') return;
      
      const occurrences = op.nombreOccurrences || 1;
      
      if (!operatorsByLigneMap[ligneName]) {
        operatorsByLigneMap[ligneName] = {};
      }
      
      if (!operatorsByLigneMap[ligneName][operatorName]) {
        operatorsByLigneMap[ligneName][operatorName] = 0;
      }
      
      operatorsByLigneMap[ligneName][operatorName] += occurrences;
    });

    const result: { [ligne: string]: OperatorByLigneStats[] } = {};
    
    Object.entries(operatorsByLigneMap).forEach(([ligneName, operators], ligneIndex) => {
      const ligneColor = ligneColors[ligneIndex % ligneColors.length];
      
      result[ligneName] = Object.entries(operators)
        .map(([operatorName, defectCount]) => ({
          operatorName,
          ligneName,
          defectCount,
          color: ligneColor,
        }))
        .sort((a, b) => b.defectCount - a.defectCount);
    });

    return result;
  }, [filteredOperators]);

  const calculateShiftLeadersByLigne = useMemo(() => {
    const shiftLeadersByLigneMap: { [ligne: string]: { [shiftLeader: string]: { [operator: string]: number } } } = {};
    const ligneColors = ['#FF6700', '#2ECC71', '#3498DB', '#FFC300', '#9B59B6', '#E74C3C', '#FF8C42', '#19376D', '#0A2342'];
    const shiftLeaderColors = ['#FF6700', '#0A2342', '#19376D', '#FF8C42', '#2ECC71', '#FFC300', '#9B59B6', '#3498DB', '#E74C3C'];

    // Filtrer les opérateurs par date ET par section pour ce graphique spécifique
    const segmentFilteredOperators = filteredOperators.filter(op => {
      if (selectedSegment === 'all') return true;
      // Vérifier d'abord le champ projet, puis section comme fallback
      const operatorProject = op.projet || op.section;
      return operatorProject === selectedSegment;
    });

    segmentFilteredOperators.forEach((op) => {
      const ligneName = op.ligne ? `Ligne ${op.ligne}` : 'Ligne non définie';
      const operatorName = op.operateurNom;
      const shiftLeaderName = op.shiftLeaderName || 'Shift Leader non défini';
      
      if (!operatorName || operatorName.trim() === '') return;
      
      const occurrences = op.nombreOccurrences || 1;
      
      if (!shiftLeadersByLigneMap[ligneName]) {
        shiftLeadersByLigneMap[ligneName] = {};
      }
      
      if (!shiftLeadersByLigneMap[ligneName][shiftLeaderName]) {
        shiftLeadersByLigneMap[ligneName][shiftLeaderName] = {};
      }
      
      if (!shiftLeadersByLigneMap[ligneName][shiftLeaderName][operatorName]) {
        shiftLeadersByLigneMap[ligneName][shiftLeaderName][operatorName] = 0;
      }
      
      shiftLeadersByLigneMap[ligneName][shiftLeaderName][operatorName] += occurrences;
    });

    const result: { [ligne: string]: ShiftLeaderByLigneStats[] } = {};
    
    Object.entries(shiftLeadersByLigneMap).forEach(([ligneName, shiftLeaders], ligneIndex) => {
      const ligneColor = ligneColors[ligneIndex % ligneColors.length];
      
      result[ligneName] = Object.entries(shiftLeaders)
        .map(([shiftLeaderName, operators], shiftLeaderIndex) => {
          const shiftLeaderColor = shiftLeaderColors[shiftLeaderIndex % shiftLeaderColors.length];
          
          const operatorsList: OperatorByLigneStats[] = Object.entries(operators)
            .map(([operatorName, defectCount]) => ({
              operatorName,
              ligneName,
              defectCount,
              color: shiftLeaderColor,
            }))
            .sort((a, b) => b.defectCount - a.defectCount);

          const totalDefectCount = operatorsList.reduce((sum, op) => sum + op.defectCount, 0);

          return {
            shiftLeaderName,
            ligneName,
            operators: operatorsList,
            totalDefectCount,
            color: shiftLeaderColor,
          };
        })
        .sort((a, b) => b.totalDefectCount - a.totalDefectCount);
    });

    return result;
  }, [filteredOperators, selectedSegment]);

  // Options pour les segments (basées sur les nouveaux projets)
  const segments = [
    'WPA',
    'CRA',
    'X1310 PDB',
    'X1310 LOWDASH',
    'X1310 EGR ICE',
    'X1310 EGR HEV',
    'X1310 ENGINE',
    'X1310 Smalls',
    'P13A SMALLS',
    'P13A MAIN & BODY',
    'P13A EGR'
  ];

  // Get available segments - show all defined segments
  const availableSegments = useMemo(() => {
    // Return all segments so users can filter by any segment
    return segments.sort();
  }, []);

  // Calculate Pareto chart data for defects
  const calculateParetoDefects = useMemo(() => {
    const defectMap: { [defectCode: string]: number } = {};
    const colors = [
      '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', 
      '#1ABC9C', '#E67E22', '#34495E', '#95A5A6', '#F1C40F',
      '#8E44AD', '#16A085', '#27AE60', '#2980B9', '#C0392B'
    ];

    // Count defects by type
    filteredOperators.forEach((op) => {
      if (!op.codeDefaut) return;
      
      const defectCode = op.codeDefaut;
      const occurrences = op.nombreOccurrences || 1;
      
      if (!defectMap[defectCode]) {
        defectMap[defectCode] = 0;
      }
      
      defectMap[defectCode] += occurrences;
    });

    // Convert to array and sort by count (descending)
    const defectArray = Object.entries(defectMap)
      .map(([defectCode, count]) => ({
        defectCode,
        defectName: defectCode,
        count
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate total for percentages
    const totalDefects = defectArray.reduce((sum, item) => sum + item.count, 0);

    // Calculate percentages and cumulative percentages
    let cumulativeCount = 0;
    const paretoData: ParetoDefectStats[] = defectArray.map((item, index) => {
      const percentage = Math.round((item.count / totalDefects) * 100);
      cumulativeCount += item.count;
      const cumulativePercentage = Math.round((cumulativeCount / totalDefects) * 100);
      
      return {
        defectCode: item.defectCode,
        defectName: item.defectName,
        count: item.count,
        percentage,
        cumulativePercentage,
        color: colors[index % colors.length]
      };
    });

    return paretoData;
  }, [operators]);

  // Helper function to get category name from defect code
  const getDefectCategoryName = (defectCode: string): string => {
    for (const [categoryName, codes] of Object.entries(CODES_DEFAUT_PAR_CATEGORIE)) {
      if (codes[defectCode]) {
        return codes[defectCode]; // Return the specific defect name
      }
    }
    return defectCode; // Fallback to code if not found
  };

  // Calculate Major Defects by Operator (Top 3 defects with operators grouped by defect type)
  const calculateMajorDefectsByOperator = useMemo(() => {
    const defectMap: { [defectCode: string]: { [operatorName: string]: number } } = {};
    const colors = ['#E74C3C', '#3498DB', '#2ECC71'];

    // Count defects by type and operator
    filteredOperators.forEach((op) => {
      if (!op.codeDefaut || !op.operateurNom) return;
      
      const defectCode = op.codeDefaut;
      const operatorName = op.operateurNom;
      const occurrences = op.nombreOccurrences || 1;
      
      if (!defectMap[defectCode]) {
        defectMap[defectCode] = {};
      }
      
      if (!defectMap[defectCode][operatorName]) {
        defectMap[defectCode][operatorName] = 0;
      }
      
      defectMap[defectCode][operatorName] += occurrences;
    });

    // Calculate total count per defect and sort to get top 3
    const defectTotals = Object.entries(defectMap).map(([defectCode, operators]) => {
      const totalCount = Object.values(operators).reduce((sum, count) => sum + count, 0);
      return { defectCode, operators, totalCount };
    }).sort((a, b) => b.totalCount - a.totalCount).slice(0, 3);

    // Transform to the required format
    const majorDefectsData: MajorDefectByOperatorStats[] = defectTotals.map((defect, index) => {
      const operatorsList = Object.entries(defect.operators)
        .map(([operatorName, count]) => ({
          operatorName,
          count
        }))
        .sort((a, b) => b.count - a.count);

      return {
        defectCode: defect.defectCode,
        defectName: getDefectCategoryName(defect.defectCode), // Use category name instead of code
        operators: operatorsList,
        totalCount: defect.totalCount,
        color: colors[index % colors.length]
      };
    });

    return majorDefectsData;
  }, [filteredOperators]);

  // Calculate Major Defects by Poste (Top 3 defects with postes grouped by defect type)
  const calculateMajorDefectsByPoste = useMemo(() => {
    const defectMap: { [defectCode: string]: { [posteName: string]: number } } = {};
    const colors = ['#E74C3C', '#3498DB', '#2ECC71'];

    // Count defects by type and poste
    filteredOperators.forEach((op) => {
      if (!op.codeDefaut || !op.posteTravail) return;
      
      const defectCode = op.codeDefaut;
      const posteName = op.posteTravail;
      const occurrences = op.nombreOccurrences || 1;
      
      if (!defectMap[defectCode]) {
        defectMap[defectCode] = {};
      }
      
      if (!defectMap[defectCode][posteName]) {
        defectMap[defectCode][posteName] = 0;
      }
      
      defectMap[defectCode][posteName] += occurrences;
    });

    // Calculate total count per defect and sort to get top 3
    const defectTotals = Object.entries(defectMap).map(([defectCode, postes]) => {
      const totalCount = Object.values(postes).reduce((sum, count) => sum + count, 0);
      return { defectCode, postes, totalCount };
    }).sort((a, b) => b.totalCount - a.totalCount).slice(0, 3);

    // Transform to the required format
    const majorDefectsData: MajorDefectByPosteStats[] = defectTotals.map((defect, index) => {
      const postesList = Object.entries(defect.postes)
        .map(([posteName, count]) => ({
          posteName,
          count
        }))
        .sort((a, b) => b.count - a.count);

      return {
        defectCode: defect.defectCode,
        defectName: getDefectCategoryName(defect.defectCode), // Use category name instead of code
        postes: postesList,
        totalCount: defect.totalCount,
        color: colors[index % colors.length]
      };
    });

    return majorDefectsData;
  }, [filteredOperators]);

  useEffect(() => {
    setOperatorStats(calculateOperatorStats);
    setPosteStats(calculatePosteStats);
    setLigneStats(calculateLigneStats);
    setOperatorsByLigne(calculateOperatorsByLigne);
    setShiftLeadersByLigne(calculateShiftLeadersByLigne);
    setParetoDefects(calculateParetoDefects);
    setMajorDefectsByOperator(calculateMajorDefectsByOperator);
    setMajorDefectsByPoste(calculateMajorDefectsByPoste);
  }, [calculateOperatorStats, calculatePosteStats, calculateLigneStats, calculateOperatorsByLigne, calculateShiftLeadersByLigne, calculateParetoDefects, calculateMajorDefectsByOperator, calculateMajorDefectsByPoste]);

  // Fonctions utilitaires pour les dates
  const formatDate = (date: Date | null) => {
    if (!date) return 'Sélectionner une date';
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Fonctions pour gérer le sélecteur de date
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'debut') {
        setDateDebut(selectedDate);
      } else {
        setDateFin(selectedDate);
      }
    }
  };

  const openDatePicker = (mode: 'debut' | 'fin') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const clearDateFilter = () => {
    setDateDebut(null);
    setDateFin(null);
  };


  // Render bar chart for operators
  const renderBarChart = () => {
    if (operatorStats.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxDefects = Math.max(...operatorStats.map((s) => s.defectCount), 10);
    const chartWidth = screenWidth - 40;
    const chartHeight = 400;
    const barWidth = 35;
    const barSpacing = 10;
    const leftMargin = 50;
    const bottomMargin = 80;
    const topMargin = 20;
    const availableHeight = chartHeight - bottomMargin - topMargin;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(chartWidth, operatorStats.length * (barWidth + barSpacing) + leftMargin + 20)} height={chartHeight}>
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={Math.max(chartWidth, operatorStats.length * (barWidth + barSpacing) + leftMargin + 20)} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          
          {operatorStats.map((stat, index) => {
            const barHeight = (stat.defectCount / maxDefects) * availableHeight;
            const x = leftMargin + index * (barWidth + barSpacing) + barSpacing;
            const y = chartHeight - bottomMargin - barHeight;

            return (
              <G key={index}>
                <Rect x={x} y={y} width={barWidth} height={barHeight} fill={stat.color} rx={4} />
                <SvgText x={x + barWidth / 2} y={y - 5} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                  {stat.defectCount}
                </SvgText>
                <SvgText x={x + barWidth / 2} y={chartHeight - bottomMargin + 20} fontSize="10" fill={theme.textSecondary} textAnchor="middle" transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 20})`}>
                  {stat.operatorName}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </ScrollView>
    );
  };

  // Render bar chart for postes
  const renderPosteBarChart = () => {
    if (posteStats.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxDefects = Math.max(...posteStats.map((s) => s.defectCount), 10);
    const chartWidth = screenWidth - 40;
    const chartHeight = 400;
    const barWidth = 35;
    const barSpacing = 10;
    const leftMargin = 50;
    const bottomMargin = 80;
    const topMargin = 20;
    const availableHeight = chartHeight - bottomMargin - topMargin;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(chartWidth, posteStats.length * (barWidth + barSpacing) + leftMargin + 20)} height={chartHeight}>
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={Math.max(chartWidth, posteStats.length * (barWidth + barSpacing) + leftMargin + 20)} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          
          {posteStats.map((stat, index) => {
            const barHeight = (stat.defectCount / maxDefects) * availableHeight;
            const x = leftMargin + index * (barWidth + barSpacing) + barSpacing;
            const y = chartHeight - bottomMargin - barHeight;

            return (
              <G key={index}>
                <Rect x={x} y={y} width={barWidth} height={barHeight} fill={stat.color} rx={4} />
                <SvgText x={x + barWidth / 2} y={y - 5} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                  {stat.defectCount}
                </SvgText>
                <SvgText x={x + barWidth / 2} y={chartHeight - bottomMargin + 20} fontSize="10" fill={theme.textSecondary} textAnchor="middle" transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 20})`}>
                  {stat.posteName}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </ScrollView>
    );
  };

  // Render operators by ligne chart with separators
  const renderOperatorsByLigneChart = () => {
    const allOperatorsWithLigne: OperatorByLigneStats[] = [];
    Object.values(operatorsByLigne).forEach(ops => {
      allOperatorsWithLigne.push(...ops);
    });

    if (allOperatorsWithLigne.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="users" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxDefects = Math.max(...allOperatorsWithLigne.map(s => s.defectCount), 10);
    const chartHeight = 400;
    const barWidth = 35;
    const barSpacing = 10;
    const leftMargin = 50;
    const bottomMargin = 120;
    const topMargin = 20;
    const availableHeight = chartHeight - bottomMargin - topMargin;
    const ligneSeparationSpace = 60;

    let totalWidth = leftMargin + barSpacing;
    let currentLigne = '';
    const separators: number[] = [];

    allOperatorsWithLigne.forEach((op) => {
      if (op.ligneName !== currentLigne) {
        if (currentLigne !== '') {
          separators.push(totalWidth + ligneSeparationSpace / 2);
          totalWidth += ligneSeparationSpace;
        }
        currentLigne = op.ligneName;
      }
      totalWidth += barWidth + barSpacing;
    });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(screenWidth - 40, totalWidth + 20)} height={chartHeight}>
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={totalWidth} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />

          {(() => {
            let currentX = leftMargin + barSpacing;
            let currentLigne = '';
            const ligneLabels: { name: string; startX: number; endX: number; color: string }[] = [];
            let ligneStartX = currentX;

            return (
              <>
                {allOperatorsWithLigne.map((op, index) => {
                  if (op.ligneName !== currentLigne) {
                    if (currentLigne !== '') {
                      ligneLabels.push({
                        name: currentLigne,
                        startX: ligneStartX,
                        endX: currentX - barSpacing,
                        color: allOperatorsWithLigne.find(o => o.ligneName === currentLigne)?.color || '#000',
                      });
                      currentX += ligneSeparationSpace;
                      ligneStartX = currentX;
                    }
                    currentLigne = op.ligneName;
                  }
                  
                  const barHeight = (op.defectCount / maxDefects) * availableHeight;
                  const x = currentX;
                  const y = chartHeight - bottomMargin - barHeight;
                  
                  currentX += barWidth + barSpacing;

                  if (index === allOperatorsWithLigne.length - 1) {
                    ligneLabels.push({
                      name: currentLigne,
                      startX: ligneStartX,
                      endX: currentX - barSpacing,
                      color: op.color,
                    });
                  }

                  return (
                    <G key={`${op.ligneName}-${op.operatorName}-${index}`}>
                      <Rect x={x} y={y} width={barWidth} height={barHeight} fill={op.color} rx={4} />
                      <SvgText x={x + barWidth / 2} y={y - 5} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                        {op.defectCount}
                      </SvgText>
                      <SvgText x={x + barWidth / 2} y={chartHeight - bottomMargin + 20} fontSize="10" fill={theme.textSecondary} textAnchor="middle" transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 20})`}>
                        {op.operatorName}
                      </SvgText>
                    </G>
                  );
                })}
                
                {separators.map((xPos, idx) => (
                  <G key={`separator-${idx}`}>
                    <Rect x={xPos - 25} y={topMargin} width={50} height={chartHeight - bottomMargin - topMargin} fill={theme.background} opacity={0.5} />
                    <Line x1={xPos} y1={topMargin} x2={xPos} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="4" strokeDasharray="10,5" opacity={0.8} />
                  </G>
                ))}

                {ligneLabels.map((label, idx) => (
                  <G key={`ligne-label-${idx}`}>
                    <Rect 
                      x={label.startX} 
                      y={chartHeight - bottomMargin + 70} 
                      width={label.endX - label.startX} 
                      height={25} 
                      fill={label.color} 
                      opacity={0.2}
                      rx={4}
                    />
                    <SvgText 
                      x={(label.startX + label.endX) / 2} 
                      y={chartHeight - bottomMargin + 85} 
                      fontSize="14" 
                      fill={label.color} 
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {label.name}
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

  // Render operators by ligne and shift leader chart with enhanced visual separation
  const renderOperatorsByLigneWithShiftLeadersChart = () => {
    const allOperatorsWithShiftLeaders: (OperatorByLigneStats & { shiftLeaderName: string })[] = [];
    
    Object.values(shiftLeadersByLigne).forEach(shiftLeaders => {
      shiftLeaders.forEach(shiftLeader => {
        shiftLeader.operators.forEach(operator => {
          allOperatorsWithShiftLeaders.push({
            ...operator,
            shiftLeaderName: shiftLeader.shiftLeaderName
          });
        });
      });
    });

    if (allOperatorsWithShiftLeaders.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="users" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxDefects = Math.max(...allOperatorsWithShiftLeaders.map(s => s.defectCount), 10);
    const chartHeight = 500;
    const barWidth = 32;
    const barSpacing = 6;
    const leftMargin = 50;
    const bottomMargin = 180;
    const topMargin = 20;
    const availableHeight = chartHeight - bottomMargin - topMargin;
    
    // Enhanced separation spaces for better visual hierarchy
    const ligneSeparationSpace = 120; // Larger gap between lines
    const shiftLeaderSeparationSpace = 25; // Smaller gap between shift leaders
    
    // Color palette for better visual distinction
    const ligneColors = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#592E83', '#1B998B'];
    const shiftLeaderColors = ['#4A90E2', '#7B68EE', '#50C878', '#FF6B6B', '#FFD93D', '#6BCF7F'];

    let totalWidth = leftMargin + barSpacing;
    let currentLigne = '';
    let currentShiftLeader = '';
    const ligneSeparators: number[] = [];
    const shiftLeaderSeparators: number[] = [];

    // Calculate positions and separators
    allOperatorsWithShiftLeaders.forEach((op) => {
      if (op.ligneName !== currentLigne) {
        if (currentLigne !== '') {
          ligneSeparators.push(totalWidth + ligneSeparationSpace / 2);
          totalWidth += ligneSeparationSpace;
        }
        currentLigne = op.ligneName;
        currentShiftLeader = '';
      }
      
      if (op.shiftLeaderName !== currentShiftLeader) {
        if (currentShiftLeader !== '' && op.ligneName === currentLigne) {
          shiftLeaderSeparators.push(totalWidth + shiftLeaderSeparationSpace / 2);
          totalWidth += shiftLeaderSeparationSpace;
        }
        currentShiftLeader = op.shiftLeaderName;
      }
      
      totalWidth += barWidth + barSpacing;
    });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(screenWidth - 40, totalWidth + 20)} height={chartHeight}>
          {/* Axes */}
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={totalWidth} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />

          {(() => {
            let currentX = leftMargin + barSpacing;
            let currentLigne = '';
            let currentShiftLeader = '';
            let ligneIndex = 0;
            let shiftLeaderIndex = 0;
            const ligneLabels: { name: string; startX: number; endX: number; color: string }[] = [];
            const shiftLeaderLabels: { name: string; startX: number; endX: number; color: string; ligneName: string }[] = [];
            let ligneStartX = currentX;
            let shiftLeaderStartX = currentX;

            return (
              <>
                {allOperatorsWithShiftLeaders.map((op, index) => {
                  // Handle ligne changes
                  if (op.ligneName !== currentLigne) {
                    if (currentLigne !== '') {
                      // Close previous shift leader
                      if (currentShiftLeader !== '') {
                        shiftLeaderLabels.push({
                          name: currentShiftLeader,
                          startX: shiftLeaderStartX,
                          endX: currentX - barSpacing,
                          color: shiftLeaderColors[shiftLeaderIndex % shiftLeaderColors.length],
                          ligneName: currentLigne,
                        });
                      }
                      
                      // Close previous ligne
                      ligneLabels.push({
                        name: currentLigne,
                        startX: ligneStartX,
                        endX: currentX - barSpacing,
                        color: ligneColors[ligneIndex % ligneColors.length],
                      });
                      
                      currentX += ligneSeparationSpace;
                      ligneStartX = currentX;
                      ligneIndex++;
                    }
                    currentLigne = op.ligneName;
                    currentShiftLeader = '';
                    shiftLeaderIndex = 0;
                  }
                  
                  // Handle shift leader changes
                  if (op.shiftLeaderName !== currentShiftLeader) {
                    if (currentShiftLeader !== '' && op.ligneName === currentLigne) {
                      shiftLeaderLabels.push({
                        name: currentShiftLeader,
                        startX: shiftLeaderStartX,
                        endX: currentX - barSpacing,
                        color: shiftLeaderColors[shiftLeaderIndex % shiftLeaderColors.length],
                        ligneName: currentLigne,
                      });
                      
                      currentX += shiftLeaderSeparationSpace;
                      shiftLeaderIndex++;
                    }
                    currentShiftLeader = op.shiftLeaderName;
                    shiftLeaderStartX = currentX;
                  }
                  
                  const barHeight = (op.defectCount / maxDefects) * availableHeight;
                  const x = currentX;
                  const y = chartHeight - bottomMargin - barHeight;
                  
                  currentX += barWidth + barSpacing;

                  // Handle last items
                  if (index === allOperatorsWithShiftLeaders.length - 1) {
                    shiftLeaderLabels.push({
                      name: currentShiftLeader,
                      startX: shiftLeaderStartX,
                      endX: currentX - barSpacing,
                      color: shiftLeaderColors[shiftLeaderIndex % shiftLeaderColors.length],
                      ligneName: currentLigne,
                    });
                    
                    ligneLabels.push({
                      name: currentLigne,
                      startX: ligneStartX,
                      endX: currentX - barSpacing,
                      color: ligneColors[ligneIndex % ligneColors.length],
                    });
                  }

                  return (
                    <G key={`${op.ligneName}-${op.shiftLeaderName}-${op.operatorName}-${index}`}>
                      <Rect x={x} y={y} width={barWidth} height={barHeight} fill={op.color} rx={6} />
                      <SvgText x={x + barWidth / 2} y={y - 8} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                        {op.defectCount}
                      </SvgText>
                      <SvgText x={x + barWidth / 2} y={chartHeight - bottomMargin + 18} fontSize="10" fill={theme.textSecondary} textAnchor="middle" transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 18})`}>
                        {op.operatorName}
                      </SvgText>
                    </G>
                  );
                })}
                
                {/* Light separators between shift leaders */}
                {shiftLeaderSeparators.map((xPos, idx) => (
                  <G key={`shift-separator-${idx}`}>
                    <Line x1={xPos} y1={topMargin + 20} x2={xPos} y2={chartHeight - bottomMargin - 20} stroke={theme.textTertiary} strokeWidth="1" strokeDasharray="3,3" opacity={0.4} />
                  </G>
                ))}

                {/* Strong separators between lines */}
                {ligneSeparators.map((xPos, idx) => (
                  <G key={`ligne-separator-${idx}`}>
                    <Rect x={xPos - 40} y={topMargin} width={80} height={chartHeight - bottomMargin - topMargin} fill={theme.background} opacity={0.6} />
                    <Line x1={xPos} y1={topMargin} x2={xPos} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="6" opacity={0.8} />
                    <Rect x={xPos - 2} y={topMargin} width={4} height={chartHeight - bottomMargin - topMargin} fill={theme.primary} opacity={0.3} />
                  </G>
                ))}

                {/* Enhanced Shift Leader labels with colored backgrounds */}
                {shiftLeaderLabels.map((label, idx) => (
                  <G key={`shift-leader-label-${idx}`}>
                    <Rect 
                      x={label.startX - 5} 
                      y={chartHeight - bottomMargin + 58} 
                      width={label.endX - label.startX + 10} 
                      height={20} 
                      fill={label.color} 
                      opacity={0.2}
                      rx={6}
                      ry={6}
                    />
                    <SvgText 
                      x={(label.startX + label.endX) / 2} 
                      y={chartHeight - bottomMargin + 71} 
                      fontSize="11" 
                      fill={label.color} 
                      textAnchor="middle"
                      fontWeight="700"
                    >
                      {label.name.length > 15 ? label.name.substring(0, 13) + '...' : label.name}
                    </SvgText>
                  </G>
                ))}

                {/* Enhanced Ligne labels with prominent colored backgrounds */}
                {ligneLabels.map((label, idx) => (
                  <G key={`ligne-label-${idx}`}>
                    <Rect 
                      x={label.startX - 8} 
                      y={chartHeight - bottomMargin + 110} 
                      width={label.endX - label.startX + 16} 
                      height={28} 
                      fill={label.color} 
                      opacity={0.25}
                      rx={6}
                      ry={6}
                    />
                    <SvgText 
                      x={(label.startX + label.endX) / 2} 
                      y={chartHeight - bottomMargin + 127} 
                      fontSize="14" 
                      fill={label.color} 
                      textAnchor="middle"
                      fontWeight="800"
                    >
                      {label.name}
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

  // Render Major Defects by Operator Pareto Chart
  const renderMajorDefectsByOperatorChart = () => {
    if (majorDefectsByOperator.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    // Calculate total operators across all defects for chart sizing
    const allOperators: { operatorName: string; count: number; defectCode: string; defectName: string; color: string }[] = [];
    majorDefectsByOperator.forEach((defect) => {
      defect.operators.forEach((operator) => {
        allOperators.push({
          operatorName: operator.operatorName,
          count: operator.count,
          defectCode: defect.defectCode,
          defectName: defect.defectName,
          color: defect.color
        });
      });
    });

    if (allOperators.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxCount = Math.max(...allOperators.map(op => op.count), 10);
    const chartHeight = 400;
    const barWidth = 40;
    const barSpacing = 12;
    const leftMargin = 50;
    const bottomMargin = 80;
    const topMargin = 20;
    const availableHeight = chartHeight - bottomMargin - topMargin;
    const defectSeparationSpace = 80;

    let totalWidth = leftMargin + barSpacing;
    let currentDefect = '';
    const defectSeparators: number[] = [];

    // Calculate positions and separators
    allOperators.forEach((op) => {
      if (op.defectName !== currentDefect) {
        if (currentDefect !== '') {
          defectSeparators.push(totalWidth + defectSeparationSpace / 2);
          totalWidth += defectSeparationSpace;
        }
        currentDefect = op.defectName;
      }
      totalWidth += barWidth + barSpacing;
    });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(screenWidth - 40, totalWidth + 20)} height={chartHeight}>
          {/* Axes */}
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={totalWidth} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />

          {(() => {
            let currentX = leftMargin + barSpacing;
            let currentDefect = '';
            const defectLabels: { name: string; startX: number; endX: number; color: string }[] = [];
            let defectStartX = currentX;

            return (
              <>
                {allOperators.map((op, index) => {
                  // Handle defect changes
                  if (op.defectName !== currentDefect) {
                    if (currentDefect !== '') {
                      // Close previous defect
                      defectLabels.push({
                        name: currentDefect,
                        startX: defectStartX,
                        endX: currentX - barSpacing,
                        color: allOperators.find(o => o.defectName === currentDefect)?.color || '#000',
                      });
                      
                      currentX += defectSeparationSpace;
                      defectStartX = currentX;
                    }
                    currentDefect = op.defectName;
                  }
                  
                  const barHeight = (op.count / maxCount) * availableHeight;
                  const x = currentX;
                  const y = chartHeight - bottomMargin - barHeight;
                  
                  currentX += barWidth + barSpacing;

                  // Handle last item
                  if (index === allOperators.length - 1) {
                    defectLabels.push({
                      name: currentDefect,
                      startX: defectStartX,
                      endX: currentX - barSpacing,
                      color: op.color,
                    });
                  }

                  return (
                    <G key={`${op.defectName}-${op.operatorName}-${index}`}>
                      <Rect x={x} y={y} width={barWidth} height={barHeight} fill={op.color} rx={4} />
                      <SvgText x={x + barWidth / 2} y={y - 5} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                        {op.count}
                      </SvgText>
                      <SvgText x={x + barWidth / 2} y={chartHeight - bottomMargin + 20} fontSize="10" fill={theme.textSecondary} textAnchor="middle" transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 20})`}>
                        {op.operatorName}
                      </SvgText>
                    </G>
                  );
                })}
                
                {/* Defect separators */}
                {defectSeparators.map((xPos, idx) => (
                  <G key={`defect-separator-${idx}`}>
                    <Rect x={xPos - 30} y={topMargin} width={60} height={chartHeight - bottomMargin - topMargin} fill={theme.background} opacity={0.3} />
                    <Line x1={xPos} y1={topMargin} x2={xPos} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="4" strokeDasharray="10,5" opacity={0.8} />
                  </G>
                ))}

                {/* Defect labels inside chart area */}
                {defectLabels.map((label, idx) => {
                  const labelWidth = label.endX - label.startX;
                  const labelCenterX = (label.startX + label.endX) / 2;
                  
                  // Find the maximum bar height in this defect group for better positioning
                  const defectOperators = allOperators.filter(op => op.defectName === label.name);
                  const maxBarHeightInGroup = Math.max(...defectOperators.map(op => (op.count / maxCount) * availableHeight));
                  const labelY = chartHeight - bottomMargin - Math.max(maxBarHeightInGroup / 2, 40);
                  
                  return (
                    <G key={`defect-label-${idx}`}>
                      <SvgText 
                        x={labelCenterX} 
                        y={labelY} 
                        fontSize="12" 
                        fill="white" 
                        textAnchor="middle"
                        fontWeight="bold"
                        transform={`rotate(-90, ${labelCenterX}, ${labelY})`}
                      >
                        {label.name.length > 20 ? label.name.substring(0, 18) + '...' : label.name}
                      </SvgText>
                    </G>
                  );
                })}
              </>
            );
          })()}
        </Svg>
      </ScrollView>
    );
  };

  // Render Major Defects by Poste Pareto Chart
  const renderMajorDefectsByPosteChart = () => {
    if (majorDefectsByPoste.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    // Calculate total postes across all defects for chart sizing
    const allPostes: { posteName: string; count: number; defectCode: string; defectName: string; color: string }[] = [];
    majorDefectsByPoste.forEach((defect) => {
      defect.postes.forEach((poste) => {
        allPostes.push({
          posteName: poste.posteName,
          count: poste.count,
          defectCode: defect.defectCode,
          defectName: defect.defectName,
          color: defect.color
        });
      });
    });

    if (allPostes.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Aucune donnée disponible
          </Text>
        </View>
      );
    }

    const maxCount = Math.max(...allPostes.map(poste => poste.count), 10);
    const chartHeight = 450;
    const barWidth = 40;
    const barSpacing = 12;
    const leftMargin = 50;
    const bottomMargin = 120;
    const topMargin = 20;
    const availableHeight = chartHeight - bottomMargin - topMargin;
    const defectSeparationSpace = 80;

    let totalWidth = leftMargin + barSpacing;
    let currentDefect = '';
    const defectSeparators: number[] = [];

    // Calculate positions and separators
    allPostes.forEach((poste) => {
      if (poste.defectName !== currentDefect) {
        if (currentDefect !== '') {
          defectSeparators.push(totalWidth + defectSeparationSpace / 2);
          totalWidth += defectSeparationSpace;
        }
        currentDefect = poste.defectName;
      }
      totalWidth += barWidth + barSpacing;
    });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <Svg width={Math.max(screenWidth - 40, totalWidth + 20)} height={chartHeight}>
          {/* Axes */}
          <Line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />
          <Line x1={leftMargin} y1={chartHeight - bottomMargin} x2={totalWidth} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="2" />

          {(() => {
            let currentX = leftMargin + barSpacing;
            let currentDefect = '';
            const defectLabels: { name: string; startX: number; endX: number; color: string }[] = [];
            let defectStartX = currentX;

            return (
              <>
                {allPostes.map((poste, index) => {
                  // Handle defect changes
                  if (poste.defectName !== currentDefect) {
                    if (currentDefect !== '') {
                      // Close previous defect
                      defectLabels.push({
                        name: currentDefect,
                        startX: defectStartX,
                        endX: currentX - barSpacing,
                        color: allPostes.find(p => p.defectName === currentDefect)?.color || '#000',
                      });
                      
                      currentX += defectSeparationSpace;
                      defectStartX = currentX;
                    }
                    currentDefect = poste.defectName;
                  }
                  
                  const barHeight = (poste.count / maxCount) * availableHeight;
                  const x = currentX;
                  const y = chartHeight - bottomMargin - barHeight;
                  
                  currentX += barWidth + barSpacing;

                  // Handle last item
                  if (index === allPostes.length - 1) {
                    defectLabels.push({
                      name: currentDefect,
                      startX: defectStartX,
                      endX: currentX - barSpacing,
                      color: poste.color,
                    });
                  }

                  return (
                    <G key={`${poste.defectName}-${poste.posteName}-${index}`}>
                      <Rect x={x} y={y} width={barWidth} height={barHeight} fill={poste.color} rx={4} />
                      <SvgText x={x + barWidth / 2} y={y - 5} fontSize="12" fill={theme.textPrimary} textAnchor="middle" fontWeight="bold">
                        {poste.count}
                      </SvgText>
                      <SvgText x={x + barWidth / 2} y={chartHeight - bottomMargin + 20} fontSize="10" fill={theme.textSecondary} textAnchor="middle" transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - bottomMargin + 20})`}>
                        {poste.posteName}
                      </SvgText>
                    </G>
                  );
                })}
                
                {/* Defect separators */}
                {defectSeparators.map((xPos, idx) => (
                  <G key={`defect-separator-${idx}`}>
                    <Rect x={xPos - 30} y={topMargin} width={60} height={chartHeight - bottomMargin - topMargin} fill={theme.background} opacity={0.3} />
                    <Line x1={xPos} y1={topMargin} x2={xPos} y2={chartHeight - bottomMargin} stroke={theme.border} strokeWidth="4" strokeDasharray="10,5" opacity={0.8} />
                  </G>
                ))}

                {/* Defect category labels below X-axis */}
                {defectLabels.map((label, idx) => (
                  <G key={`defect-label-${idx}`}>
                    <Rect 
                      x={label.startX} 
                      y={chartHeight - bottomMargin + 50} 
                      width={label.endX - label.startX} 
                      height={25} 
                      fill={label.color} 
                      opacity={0.2}
                      rx={4}
                    />
                    <SvgText 
                      x={(label.startX + label.endX) / 2} 
                      y={chartHeight - bottomMargin + 65} 
                      fontSize="12" 
                      fill={label.color} 
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {label.name.length > 25 ? label.name.substring(0, 23) + '...' : label.name}
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
        <CustomNavbar title="Analyse" />
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
      <CustomNavbar title="Analyse" />
      <ScrollView style={[styles.scrollView, { paddingTop: insets.top + NAVBAR_HEIGHT }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerSection}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Analyse des Défauts par Opérateur
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Suivi en temps réel des défauts détectés
          </Text>
        </View>

        {/* Filtres globaux */}
        <View style={[styles.dateFilterContainer, { backgroundColor: theme.surface }]}>
          {/* Filtrage par date */}
            <View style={styles.dateFilterHeader}>
              <Feather name="layers" size={20} color={theme.primary} />
              <Text style={[styles.dateFilterTitle, { color: theme.textPrimary }]}>Section</Text>
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
                  <Text style={[styles.dateButtonText, { color: dateDebut ? theme.textPrimary : theme.textSecondary }]}>
                    {formatDate(dateDebut)}
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
                  <Text style={[styles.dateButtonText, { color: dateFin ? theme.textPrimary : theme.textSecondary }]}>
                    {formatDate(dateFin)}
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

        {/* Cartes de résumé */}
        <View style={styles.cardsContainer}>
          <View style={styles.cardsRow}>
            <AnalyseCard
              title="Total Défauts"
              value={filteredOperators.reduce((sum, op) => sum + (op.nombreOccurrences || 1), 0)}
              subtitle="Toutes occurrences"
              icon="alert-triangle"
              color="#E74C3C"
            />
            <AnalyseCard
              title="Alertes Critiques"
              value={operatorStats.filter(op => op.alertLevel === 'critical').length}
              subtitle="≥ 7 défauts"
              icon="alert-circle"
              color="#FF6B35"
            />
          </View>
        </View>



        {/* Alert Levels Cards */}
        <View style={styles.alertLevelsContainer}>
          <View style={styles.alertLevelsGrid}>
            <View style={[styles.alertLevelCard, { backgroundColor: theme.surface }]}>
              <View style={styles.alertLevelHeader}>
                <View style={[styles.alertLevelIcon, { backgroundColor: '#FFC30015' }]}>
                  <Feather name="alert-triangle" size={20} color="#FFC300" />
                </View>
                <View style={styles.alertLevelContent}>
                  <Text style={[styles.alertLevelNumber, { color: '#FFC300' }]}>3</Text>
                  <Text style={[styles.alertLevelLabel, { color: theme.textSecondary }]}>défauts</Text>
                </View>
              </View>
              <Text style={[styles.alertLevelDescription, { color: theme.textTertiary }]}>Alerte niveau 1</Text>
            </View>

            <View style={[styles.alertLevelCard, { backgroundColor: theme.surface }]}>
              <View style={styles.alertLevelHeader}>
                <View style={[styles.alertLevelIcon, { backgroundColor: '#FF8C4215' }]}>
                  <Feather name="alert-circle" size={20} color="#FF8C42" />
                </View>
                <View style={styles.alertLevelContent}>
                  <Text style={[styles.alertLevelNumber, { color: '#FF8C42' }]}>5</Text>
                  <Text style={[styles.alertLevelLabel, { color: theme.textSecondary }]}>défauts</Text>
                </View>
              </View>
              <Text style={[styles.alertLevelDescription, { color: theme.textTertiary }]}>Alerte niveau 2</Text>
            </View>

            <View style={[styles.alertLevelCard, { backgroundColor: theme.surface }]}>
              <View style={styles.alertLevelHeader}>
                <View style={[styles.alertLevelIcon, { backgroundColor: '#E74C3C15' }]}>
                  <Feather name="alert-octagon" size={20} color="#E74C3C" />
                </View>
                <View style={styles.alertLevelContent}>
                  <Text style={[styles.alertLevelNumber, { color: '#E74C3C' }]}>7</Text>
                  <Text style={[styles.alertLevelLabel, { color: theme.textSecondary }]}>défauts</Text>
                </View>
              </View>
              <Text style={[styles.alertLevelDescription, { color: theme.textTertiary }]}>Alerte niveau 3</Text>
            </View>
          </View>
        </View>

        {/* Operator Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Graphique des Défauts par opérateur</Text>
            <TouchableOpacity onPress={loadOperators}>
              <Feather name="refresh-cw" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {renderBarChart()}
        </View>

        {/* Poste Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Défauts par Poste de Travail</Text>
          {renderPosteBarChart()}
        </View>


        {/* Operators by Ligne Chart with Shift Leaders */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderLeft}>
              <Feather name="users" size={24} color={theme.primary} />
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Nombre de défaut par opérateur par ligne et shift leader</Text>
            </View>
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: theme.primary }]}
              onPress={() => downloadChart(operatorsByLigneChartRef, 'Défauts par Opérateur par Ligne')}
              activeOpacity={0.7}
            >
              <Feather name="download" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
            Visualisation groupée par ligne → shift leader → opérateurs
          </Text>
          
          {/* Filtrage par section - spécifique à ce graphique */}
          <View style={styles.segmentDropdownContainer}>
            <Text style={[styles.segmentFilterLabel, { color: theme.textSecondary }]}>
              Section:
            </Text>
            
            <TouchableOpacity
              style={[
                styles.segmentDropdownButton,
                { 
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.border
                }
              ]}
              onPress={() => setIsSegmentDropdownOpen(!isSegmentDropdownOpen)}
            >
              <Text style={[
                styles.segmentDropdownButtonText, 
                { color: theme.textPrimary }
              ]}>
                {selectedSegment === 'all' ? 'Toutes les Sections' : selectedSegment}
              </Text>
              <Feather 
                name={isSegmentDropdownOpen ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {isSegmentDropdownOpen && (
              <>
                <TouchableOpacity
                  style={styles.segmentDropdownOverlay}
                  onPress={() => setIsSegmentDropdownOpen(false)}
                  activeOpacity={1}
                />
                <View style={[
                  styles.segmentDropdownMenu,
                  { 
                    backgroundColor: theme.surface,
                    borderColor: theme.border
                  }
                ]}>
                  <ScrollView style={styles.segmentDropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity
                      style={[
                        styles.segmentDropdownItem,
                        selectedSegment === 'all' && { backgroundColor: theme.primary + '15' }
                      ]}
                      onPress={() => {
                        setSelectedSegment('all');
                        setIsSegmentDropdownOpen(false);
                      }}
                    >
                      <Text style={[
                        styles.segmentDropdownItemText,
                        { 
                          color: selectedSegment === 'all' ? theme.primary : theme.textPrimary,
                          fontWeight: selectedSegment === 'all' ? '600' : '400'
                        }
                      ]}>
                        Toutes les Sections
                      </Text>
                      {selectedSegment === 'all' && (
                        <Feather name="check" size={16} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                    
                    {availableSegments.map((segment) => (
                      <TouchableOpacity
                        key={segment}
                        style={[
                          styles.segmentDropdownItem,
                          selectedSegment === segment && { backgroundColor: theme.primary + '15' }
                        ]}
                        onPress={() => {
                          setSelectedSegment(segment);
                          setIsSegmentDropdownOpen(false);
                        }}
                      >
                        <Text style={[
                          styles.segmentDropdownItemText,
                          { 
                            color: selectedSegment === segment ? theme.primary : theme.textPrimary,
                            fontWeight: selectedSegment === segment ? '600' : '400'
                          }
                        ]}>
                          {segment}
                        </Text>
                        {selectedSegment === segment && (
                          <Feather name="check" size={16} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
          
          <View 
            ref={operatorsByLigneChartRef}
            style={{ 
              backgroundColor: theme.surface,
              padding: 10,
              borderRadius: 8,
            }}
          >
            {renderOperatorsByLigneWithShiftLeadersChart()}
          </View>
        </View>

        {/* Major Defects by Operator Pareto Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderLeft}>
              <Feather name="trending-up" size={24} color={theme.primary} />
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
                Défaut majeur/opérateur
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: theme.primary }]}
              onPress={() => downloadChart(majorDefectsByOperatorChartRef, 'Défaut majeur par Opérateur')}
              activeOpacity={0.7}
            >
              <Feather name="download" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
            Top 3 des défauts majeurs avec opérateurs groupés par type de défaut
          </Text>
          <View 
            ref={majorDefectsByOperatorChartRef}
            style={{ 
              backgroundColor: theme.surface,
              padding: 10,
              borderRadius: 8,
            }}
          >
            {renderMajorDefectsByOperatorChart()}
          </View>
        </View>

        {/* Major Defects by Poste Pareto Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderLeft}>
              <Feather name="map-pin" size={24} color={theme.primary} />
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
                Défaut majeur/poste
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: theme.primary }]}
              onPress={() => downloadChart(majorDefectsByPosteChartRef, 'Défaut majeur par Poste')}
              activeOpacity={0.7}
            >
              <Feather name="download" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
            Top 3 des défauts majeurs avec postes de travail groupés par type de défaut
          </Text>
          <View 
            ref={majorDefectsByPosteChartRef}
            style={{ 
              backgroundColor: theme.surface,
              padding: 10,
              borderRadius: 8,
            }}
          >
            {renderMajorDefectsByPosteChart()}
          </View>
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
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Sélectionner la {datePickerMode === 'debut' ? 'date de début' : 'date de fin'}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <DatePickerWeb
              value={datePickerMode === 'debut' ? (dateDebut || new Date()) : (dateFin || new Date())}
              mode="date"
              onChange={handleDateChange}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
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
  // Alert Levels Styles
  alertLevelsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  alertLevelsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  alertLevelsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  alertLevelCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertLevelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  alertLevelContent: {
    flex: 1,
  },
  alertLevelNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  alertLevelLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  alertLevelDescription: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: spacing.xs,
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
  operatorCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 5,
  },
  operatorCardContent: {
    flex: 1,
  },
  operatorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  defectCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  defectBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    minWidth: 30,
    alignItems: 'center',
  },
  defectBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
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
  // Styles pour les cartes
  cardsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  analyseCard: {
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
  // Styles pour les cartes statistiques
  statsCardsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: spacing.md,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  statsTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContent: {
    gap: spacing.sm,
  },
  statsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statsIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statsItemRight: {
    alignItems: 'flex-end',
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsPercentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Styles pour les tags
  tagsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Segment Dropdown Styles
  segmentDropdownContainer: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    position: 'relative',
    zIndex: 1000,
  },
  segmentFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  segmentDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginHorizontal: spacing.xs,
  },
  segmentDropdownButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  segmentDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  segmentDropdownScroll: {
    maxHeight: 200,
  },
  segmentDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  segmentDropdownItemText: {
    fontSize: 14,
    flex: 1,
  },
  segmentDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
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
    textTransform: 'uppercase',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
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
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Download Button Styles
  chartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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

export default AnalyseDashboard;
