import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { Task } from '../types/Task';
import { taskService } from '../services/database';

interface TaskItemProps {
  task: Task;
  onUpdate: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate }) => {
  const { theme } = useTheme();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return theme.error;
      case 'medium': return theme.warning;
      case 'low': return theme.success;
      default: return theme.textTertiary;
    }
  };

  const toggleComplete = async () => {
    try {
      await taskService.update(task.id!, { completed: !task.completed });
      onUpdate();
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la mise à jour de la tâche');
    }
  };

  const deleteTask = async () => {
    Alert.alert(
      'Supprimer la tâche',
      'Êtes-vous sûr de vouloir supprimer cette tâche ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskService.delete(task.id!);
              onUpdate();
            } catch (error) {
              Alert.alert('Erreur', 'Échec de la suppression de la tâche');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.surface,
        borderColor: theme.border,
        opacity: task.completed ? 0.6 : 1
      }
    ]}>
      <TouchableOpacity style={styles.content} onPress={toggleComplete}>
        <View style={styles.header}>
          <Text style={[
            styles.title, 
            { color: theme.textPrimary },
            task.completed && { 
              textDecorationLine: 'line-through',
              color: theme.textTertiary 
            }
          ]}>
            {task.title}
          </Text>
          <View style={[
            styles.priority, 
            { backgroundColor: getPriorityColor(task.priority) }
          ]} />
        </View>
        
        {task.description && (
          <Text style={[
            styles.description, 
            { color: theme.textSecondary },
            task.completed && { color: theme.textTertiary }
          ]}>
            {task.description}
          </Text>
        )}
        
        {task.dueDate && (
          <Text style={[styles.dueDate, { color: theme.textTertiary }]}>
            Échéance : {new Date(task.dueDate).toLocaleDateString('fr-FR')}
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.deleteButton, { backgroundColor: theme.error }]} 
        onPress={deleteTask}
      >
        <Text style={[styles.deleteText, { color: theme.textInverse }]}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  dueDate: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  priority: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: spacing.sm,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  deleteText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default TaskItem; 