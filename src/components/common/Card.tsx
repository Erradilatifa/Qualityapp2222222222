import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

interface CardProps extends ViewProps {
  children?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getCardStyle = () => {
    const baseStyle = [styles.card, styles[padding]];

    switch (variant) {
      case 'elevated':
        baseStyle.push({
          backgroundColor: theme.surface,
          ...shadows.md,
        } as any);
        break;
      case 'outlined':
        baseStyle.push({
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        } as any);
        break;
      default:
        baseStyle.push({
          backgroundColor: theme.surface,
          ...shadows.sm,
        } as any);
    }

    return baseStyle;
  };

  return (
    <View style={[getCardStyle(), style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
  },
  none: {
    padding: 0,
  },
  small: {
    padding: spacing.sm,
  },
  medium: {
    padding: spacing.md,
  },
  large: {
    padding: spacing.lg,
  },
});

export default Card; 