import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@lib/haptics';
import { colors, radius, shadows, typography } from '@theme';

interface ShadcnCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  title?: string;
  themeColor?: string; // default '#0D9488'
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function ShadcnCalendarModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'Select Date',
  themeColor = '#0D9488',
}: ShadcnCalendarModalProps) {
  // Parse initial selected date or fallback to today
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [currentYear, setCurrentYear] = useState(validInitialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(validInitialDate.getMonth()); // 0-11

  React.useEffect(() => {
    if (visible && selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [visible, selectedDate]);

  if (!visible) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSameDayOpenNow = new Date().getHours() < 16;

  // Month navigation
  const handlePrevMonth = () => {
    haptic.light();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    haptic.light();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Days in month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Selected date components
  const selDateObj = selectedDate ? new Date(selectedDate) : null;
  const isSelectedMonth =
    selDateObj &&
    selDateObj.getFullYear() === currentYear &&
    selDateObj.getMonth() === currentMonth;
  const selectedDayNum = isSelectedMonth ? selDateObj.getDate() : -1;

  const calendarDays: ({ dayNum: number; isPadding: boolean })[] = [];

  // Padding for start of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ dayNum: 0, isPadding: true });
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ dayNum: d, isPadding: false });
  }

  const handleDayPress = (dayNum: number) => {
    const candidate = new Date(currentYear, currentMonth, dayNum);
    const dayOfWeek = candidate.getDay();

    // Monday (1) to Friday (5) only!
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      haptic.warning();
      return;
    }

    // Past date check
    if (candidate < today) {
      haptic.warning();
      return;
    }

    // Today check: only allowed until 4:00 PM (1 hour before 5 PM closing)
    const isToday =
      candidate.getFullYear() === today.getFullYear() &&
      candidate.getMonth() === today.getMonth() &&
      candidate.getDate() === today.getDate();

    if (isToday && !isSameDayOpenNow) {
      haptic.warning();
      return;
    }

    haptic.light();
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const formatted = `${currentYear}-${mm}-${dd}`;
    onSelectDate(formatted);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          {/* Top Title & Close */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="calendar" size={17} color={themeColor} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color="#6B7280" />
            </Pressable>
          </View>

          {/* Month & Navigation Row */}
          <View style={styles.monthNavRow}>
            <Pressable
              onPress={handlePrevMonth}
              style={styles.navArrowBtn}
              hitSlop={6}
            >
              <Ionicons name="chevron-back" size={16} color="#374151" />
            </Pressable>

            <Text style={styles.monthYearText}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>

            <Pressable
              onPress={handleNextMonth}
              style={styles.navArrowBtn}
              hitSlop={6}
            >
              <Ionicons name="chevron-forward" size={16} color="#374151" />
            </Pressable>
          </View>

          {/* Days of week */}
          <View style={styles.weekdaysHeader}>
            {DAYS_OF_WEEK.map((d, idx) => {
              const isWeekend = idx === 0 || idx === 6;
              return (
                <View key={idx} style={styles.weekdayCell}>
                  <Text
                    style={[
                      styles.weekdayText,
                      isWeekend && styles.weekendHeaderText,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, idx) => {
              if (item.isPadding) {
                return <View key={`pad-${idx}`} style={styles.dayCell} />;
              }

              const cellDate = new Date(currentYear, currentMonth, item.dayNum);
              const dayOfWeek = cellDate.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isPast = cellDate < today;
              const isSelected = item.dayNum === selectedDayNum;
              const isTodayDate =
                cellDate.getFullYear() === today.getFullYear() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getDate() === today.getDate();

              // If today, enable until 4:00 PM (1 hour before 5:00 PM closing)
              const isTodayCutoffBlocked = isTodayDate && !isSameDayOpenNow;
              const isDisabled = isWeekend || isPast || isTodayCutoffBlocked;

              return (
                <Pressable
                  key={`day-${item.dayNum}`}
                  onPress={() => !isDisabled && handleDayPress(item.dayNum)}
                  disabled={isDisabled}
                  style={[
                    styles.dayCell,
                    isDisabled && styles.dayCellDisabled,
                    isSelected && [
                      styles.dayCellSelected,
                      { backgroundColor: themeColor },
                    ],
                    !isSelected && isTodayDate && !isTodayCutoffBlocked && [
                      styles.dayCellToday,
                      { borderColor: themeColor },
                    ],
                    isTodayCutoffBlocked && styles.dayCellAfternoonBlocked,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isWeekend && styles.dayTextWeekend,
                      isDisabled && styles.dayTextDisabled,
                      isTodayCutoffBlocked && styles.dayTextAfternoonBlocked,
                      isSelected && styles.dayTextSelected,
                      !isSelected && isTodayDate && !isTodayCutoffBlocked && { color: themeColor, fontWeight: '700' },
                    ]}
                  >
                    {item.dayNum}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Municipal Walk-In Queue Notice */}
          <View style={styles.footerNotice}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="time-outline" size={14} color="#0D9488" />
              <Text style={styles.noticeTitle}>
                Monday to Friday • 8:00 AM – 5:00 PM
              </Text>
            </View>
            <Text style={styles.noticeBody}>
              {isSameDayOpenNow
                ? 'Today is available for same-day walk-in scheduling until 4:00 PM (1 hour before 5:00 PM closing). Afterwards, only upcoming weekdays can be scheduled.'
                : 'Same-day queue scheduling closes at 4:00 PM (an hour before 5:00 PM closing). Please select an upcoming weekday.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 8,
  },
  navArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  monthYearText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  weekdaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekdayCell: {
    width: 38,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  weekendHeaderText: {
    color: '#D1D5DB',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: 44,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
    borderRadius: 8,
  },
  dayCellSelected: {
    borderRadius: 8,
  },
  dayCellToday: {
    borderWidth: 1,
    borderRadius: 8,
  },
  dayCellDisabled: {
    opacity: 0.45,
  },
  dayCellAfternoonBlocked: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    opacity: 0.6,
  },
  dayText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  dayTextWeekend: {
    color: '#D1D5DB',
  },
  dayTextDisabled: {
    color: '#E5E7EB',
  },
  dayTextAfternoonBlocked: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerNotice: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  noticeBody: {
    fontSize: 10.5,
    color: '#6B7280',
    lineHeight: 14.5,
  },
});
