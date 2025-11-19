import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, TouchableOpacity, Text, Platform, ScrollView, Dimensions, ActivityIndicator, TextInput, Alert } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import OperatorForm from './src/components/OperatorForm';
import OperatorList from './src/components/OperatorList';
import NotificationList from './src/components/NotificationList';
import Dashboard from './src/components/Dashboard';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NotificationBadgeProvider, useNotificationBadge } from './src/context/NotificationBadgeContext';
import CustomNavbar from './src/components/CustomNavbar';
import { operatorService } from './src/services/database';
import { spacing } from './src/theme/spacing';
import { AuthProvider, useAuth } from './src/context/AuthContext'; 
import { authService } from './src/services/authService';
import RegisterPage from './src/components/RegisterPage';
import CentreFormationDashboard from './src/components/CentreFormationDashboard';
import AnalyseDashboard from './src/components/AnalyseDashboard';
import AnalyseEquipe from './src/components/AnalyseEquipe';

// Initialiser l'admin au démarrage de l'app
const initializeAdmin = async () => {
  try {
    await authService.setUserAsAdminByEmail('mehdifadil2103@gmail.com');
    console.log('Admin initialisé avec succès');
  } catch (error) {
    console.log('Erreur lors de l\'initialisation admin:', error);
  }
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const Stack = createNativeStackNavigator();

const NAVBAR_HEIGHT = spacing.lg * 2 + 24; // This should match HEADER_HEIGHT_BASE in CustomNavbar.tsx

// Define the stack param list
type StackParamList = {
  Accueil: undefined;
  'Défauts détectés': { reload?: number } | undefined;
  Dashboard: undefined;
  'Centre de Formation': undefined;
  Analyse: undefined;
  'Analyse Équipe': undefined;
  Notifications: undefined;
  'Ajouter un défaut': { operatorName?: string; matricule?: string } | undefined;
  Login: undefined; // Add Login to stack param list
};

interface NavbarWrapperProps {
  setLeftContent: (content: React.ReactNode) => void;
  setRightContent: (content: React.ReactNode) => void;
}

const NavbarWrapper: React.FC<NavbarWrapperProps> = ({ setLeftContent, setRightContent }) => {
  const navigation = useNavigation<any>();
  const { unreadCount } = useNotificationBadge();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    setLeftContent(
      <TouchableOpacity onPress={() => navigation.navigate('Accueil')}>
        <MaterialIcons name="home" size={24} color="white" />
      </TouchableOpacity>
    );

    setRightContent(
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.navigate('Défauts détectés')} style={{ marginRight: 15 }}>
          <Feather name="list" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={{ marginRight: 15 }}>
          <Feather name="bar-chart-2" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Feather name="bell" size={24} color="white" />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              right: -2,
              top: -2,
              backgroundColor: 'red',
              borderRadius: 8,
              minWidth: 16,
              height: 16,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 3,
            }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                {unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [navigation, unreadCount, setLeftContent, setRightContent]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.surface,
          },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
          headerTransparent: true,
        }}
      >
        <Stack.Screen name="Accueil" component={HomeScreen} />
        <Stack.Screen name="Défauts détectés" component={OperatorList} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Centre de Formation" component={CentreFormationDashboard} />
        <Stack.Screen name="Analyse" component={AnalyseDashboard} />
        <Stack.Screen name="Analyse Équipe" component={AnalyseEquipe} />
        <Stack.Screen name="Notifications" component={NotificationList} />
        <Stack.Screen name="Ajouter un défaut" component={AddDefautScreen} options={{ presentation: 'modal', headerShown: false }} />
      </Stack.Navigator>
    </>
  );
};

