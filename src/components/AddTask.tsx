import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { CreateTaskData } from '../types/Task';
import { taskService } from '../services/database';

interface AddTaskProps {
  visible: boolean;
  onClose: () => void;
  onTaskAdded: () => void;
}

const AddTask: React.FC<AddTaskProps> = ({ visible, onClose, onTaskAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const { theme } = useTheme();

  const priorities = [
    { value: 'low', label: 'Basse', color: theme.success },
    { value: 'medium', label: 'Moyenne', color: theme.warning },
    { value: 'high', label: 'Haute', color: theme.error },
  ];

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre de la tâche est obligatoire');
      return;
    }

    try {
      const taskData: CreateTaskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completed: false,
        commentaire: commentaire.trim() || undefined,
      };

      await taskService.create(taskData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setCommentaire('');
      
      onTaskAdded();
      onClose();
      
      Alert.alert('Succès', 'Tâche créée avec succès!');
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la création de la tâche');
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setCommentaire('');
    onClose();
  };

  const getPriorityColor = (priorityValue: string) => {
    const priority = priorities.find(p => p.value === priorityValue);
    return priority ? priority.color : theme.textTertiary;
  };

  const getPriorityLabel = (priorityValue: string) => {
    const priority = priorities.find(p => p.value === priorityValue);
    return priority ? priority.label : 'Moyenne';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Nouvelle Tâche</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.primary }]}>Annuler</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Titre *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textPrimary 
              }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Entrez le titre de la tâche"
              placeholderTextColor={theme.textTertiary}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textPrimary 
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Entrez une description (optionnel)"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Commentaire</Text>
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textPrimary 
              }]}
              value={commentaire}
              onChangeText={setCommentaire}
              placeholder="Ajouter un commentaire (optionnel)"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Priorité</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { 
                backgroundColor: theme.surface,
                borderColor: theme.border 
              }]}
              onPress={() => setShowPriorityPicker(true)}
            >
              <View style={styles.pickerContent}>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(priority) }]} />
                <Text style={[styles.pickerButtonText, { color: theme.textPrimary }]}>
                  {getPriorityLabel(priority)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Date d'échéance</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textPrimary 
              }]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="JJ/MM/AAAA (optionnel)"
              placeholderTextColor={theme.textTertiary}
              maxLength={10}
            />
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              Format: JJ/MM/AAAA
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: theme.primary }]} 
            onPress={handleSubmit}
          >
            <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>
              Créer la tâche
            </Text>
          </TouchableOpacity>
        </View>

        {/* Priority Picker Modal */}
        <Modal
          visible={showPriorityPicker}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
                  Sélectionner la priorité
                </Text>
                <TouchableOpacity onPress={() => setShowPriorityPicker(false)}>
                  <Text style={[styles.pickerCloseButton, { color: theme.primary }]}>
                    Fermer
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerContent}>
                {priorities.map((priorityOption) => (
                  <TouchableOpacity
                    key={priorityOption.value}
                    style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setPriority(priorityOption.value as 'low' | 'medium' | 'high');
                      setShowPriorityPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <View style={[styles.priorityDot, { backgroundColor: priorityOption.color }]} />
                      <Text style={[styles.pickerItemText, { color: theme.textPrimary }]}>
                        {priorityOption.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: typography.fontSize.md,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: typography.fontSize.md,
    marginLeft: spacing.sm,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  pickerCloseButton: {
    fontSize: typography.fontSize.md,
  },
  pickerItem: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: typography.fontSize.md,
    marginLeft: spacing.sm,
  },
});

export default AddTask; 