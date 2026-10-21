import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeightPercent?: number;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightPercent = 80,
}: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <SafeAreaView style={[styles.sheetContainer, { maxHeight: `${maxHeightPercent}%` }]}>
              {/* Drag Indicator Handle */}
              <View style={styles.handleWrapper}>
                <View style={styles.handle} />
              </View>

              {/* Sheet Header */}
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  <Pressable
                    onPress={onClose}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close sheet"
                  >
                    <Ionicons name="close" size={22} color={Colors.text.DEFAULT} />
                  </Pressable>
                </View>
              )}

              {/* Body */}
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6D2C4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.text.DEFAULT,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    width: '100%',
  },
  contentContainer: {
    paddingVertical: 8,
  },
});
