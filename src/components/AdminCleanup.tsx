import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import CustomNavbar from './CustomNavbar';
import { cleanAllVirtualData, cleanUnknownOperators, getDataStatistics } from '../utils/cleanVirtualData';

const AdminCleanup: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const statistics = await getDataStatistics();
      setStats(statistics);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les statistiques');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanAllVirtual = async () => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous supprimer toutes les données virtuelles et de test ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cleanAllVirtualData();
              
              if (result.success) {
                Alert.alert(
                  'Succès',
                  `${result.deletedCount} documents supprimés avec succès !`
                );
                loadStatistics(); // Refresh stats
              } else {
                Alert.alert(
                  'Erreur partielle',
                  `${result.deletedCount} documents supprimés, ${result.errors.length} erreurs`
                );
              }
            } catch (error) {
              Alert.alert('Erreur', 'Échec du nettoyage');
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCleanUnknown = async () => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous supprimer tous les opérateurs inconnus ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cleanUnknownOperators();
              
              if (result.success) {
                Alert.alert(
                  'Succès',
                  `${result.deletedCount} opérateurs inconnus supprimés !`
                );
                loadStatistics(); // Refresh stats
              } else {
                Alert.alert(
                  'Erreur partielle',
                  `${result.deletedCount} supprimés, ${result.errors.length} erreurs`
                );
              }
            } catch (error) {
              Alert.alert('Erreur', 'Échec du nettoyage');
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  React.useEffect(() => {
    loadStatistics();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <CustomNavbar title="Nettoyage Admin" />
      
      <ScrollView style={styles.content}>
        {/* Statistics Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            📊 Statistiques de la base de données
          </Text>
          
          {loading && !stats ? (
            <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
          ) : stats ? (
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Total de documents:
                </Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                  {stats.total}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Avec nom d'opérateur:
                </Text>
                <Text style={[styles.statValue, { color: theme.success }]}>
                  {stats.withOperatorName}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Sans nom d'opérateur:
                </Text>
                <Text style={[styles.statValue, { color: theme.error }]}>
                  {stats.withoutOperatorName}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Opérateurs virtuels/test:
                </Text>
                <Text style={[styles.statValue, { color: '#F39C12' }]}>
                  {stats.virtualOperators}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Opérateurs réels:
                </Text>
                <Text style={[styles.statValue, { color: theme.success }]}>
                  {stats.realOperators}
                </Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: theme.primary }]}
            onPress={loadStatistics}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Chargement...' : '🔄 Actualiser les statistiques'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cleanup Actions Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            🧹 Actions de nettoyage
          </Text>

          <Text style={[styles.warningText, { color: '#E67E22' }]}>
            ⚠️ Attention: Ces actions sont irréversibles !
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E74C3C' }]}
            onPress={handleCleanUnknown}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              🗑️ Supprimer les opérateurs inconnus
            </Text>
            <Text style={[styles.buttonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
              Supprime tous les défauts sans nom d'opérateur
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#C0392B' }]}
            onPress={handleCleanAllVirtual}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              🧹 Supprimer toutes les données virtuelles
            </Text>
            <Text style={[styles.buttonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
              Supprime tous les opérateurs de test et données fictives
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            ℹ️ Informations
          </Text>
          
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Les opérateurs virtuels incluent:{'\n'}
            • Opérateur inconnu{'\n'}
            • Ahmed M., Fatima Z., Youssef K.{'\n'}
            • Test Operator, Test User{'\n'}
            • Références TEST-001, VIRTUAL, MOCK{'\n'}
            {'\n'}
            Seules les données réelles avec des noms d'opérateurs valides seront conservées.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  loader: {
    marginVertical: 20,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  warningText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AdminCleanup;
