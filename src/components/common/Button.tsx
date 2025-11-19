import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: any;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const { theme } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = [
      styles.button,
      styles[size],
      fullWidth && styles.fullWidth,
      style,
    ];

    switch (variant) {
      case 'primary':
        return [
          ...baseStyle,
          {
            backgroundColor: disabled ? theme.textTertiary : theme.primary,
            borderColor: disabled ? theme.textTertiary : theme.primary,
          },
        ];
      case 'secondary':
        return [
          ...baseStyle,
          {
            backgroundColor: disabled ? theme.textTertiary : theme.secondary,
            borderColor: disabled ? theme.textTertiary : theme.secondary,
          },
        ];
      case 'outline':
        return [
          ...baseStyle,
          {
            backgroundColor: 'transparent',
            borderColor: disabled ? theme.textTertiary : theme.primary,
          },
        ];
      case 'ghost':
        return [
          ...baseStyle,
          {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
        ];
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = [styles.text, styles[`${size}Text`]];

    switch (variant) {
      case 'primary':
      case 'secondary':
        return [
          ...baseTextStyle,
          {
            color: theme.textInverse,
          },
        ];
      case 'outline':
        return [
          ...baseTextStyle,
          {
            color: disabled ? theme.textTertiary : theme.primary,
          },
        ];
      case 'ghost':
        return [
          ...baseTextStyle,
          {
            color: disabled ? theme.textTertiary : theme.primary,
          },
        ];
      default:
        return baseTextStyle;
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size={16}
          color={variant === 'outline' || variant === 'ghost' ? theme.primary : theme.textInverse}
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '500',
  },
  smallText: {
    fontSize: typography.fontSize.sm,
  },
  mediumText: {
    fontSize: typography.fontSize.md,
  },
  largeText: {
    fontSize: typography.fontSize.lg,
  },
});

export default Button; 