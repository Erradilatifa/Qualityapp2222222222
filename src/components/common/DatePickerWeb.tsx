import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerWebProps {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'compact';
  onChange: (event: any, selectedDate?: Date) => void;
  style?: any;
}

const DatePickerWeb: React.FC<DatePickerWebProps> = ({ value, mode = 'date', display, onChange, style }) => {
  if (Platform.OS === 'web') {
    const formatDateForInput = (date: Date): string => {
      if (mode === 'date') {
        return date.toISOString().split('T')[0];
      } else if (mode === 'time') {
        return date.toTimeString().slice(0, 5);
      } else {
        return date.toISOString().slice(0, 16);
      }
    };

    const handleWebDateChange = (event: any) => {
      const dateString = event.target.value;
      if (dateString) {
        let newDate: Date;
        if (mode === 'date') {
          newDate = new Date(dateString + 'T00:00:00');
        } else if (mode === 'time') {
          const today = new Date();
          const [hours, minutes] = dateString.split(':');
          newDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));
        } else {
          newDate = new Date(dateString);
        }
        onChange(event, newDate);
      }
    };

    const inputType = mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date';
    
    return (
      <input
        type={inputType}
        value={formatDateForInput(value)}
        onChange={handleWebDateChange}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '16px',
          ...style
        }}
      />
    );
  }

  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={display}
      onChange={onChange}
    />
  );
};

export default DatePickerWeb;
