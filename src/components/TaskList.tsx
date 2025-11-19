import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { Task } from '../types/Task';
import { taskService } from '../services/database';
import TaskItem from './TaskItem';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const loadTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await taskService.getAll();
      setTasks(fetchedTasks as Task[]);
    } catch (error) {
      Alert.alert('Erreur', 'Échec du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleTaskUpdate = () => {
    loadTasks();
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TaskItem task={item} onUpdate={handleTaskUpdate} />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Aucune tâche pour le moment
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
        Ajoutez votre première tâche pour commencer !
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size={32} color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Chargement des tâches...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Mes Tâches</Text>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    margin: spacing.lg,
    marginBottom: spacing.sm,
  },
  listContainer: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
});

export default TaskList; 