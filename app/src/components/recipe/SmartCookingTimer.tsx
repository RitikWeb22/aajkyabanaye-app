import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Vibration,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

interface SmartCookingTimerProps {
  initialMinutes?: number;
  stepLabel?: string;
  visible?: boolean;
  onClose?: () => void;
  onTimerComplete?: (stepLabel?: string) => void;
}

export function SmartCookingTimer({
  initialMinutes = 5,
  stepLabel = 'Cooking Step',
  visible = false,
  onClose,
  onTimerComplete,
}: SmartCookingTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState<number>(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Sync when initialMinutes changes
  useEffect(() => {
    if (initialMinutes > 0) {
      const sec = initialMinutes * 60;
      setTotalSeconds(sec);
      setRemainingSeconds(sec);
      setIsCompleted(false);
      setIsRunning(true); // Auto-start when user specifically triggered from a step
    }
  }, [initialMinutes, stepLabel]);

  // Timer Tick Interval
  useEffect(() => {
    let interval: any = null;

    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, remainingSeconds]);

  // Pulse animation on complete
  const handleComplete = () => {
    setIsRunning(false);
    setIsCompleted(true);

    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      } catch (e) {
        // Safe fallback
      }
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 6 }
    ).start();

    if (onTimerComplete) {
      onTimerComplete(stepLabel);
    }
  };

  const handleTogglePlayPause = () => {
    if (remainingSeconds === 0) {
      // If completed or 0, restart with total seconds
      setRemainingSeconds(totalSeconds > 0 ? totalSeconds : 300);
      setIsCompleted(false);
      setIsRunning(true);
      return;
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setRemainingSeconds(totalSeconds);
  };

  const handleAddMinutes = (mins: number) => {
    setTotalSeconds((prev) => prev + mins * 60);
    setRemainingSeconds((prev) => prev + mins * 60);
    setIsCompleted(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = totalSeconds > 0 ? Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100) : 0;

  if (!visible && remainingSeconds === totalSeconds && !isRunning) {
    return null;
  }

  // Floating Minimized Bar when user minimizes the clock
  if (isMinimized) {
    return (
      <View style={styles.floatingMinimizedBar}>
        <Pressable
          style={styles.minimizedContent}
          onPress={() => setIsMinimized(false)}
        >
          <View style={[styles.timerIconPulse, isRunning && styles.timerIconPulseActive]}>
            <Ionicons
              name={isRunning ? 'timer' : 'timer-outline'}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.minimizedTextCol}>
            <Text style={styles.minimizedLabel} numberOfLines={1}>
              {stepLabel}
            </Text>
            <Text style={styles.minimizedTime}>
              {isCompleted ? 'Done! 🔔' : formatTime(remainingSeconds)}
            </Text>
          </View>
        </Pressable>

        <View style={styles.minimizedActions}>
          <Pressable
            style={styles.minimizedPlayBtn}
            onPress={handleTogglePlayPause}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={15}
              color="#20563F"
            />
          </Pressable>
          <Pressable
            style={styles.minimizedCloseBtn}
            onPress={() => {
              setIsRunning(false);
              if (onClose) onClose();
            }}
          >
            <Ionicons name="close" size={16} color="#8E8B82" />
          </Pressable>
        </View>
      </View>
    );
  }

  const handleClose = () => {
    setIsRunning(false);
    setIsMinimized(false);
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="Close timer overlay"
        />
        <Animated.View
          style={[
            styles.timerCard,
            isCompleted && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.timerHeader}>
            <View style={styles.timerHeaderLeft}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="stopwatch" size={18} color="#20563F" />
              </View>
              <View>
                <Text style={styles.timerTitle}>Smart Kitchen Timer</Text>
                <Text style={styles.timerSubtitle} numberOfLines={1}>
                  {stepLabel}
                </Text>
              </View>
            </View>

            <View style={styles.headerBtnsRow}>
              {isRunning && (
                <Pressable
                  style={styles.minimizeBtn}
                  onPress={() => setIsMinimized(true)}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-down" size={20} color={Colors.text.DEFAULT} />
                </Pressable>
              )}
              <Pressable
                style={styles.closeBtn}
                onPress={handleClose}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={Colors.text.DEFAULT} />
              </Pressable>
            </View>
          </View>

          {/* Clock Dial Display */}
          <View
            style={[
              styles.clockDisplayContainer,
              isCompleted && styles.clockDisplayCompleted,
              isRunning && styles.clockDisplayRunning,
            ]}
          >
            <Text
              style={[
                styles.digitalTimeText,
                isCompleted && styles.digitalTimeTextCompleted,
              ]}
            >
              {formatTime(remainingSeconds)}
            </Text>

            <Text style={styles.clockStatusText}>
              {isCompleted
                ? 'Dish Ready! Time to check 🍲'
                : isRunning
                ? 'Cooking in progress...'
                : 'Timer paused'}
            </Text>

            {/* Circular/Linear Progress Bar */}
            <View style={styles.timerProgressBarTrack}>
              <View
                style={[
                  styles.timerProgressBarFill,
                  { width: `${progressPercent}%` },
                  isCompleted && { backgroundColor: '#248A3D' },
                ]}
              />
            </View>
          </View>

          {/* Quick Preset Buttons (+1m, +3m, +5m, +10m) */}
          <View style={styles.presetButtonsRow}>
            {[
              { label: '+1 Min', mins: 1 },
              { label: '+3 Mins', mins: 3 },
              { label: '+5 Mins', mins: 5 },
              { label: '+10 Mins', mins: 10 },
            ].map((preset) => (
              <Pressable
                key={preset.label}
                style={styles.presetChip}
                onPress={() => handleAddMinutes(preset.mins)}
              >
                <Text style={styles.presetChipText}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Primary Action Buttons */}
          <View style={styles.timerControlsRow}>
            <Pressable
              style={styles.resetControlBtn}
              onPress={handleReset}
            >
              <Ionicons name="refresh" size={18} color="#6B7280" />
              <Text style={styles.resetControlText}>Reset</Text>
            </Pressable>

            <Pressable
              style={[
                styles.mainPlayBtn,
                isRunning && styles.mainPlayBtnPause,
                isCompleted && styles.mainPlayBtnDone,
              ]}
              onPress={handleTogglePlayPause}
            >
              <Ionicons
                name={isCompleted ? 'refresh' : isRunning ? 'pause' : 'play'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.mainPlayBtnText}>
                {isCompleted ? 'Restart' : isRunning ? 'Pause Timer' : 'Start Timer'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  timerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#6B7280',
    maxWidth: 200,
  },
  headerBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimizeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockDisplayContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 18,
  },
  clockDisplayRunning: {
    borderColor: '#20563F',
    backgroundColor: '#F2F7F4',
  },
  clockDisplayCompleted: {
    borderColor: '#248A3D',
    backgroundColor: '#EDFDF2',
  },
  digitalTimeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 48,
    color: '#111827',
    letterSpacing: 2,
    lineHeight: 56,
  },
  digitalTimeTextCompleted: {
    color: '#248A3D',
  },
  clockStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  timerProgressBarTrack: {
    width: '90%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  timerProgressBarFill: {
    height: '100%',
    backgroundColor: '#20563F',
    borderRadius: 3,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 20,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#374151',
  },
  timerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetControlText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#4B5563',
  },
  mainPlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#20563F',
    shadowColor: '#20563F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  mainPlayBtnPause: {
    backgroundColor: '#D97706',
    shadowColor: '#D97706',
  },
  mainPlayBtnDone: {
    backgroundColor: '#248A3D',
    shadowColor: '#248A3D',
  },
  mainPlayBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  // Minimized Floating Pill
  floatingMinimizedBar: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timerIconPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerIconPulseActive: {
    backgroundColor: '#FC8019',
  },
  minimizedTextCol: {
    flex: 1,
  },
  minimizedLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#94A3B8',
  },
  minimizedTime: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  minimizedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimizedPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizedCloseBtn: {
    padding: 6,
  },
});
