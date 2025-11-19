import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import Feather from '@expo/vector-icons/Feather';
import { Picker } from '@react-native-picker/picker';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
  visible: boolean;
  onClose: () => void;
  onUserRegistered: () => void;
}

interface UserRegistrationData {
  matricule: string;
  password: string;
  fullName: string;
  projet: string;
  section: string;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ visible, onClose, onUserRegistered }) => {
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [projet, setProjet] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showProjetPicker, setShowProjetPicker] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  
  const { theme } = useTheme();
  const { isAdmin, user } = useAuth();

  // Options pour les projets (basées sur PROJETS_SECTIONS)
  const projets = [
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

  // Options pour les sections
  const sections = [
    'Section 01',
    'Section 02',
    'Section 03',
    'Section 04',
    'Section 05',
    'Section 06',
    'Section 07'
  ];

  const resetForm = () => {
    setMatricule('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setProjet('');
    setSection('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validateForm = (): boolean => {
    if (!matricule.trim()) {
      Alert.alert('Erreur', 'Le matricule est obligatoire');
      return false;
    }

    if (!fullName.trim()) {
      Alert.alert('Erreur', 'Le nom complet est obligatoire');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Erreur', 'Le mot de passe est obligatoire');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }

    if (!projet) {
      Alert.alert('Erreur', 'Veuillez sélectionner un projet');
      return false;
    }

    if (!section) {
      Alert.alert('Erreur', 'Veuillez sélectionner une section');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    // Vérifier si l'utilisateur est connecté et admin
    if (!user) {
      Alert.alert('Accès refusé', 'Vous devez être connecté en tant qu\'administrateur pour créer des utilisateurs');
      return;
    }
    
    if (!isAdmin) {
      Alert.alert('Accès refusé', 'Seuls les administrateurs peuvent créer de nouveaux utilisateurs');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const userData: UserRegistrationData = {
        matricule: matricule.trim(),
        password: password.trim(),
        fullName: fullName.trim(),
        projet,
        section,
      };

      // Appeler le service d'inscription
      await authService.registerUser(userData);
      
      Alert.alert(
        'Succès',
        'Utilisateur créé avec succès',
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onUserRegistered();
              onClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      Alert.alert('Erreur', 'Échec de la création du compte utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un utilisateur</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            
            {/* Matricule */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Matricule *
              </Text>
              <View style={[styles.inputContainer, { borderColor: theme.border }]}>
                <Feather name="user" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  value={matricule}
                  onChangeText={setMatricule}
                  placeholder="Entrez le matricule"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Nom complet */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Nom complet *
              </Text>
              <View style={[styles.inputContainer, { borderColor: theme.border }]}>
                <Feather name="user-check" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Entrez le nom complet"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Projet */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Projet *
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={() => setShowProjetPicker(true)}
              >
                <Feather name="briefcase" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.pickerText, { color: projet ? theme.textPrimary : theme.textSecondary }]}>
                  {projet || 'Sélectionner un projet'}
                </Text>
                <Feather name="chevron-down" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Section */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Section *
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={() => setShowSectionPicker(true)}
              >
                <Feather name="layers" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.pickerText, { color: section ? theme.textPrimary : theme.textSecondary }]}>
                  {section || 'Sélectionner une section'}
                </Text>
                <Feather name="chevron-down" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Mot de passe *
              </Text>
              <View style={[styles.inputContainer, { borderColor: theme.border }]}>
                <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Entrez le mot de passe"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmer mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Confirmer le mot de passe *
              </Text>
              <View style={[styles.inputContainer, { borderColor: theme.border }]}>
                <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmez le mot de passe"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Feather 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bouton d'inscription */}
            <TouchableOpacity
              style={[styles.registerButton, { backgroundColor: theme.primary }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Feather name="user-plus" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.registerButtonText}>Créer l'utilisateur</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal pour sélection du projet */}
        <Modal
          visible={showProjetPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowProjetPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
                  Sélectionner un projet
                </Text>
                <TouchableOpacity onPress={() => setShowProjetPicker(false)}>
                  <Feather name="x" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {projets.map((projetOption) => (
                  <TouchableOpacity
                    key={projetOption}
                    style={[styles.pickerOption, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setProjet(projetOption);
                      setShowProjetPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: theme.textPrimary }]}>
                      {projetOption}
                    </Text>
                    {projet === projetOption && (
                      <Feather name="check" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal pour sélection de la section */}
        <Modal
          visible={showSectionPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSectionPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
                  Sélectionner une section
                </Text>
                <TouchableOpacity onPress={() => setShowSectionPicker(false)}>
                  <Feather name="x" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {sections.map((sectionOption) => (
                  <TouchableOpacity
                    key={sectionOption}
                    style={[styles.pickerOption, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSection(sectionOption);
                      setShowSectionPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: theme.textPrimary }]}>
                      {sectionOption}
                    </Text>
                    {section === sectionOption && (
                      <Feather name="check" size={20} color={theme.primary} />
                    )}
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSize.lg,
    fontWeight: '700' as const,
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: '500' as const,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    paddingVertical: spacing.xs,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    marginLeft: spacing.sm,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  registerButtonText: {
    color: 'white',
    fontSize: typography.fontSize.md,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '500' as const,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: typography.fontSize.md,
  },
});

export default RegisterPage;
