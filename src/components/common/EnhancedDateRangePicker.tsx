import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  Platform,
  Dimensions
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme/spacing';
import Feather from '@expo/vector-icons/Feather';
import DatePickerWeb from './DatePickerWeb';

const { width: screenWidth } = Dimensions.get('window');

interface DateRangePreset {
  key: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

interface EnhancedDateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onClearFilters: () => void;
}

const EnhancedDateRangePicker: React.FC<EnhancedDateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearFilters
}) => {
  const { theme } = useTheme();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().slice(0, 10);
  };

  // Presets de dates prédéfinies
  const getDatePresets = useCallback((): DateRangePreset[] => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Lundi
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 7);

    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);

    return [
      {
        key: 'today',
        label: "Aujourd'hui",
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      },
      {
        key: 'yesterday',
        label: 'Hier',
        startDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
        endDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
      },
      {
        key: 'last7days',
        label: '7 derniers jours',
        startDate: last7Days,
        endDate: today
      },
      {
        key: 'last30days',
        label: '30 derniers jours',
        startDate: last30Days,
        endDate: today
      },
      {
        key: 'thisWeek',
        label: 'Cette semaine',
        startDate: weekStart,
        endDate: today
      },
      {
        key: 'thisMonth',
        label: 'Ce mois',
        startDate: monthStart,
        endDate: today
      },
      {
        key: 'thisQuarter',
        label: 'Ce trimestre',
        startDate: quarterStart,
        endDate: today
      },
      {
        key: 'thisYear',
        label: 'Cette année',
        startDate: yearStart,
        endDate: today
      }
    ];
  }, []);

  const handlePresetSelect = (preset: DateRangePreset) => {
    onStartDateChange(preset.startDate);
    onEndDateChange(preset.endDate);
    setShowPresets(false);
  };

  const handleStartDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate) {
      // Normaliser la date au début de la journée
      const normalizedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      onStartDateChange(normalizedDate);
      
      // Si la date de fin est antérieure à la nouvelle date de début, la réinitialiser
      if (endDate && normalizedDate > endDate) {
        onEndDateChange(null);
      }
    }
    setShowStartPicker(false);
  }, [endDate, onStartDateChange, onEndDateChange]);

  const handleEndDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate) {
      // Normaliser la date à la fin de la journée
      const normalizedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
      
      // Si la date de fin est antérieure à la date de début, ajuster
      if (startDate && selectedDate < startDate) {
        const newStartDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        onStartDateChange(newStartDate);
        onEndDateChange(normalizedDate);
      } else {
        onEndDateChange(normalizedDate);
      }
    }
    setShowEndPicker(false);
  }, [startDate, onStartDateChange, onEndDateChange]);

  const hasActiveFilters = () => {
    return startDate !== null || endDate !== null;
  };

  const getFilterSummary = () => {
    if (startDate && endDate) {
      return `Période: ${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
    } else if (startDate) {
      return `À partir du: ${formatDateDisplay(startDate)}`;
    } else if (endDate) {
      return `Jusqu'au: ${formatDateDisplay(endDate)}`;
    }
    return 'Aucun filtre actif';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header avec titre et résumé */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Filtres par date
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.presetsButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowPresets(true)}
        >
          <Feather name="clock" size={16} color="white" />
          <Text style={styles.presetsButtonText}>Raccourcis</Text>
        </TouchableOpacity>
      </View>

      {/* Résumé des filtres actifs */}
      <View style={[styles.filterSummary, { 
        backgroundColor: hasActiveFilters() ? theme.primaryLight : theme.surfaceSecondary 
      }]}>
        <Feather 
          name={hasActiveFilters() ? "filter" : "info"} 
          size={16} 
          color={hasActiveFilters() ? theme.primary : theme.textSecondary} 
        />
        <Text style={[styles.filterSummaryText, { 
          color: hasActiveFilters() ? theme.primary : theme.textSecondary 
        }]}>
          {getFilterSummary()}
        </Text>
      </View>

      {/* Sélecteurs de dates */}
      <View style={styles.dateRangeContainer}>
        <View style={styles.dateInputContainer}>
          <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
            Date de début
          </Text>
          <TouchableOpacity
            style={[
              styles.dateInput,
              {
                backgroundColor: startDate ? theme.primaryLight : theme.surfaceSecondary,
                borderColor: startDate ? theme.primary : theme.border
              }
            ]}
            onPress={() => setShowStartPicker(true)}
          >
            <View style={styles.dateInputContent}>
              <Feather 
                name="calendar" 
                size={18} 
                color={startDate ? theme.primary : theme.textSecondary} 
              />
              <Text style={[
                styles.dateInputText,
                { color: startDate ? theme.primary : theme.textTertiary }
              ]}>
                {startDate ? formatDateDisplay(startDate) : 'Date de début'}
              </Text>
            </View>
            {startDate && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => onStartDateChange(null)}
              >
                <Feather name="x" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dateInputContainer}>
          <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
            Date de fin
          </Text>
          <TouchableOpacity
            style={[
              styles.dateInput,
              {
                backgroundColor: endDate ? theme.primaryLight : theme.surfaceSecondary,
                borderColor: endDate ? theme.primary : theme.border
              }
            ]}
            onPress={() => setShowEndPicker(true)}
          >
            <View style={styles.dateInputContent}>
              <Feather 
                name="calendar" 
                size={18} 
                color={endDate ? theme.primary : theme.textSecondary} 
              />
              <Text style={[
                styles.dateInputText,
                { color: endDate ? theme.primary : theme.textTertiary }
              ]}>
                {endDate ? formatDateDisplay(endDate) : 'Date de fin'}
              </Text>
            </View>
            {endDate && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => onEndDateChange(null)}
              >
                <Feather name="x" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Bouton d'effacement global */}
      {hasActiveFilters() && (
        <TouchableOpacity
          style={[styles.clearAllButton, { backgroundColor: theme.error }]}
          onPress={onClearFilters}
        >
          <Feather name="trash-2" size={16} color="white" />
          <Text style={styles.clearAllButtonText}>Effacer tous les filtres</Text>
        </TouchableOpacity>
      )}

      {/* Modal des raccourcis de dates */}
      <Modal
        visible={showPresets}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPresets(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Raccourcis de dates
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPresets(false)}
              >
                <Feather name="x" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.presetsGrid}>
              {getDatePresets().map((preset) => (
                <TouchableOpacity
                  key={preset.key}
                  style={[styles.presetButton, { backgroundColor: theme.surfaceSecondary }]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <Text style={[styles.presetButtonText, { color: theme.textPrimary }]}>
                    {preset.label}
                  </Text>
                  <Text style={[styles.presetButtonSubtext, { color: theme.textSecondary }]}>
                    {formatDateDisplay(preset.startDate)} - {formatDateDisplay(preset.endDate)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartPicker && (
        <Modal
          visible={showStartPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowStartPicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={[styles.datePickerModalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.datePickerTitle, { color: theme.textPrimary }]}>Sélectionner la date de début</Text>
              <DatePickerWeb
                value={startDate || new Date()}
                mode="date"
                onChange={handleStartDateChange}
              />
              <TouchableOpacity
                style={[styles.datePickerCloseButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowStartPicker(false)}
              >
                <Text style={styles.datePickerCloseButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showEndPicker && (
        <Modal
          visible={showEndPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEndPicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={[styles.datePickerModalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.datePickerTitle, { color: theme.textPrimary }]}>Sélectionner la date de fin</Text>
              <DatePickerWeb
                value={endDate || new Date()}
                mode="date"
                onChange={handleEndDateChange}
              />
              <TouchableOpacity
                style={[styles.datePickerCloseButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowEndPicker(false)}
              >
                <Text style={styles.datePickerCloseButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: 600,
    marginLeft: spacing.sm,
  },
  presetsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  presetsButtonText: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: 500,
    marginLeft: spacing.xs,
  },
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  filterSummaryText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    width: screenWidth * 0.9,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 600,
    marginBottom: spacing.md,
  },
  datePickerCloseButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  datePickerCloseButtonText: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: 500,
  },
  dateRangeContainer: {
    gap: spacing.md,
  },
  dateInputContainer: {
    marginBottom: spacing.sm,
  },
  dateLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: 500,
    marginBottom: spacing.xs,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 50,
  },
  dateInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateInputText: {
    fontSize: typography.fontSize.md,
    marginLeft: spacing.sm,
    flex: 1,
  },
  clearDateButton: {
    padding: spacing.xs,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  clearAllButtonText: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: 500,
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 600,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  presetsGrid: {
    gap: spacing.sm,
  },
  presetButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  presetButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: 500,
    marginBottom: spacing.xs,
  },
  presetButtonSubtext: {
    fontSize: typography.fontSize.sm,
  },
});

export default EnhancedDateRangePicker;
