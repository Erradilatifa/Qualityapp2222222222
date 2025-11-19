import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme/spacing';

interface CustomNavbarProps {
  title?: string; // Make title optional
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

const HEADER_HEIGHT_BASE = spacing.lg * 2 + 24; // Base height for the content inside the navbar (padding + icon size)

const CustomNavbar: React.FC<CustomNavbarProps> = ({ title, leftContent, rightContent }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate the total height of the navbar including safe area insets
  const totalNavbarHeight = insets.top + HEADER_HEIGHT_BASE;

  return (
    <LinearGradient 
      colors={[theme.primary, theme.secondary]} 
      style={[styles.headerGradient, { paddingTop: insets.top, height: totalNavbarHeight }]} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 0 }}
    >
      <View style={[styles.headerContent, {marginTop: Platform.OS === 'android' ? insets.top : 0}]}>
        <View style={styles.headerLeft}>
          {leftContent}
          {title && <Text style={styles.headerTitle}>{title}</Text>}
        </View>
        <View style={styles.headerRight}>
          {rightContent}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    // The actual content's vertical padding will be managed by the parent LinearGradient's height
    // and paddingTop (insets.top)
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: 'white',
    marginLeft: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default CustomNavbar;