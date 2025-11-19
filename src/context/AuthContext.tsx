import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService, UserData } from '../services/authService';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithMatricule: (matricule: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerUser: (userData: any) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Récupérer les données utilisateur depuis Firestore
        try {
          const userDataFromDb = await authService.getUserData(firebaseUser.uid);
          setUserData(userDataFromDb);
          
          // Vérifier si l'utilisateur est admin
          const adminStatus = await authService.isAdmin(firebaseUser.uid);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
          setUserData(null);
          setIsAdmin(false);
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const loginWithMatricule = async (matricule: string, password: string) => {
    try {
      const userDataFromLogin = await authService.signInWithMatricule(matricule, password);
      setUserData(userDataFromLogin);
      
      // Vérifier le statut admin après connexion
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const adminStatus = await authService.isAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setUserData(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  };

  const registerUser = async (userData: any) => {
    try {
      return await authService.registerUser(userData);
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      isAdmin,
      loginWithMatricule, 
      logout,
      registerUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
