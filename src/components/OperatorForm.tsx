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
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { CreateOperatorData, POSTES_TRAVAIL, CODES_DEFAUT, CODES_DEFAUT_PAR_CATEGORIE, CATEGORIES, PROJETS_SECTIONS } from '../types/Operator';
import { operatorService } from '../services/database';
import { notificationService } from '../services/notificationService';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomNavbar from './CustomNavbar';

interface OperatorFormProps {
  visible: boolean;
  onClose: () => void;
  onOperatorAdded: () => void;
  photoUri?: string | null;
  initialOperatorName?: string;
  initialMatricule?: string;
}

const OperatorForm: React.FC<OperatorFormProps> = ({ visible, onClose, onOperatorAdded, photoUri: initialPhotoUri, initialOperatorName, initialMatricule }) => {
  const [matricule, setMatricule] = useState(initialMatricule || '');
  const [nom, setNom] = useState(initialOperatorName || '');
  const [dateDetection, setDateDetection] = useState(new Date());
  const [posteTravail, setPosteTravail] = useState('');
  const [referenceProduit, setReferenceProduit] = useState('');
  const [codeDefaut, setCodeDefaut] = useState('');
  const [natureDefaut, setNatureDefaut] = useState('');
  const [shiftLeaderName, setShiftLeaderName] = useState('');
  const [ligne, setLigne] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [nombreOccurrences, setNombreOccurrences] = useState('');
  const [showPostePicker, setShowPostePicker] = useState(false);
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [filteredCodes, setFilteredCodes] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(initialPhotoUri || null);
  const [category, setCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [codeBoitier, setCodeBoitier] = useState('');
  const [codeRepere, setCodeRepere] = useState('');
  const [repere1, setRepere1] = useState('');
  const [repere2, setRepere2] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [valeurDemande, setValeurDemande] = useState('');
  const [valeurDetecte, setValeurDetecte] = useState('');
  const [operateurNom, setOperateurNom] = useState(initialOperatorName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useTheme();
  const { userData } = useAuth();
  const insets = useSafeAreaInsets();
  const [formattedDateText, setFormattedDateText] = useState('');

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: Platform.OS === 'web', // Utiliser base64 uniquement pour le web
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        if (Platform.OS === 'web') {
          // Pour le web, toujours utiliser base64 pour éviter les problèmes d'URI locales
          if (asset.base64) {
            setPhotoUri(`data:image/jpeg;base64,${asset.base64}`);
          } else {
            // Fallback: convertir l'URI en base64 pour le web
            try {
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onload = () => {
                setPhotoUri(reader.result as string);
              };
              reader.readAsDataURL(blob);
            } catch (fetchError) {
              console.log('Error converting image to base64:', fetchError);
              Alert.alert('Erreur', 'Impossible de traiter l\'image pour le web');
            }
          }
        } else {
          // Pour mobile, utiliser l'URI normale
          setPhotoUri(asset.uri);
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!userData) {
      Alert.alert('Erreur', 'Informations utilisateur non disponibles. Veuillez vous reconnecter.');
      return;
    }
    if (!posteTravail) {
      Alert.alert('Erreur', 'Veuillez sélectionner un poste de travail');
      return;
    }
    if (!referenceProduit.trim()) {
      Alert.alert('Erreur', 'La référence du produit est obligatoire');
      return;
    }
    if (!operateurNom.trim()) {
      Alert.alert('Erreur', "Le nom et prénom de l'opérateur est obligatoire");
      return;
    }

    try {
      setIsSubmitting(true);
      
      let uploadedPhotoUrl: string | undefined = undefined;
      if (photoUri) {
        if (photoUri.startsWith('data:image/')) {
          // Pour les images base64 (web), uploader directement
          try {
            console.log('Starting Cloudinary upload for base64 image');
            
            const uploadPromise = new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              
              xhr.open('POST', 'https://api.cloudinary.com/v1_1/dt6sq0zub/image/upload', true);
              
              xhr.onload = function() {
                if (xhr.status === 200) {
                  try {
                    const result = JSON.parse(xhr.responseText);
                    console.log('Cloudinary response:', result);
                    if (result && result.secure_url) {
                      resolve(result.secure_url);
                    } else {
                      reject(new Error('Réponse invalide de Cloudinary: pas d\'URL sécurisée'));
                    }
                  } catch (e) {
                    reject(new Error('Erreur parsing JSON: ' + (e instanceof Error ? e.message : String(e))));
                  }
                } else {
                  reject(new Error(`HTTP error! status: ${xhr.status}, response: ${xhr.responseText}`));
                }
              };
              
              xhr.onerror = function() {
                reject(new Error('Network request failed'));
              };
              
              xhr.ontimeout = function() {
                reject(new Error('Upload timeout'));
              };
              
              xhr.timeout = 30000;
              
              const formData = new FormData();
              formData.append('file', photoUri);
              formData.append('upload_preset', 'mehdi234');
              
              console.log('Data prepared, uploading base64 to Cloudinary...');
              
              xhr.send(formData);
            });
            
            uploadedPhotoUrl = await uploadPromise as string;
            console.log('Base64 image uploaded successfully to Cloudinary:', uploadedPhotoUrl);
            
          } catch (error) {
            console.error('Cloudinary upload error for base64:', error);
            uploadedPhotoUrl = photoUri; // Fallback to base64 data
          }
        } else if (photoUri.startsWith('file://')) {
          // Pour les fichiers locaux (mobile), lire en base64 puis uploader
          try {
            console.log('Starting Cloudinary upload for file:', photoUri);
            
            console.log('Reading file as base64...');
            const base64 = await FileSystem.readAsStringAsync(photoUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            console.log('Base64 created, length:', base64.length);
            
            const uploadPromise = new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              
              xhr.open('POST', 'https://api.cloudinary.com/v1_1/dt6sq0zub/image/upload', true);
              
              xhr.onload = function() {
                if (xhr.status === 200) {
                  try {
                    const result = JSON.parse(xhr.responseText);
                    console.log('Cloudinary response:', result);
                    if (result && result.secure_url) {
                      resolve(result.secure_url);
                    } else {
                      reject(new Error('Réponse invalide de Cloudinary: pas d\'URL sécurisée'));
                    }
                  } catch (e) {
                    reject(new Error('Erreur parsing JSON: ' + (e instanceof Error ? e.message : String(e))));
                  }
                } else {
                  reject(new Error(`HTTP error! status: ${xhr.status}, response: ${xhr.responseText}`));
                }
              };
              
              xhr.onerror = function() {
                reject(new Error('Network request failed'));
              };
              
              xhr.ontimeout = function() {
                reject(new Error('Upload timeout'));
              };
              
              xhr.timeout = 30000;
              
              const formData = new FormData();
              formData.append('file', `data:image/jpeg;base64,${base64}`);
              formData.append('upload_preset', 'mehdi234');
              
              console.log('Data prepared, uploading to Cloudinary...');
              console.log('Upload URL:', 'https://api.cloudinary.com/v1_1/dt6sq0zub/image/upload');
              console.log('Upload preset:', 'mehdi234');
              
              xhr.send(formData);
            });
            
            uploadedPhotoUrl = await uploadPromise as string;
            console.log('Image uploaded successfully to Cloudinary:', uploadedPhotoUrl);
          
        } catch (error) {
          console.error('Cloudinary upload error details:', error);
          
          if (error instanceof Error && error.message.includes('timeout')) {
            console.log('Upload timeout, using local URI as fallback');
            Alert.alert(
              'Upload interrompu',
              'L\'upload de la photo a pris trop de temps. La photo sera sauvegardée localement.',
              [{ text: 'OK' }]
            );
          } else if (error instanceof Error && error.message.includes('Network request failed')) {
            console.log('Network error, using local URI as fallback');
            Alert.alert(
              'Erreur réseau',
              'Impossible de se connecter à Cloudinary. La photo sera sauvegardée localement.',
              [{ text: 'OK' }]
            );
          } else {
            console.log('Other error, using local URI as fallback');
            Alert.alert(
              'Erreur d\'upload',
              'Impossible d\'uploader la photo sur Cloudinary. La photo sera sauvegardée localement.',
              [{ text: 'OK' }]
            );
          }
          
          uploadedPhotoUrl = photoUri;
          console.log('Using local URI as fallback:', uploadedPhotoUrl);
        }
        } else {
          // Pour les URLs déjà existantes (remote URLs)
          uploadedPhotoUrl = photoUri;
          console.log('Photo already has remote URL:', uploadedPhotoUrl);
        }
      }

      const operatorData: CreateOperatorData = {
        matricule: userData.matricule,
        nom: operateurNom.trim() || userData.fullName, // Utiliser operateurNom si rempli, sinon userData.fullName
        dateDetection,
        posteTravail,
        referenceProduit: referenceProduit.trim(),
        projet: userData.projet,
        section: userData.section,
        codeDefaut: codeDefaut.trim() || undefined,
        natureDefaut: natureDefaut.trim() || undefined,
        shiftLeaderName: shiftLeaderName.trim() || undefined,
        ligne: ligne ? Number(ligne) : undefined,
        commentaire: commentaire.trim() || undefined,
        nombreOccurrences: nombreOccurrences ? Number(nombreOccurrences) : undefined,
        photoUri: uploadedPhotoUrl,
        category: category || undefined,
        codeBoitier: codeBoitier.trim() || undefined,
        codeRepere: codeRepere.trim() || undefined,
        repere1: codeDefaut === '210' ? repere1.trim() || undefined : undefined,
        repere2: codeDefaut === '210' ? repere2.trim() || undefined : undefined,
        p1: category === 'geometrie' ? p1.trim() || undefined : undefined,
        p2: category === 'geometrie' ? p2.trim() || undefined : undefined,
        valeurDemande: category === 'geometrie' ? valeurDemande.trim() || undefined : undefined,
        valeurDetecte: category === 'geometrie' ? valeurDetecte.trim() || undefined : undefined,
        operateurNom: operateurNom.trim() || undefined,
      };

      const createdOperatorId = await operatorService.create(operatorData);
      
      await notificationService.notifyDefautAdded({
        matricule: userData.matricule,
        nom: userData.fullName,
        codeDefaut: codeDefaut.trim(),
        referenceProduit: referenceProduit.trim(),
        posteTravail,
        dateDetection: dateDetection,
        defautId: createdOperatorId,
        defautSnapshot: {
          id: createdOperatorId,
          ...operatorData,
        },
      });
      
      setMatricule('');
      setNom('');
      setOperateurNom('');
      setDateDetection(new Date());
      setFormattedDateText('');
      setPosteTravail('');
      setReferenceProduit('');
      setCodeDefaut('');
      setNatureDefaut('');
      setShiftLeaderName('');
      setLigne('');
      setCommentaire('');
      setNombreOccurrences('');
      setPhotoUri(null);
      setCategory('');
      setCodeBoitier('');
      setCodeRepere('');
      setRepere1('');
      setRepere2('');
      setP1('');
      setP2('');
      setValeurDemande('');
      setValeurDetecte('');
      
      onOperatorAdded();
      onClose();
      
      Alert.alert('Succès', 'Agent qualité enregistré avec succès!');
    } catch (error) {
      let errorMessage = 'Échec de l\'enregistrement de l\'agent qualité';
      if (error instanceof Error) {
        errorMessage += ` : ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage += ` : ${error}`;
      }
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setMatricule('');
    setNom('');
    setOperateurNom('');
    setDateDetection(new Date());
    setFormattedDateText('');
    setPosteTravail('');
    setReferenceProduit('');
    setCodeDefaut('');
    setNatureDefaut('');
    setShiftLeaderName('');
    setLigne('');
    setCommentaire('');
    setNombreOccurrences('');
    setPhotoUri(null);
    setCategory('');
    setCodeBoitier('');
    setCodeRepere('');
    setRepere1('');
    setRepere2('');
    setP1('');
    setP2('');
    setValeurDemande('');
    setValeurDetecte('');
    setIsSubmitting(false);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleDateChange = (text: string) => {
    const numbersOnly = text.replace(/[^0-9]/g, '');
    
    let formattedDate = '';
    if (numbersOnly.length >= 1) {
      formattedDate = numbersOnly.substring(0, 2);
    }
    if (numbersOnly.length >= 3) {
      formattedDate += '/' + numbersOnly.substring(2, 4);
    }
    if (numbersOnly.length >= 5) {
      formattedDate += '/' + numbersOnly.substring(4, 8);
    }
    
    setFormattedDateText(formattedDate);
    
    if (formattedDate.length === 10) {
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = formattedDate.match(dateRegex);
      
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);
        const newDate = new Date(year, month, day);
        
        if (newDate.getDate() === day && 
            newDate.getMonth() === month && 
            newDate.getFullYear() === year &&
            year >= 1900 && year <= 2100) {
          setDateDetection(newDate);
        }
      }
    }
  };

  const handleCodeDefautChange = (text: string) => {
    setCodeDefaut(text);
    
    if (text.trim()) {
      const categoryCodes = selectedCategory && CODES_DEFAUT_PAR_CATEGORIE[selectedCategory] ? CODES_DEFAUT_PAR_CATEGORIE[selectedCategory] : {};
      const filtered = Object.keys(categoryCodes).filter(code => 
        code.toLowerCase().includes(text.toLowerCase()) ||
        (categoryCodes as any)[code].toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCodes(filtered);
    } else {
      setFilteredCodes([]);
    }
  };

  const selectCodeDefaut = (code: string) => {
    setCodeDefaut(code);
    const categoryCodes = selectedCategory && CODES_DEFAUT_PAR_CATEGORIE[selectedCategory] ? CODES_DEFAUT_PAR_CATEGORIE[selectedCategory] : {};
    setNatureDefaut((categoryCodes as any)[code] || '');
    setFilteredCodes([]);
  };

  const handleCategoryChange = (selectedCat: string) => {
    setSelectedCategory(selectedCat);
    setCategory(selectedCat);
    setCodeDefaut('');
    setNatureDefaut('');
    setFilteredCodes([]);
    if (selectedCat !== 'geometrie') {
      setP1('');
      setP2('');
      setValeurDemande('');
      setValeurDetecte('');
    } else { 
      setCodeBoitier('');
      setCodeRepere('');
    }
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}> 
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          
          <CustomNavbar 
            title="Nouveau Défaut Qualité"
            leftContent={
              <Feather name="user-plus" size={24} color="white" style={{ marginRight: 12 }} />
            }
            rightContent={
              <TouchableOpacity onPress={handleCancel} style={{
                padding: spacing.sm,
                borderRadius: borderRadius.sm,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}>
                <Feather name="x" size={24} color="white" />
              </TouchableOpacity>
            }
          />

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }} 
          >
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="camera" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Photo du défaut</Text>
              </View>
              
              {photoUri ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <TouchableOpacity onPress={removePhoto} style={styles.removePhotoButton}>
                    <Feather name="x-circle" size={24} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.photoButton, { 
                    backgroundColor: theme.surface,
                    borderColor: theme.border 
                  }]}
                  onPress={pickImage}
                >
                  <Feather name="camera" size={32} color={theme.primary} style={{ marginBottom: 8 }} />
                  <Text style={[styles.photoButtonText, { color: theme.primary }]}>
                    Ajouter une photo
                  </Text>
                  <Text style={[styles.photoButtonSubtext, { color: theme.textSecondary }]}>
                    Optionnel
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="user" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Informations Agent</Text>
              </View>

              {/* Affichage des informations utilisateur (lecture seule) */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Matricule</Text>
                  <View style={[styles.input, { 
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    justifyContent: 'center'
                  }]}>
                    <Text style={[{ color: theme.textPrimary }]}>
                      {userData?.matricule || 'Non disponible'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Nom complet</Text>
                  <View style={[styles.input, { 
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    justifyContent: 'center'
                  }]}>
                    <Text style={[{ color: theme.textPrimary }]}>
                      {userData?.fullName || 'Non disponible'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Projet</Text>
                  <View style={[styles.input, { 
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    justifyContent: 'center'
                  }]}> 
                  <Text style={[{ color: theme.textPrimary }]}>
                    {userData?.projet || 'Non disponible'}
                  </Text>
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Section</Text>
                  <View style={[styles.input, { 
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    justifyContent: 'center'
                  }]}>
                    <Text style={[{ color: theme.textPrimary }]}>
                      {userData?.section || 'Non disponible'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Date détection</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.textPrimary 
                    }]}
                    value={formattedDateText || formatDate(dateDetection)}
                    onChangeText={handleDateChange}
                    placeholder="JJ/MM/AAAA"
                    placeholderTextColor={theme.textTertiary}
                    maxLength={10}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Shift Leader Name</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.textPrimary 
                    }]}
                    value={shiftLeaderName}
                    onChangeText={setShiftLeaderName}
                    placeholder="Enter the correct shift leader name"
                    placeholderTextColor={theme.textTertiary}
                    maxLength={100}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Matricule de l'opérateur *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.textPrimary 
                    }]}
                    value={operateurNom}
                    onChangeText={setOperateurNom}
                    placeholder="Veuillez saisir le matricule de l'opérateur"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]} />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="settings" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Configuration</Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Ligne</Text>
                <View style={[styles.pickerButton, { 
                  backgroundColor: theme.surface,
                  borderColor: theme.border 
                }]}> 
                  <Picker
                    selectedValue={ligne}
                    onValueChange={(value) => setLigne(value)}
                    style={{ 
                      color: theme.textPrimary, 
                      backgroundColor: 'transparent',
                      flex: 1,
                      marginLeft: -8
                    }}
                    dropdownIconColor={theme.primary}
                  >
                    <Picker.Item label="Sélectionner une ligne..." value="" />
                    <Picker.Item label="Ligne 1" value="1" />
                    <Picker.Item label="Ligne 2" value="2" />
                    <Picker.Item label="Ligne 3" value="3" />
                    <Picker.Item label="Ligne 4" value="4" />
                    <Picker.Item label="Ligne 5" value="5" />
                    <Picker.Item label="Ligne 6" value="6" />
                    <Picker.Item label="Ligne 7" value="7" />
                    <Picker.Item label="Ligne 8" value="8" />
                    <Picker.Item label="Ligne 9" value="9" />
                    <Picker.Item label="Ligne 10" value="10" />
                  </Picker>
                  <Feather name="chevron-down" size={16} color={theme.textSecondary} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Poste de travail *</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, { 
                    backgroundColor: theme.surface,
                    borderColor: theme.border 
                  }]}
                  onPress={() => setShowPostePicker(true)}
                >
                  <Text style={posteTravail ? [styles.pickerButtonText, { color: theme.textPrimary }] : [styles.pickerButtonPlaceholder, { color: theme.textTertiary }]}>
                    {posteTravail || 'Sélectionner'}
                  </Text>
                  <Feather name="chevron-down" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="tag" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Catégorie du défaut</Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Catégorie</Text>
                <View style={[styles.pickerButton, { 
                  backgroundColor: theme.surface,
                  borderColor: theme.border 
                }]}>
                  <Picker
                    selectedValue={category}
                    onValueChange={handleCategoryChange}
                    style={{ 
                      color: theme.textPrimary, 
                      backgroundColor: 'transparent',
                      flex: 1,
                      marginLeft: -8
                    }}
                    dropdownIconColor={theme.primary}
                  >
                    <Picker.Item label="Sélectionner une catégorie..." value="" />
                    {CATEGORIES.map((cat) => (
                      <Picker.Item key={cat} label={cat === 'geometrie' ? 'Géométrie' : cat} value={cat} />
                    ))}
                  </Picker>
                  <Feather name="chevron-down" size={16} color={theme.textSecondary} />
                </View>
              </View>
            </View>

            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="alert-triangle" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Détails du Défaut</Text>
              </View>
              
              <View style={styles.row}>
                
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Référence produit *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.textPrimary 
                    }]}
                    value={referenceProduit}
                    onChangeText={setReferenceProduit}
                    placeholder="Réf. produit"
                    placeholderTextColor={theme.textTertiary}
                    maxLength={50}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Code défaut</Text>
                {!selectedCategory ? (
                  <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                    Veuillez d'abord sélectionner une catégorie
                  </Text>
                ) : (
                  <>
                    <View style={styles.codeInputContainer}>
                      <TextInput
                        style={[styles.input, styles.codeInput, { 
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          color: theme.textPrimary 
                        }]}
                        value={codeDefaut}
                        onChangeText={handleCodeDefautChange}
                        placeholder="Code du défaut"
                        placeholderTextColor={theme.textTertiary}
                        maxLength={20}
                      />
                      <TouchableOpacity
                        style={[styles.codePickerButton, { backgroundColor: theme.primary }]}
                        onPress={() => setShowCodePicker(true)}
                      >
                        <Feather name="list" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                    {filteredCodes.length > 0 && (
                      <View style={[styles.autocompleteContainer, { 
                        backgroundColor: theme.surface,
                        borderColor: theme.border 
                      }]}>
                        {filteredCodes.map((code) => (
                          <TouchableOpacity
                            key={code}
                            style={[styles.autocompleteItem, { borderBottomColor: theme.borderLight }]}
                            onPress={() => selectCodeDefaut(code)}
                          >
                            <Text style={[styles.autocompleteText, { color: theme.textPrimary }]}>{code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Nature du défaut</Text>
                  <TextInput
                    style={[styles.input, styles.natureInput, { 
                      backgroundColor: theme.surfaceSecondary,
                      borderColor: theme.border,
                      color: theme.textSecondary 
                    }]}
                    value={natureDefaut}
                    onChangeText={setNatureDefaut}
                    placeholder="Auto-rempli"
                    placeholderTextColor={theme.textTertiary}
                    editable={false}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Occurrences</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.textPrimary 
                    }]}
                    value={nombreOccurrences}
                    onChangeText={setNombreOccurrences}
                    placeholder="Nombre"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            
            {category !== 'geometrie' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="box" size={20} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Code du boitier</Text>
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
                    value={codeBoitier}
                    onChangeText={setCodeBoitier}
                    placeholder="Code du boitier"
                    placeholderTextColor={theme.textTertiary}
                    maxLength={50}
                  />
                </View>
              </View>
            )}
            
            {category !== 'geometrie' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="hash" size={20} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Code de repère (optionnel)</Text>
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
                    value={codeRepere}
                    onChangeText={setCodeRepere}
                    placeholder="Code de repère"
                    placeholderTextColor={theme.textTertiary}
                    maxLength={50}
                  />
                </View>
              </View>
            )}
            {codeDefaut === '210' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="hash" size={20} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Repère 1 et Repère 2</Text>
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
                    value={repere1}
                    onChangeText={setRepere1}
                    placeholder="Repère 1"
                    placeholderTextColor={theme.textTertiary}
                    maxLength={50}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
                    value={repere2}
                    onChangeText={setRepere2}
                    placeholder="Repère 2"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="numeric"
                    maxLength={50}
                  />
                </View>
              </View>
            )}

            
            {category === 'geometrie' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="compass" size={20} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Mesures Géométriques</Text>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={[styles.label, { color: theme.textPrimary }]}>P1</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: theme.surfaceSecondary, 
                        borderColor: theme.border,
                        color: theme.textPrimary 
                      }]}
                      value={p1}
                      onChangeText={setP1}
                      placeholder="P1 (mm)"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={[styles.label, { color: theme.textPrimary }]}>P2</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: theme.surfaceSecondary, 
                        borderColor: theme.border,
                        color: theme.textPrimary 
                      }]}
                      value={p2}
                      onChangeText={setP2}
                      placeholder="P2 (mm)"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={[styles.label, { color: theme.textPrimary }]}>Valeur Demandée</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: theme.surfaceSecondary, 
                        borderColor: theme.border,
                        color: theme.textPrimary 
                      }]}
                      value={valeurDemande}
                      onChangeText={setValeurDemande}
                      placeholder="Valeur demandée (mm)"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={[styles.label, { color: theme.textPrimary }]}>Valeur Détectée</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: theme.surfaceSecondary, 
                        borderColor: theme.border,
                        color: theme.textPrimary 
                      }]}
                      value={valeurDetecte}
                      onChangeText={setValeurDetecte}
                      placeholder="Valeur détectée (mm)"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>
            )}

            
            <View style={styles.section}>
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
                  placeholder="Description détaillée du défaut (optionnel)"
                  placeholderTextColor={theme.textTertiary}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>
            </View>
          </ScrollView>

          
          
          <Modal
            visible={showPostePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPostePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                    Sélectionner un poste de travail
                  </Text>
                  <TouchableOpacity onPress={() => setShowPostePicker(false)}>
                    <Feather name="x" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScrollView}>
                  {POSTES_TRAVAIL.map((poste) => (
                    <TouchableOpacity
                      key={poste}
                      style={[styles.modalItem, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setPosteTravail(poste);
                        setShowPostePicker(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, { color: theme.textPrimary }]}>
                        {poste}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          
          <Modal
            visible={showCodePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCodePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                    {selectedCategory ? `Codes défauts - ${selectedCategory}` : 'Sélectionner un code défaut'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCodePicker(false)}>
                    <Feather name="x" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScrollView}>
                  {selectedCategory ? 
                    Object.keys(CODES_DEFAUT_PAR_CATEGORIE[selectedCategory] || {}).map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={[styles.modalItem, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        selectCodeDefaut(code);
                        setShowCodePicker(false);
                      }}
                    >
                      <View>
                        <Text style={[styles.modalItemText, { color: theme.textPrimary, fontWeight: '600' }]}>
                          {code}
                        </Text>
                        <Text style={[styles.modalItemSubtext, { color: theme.textSecondary }]}>
                          {(CODES_DEFAUT_PAR_CATEGORIE[selectedCategory] as any)[code]}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.modalItem}>
                      <Text style={[styles.modalItemText, { color: theme.textSecondary, textAlign: 'center' }]}>
                        Veuillez d'abord sélectionner une catégorie
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

          

          <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={handleCancel}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                { 
                  backgroundColor: isSubmitting ? theme.textTertiary : theme.primary,
                  opacity: isSubmitting ? 0.7 : 1
                }
              ]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <Feather name="check" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    // padding and paddingTop handled by contentContainerStyle
    // Removed paddingHorizontal from here
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    color: '#374151',
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    color: '#6b7280',
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    minHeight: 48,
  },
  pickerButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  pickerButtonPlaceholder: {
    fontSize: typography.fontSize.md,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  codeInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  codePickerButton: {
    padding: spacing.md,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
  },
  codePickerButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  autocompleteContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    maxHeight: 150,
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    elevation: 4,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  autocompleteItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  autocompleteText: {
    fontSize: typography.fontSize.md,
  },
  natureInput: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    color: '#6b7280',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    padding: spacing.md,
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 1.2,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    backgroundColor: '#f9fafb',
  },
  photoButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  photoButtonSubtext: {
    fontSize: typography.fontSize.sm,
  },
  removePhotoButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    elevation: 8,
    boxShadow: '0 -4px 8px rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    minWidth: 160,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 10,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  modalItemText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  modalItemSubtext: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  addButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  saveGeometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  saveGeometricButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: 'white',
  },
  savedGeometricData: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  savedGeometricText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
});

export default OperatorForm; 