const LoginScreen: React.FC = () => {
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegisterPage, setShowRegisterPage] = useState(false);
  const { loginWithMatricule, isAdmin } = useAuth();
  const { theme } = useTheme();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await loginWithMatricule(matricule, password);
    } catch (error: any) {
      Alert.alert('Connexion échouée', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserRegistered = () => {
    Alert.alert('Succès', 'Utilisateur créé avec succès');
  };

  return (
    <>
      <SafeAreaView style={[localStyles.container, { backgroundColor: theme.background }]}>
        <View style={localStyles.logoContainer}>
          <Feather name="shield" size={60} color={theme.primary} />
          <Text style={[localStyles.title, { color: theme.textPrimary }]}>Quality Mobile App</Text>
          <Text style={[localStyles.subtitle, { color: theme.textSecondary }]}>Connexion</Text>
        </View>

        <View style={localStyles.formContainer}>
          <TextInput
            style={[localStyles.input, { borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Matricule"
            placeholderTextColor={theme.textSecondary}
            value={matricule}
            onChangeText={(text) => setMatricule(text)}
            autoCapitalize="none"
          />
          <TextInput
            style={[localStyles.input, { borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Mot de passe"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[localStyles.button, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={localStyles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          {/* Registration button removed from login screen - now only available in admin dashboard */}
        </View>
      </SafeAreaView>

      {/* Page d'inscription */}
      <RegisterPage
        visible={showRegisterPage}
        onClose={() => setShowRegisterPage(false)}
        onUserRegistered={handleUserRegistered}
      />
    </>
  );
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [dailyStats, setDailyStats] = useState({ defects: 0, agents: 0 });
  const [loading, setLoading] = useState(true);
  const [showRegisterPage, setShowRegisterPage] = useState(false);
  const { user, logout, isAdmin } = useAuth(); // Use auth user for logging connection

  // Fonction pour calculer les statistiques du jour
  const calculateDailyStats = async () => {
    try {
      setLoading(true);
      const operators = await operatorService.getAll();
      
      // Date d'aujourd'hui (début et fin de journée)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Filtrer les défauts d'aujourd'hui
      const todayDefects = operators.filter((op: any) => {
        let opDate: Date;
        
        if (op.dateDetection instanceof Date) {
          opDate = op.dateDetection;
        } else if (op.dateDetection && typeof op.dateDetection === 'string') {
          opDate = new Date(op.dateDetection);
        } else if (op.dateDetection && (op.dateDetection as any).toDate) {
          opDate = (op.dateDetection as any).toDate();
        } else {
          return false;
        }
        
        return opDate >= startOfDay && opDate <= endOfDay;
      });
      
      // Calculer le total des défauts en tenant compte des occurrences
      const totalDefectsWithOccurrences = todayDefects.reduce((total, op) => {
        const occurrences = op.nombreOccurrences || 1; // Si pas d'occurrences, compter comme 1
        return total + occurrences;
      }, 0);
      
      // Obtenir les agents connectés aujourd'hui
      const activeUsers = await operatorService.getActiveUsersToday();
      
      setDailyStats({
        defects: totalDefectsWithOccurrences,
        agents: activeUsers.length
      });
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      setDailyStats({ defects: 0, agents: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour enregistrer une connexion utilisateur
  const logUserConnection = async () => {
    try {
      if (user?.email) { // Use authenticated user's email as matricule
        await operatorService.logUserConnection(user.email);
      } else {
        console.warn('User not authenticated, skipping user connection log.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la connexion:', error);
    }
  };

  // Charger les statistiques au montage du composant
  useEffect(() => {
    calculateDailyStats();
    logUserConnection();
  }, [user]); // Rerun when user changes

  // Recharger les statistiques quand on revient sur cette page
  useFocusEffect(
    React.useCallback(() => {
      calculateDailyStats();
      logUserConnection();
    }, [user]) // Rerun when user changes
  );
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* A spacer to push content down, making space for the fixed navbar */}
      <View style={{ height: NAVBAR_HEIGHT }} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
          {/* Contenu principal avec marges appropriées */}
          <View style={styles.mainContainer}>
            
            {/* Section des statistiques */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="bar-chart-2" size={24} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Statistiques du jour
                </Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FF6700' }]}>
                    <Feather name="alert-triangle" size={24} color="white" />
                  </View>
                  <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                    {loading ? '...' : dailyStats.defects}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    Défauts détectés
                  </Text>
                  <Text style={[styles.statSubtext, { color: theme.textTertiary }]}>
                    (avec occurrences)
                  </Text>
                </View>
                
                <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#0A2342' }]}>
                    <Feather name="users" size={24} color="white" />
                  </View>
                  <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                    {loading ? '...' : dailyStats.agents}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    Agents connectés
                  </Text>
                </View>
              </View>
            </View>

            {/* Section des actions principales */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="zap" size={24} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Actions principales
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => navigation.navigate('Ajouter un défaut' as any)}
                activeOpacity={0.8}
              >
                <LinearGradient 
                  colors={['#FF6700', '#FF8C42']} 
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.primaryButtonContent}>
                    <View style={styles.primaryButtonLeft}>
                      <Feather name="plus-circle" size={28} color="white" />
                      <Text style={styles.primaryButtonText}>Ajouter un défaut</Text>
                    </View>
                    <Feather name="arrow-right" size={20} color="white" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Section de navigation rapide */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="navigation" size={24} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Navigation rapide
                </Text>
              </View>
              
              <View style={styles.navigationGrid}>
                <TouchableOpacity
                  style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                  onPress={() => navigation.navigate('Défauts détectés' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navigationIconContainer, { backgroundColor: '#0A2342' }]}>
                    <Feather name="list" size={24} color="white" />
                  </View>
                  <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}>
                    Voir les défauts
                  </Text>
                  <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}>
                    Consulter la liste complète
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                  onPress={() => navigation.navigate('Dashboard' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navigationIconContainer, { backgroundColor: '#FF6700' }]}> 
                    <Feather name="bar-chart-2" size={24} color="white" />
                  </View>
                  <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}> 
                    Dashboard
                  </Text>
                  <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}> 
                    Statistiques et graphiques
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                  onPress={() => navigation.navigate('Centre de Formation' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navigationIconContainer, { backgroundColor: '#3498DB' }]}>
                    <Feather name="book" size={24} color="white" />
                  </View>
                  <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}>
                    Centre de Formation
                  </Text>
                  <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}>
                    Traçabilité et Requalification
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                  onPress={() => navigation.navigate('Analyse' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navigationIconContainer, { backgroundColor: '#9B59B6' }]}>
                    <Feather name="trending-up" size={24} color="white" />
                  </View>
                  <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}>
                    Analyse
                  </Text>
                  <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}>
                    Statistiques et graphiques
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                  onPress={() => navigation.navigate('Analyse Équipe' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navigationIconContainer, { backgroundColor: '#E67E22' }]}>
                    <Feather name="users" size={24} color="white" />
                  </View>
                  <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}>
                    Analyse Équipe
                  </Text>
                  <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}>
                    Gestion Utilisateurs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                  onPress={() => navigation.navigate('Notifications' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navigationIconContainer, { backgroundColor: '#2ECC71' }]}>
                    <Feather name="bell" size={24} color="white" />
                  </View>
                  <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}>
                    Notifications
                  </Text>
                  <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}>
                    Alertes système
                  </Text>
                </TouchableOpacity>


                {/* Admin-only user management */}
                {isAdmin && (
                  <TouchableOpacity
                    style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                    onPress={() => setShowRegisterPage(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.navigationIconContainer, { backgroundColor: '#9B59B6' }]}>
                      <Feather name="user-plus" size={24} color="white" />
                    </View>
                    <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}>
                      Gestion Utilisateurs
                    </Text>
                    <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}>
                      Créer nouveaux comptes
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Logout button */}
                <TouchableOpacity
                  style={[styles.navigationCard, { backgroundColor: theme.surface }]}
                  onPress={logout}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navigationIconContainer, { backgroundColor: '#E74C3C' }]}>
                    <Feather name="log-out" size={24} color="white" />
                  </View>
                  <Text style={[styles.navigationTitle, { color: theme.textPrimary }]}>
                    Déconnexion
                  </Text>
                  <Text style={[styles.navigationSubtitle, { color: theme.textSecondary }]}>
                    Se déconnecter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section d'information */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="info" size={24} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Guide d'utilisation
                </Text>
              </View>
              
              <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.infoIconContainer, { backgroundColor: '#0A2342' }]}>
                  <Feather name="help-circle" size={20} color="white" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>
                    Comment utiliser l'application ?
                  </Text>
                  <View style={styles.infoSteps}>
                    <View style={styles.infoStep}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                        <Text style={styles.stepNumberText}>1</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                        Ajoutez des défauts détectés avec photos
                      </Text>
                    </View>
                    <View style={styles.infoStep}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                        <Text style={styles.stepNumberText}>2</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                        Suivez leur progression en temps réel
                      </Text>
                    </View>
                    <View style={styles.infoStep}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                        <Text style={styles.stepNumberText}>3</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                        Gérez la qualité de vos produits
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Espace en bas pour éviter que le contenu soit caché par la barre de navigation */}
            <View style={styles.bottomSpacer} />
          </View>
      </ScrollView>
      
      {/* Admin Registration Modal */}
      <RegisterPage
        visible={showRegisterPage}
        onClose={() => setShowRegisterPage(false)}
        onUserRegistered={() => {
          setShowRegisterPage(false);
          Alert.alert('Succès', 'Utilisateur créé avec succès!');
        }}
      />
    </SafeAreaView>
  );
};

const AddDefautScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [showForm, setShowForm] = React.useState(true);
  const [photoUri, setPhotoUri] = React.useState<string | null>(null);
  
  // Récupérer les paramètres de la route
  const operatorName = route.params?.operatorName;
  const matricule = route.params?.matricule;

  const handleClose = () => {
    setShowForm(false);
    setPhotoUri(null);
    setTimeout(() => navigation.navigate('Défauts détectés', { reload: Date.now() }), 300);
  };

  return (
    <OperatorForm
      visible={showForm}
      onClose={handleClose}
      onOperatorAdded={handleClose}
      photoUri={photoUri}
      initialOperatorName={operatorName}
      initialMatricule={matricule}
    />
  );
};

const App: React.FC = () => {
  const [leftContent, setLeftContent] = useState<React.ReactNode>(null);
  const [rightContent, setRightContent] = useState<React.ReactNode>(null);
  const { user, loading } = useAuth(); // Use useAuth hook

  React.useEffect(() => {
    // Initialiser l'admin au démarrage
    initializeAdmin();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={localStyles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading user session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <NotificationBadgeProvider>
            {user ? ( // Conditionally render based on authentication status
              <>
                <CustomNavbar title="Quality Rework" leftContent={leftContent} rightContent={rightContent} />
                <NavigationContainer theme={{
                  ...DefaultTheme,
                  colors: {
                    ...DefaultTheme.colors,
                    background: 'transparent', 
                  },
                }}>
                  <NavbarWrapper setLeftContent={setLeftContent} setRightContent={setRightContent} />
                </NavigationContainer>
              </>
            ) : (
              <LoginScreen />
            )}
          </NotificationBadgeProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const localStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1 
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: {
    paddingBottom: 60,
  },
  headerGradient: {
    display: 'none',
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  logoContainer: {
    width: 0,
    height: 0,
    marginBottom: 0,
    alignSelf: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 0,
  },
  logo: {
    width: 0,
    height: 0,
  },
  headerTextContainer: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: 0,
    fontWeight: '600',
    color: 'white',
    marginBottom: 0,
    textAlign: 'center',
  },
  appNameText: {
    fontSize: 0,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 0,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 0,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  mainContainer: {
    paddingHorizontal: 20,
    paddingTop: 0, // Adjusted padding top
    paddingBottom: 10,
    width: '100%',
  },
  sectionContainer: {
    marginBottom: 20,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statCard: {
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 20,
    width: '48%',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  statSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  primaryActionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 6px 12px rgba(255, 103, 0, 0.3)',
    elevation: 8,
  },
  primaryButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginLeft: 15,
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  navigationCard: {
    width: '30%',
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 15,
    alignItems: 'center',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    marginBottom: 15,
  },
  navigationIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  navigationSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 25,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  infoIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoSteps: {
    marginTop: 10,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  stepText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 40,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App; 