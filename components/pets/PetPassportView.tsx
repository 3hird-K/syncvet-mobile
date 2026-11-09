import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { ageFromBirthYear, formatDateWithYear } from '@lib/format';
import { getAvatarPath, getPetAvatarSource } from '@lib/petAvatars';
import { buildPetTagString, downloadPetTag } from '@lib/petQrTag';
import { useAuthStore } from '@store/useAuthStore';
import { useDataStore } from '@store/useDataStore';
import { toast } from '@components/ui/Sonner';
import { PetAvatarPickerModal } from '@components/ui/PetAvatarPickerModal';
import { ShadcnCalendarModal } from '@components/ui/ShadcnCalendarModal';
import type { BookingInput, Pet } from '@services/data';

export type PetDetailTab = 'overview' | 'passport' | 'clinical' | 'procedure';

interface PetPassportViewProps {
  pet: Pet;
  onClose?: () => void;
  isCard?: boolean;
  onSelectPet?: (pet: Pet) => void;
}

const DOG_BREEDS = [
  'Aspin (Asong Pinoy)',
  'Shih Tzu',
  'Pomeranian',
  'Golden Retriever',
  'Labrador',
  'Pug',
  'Siberian Husky',
  'Chihuahua',
  'German Shepherd',
  'French Bulldog',
  'Beagle',
  'Dachshund',
  'Rottweiler',
  'Corgi',
  'Other / Mixed Breed',
];

const CAT_BREEDS = [
  'Puspin (Pusang Pinoy)',
  'Persian',
  'Siamese',
  'British Shorthair',
  'Scottish Fold',
  'Maine Coon',
  'Bengal',
  'Ragdoll',
  'Sphynx',
  'Russian Blue',
  'Other / Mixed Breed',
];

const CLINICAL_SERVICES = [
  { id: 'HEALTHY', title: 'HEALTHY', subtitle: 'Routine wellness check' },
  { id: 'VITAMINS', title: 'VITAMINS', subtitle: 'Supplements' },
  { id: 'DEWORMING', title: 'DEWORMING', subtitle: 'Anti-parasitic dose' },
  { id: 'FARM MGMT', title: 'FARM MGMT', subtitle: 'Livestock guidance' },
  { id: 'CONSULTATION', title: 'CONSULTATION', subtitle: 'Illness or injury' },
];

function getNextWeekdayISO(): string {
  const d = new Date();
  const isMorningNow = d.getHours() < 12;
  const day = d.getDay();
  const isWeekend = day === 0 || day === 6;

  // If today is a weekday and it's morning (before 12 PM), today is available for selection
  if (!isWeekend && isMorningNow) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // If weekend or afternoon (12 PM or later), advance to next weekday morning
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatShadcnDate(iso: string): string {
  if (!iso) return 'Pick an available weekday';
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const parts = iso.split('-');
  if (parts.length === 3) {
    const yyyy = parts[0];
    const mm = parseInt(parts[1], 10) - 1;
    const dd = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${months[mm]} ${dd}, ${yyyy}`;
    if (iso === todayISO) {
      return `${formatted} (Today • Morning Walk-In)`;
    }
    return formatted;
  }
  return iso;
}

export function PetPassportView({
  pet,
  onClose,
  isCard = false,
  onSelectPet,
}: PetPassportViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const authUser = useAuthStore((state) => state.user);
  const allPets = useDataStore((state) => state.pets) || [];
  const ownerId = authUser?.id || pet?.ownerId || '';
  const qrRef = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<PetDetailTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [switchPetModalVisible, setSwitchPetModalVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingTag, setDownloadingTag] = useState(false);
  const [headerSize, setHeaderSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Edit fields
  const [editName, setEditName] = useState(pet.name || '');
  const [editBreed, setEditBreed] = useState(pet.breed || '');
  const [editWeight, setEditWeight] = useState(
    pet.weightCategory ? pet.weightCategory.replace(/[^0-9.]/g, '') : '10',
  );
  const [breedPickerOpen, setBreedPickerOpen] = useState(false);

  // Clinical care state
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'HEALTHY',
    'VITAMINS',
    'DEWORMING',
    'CONSULTATION',
  ]);
  const [clinicalDate, setClinicalDate] = useState<string>(getNextWeekdayISO());
  const [clinicalSymptoms, setClinicalSymptoms] = useState('');
  const [clinicalCalendarOpen, setClinicalCalendarOpen] = useState(false);
  const [submittingClinical, setSubmittingClinical] = useState(false);

  // Procedure slot state
  const [selectedProcedure, setSelectedProcedure] = useState<'vaccination' | 'kapon'>('vaccination');
  const [procedureDate, setProcedureDate] = useState<string>(getNextWeekdayISO());
  const [prepConfirmed, setPrepConfirmed] = useState(false);
  const [procedureNotes, setProcedureNotes] = useState('');
  const [procedureCalendarOpen, setProcedureCalendarOpen] = useState(false);
  const [submittingProcedure, setSubmittingProcedure] = useState(false);

  // Synchronize state when pet changes
  React.useEffect(() => {
    if (pet) {
      setEditName(pet.name);
      setEditBreed(pet.breed || '');
      setEditWeight(
        pet.weightCategory ? pet.weightCategory.replace(/[^0-9.]/g, '') : '10',
      );
    }
  }, [pet]);

  const isDog = pet.species?.toLowerCase() === 'dog';
  const age = pet.birthYear ? ageFromBirthYear(pet.birthYear) : 1;

  // Format weight for header: e.g. "48 kg"
  const weightDisplay = pet.weightCategory
    ? pet.weightCategory.toLowerCase().includes('kg')
      ? pet.weightCategory
      : `${pet.weightCategory.replace(/[^0-9.]/g, '') || '10'} kg`
    : '10 kg';

  // Tag ID format matching screenshot: #CDO-FEL-8918 or #CDO-CAN-XXXX
  const tagCode = pet.microchipNumber
    ? pet.microchipNumber.replace(/[^0-9]/g, '').slice(-4)
    : pet.id.replace(/[^0-9]/g, '').slice(-4) || '8918';
  const formattedTagId = `CDO-${isDog ? 'CAN' : 'FEL'}-${tagCode}`;

  // QR Payload String
  const qrString = buildPetTagString(pet, {
    id: ownerId,
    fullName: authUser?.fullName || clerkUser?.fullName || 'SyncVet Resident',
    mobileNumber: authUser?.mobileNumber || clerkUser?.primaryPhoneNumber?.phoneNumber || undefined,
    address: authUser?.address || undefined,
  });

  // Avatar source
  const avatarSource = getPetAvatarSource(pet.avatarId, pet.species, pet.photoUrl, pet.name);

  // Header Gradient: Cat = Violet/Purple, Dog = Ocean Teal
  const gradientColors = isDog
    ? { top: '#0D9488', bottom: '#042F2C' } // Ocean Teal for Dogs
    : { top: '#4C1D95', bottom: '#170530' }; // Deep Violet for Cats

  // Upcoming weekday options for quick date selection buttons
  const upcomingWeekdayOptions = useMemo(() => {
    const options: {
      iso: string;
      label: string;
      isToday: boolean;
      isDisabled: boolean;
    }[] = [];
    const now = new Date();
    const isMorning = now.getHours() < 12;

    for (let offset = 0; offset <= 8 && options.length < 3; offset++) {
      const d = new Date();
      d.setDate(now.getDate() + offset);
      const day = d.getDay();
      if (day === 0 || day === 6) continue;

      const isToday = offset === 0;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;

      const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
      const monthShort = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ][d.getMonth()];

      const label = isToday
        ? `Today (${monthShort} ${d.getDate()})`
        : `${weekdayShort}, ${monthShort} ${d.getDate()}`;

      // Today's date is strictly disabled if already afternoon (12 PM cutoff)
      const isDisabled = isToday && !isMorning;

      options.push({
        iso,
        label,
        isToday,
        isDisabled,
      });
    }
    return options;
  }, []);

  // Check required fields for Clinical Request (Services + Valid Weekday Date + Symptoms)
  const isClinicalFormValid = useMemo(() => {
    if (selectedServices.length === 0) return false;
    if (!clinicalDate) return false;
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (clinicalDate === todayISO && now.getHours() >= 12) return false;
    if (!clinicalSymptoms.trim()) return false;
    return true;
  }, [selectedServices, clinicalDate, clinicalSymptoms]);

  // Check required fields for Procedure Booking (Procedure + Valid Weekday Date + Prep Checkbox)
  const isProcedureFormValid = useMemo(() => {
    if (!selectedProcedure) return false;
    if (!procedureDate) return false;
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (procedureDate === todayISO && now.getHours() >= 12) return false;
    if (!prepConfirmed) return false;
    return true;
  }, [selectedProcedure, procedureDate, prepConfirmed]);

  // 1. Save Edited Pet Info
  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error('Pet Name Required', { description: 'Please enter a name for your companion.' });
      return;
    }

    setSavingEdit(true);
    try {
      haptic.medium();
      const updatedPet: Pet = {
        ...pet,
        name: editName.trim(),
        breed: editBreed.trim() || pet.breed,
        weightCategory: editWeight ? `${editWeight.trim()} kg` : pet.weightCategory,
      };

      await useDataStore.getState().updatePet(updatedPet, clerkUser);
      toast.success(`${updatedPet.name} updated!`, {
        description: 'Municipal companion records saved.',
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Save pet edit error:', err);
      toast.error('Save failed', { description: err?.message || 'Could not update pet.' });
    } finally {
      setSavingEdit(false);
    }
  };

  // 2. Select New Avatar
  const handleSelectAvatar = async (avatarId: string) => {
    try {
      haptic.success();
      const relativePath = getAvatarPath(avatarId, pet.species);
      const updatedPet: Pet = {
        ...pet,
        avatarId,
        photoUrl: relativePath,
      };

      await useDataStore.getState().updatePet(updatedPet, clerkUser);
      setAvatarPickerVisible(false);
      toast.success(`${pet.name}’s photo updated!`, {
        description: 'Official pet avatar updated.',
      });
    } catch (err: any) {
      toast.error('Avatar update failed', { description: err?.message || 'Try again.' });
    }
  };

  // 3. Confirm & Delete Pet
  const handleDeletePet = () => {
    haptic.warning();
    Alert.alert(
      `Delete ${pet.name}’s Passport?`,
      `This will permanently remove ${pet.name} from your registered municipal companion animals.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              haptic.medium();
              await useDataStore.getState().deletePet(ownerId, pet.id, clerkUser);
              toast.info(`${pet.name} removed`, { description: 'Pet passport deleted.' });
              if (onClose) {
                onClose();
              } else if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/pets' as never);
              }
            } catch (err: any) {
              toast.error('Delete failed', { description: err?.message || 'Could not delete pet.' });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  // 4. Download / Export Tag
  const handleDownloadQr = async () => {
    try {
      haptic.medium();
      setDownloadingTag(true);
      const res = await downloadPetTag(qrRef.current, pet.name);
      if (res.success) {
        toast.success('Pet Tag Saved', { description: 'Official QR tag saved to device.' });
      } else if (res.error) {
        toast.error('Download note', { description: res.error });
      }
    } catch (err: any) {
      toast.error('Download failed', { description: err?.message || 'Try again.' });
    } finally {
      setDownloadingTag(false);
    }
  };

  // 5. Submit Clinical Care Request
  const handleSubmitClinical = async () => {
    if (selectedServices.length === 0) {
      toast.error('Select at least one service', {
        description: 'Choose one or more clinical services requested.',
      });
      return;
    }

    setSubmittingClinical(true);
    try {
      haptic.success();
      const notesDetail = [
        `Services: ${selectedServices.join(', ')}`,
        clinicalSymptoms.trim() ? `Symptoms: ${clinicalSymptoms.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const now = new Date();
      const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isToday = clinicalDate === todayISO;
      const timeSlot = isToday
        ? '8:30 AM - 11:30 AM (Morning Session)'
        : '8:00 AM - 5:00 PM (Walk-in anytime)';

      const input: BookingInput = {
        petId: pet.id,
        petName: pet.name,
        serviceId: 'consultation',
        date: clinicalDate,
        timeSlot,
        location: 'City Veterinary Office Main Clinic',
        notes: notesDetail,
      };

      await useDataStore.getState().bookAppointment(ownerId, input, clerkUser);
      toast.success('Clinical care requested!', {
        description: `Scheduled for ${formatShadcnDate(clinicalDate)}. Walk in anytime during operating hours to scan QR and queue.`,
      });
      setActiveTab('overview');
    } catch (err: any) {
      console.error('Error submitting clinical care:', err);
      toast.error('Booking failed', { description: err?.message || 'Could not submit request.' });
    } finally {
      setSubmittingClinical(false);
    }
  };

  // 6. Submit Procedure Slot Booking
  const handleSubmitProcedure = async () => {
    if (!prepConfirmed) {
      toast.error('Confirmation Required', {
        description: 'Please confirm that your pet meets the health criteria and you will follow guidelines.',
      });
      return;
    }

    setSubmittingProcedure(true);
    try {
      haptic.success();
      const serviceId = selectedProcedure === 'vaccination' ? 'vaccination' : 'kapon';
      const procedureTitle = selectedProcedure === 'vaccination' ? 'Anti-Rabies & Core Immunization' : 'Spay & Neuter Surgery';
      const notesDetail = [
        `Procedure: ${procedureTitle}`,
        procedureNotes.trim() ? `Notes: ${procedureNotes.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const now = new Date();
      const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isToday = procedureDate === todayISO;
      const timeSlot = isToday
        ? '8:30 AM - 11:30 AM (Morning Session)'
        : '8:00 AM - 5:00 PM (Walk-in anytime)';

      const input: BookingInput = {
        petId: pet.id,
        petName: pet.name,
        serviceId,
        date: procedureDate,
        timeSlot,
        location: 'City Veterinary Office Main Clinic',
        notes: notesDetail,
      };

      await useDataStore.getState().bookAppointment(ownerId, input, clerkUser);
      toast.success(`Procedure slot booked for ${pet.name}!`, {
        description: `Scheduled for ${formatShadcnDate(procedureDate)}. Walk in anytime during operating hours to scan QR and queue.`,
      });
      setActiveTab('overview');
    } catch (err: any) {
      console.error('Error booking procedure:', err);
      toast.error('Booking failed', { description: err?.message || 'Could not book procedure.' });
    } finally {
      setSubmittingProcedure(false);
    }
  };

  const toggleService = (serviceId: string) => {
    haptic.light();
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleClosePress = () => {
    haptic.light();
    if (onClose) {
      onClose();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/pets' as never);
    }
  };

  // Switch Companion Pet
  const handleSelectPet = (targetPet: Pet) => {
    if (targetPet.id === pet.id) {
      setSwitchPetModalVisible(false);
      return;
    }
    haptic.light();
    setSwitchPetModalVisible(false);
    toast.success(`Switched to ${targetPet.name}`, {
      description: `Viewing ${targetPet.name}'s records and passport.`,
    });
    if (onSelectPet) {
      onSelectPet(targetPet);
    } else {
      router.replace(`/pets/${targetPet.id}` as never);
    }
  };

  return (
    <View style={isCard ? styles.cardContainer : styles.pageContainer}>
      {/* ===================== TOP GRADIENT HEADER ===================== */}
      <View
        style={[
          styles.gradientHeader,
          { backgroundColor: gradientColors.bottom },
          isCard
            ? styles.cardHeaderRadius
            : {
              paddingTop: Math.max(insets.top, 16) + 6,
              overflow: 'visible',
            },
        ]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setHeaderSize({ width, height });
          }
        }}
      >
        {headerSize.width > 0 && (
          <Svg
            width={headerSize.width}
            height={headerSize.height}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="headerGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={gradientColors.top} />
                <Stop offset="100%" stopColor={gradientColors.bottom} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={headerSize.width}
              height={headerSize.height}
              fill="url(#headerGrad)"
            />
          </Svg>
        )}

        {/* Top 6-Button Pill Action Toolbar */}
        <View style={styles.topToolbarRow}>
          {/* 1. QR Code / Passport Tab Button */}
          <Pressable
            onPress={() => {
              haptic.light();
              setActiveTab('passport');
            }}
            style={[
              styles.toolIconBtn,
              activeTab === 'passport' && styles.toolIconBtnActive,
            ]}
            hitSlop={5}
            accessibilityRole="button"
            accessibilityLabel="Digital Passport"
          >
            <Ionicons
              name="qr-code-outline"
              size={15}
              color={activeTab === 'passport' ? '#FFFFFF' : 'rgba(255,255,255,0.85)'}
            />
          </Pressable>

          {/* 2. Clinical Care Tab Button */}
          <Pressable
            onPress={() => {
              haptic.light();
              setActiveTab('clinical');
            }}
            style={[
              styles.toolIconBtn,
              activeTab === 'clinical' && styles.toolIconBtnActive,
            ]}
            hitSlop={5}
            accessibilityRole="button"
            accessibilityLabel="Clinical Care"
          >
            <Ionicons
              name="medical-outline"
              size={15}
              color={activeTab === 'clinical' ? '#FFFFFF' : 'rgba(255,255,255,0.85)'}
            />
          </Pressable>

          {/* 3. Calendar Tab Button */}
          <Pressable
            onPress={() => {
              haptic.light();
              setActiveTab('procedure');
            }}
            style={[
              styles.toolIconBtn,
              activeTab === 'procedure' && styles.toolIconBtnActive,
            ]}
            hitSlop={5}
            accessibilityRole="button"
            accessibilityLabel="Book Procedure Slot"
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={activeTab === 'procedure' ? '#FFFFFF' : 'rgba(255,255,255,0.85)'}
            />
          </Pressable>

          {/* 4. Switch Pet Button (if 2+ pets) */}
          {allPets.length > 1 && (
            <Pressable
              onPress={() => {
                haptic.light();
                setSwitchPetModalVisible(true);
              }}
              style={styles.toolIconBtn}
              hitSlop={5}
              accessibilityRole="button"
              accessibilityLabel="Switch Pet"
            >
              <Ionicons name="swap-horizontal" size={15} color="rgba(255,255,255,0.9)" />
            </Pressable>
          )}

          {/* 5. Save / Download Icon */}
          <Pressable
            onPress={handleDownloadQr}
            style={styles.toolIconBtn}
            hitSlop={5}
            accessibilityRole="button"
            accessibilityLabel="Save / Download Tag"
          >
            {downloadingTag ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="save-outline" size={15} color="rgba(255,255,255,0.85)" />
            )}
          </Pressable>

          {/* 6. Delete Pet Button */}
          <Pressable
            onPress={handleDeletePet}
            style={styles.toolIconBtn}
            hitSlop={5}
            accessibilityRole="button"
            accessibilityLabel="Delete Pet"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={15} color="rgba(255,255,255,0.85)" />
            )}
          </Pressable>

          {/* 7. Close Modal Button */}
          <Pressable
            onPress={handleClosePress}
            style={[styles.toolIconBtn, styles.closeToolBtn]}
            hitSlop={5}
            accessibilityRole="button"
            accessibilityLabel="Close Dialog"
          >
            <Ionicons name="close" size={17} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Profile Identity Details Row */}
        <View style={styles.petIdentityRow}>
          {/* Pet Circular Avatar with Emerald Ring Border */}
          <View style={styles.avatarCircleBorder}>
            <Image
              source={avatarSource}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>

          {/* Name, Subtitle, and Badges */}
          <View style={styles.petInfoCol}>
            {/* Pet Name with Edit, Gallery, and Switch Buttons */}
            <View style={styles.petNameRow}>
              <Pressable
                onPress={() => {
                  if (allPets.length > 1) {
                    haptic.light();
                    setSwitchPetModalVisible(true);
                  }
                }}
                style={styles.petNamePressable}
                hitSlop={5}
                accessibilityRole="button"
                accessibilityLabel="Switch Companion Pet"
              >
                <Text style={styles.petNameText} numberOfLines={1}>
                  {pet.name}
                </Text>
                {allPets.length > 1 && (
                  <Ionicons name="chevron-down-circle" size={15} color="rgba(255, 255, 255, 0.85)" />
                )}
              </Pressable>

              {/* Edit Pencil Icon Button */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  setIsEditing(true);
                }}
                style={styles.inlineEditBtn}
                hitSlop={5}
                accessibilityRole="button"
                accessibilityLabel="Edit Pet Details"
              >
                <Ionicons name="pencil" size={13} color="#FFFFFF" />
              </Pressable>

              {/* Gallery/Avatar Image Edit Button */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  setAvatarPickerVisible(true);
                }}
                style={styles.inlineEditBtn}
                hitSlop={5}
                accessibilityRole="button"
                accessibilityLabel="Change Pet Avatar"
              >
                <Ionicons name="images-outline" size={13} color="#FFFFFF" />
              </Pressable>

              {/* Switch Pet Button Pill */}
              {allPets.length > 1 && (
                <Pressable
                  onPress={() => {
                    haptic.light();
                    setSwitchPetModalVisible(true);
                  }}
                  style={styles.switchPetPill}
                  hitSlop={5}
                  accessibilityRole="button"
                  accessibilityLabel="Switch Pet"
                >
                  <Ionicons name="swap-horizontal" size={11} color="#FFFFFF" />
                  <Text style={styles.switchPetPillText}>Switch</Text>
                </Pressable>
              )}
            </View>

            {/* Subtitle meta line */}
            <Text style={styles.metaSubtitle} numberOfLines={1}>
              {pet.breed || (isDog ? 'Canine' : 'Feline')} • {pet.gender === 'female' ? 'Female ♀' : 'Male ♂'} • {age} yrs • {weightDisplay}
            </Text>

            {/* Badges: Unvaccinated / Vaccinated + Intact / Sterilized */}
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.statusPillBadge,
                  pet.isVaccinated
                    ? styles.pillBadgeVaccinated
                    : styles.pillBadgeUnvaccinated,
                ]}
              >
                <Text style={styles.statusPillText}>
                  {pet.isVaccinated ? '✓ Vaccinated' : '⚠ Unvaccinated'}
                </Text>
              </View>

              <View style={styles.pillBadgeSterilization}>
                <Text style={styles.statusPillText}>
                  {pet.isSpayedNeutered ? 'Spayed / Neutered' : 'Intact (Not Sterilized)'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ===================== BODY CONTENT AREA ===================== */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[
          styles.scrollBodyContent,
          !isCard && { paddingBottom: Math.max(insets.bottom, 20) + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ----------------- TAB 0: OVERVIEW ----------------- */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            {/* Anti-Rabies Vaccination Alert Card */}
            <View style={styles.vaxAlertCard}>
              <View style={styles.vaxAlertTopRow}>
                <View style={styles.vaxIconSquare}>
                  <Ionicons name="medical" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.vaxAlertTextCol}>
                  <Text style={styles.vaxAlertTitle}>
                    {pet.isVaccinated
                      ? 'Anti-Rabies Vaccination Protected'
                      : 'Anti-Rabies Vaccination Needed'}
                  </Text>
                  <Text style={styles.vaxAlertSubtitle}>
                    Annual vaccination is free at the CVO City Clinic
                  </Text>
                </View>
                <View
                  style={[
                    styles.vaxAlertBadge,
                    pet.isVaccinated
                      ? styles.vaxAlertBadgeProtected
                      : styles.vaxAlertBadgeNeeded,
                  ]}
                >
                  <Text style={styles.vaxAlertBadgeText}>
                    {pet.isVaccinated ? 'Vaccinated' : 'Unvaccinated'}
                  </Text>
                </View>
              </View>

              <View style={styles.vaxDatesGrid}>
                <View style={styles.vaxDateItem}>
                  <Text style={styles.vaxDateLabel}>Last Vaccination:</Text>
                  <Text style={styles.vaxDateValue}>
                    {pet.lastVaccinationDate
                      ? formatDateWithYear(pet.lastVaccinationDate)
                      : 'None recorded'}
                  </Text>
                </View>
                <View style={styles.vaxDateItem}>
                  <Text style={styles.vaxDateLabel}>Next Due:</Text>
                  <Text style={[styles.vaxDateValue, !pet.isVaccinated && styles.vaxDueUrgent]}>
                    {pet.isVaccinated && pet.nextVaccinationDate
                      ? formatDateWithYear(pet.nextVaccinationDate)
                      : 'Immediate schedule required'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Companion Selector Section (if user has 2+ pets) */}
            {allPets.length > 1 && (
              <View style={styles.otherPetsSection}>
                <View style={styles.otherPetsHeaderRow}>
                  <Text style={styles.otherPetsSectionTitle}>
                    SWITCH COMPANION ({allPets.length} REGISTERED)
                  </Text>
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setSwitchPetModalVisible(true);
                    }}
                    hitSlop={5}
                  >
                    <Text style={styles.seeAllPetsLink}>View All ➔</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.otherPetsScrollContent}
                >
                  {allPets.map((p) => {
                    const isCurrent = p.id === pet.id;
                    const pAvatar = getPetAvatarSource(p.avatarId, p.species, p.photoUrl, p.name);
                    const pAge = p.birthYear ? ageFromBirthYear(p.birthYear) : 1;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => handleSelectPet(p)}
                        style={[
                          styles.otherPetPillCard,
                          isCurrent && styles.otherPetPillCardActive,
                        ]}
                      >
                        <Image source={pAvatar} style={styles.otherPetAvatarImg} resizeMode="contain" />
                        <View style={styles.otherPetTextCol}>
                          <Text style={[styles.otherPetName, isCurrent && styles.otherPetNameActive]} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={styles.otherPetMeta} numberOfLines={1}>
                            {p.species === 'cat' ? 'Cat' : 'Dog'} • {pAge} yrs{isCurrent ? ' (Active)' : ''}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* ----------------- TAB 1: DIGITAL PASSPORT (QR) ----------------- */}
        {activeTab === 'passport' && (
          <View style={styles.tabSection}>
            {/* Banner */}
            <View style={styles.tabBannerHeader}>
              <View style={[styles.bannerIconSquare, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="qr-code" size={18} color="#9333EA" />
              </View>
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  Digital Pet Passport for {pet.name}
                </Text>
                <Text style={styles.bannerSubtitle} numberOfLines={1}>
                  Official Cagayan de Oro LGU Companion Animal Identification
                </Text>
              </View>
            </View>

            {/* Action Row */}
            <View style={styles.bannerActionsRow}>
              <View style={styles.actionButtonsLeft}>
                <Pressable
                  onPress={handleDownloadQr}
                  style={styles.iconOutlineBtn}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Download Tag"
                >
                  <Ionicons name="download-outline" size={16} color="#1F2937" />
                </Pressable>

                <Pressable
                  onPress={handleDownloadQr}
                  style={styles.iconOutlineBtn}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Share Tag"
                >
                  <Ionicons name="share-social-outline" size={16} color="#1F2937" />
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  haptic.light();
                  setActiveTab('overview');
                }}
                style={styles.backToOverviewBtn}
              >
                <Text style={styles.backToOverviewText}>Back to Overview</Text>
              </Pressable>
            </View>

            {/* QR Code Container Card */}
            <View style={styles.qrContainerCard}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrString}
                  size={210}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  getRef={(c) => {
                    qrRef.current = c;
                  }}
                />
              </View>

              {/* Tag ID Badge */}
              <View style={styles.tagIdPill}>
                <Text style={styles.tagIdPillText}>Tag ID: #{formattedTagId}</Text>
              </View>

              <Text style={styles.qrMetaInfo}>
                Category: {isDog ? 'Canine' : 'Feline'} • {pet.breed || 'Companion'}
              </Text>
              <Text style={styles.qrOfficialNotice}>
                Official Cagayan de Oro City Veterinary Office Collar Record
              </Text>
            </View>
          </View>
        )}

        {/* ----------------- TAB 2: REQUEST CLINICAL CARE ----------------- */}
        {activeTab === 'clinical' && (
          <View style={styles.tabSection}>
            {/* Banner */}
            <View style={styles.tabBannerHeader}>
              <View style={[styles.bannerIconSquare, { backgroundColor: '#CCFBF1' }]}>
                <Ionicons name="medical-outline" size={18} color="#0D9488" />
              </View>
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  Request Clinical Care for {pet.name}
                </Text>
                <Text style={styles.bannerSubtitle} numberOfLines={1}>
                  Free consultation, health check-up & symptom diagnosis
                </Text>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.bannerActionsRow}>
              <Pressable
                onPress={handleSubmitClinical}
                disabled={!isClinicalFormValid || submittingClinical}
                style={[
                  styles.primaryActionBtn,
                  !isClinicalFormValid && styles.primaryActionBtnDisabled,
                ]}
              >
                {submittingClinical ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="clipboard-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.primaryActionBtnText}>Submit Request</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  haptic.light();
                  setActiveTab('overview');
                }}
                style={styles.backToOverviewBtn}
              >
                <Text style={styles.backToOverviewText}>Back to Overview</Text>
              </Pressable>
            </View>

            {/* Section: Services Requested */}
            <Text style={styles.sectionHeaderTitle}>
              SERVICES REQUESTED (SELECT ALL THAT APPLY)
            </Text>

            <View style={styles.servicesListWrap}>
              {CLINICAL_SERVICES.map((srv) => {
                const isChecked = selectedServices.includes(srv.id);
                return (
                  <Pressable
                    key={srv.id}
                    onPress={() => toggleService(srv.id)}
                    style={[
                      styles.serviceCheckboxCard,
                      isChecked && styles.serviceCheckboxCardActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkboxBox,
                        isChecked && styles.checkboxBoxActive,
                      ]}
                    >
                      {isChecked && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={styles.serviceTextCol}>
                      <Text style={[styles.serviceTitle, isChecked && styles.serviceTitleActive]}>
                        {srv.title}
                      </Text>
                      <Text style={styles.serviceSubtitle}>{srv.subtitle}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Section: Preferred Consultation Schedule Header */}
            <Text style={styles.sectionHeaderTitle}>
              PREFERRED CONSULTATION SCHEDULE (MONDAY – FRIDAY) *
            </Text>

            {/* Operating Hours Green Badge Row */}
            <View style={styles.monFriBadge}>
              <Text style={styles.monFriBadgeText}>Mon – Fri • 8:00 AM – 5:00 PM</Text>
            </View>

            {/* Weekday Quick Select Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickDateRow}
            >
              {upcomingWeekdayOptions.map((opt) => {
                const isSelected = clinicalDate === opt.iso;
                return (
                  <Pressable
                    key={opt.iso}
                    onPress={() => {
                      if (opt.isDisabled) {
                        haptic.warning();
                        toast.warning('Afternoon queue closed', {
                          description:
                            'Same-day bookings must be chosen in the morning (before 12:00 PM). Please select an upcoming weekday.',
                        });
                        return;
                      }
                      haptic.light();
                      setClinicalDate(opt.iso);
                    }}
                    disabled={opt.isDisabled}
                    style={[
                      styles.quickDateBtn,
                      isSelected && styles.quickDateBtnActive,
                      opt.isDisabled && styles.quickDateBtnDisabled,
                    ]}
                  >
                    {opt.isToday && opt.isDisabled ? (
                      <View style={styles.disabledDateTag}>
                        <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
                        <Text style={styles.quickDateTextDisabled}>
                          Today (Afternoon Closed)
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.quickDateText,
                          isSelected && styles.quickDateTextActive,
                          opt.isDisabled && styles.quickDateTextDisabled,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}

              {/* More Dates (Calendar Trigger Button) */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  setClinicalCalendarOpen(true);
                }}
                style={[styles.quickDateBtn, styles.calendarPickerTriggerBtn]}
              >
                <Ionicons name="calendar-outline" size={13} color="#0D9488" />
                <Text style={styles.calendarPickerTriggerText}>More Dates</Text>
              </Pressable>
            </ScrollView>

            {/* Select Consultation Date Field (Shadcn Date Picker Trigger) */}
            <View style={styles.datePickerWrap}>
              <Text style={styles.fieldSubLabel}>Selected Consultation Date</Text>
              <Pressable
                onPress={() => {
                  haptic.light();
                  setClinicalCalendarOpen(true);
                }}
                style={styles.shadcnDateTrigger}
              >
                <Ionicons name="calendar-outline" size={18} color="#111827" />
                <Text style={styles.shadcnDateTriggerText}>
                  {formatShadcnDate(clinicalDate)}
                </Text>
              </Pressable>
            </View>

            {/* Walk-in Operating Hours Info Card */}
            <View style={styles.operatingHoursCard}>
              <Text style={styles.operatingHoursTitle}>Walk-in Clinical Operating Hours</Text>
              <Text style={styles.operatingHoursDesc}>
                Open Monday through Friday, 8:00 AM to 5:00 PM. Same-day bookings must be chosen in the morning (before 12:00 PM). Weekend consultations are unavailable. Walk in to scan the QR to be in a queue.
              </Text>
            </View>

            {/* Symptoms Observed / Reason for Consultation Field */}
            <View style={styles.formFieldBlock}>
              <View style={styles.formFieldHeaderRow}>
                <View style={styles.symptomsTitleRow}>
                  <Ionicons name="git-pull-request-outline" size={15} color="#0D9488" />
                  <Text style={styles.symptomsFieldTitle}>
                    SYMPTOMS OBSERVED / REASON FOR CONSULTATION *
                  </Text>
                </View>
              </View>
              <TextInput
                value={clinicalSymptoms}
                onChangeText={setClinicalSymptoms}
                placeholder="Describe your pet's condition, observed symptoms (e.g. vomiting, lethargy, coughing, loss of appetite)..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={styles.multilineInput}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}

        {/* ----------------- TAB 3: BOOK PROCEDURE SLOT ----------------- */}
        {activeTab === 'procedure' && (
          <View style={styles.tabSection}>
            {/* Banner */}
            <View style={styles.tabBannerHeader}>
              <View style={[styles.bannerIconSquare, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="calendar-outline" size={18} color="#7C3AED" />
              </View>
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  Book Procedure Slot for {pet.name}
                </Text>
                <Text style={styles.bannerSubtitle} numberOfLines={1}>
                  Live municipal capacity limits for Vaccination & Kapon
                </Text>
              </View>
            </View>

            {/* Actions Row */}
            <View style={styles.bannerActionsRow}>
              <Pressable
                onPress={handleSubmitProcedure}
                disabled={!isProcedureFormValid || submittingProcedure}
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: '#7C3AED' },
                  !isProcedureFormValid && styles.primaryActionBtnDisabled,
                ]}
              >
                {submittingProcedure ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="calendar" size={15} color="#FFFFFF" />
                    <Text style={styles.primaryActionBtnText}>Book Procedure</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  haptic.light();
                  setActiveTab('overview');
                }}
                style={styles.backToOverviewBtn}
              >
                <Text style={styles.backToOverviewText}>Back to Overview</Text>
              </Pressable>
            </View>

            {/* Section: Select Municipal Service */}
            <Text style={styles.sectionHeaderTitle}>
              SELECT MUNICIPAL VETERINARY SERVICE *
            </Text>

            {/* Option 1: Vaccination */}
            <Pressable
              onPress={() => {
                haptic.light();
                setSelectedProcedure('vaccination');
              }}
              style={[
                styles.procedureOptionCard,
                selectedProcedure === 'vaccination' && styles.procedureCardActive,
              ]}
            >
              <View style={styles.procedureCardTop}>
                <View style={[styles.procIconWrap, { backgroundColor: '#CCFBF1' }]}>
                  <Ionicons name="medical" size={16} color="#0D9488" />
                </View>
                <View style={styles.procTitleCol}>
                  <Text style={styles.procTitle}>Vaccination</Text>
                  <Text style={styles.procSub}>Anti-Rabies & Core Immunization</Text>
                </View>
                <View style={styles.procSlotBadgeGreen}>
                  <Text style={styles.procSlotBadgeTextGreen}>🟢 10 Slots</Text>
                </View>
              </View>
              <Text style={styles.procDesc}>
                Annual rabies vaccine & health certificate validation.
              </Text>
            </Pressable>

            {/* Option 2: Spay & Neuter */}
            <Pressable
              onPress={() => {
                haptic.light();
                setSelectedProcedure('kapon');
              }}
              style={[
                styles.procedureOptionCard,
                selectedProcedure === 'kapon' && styles.procedureCardActivePurple,
              ]}
            >
              <View style={styles.procedureCardTop}>
                <View style={[styles.procIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="cut-outline" size={16} color="#7C3AED" />
                </View>
                <View style={styles.procTitleCol}>
                  <Text style={styles.procTitle}>Spay & Neuter</Text>
                  <Text style={styles.procSub}>Kapon / Sterilization Surgery</Text>
                </View>
                <View style={styles.procSlotBadgePurple}>
                  <Text style={styles.procSlotBadgeTextPurple}>🟣 7 Slots</Text>
                </View>
              </View>
              <Text style={styles.procDesc}>
                Surgical procedure with licensed veterinary anesthesia team.
              </Text>
            </Pressable>

            {/* Section: Choose Appointment Date Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>CHOOSE APPOINTMENT DATE *</Text>
              <View style={styles.monFriBadge}>
                <Text style={styles.monFriBadgeText}>Mon – Fri • 8AM – 5PM</Text>
              </View>
            </View>

            {/* Weekday Quick Select Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickDateRow}
            >
              {upcomingWeekdayOptions.map((opt) => {
                const isSelected = procedureDate === opt.iso;
                return (
                  <Pressable
                    key={opt.iso}
                    onPress={() => {
                      if (opt.isDisabled) {
                        haptic.warning();
                        toast.warning('Afternoon booking closed', {
                          description:
                            'Same-day bookings must be chosen in the morning (before 12:00 PM). Please select an upcoming weekday.',
                        });
                        return;
                      }
                      haptic.light();
                      setProcedureDate(opt.iso);
                    }}
                    disabled={opt.isDisabled}
                    style={[
                      styles.quickDateBtn,
                      isSelected && styles.quickDateBtnActivePurple,
                      opt.isDisabled && styles.quickDateBtnDisabled,
                    ]}
                  >
                    {opt.isToday && opt.isDisabled ? (
                      <View style={styles.disabledDateTag}>
                        <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
                        <Text style={styles.quickDateTextDisabled}>
                          Today (Afternoon Closed)
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.quickDateText,
                          isSelected && styles.quickDateTextActivePurple,
                          opt.isDisabled && styles.quickDateTextDisabled,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => {
                  haptic.light();
                  setProcedureCalendarOpen(true);
                }}
                style={[styles.quickDateBtn, styles.calendarPickerTriggerBtnPurple]}
              >
                <Ionicons name="calendar-outline" size={13} color="#7C3AED" />
                <Text style={styles.calendarPickerTriggerTextPurple}>More Dates</Text>
              </Pressable>
            </ScrollView>

            {/* Date Trigger Input (Shadcn Calendar Trigger) */}
            <Pressable
              onPress={() => {
                haptic.light();
                setProcedureCalendarOpen(true);
              }}
              style={styles.shadcnDateTrigger}
            >
              <Ionicons name="calendar-outline" size={18} color="#0D9488" />
              <Text style={styles.shadcnDateTriggerText}>
                {procedureDate
                  ? formatShadcnDate(procedureDate)
                  : `Pick an available weekday for ${selectedProcedure === 'vaccination' ? 'Vaccination' : 'Spay & Neuter'}`}
              </Text>
            </Pressable>

            {/* Section: Pre-Procedure Requirements */}
            <View style={styles.requirementsBox}>
              <View style={styles.requirementsHeader}>
                <Ionicons name="shield-checkmark" size={16} color="#0D9488" />
                <Text style={styles.requirementsTitle}>
                  PRE-PROCEDURE REQUIREMENTS ({selectedProcedure === 'vaccination' ? 'VACCINATION' : 'SPAY & NEUTER'})
                </Text>
              </View>
              {selectedProcedure === 'vaccination' ? (
                <>
                  <Text style={styles.reqItem}>• Pet must be at least 3 months old for anti-rabies vaccine.</Text>
                  <Text style={styles.reqItem}>• Pet must be clinically healthy with no active fever, diarrhea,...</Text>
                  <Text style={styles.reqItem}>• Bring pet digital passport QR code or prior vaccination card...</Text>
                  <Text style={styles.reqItem}>• Keep dogs on a secure leash and cats inside a well-ventilated carrier.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.reqItem}>• Fast pet strictly (no food or water) for 8 hours prior to surgical slot.</Text>
                  <Text style={styles.reqItem}>• Pet must be at least 6 months old and clinically stable.</Text>
                  <Text style={styles.reqItem}>• Bring pet digital passport QR code and prior health record.</Text>
                  <Text style={styles.reqItem}>• Provide a clean towel or crate for safe post-operative recovery.</Text>
                </>
              )}

              {/* Confirmation Checkbox */}
              <Pressable
                onPress={() => {
                  haptic.light();
                  setPrepConfirmed(!prepConfirmed);
                }}
                style={styles.confirmCheckboxRow}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    prepConfirmed && styles.checkboxBoxActive,
                  ]}
                >
                  {prepConfirmed && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.confirmCheckboxText}>
                  I confirm that my pet meets these health criteria and I will follow prep guidelines.
                </Text>
              </Pressable>
            </View>

            {/* Special Clinical Notes (Optional) */}
            <View style={styles.formFieldBlock}>
              <Text style={styles.fieldSubLabelBold}>Special Clinical Notes (Optional)</Text>
              <TextInput
                value={procedureNotes}
                onChangeText={setProcedureNotes}
                placeholder="Allergies, prior medication, temperament, or special handling instructions..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={styles.multilineInput}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ===================== SUB-DIALOG: EDIT PET DETAILS ===================== */}
      {isEditing && (
        <View style={styles.editSubDialogOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsEditing(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.editSubDialogCard}
          >
            {/* Header */}
            <View style={styles.editHeaderRow}>
              <View style={styles.editIconSquare}>
                <Ionicons name="pencil" size={17} color="#059669" />
              </View>
              <View style={styles.editTextCol}>
                <Text style={styles.editTitle}>Edit Pet Details</Text>
                <Text style={styles.editSubtitle}>Update basic info for {pet.name}</Text>
              </View>
              <Pressable
                onPress={() => setIsEditing(false)}
                style={styles.editCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Field 1: Pet Name * */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Pet Name *</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Cadmus"
                  placeholderTextColor="#9CA3AF"
                  style={styles.formInput}
                />
              </View>

              {/* Field 2: Breed (with Feline/Canine breed selector) */}
              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel}>Breed</Text>
                  <Text style={styles.formLabelHint}>
                    {isDog ? 'Canine Breeds' : 'Feline Breeds'}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    haptic.light();
                    setBreedPickerOpen(!breedPickerOpen);
                  }}
                  style={styles.formDropdownBtn}
                >
                  <Text style={styles.formDropdownText} numberOfLines={1}>
                    {editBreed || (isDog ? 'Select canine breed' : 'Select feline breed')}
                  </Text>
                  <Ionicons
                    name={breedPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#6B7280"
                  />
                </Pressable>

                {breedPickerOpen && (
                  <View style={styles.breedPickerOptions}>
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                      {(isDog ? DOG_BREEDS : CAT_BREEDS).map((b) => (
                        <Pressable
                          key={b}
                          onPress={() => {
                            haptic.light();
                            setEditBreed(b);
                            setBreedPickerOpen(false);
                          }}
                          style={[
                            styles.breedOptionItem,
                            editBreed === b && styles.breedOptionItemActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.breedOptionText,
                              editBreed === b && styles.breedOptionTextActive,
                            ]}
                          >
                            {b}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Field 3: Weight (in Kilograms) with suffix */}
              <View style={styles.formField}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel}>Weight</Text>
                  <Text style={styles.formLabelHint}>in Kilograms (kg)</Text>
                </View>
                <View style={styles.weightInputWrap}>
                  <TextInput
                    value={editWeight}
                    onChangeText={setEditWeight}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 15"
                    placeholderTextColor="#9CA3AF"
                    style={styles.weightInput}
                  />
                  <Text style={styles.weightSuffix}>kg</Text>
                </View>
              </View>

              {/* Municipal Registration Locks Card */}
              <View style={styles.locksCard}>
                <View style={styles.locksHeader}>
                  <Ionicons name="lock-closed-outline" size={15} color="#4B5563" />
                  <Text style={styles.locksTitle}>Municipal Registration Locks</Text>
                </View>
                <Text style={styles.locksDescription}>
                  Species and gender are permanent municipal identification parameters and cannot be altered after registration.
                </Text>
                <View style={styles.locksBadgesRow}>
                  <View style={styles.lockPill}>
                    <Text style={styles.lockPillText}>
                      Species: <Text style={styles.lockPillBold}>{pet.species === 'cat' ? 'Cat' : 'Dog'}</Text>
                    </Text>
                  </View>
                  <View style={styles.lockPill}>
                    <Text style={styles.lockPillText}>
                      Gender: <Text style={styles.lockPillBold}>{pet.gender === 'female' ? 'Female ♀' : 'Male ♂'}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Action Buttons */}
            <View style={styles.editBottomActions}>
              <Pressable
                onPress={() => setIsEditing(false)}
                style={styles.editCancelBtn}
              >
                <Text style={styles.editCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveEdit}
                disabled={savingEdit}
                style={styles.editSaveBtn}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.editSaveBtnText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ===================== SHADCN CALENDAR MODALS ===================== */}
      {/* 1. Clinical Consultation Date Picker */}
      <ShadcnCalendarModal
        visible={clinicalCalendarOpen}
        onClose={() => setClinicalCalendarOpen(false)}
        selectedDate={clinicalDate}
        onSelectDate={(dateStr) => setClinicalDate(dateStr)}
        title="Select Consultation Date"
        themeColor="#0D9488"
      />

      {/* 2. Procedure Date Picker */}
      <ShadcnCalendarModal
        visible={procedureCalendarOpen}
        onClose={() => setProcedureCalendarOpen(false)}
        selectedDate={procedureDate}
        onSelectDate={(dateStr) => setProcedureDate(dateStr)}
        title={`Select ${selectedProcedure === 'vaccination' ? 'Vaccination' : 'Procedure'} Date`}
        themeColor={selectedProcedure === 'vaccination' ? '#0D9488' : '#7C3AED'}
      />

      {/* ===================== AVATAR PICKER MODAL ===================== */}
      <PetAvatarPickerModal
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
        onSelectAvatar={handleSelectAvatar}
        currentAvatarId={pet.avatarId}
        species={pet.species}
        petName={pet.name}
      />

      {/* ===================== SWITCH COMPANION PET MODAL ===================== */}
      <Modal
        visible={switchPetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitchPetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSwitchPetModalVisible(false)}
          />

          <View style={styles.switchPetModalCard}>
            {/* Modal Header */}
            <View style={styles.switchModalHeader}>
              <View style={styles.switchModalTitleWrap}>
                <View style={styles.switchModalIconCircle}>
                  <Ionicons name="swap-horizontal" size={18} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.switchModalTitle}>Switch Companion</Text>
                  <Text style={styles.switchModalSubtitle}>
                    {allPets.length} companions registered in City Registry
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setSwitchPetModalVisible(false)}
                style={styles.switchModalCloseBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={19} color="#6B7280" />
              </Pressable>
            </View>

            {/* List of Pets */}
            <ScrollView
              style={styles.switchPetListScroll}
              contentContainerStyle={styles.switchPetListContent}
              showsVerticalScrollIndicator={false}
            >
              {allPets.map((p) => {
                const isCurrent = p.id === pet.id;
                const pAvatar = getPetAvatarSource(p.avatarId, p.species, p.photoUrl, p.name);
                const pAge = p.birthYear ? ageFromBirthYear(p.birthYear) : 1;
                const isCanine = p.species?.toLowerCase() === 'dog';

                return (
                  <Pressable
                    key={p.id}
                    onPress={() => handleSelectPet(p)}
                    style={[
                      styles.switchPetItem,
                      isCurrent && styles.switchPetItemActive,
                    ]}
                  >
                    {/* Pet Avatar with Ring */}
                    <View
                      style={[
                        styles.switchAvatarWrap,
                        isCurrent && styles.switchAvatarWrapActive,
                      ]}
                    >
                      <Image
                        source={pAvatar}
                        style={styles.switchAvatarImg}
                        resizeMode="contain"
                      />
                    </View>

                    {/* Pet Info */}
                    <View style={styles.switchPetItemDetails}>
                      <View style={styles.switchPetNameRow}>
                        <Text
                          style={[
                            styles.switchPetName,
                            isCurrent && styles.switchPetNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        {isCurrent && (
                          <View style={styles.activePetBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.activePetBadgeText}>Current</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.switchPetSub} numberOfLines={1}>
                        {p.breed || (isCanine ? 'Canine' : 'Feline')} • {pAge} yrs • {p.gender === 'female' ? 'Female ♀' : 'Male ♂'}
                      </Text>

                      {/* Status Badges */}
                      <View style={styles.switchStatusRow}>
                        <View
                          style={[
                            styles.switchStatusPill,
                            p.isVaccinated ? styles.switchStatusPillVax : styles.switchStatusPillUnvax,
                          ]}
                        >
                          <Text style={styles.switchStatusText}>
                            {p.isVaccinated ? '✓ Vaccinated' : '⚠ Unvaccinated'}
                          </Text>
                        </View>
                        <View style={styles.switchStatusPillSteril}>
                          <Text style={styles.switchStatusTextMuted}>
                            {p.isSpayedNeutered ? 'Sterilized' : 'Intact'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right Action Chevron or Switch Pill */}
                    {!isCurrent && (
                      <View style={styles.switchActionPill}>
                        <Text style={styles.switchActionPillText}>Select</Text>
                        <Ionicons name="chevron-forward" size={12} color="#0D9488" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Bottom Register New Companion CTA */}
            <View style={styles.switchModalFooter}>
              <Pressable
                onPress={() => {
                  setSwitchPetModalVisible(false);
                  router.push('/pets/add' as never);
                }}
                style={styles.addNewPetBtn}
              >
                <Ionicons name="add-circle-outline" size={17} color="#0D9488" />
                <Text style={styles.addNewPetBtnText}>Register New Companion</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  cardContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.lg,
  },
  cardHeaderRadius: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
  },

  /* Gradient Header */
  gradientHeader: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  topToolbarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingRight: 10,
  },
  toolIconBtn: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  closeToolBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  toolIconBtnActive: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  /* Identity Row */
  petIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircleBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: '#10B981', // Emerald green border matching screenshot
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  petInfoCol: {
    flex: 1,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  petNamePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  petNameText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  inlineEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchPetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 2,
  },
  switchPetPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillBadgeVaccinated: {
    backgroundColor: '#059669',
  },
  pillBadgeUnvaccinated: {
    backgroundColor: '#D97706',
  },
  pillBadgeSterilization: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Scroll Body */
  scrollBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollBodyContent: {
    padding: 16,
    paddingBottom: 28,
  },
  tabSection: {
    gap: 13,
  },

  /* Overview Tab: Anti-Rabies Card */
  vaxAlertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
  },
  vaxAlertTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vaxIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaxAlertTextCol: {
    flex: 1,
  },
  vaxAlertTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  vaxAlertSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  vaxAlertBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vaxAlertBadgeNeeded: {
    backgroundColor: '#EA580C',
  },
  vaxAlertBadgeProtected: {
    backgroundColor: '#059669',
  },
  vaxAlertBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vaxDatesGrid: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    justifyContent: 'space-between',
  },
  vaxDateItem: {
    flex: 1,
  },
  vaxDateLabel: {
    fontSize: 10.5,
    color: '#6B7280',
  },
  vaxDateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 1,
  },
  vaxDueUrgent: {
    color: '#B45309',
  },

  /* Tab Banner Header */
  tabBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  actionButtonsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconOutlineBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backToOverviewBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  backToOverviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    width: '52%',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  primaryActionBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.65,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* QR Container Card */
  qrContainerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  tagIdPill: {
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagIdPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  qrMetaInfo: {
    fontSize: 11.5,
    color: '#4B5563',
    fontWeight: '600',
    marginTop: 2,
  },
  qrOfficialNotice: {
    fontSize: 10.5,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  /* Section Title */
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },

  /* Mon-Fri Badges */
  monFriBadge: {
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  monFriBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  /* Clinical Services Checkboxes */
  servicesListWrap: {
    gap: 7,
  },
  serviceCheckboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 11,
    gap: 10,
  },
  serviceCheckboxCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  serviceTextCol: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#374151',
  },
  serviceTitleActive: {
    color: '#065F46',
  },
  serviceSubtitle: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 1,
  },

  /* Shadcn Style Date Trigger Input */
  datePickerWrap: {
    gap: 5,
  },
  fieldSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  fieldSubLabelBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 5,
  },
  shadcnDateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  shadcnDateTriggerText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },

  /* Quick Weekday Date Selector */
  quickDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  quickDateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateBtnActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  quickDateBtnActivePurple: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  quickDateBtnDisabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    opacity: 0.75,
  },
  disabledDateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  quickDateTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  quickDateTextActivePurple: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  quickDateTextDisabled: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  calendarPickerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
  },
  calendarPickerTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
  },
  calendarPickerTriggerBtnPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderColor: '#EDE9FE',
    backgroundColor: '#F5F3FF',
  },
  calendarPickerTriggerTextPurple: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },

  /* Operating Hours Info Card */
  operatingHoursCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    gap: 4,
  },
  operatingHoursTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  operatingHoursDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },

  /* Symptoms & Notes Form Fields */
  formFieldBlock: {
    gap: 8,
    marginTop: 6,
    marginBottom: 24,
  },
  formFieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symptomsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  symptomsFieldTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.3,
  },
  citizenDescLabel: {
    fontSize: 10.5,
    color: '#6B7280',
  },
  multilineInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: '#111827',
    minHeight: 88,
  },

  /* Procedure Cards */
  procedureOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 6,
  },
  procedureCardActive: {
    borderColor: '#10B981',
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  procedureCardActivePurple: {
    borderColor: '#7C3AED',
    borderWidth: 1.5,
    backgroundColor: '#FAF5FF',
  },
  procedureCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  procIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  procTitleCol: {
    flex: 1,
  },
  procTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  procSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  procSlotBadgeGreen: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  procSlotBadgeTextGreen: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  procSlotBadgePurple: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  procSlotBadgeTextPurple: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#5B21B6',
  },
  procDesc: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },

  /* Requirements Box */
  requirementsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 5,
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  requirementsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.3,
  },
  reqItem: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
  },
  confirmCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confirmCheckboxText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: 15,
  },

  /* ===================== SUB-DIALOG EDIT STYLES ===================== */
  editSubDialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999,
  },
  editSubDialogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...shadows.lg,
  },
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  editIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTextCol: {
    flex: 1,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  editSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
  },
  editCloseBtn: {
    padding: 4,
  },
  formField: {
    marginBottom: 12,
  },
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 5,
  },
  formLabelHint: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  formDropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  formDropdownText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  breedPickerOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  breedOptionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breedOptionItemActive: {
    backgroundColor: '#ECFDF5',
  },
  breedOptionText: {
    fontSize: 12.5,
    color: '#374151',
  },
  breedOptionTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  weightInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  weightInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#111827',
  },
  weightSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 6,
  },
  locksCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    gap: 6,
  },
  locksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locksTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  locksDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  locksBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  lockPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockPillText: {
    fontSize: 11,
    color: '#4B5563',
  },
  lockPillBold: {
    fontWeight: '700',
    color: '#111827',
  },
  editBottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  editSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  editSaveBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Quick Other Pets Horizontal Strip */
  otherPetsSection: {
    marginTop: 14,
    gap: 8,
  },
  otherPetsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otherPetsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.4,
  },
  seeAllPetsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  otherPetsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  otherPetPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  otherPetPillCardActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
  },
  otherPetAvatarImg: {
    width: 32,
    height: 32,
  },
  otherPetTextCol: {
    gap: 1,
  },
  otherPetName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  otherPetNameActive: {
    color: '#0D9488',
  },
  otherPetMeta: {
    fontSize: 10,
    color: '#6B7280',
  },

  /* Switch Pet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  switchPetModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  switchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchModalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchModalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  switchModalSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  switchModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchPetListScroll: {
    maxHeight: 360,
  },
  switchPetListContent: {
    padding: 14,
    gap: 10,
  },
  switchPetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  switchPetItemActive: {
    borderColor: '#0D9488',
    borderWidth: 1.5,
    backgroundColor: '#F0FDFA',
  },
  switchAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  switchAvatarWrapActive: {
    borderColor: '#10B981',
  },
  switchAvatarImg: {
    width: '100%',
    height: '100%',
  },
  switchPetItemDetails: {
    flex: 1,
    gap: 2,
  },
  switchPetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchPetName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  switchPetNameActive: {
    color: '#0D9488',
  },
  activePetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activePetBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  switchPetSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  switchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  switchStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  switchStatusPillVax: {
    backgroundColor: '#DCFCE7',
  },
  switchStatusPillUnvax: {
    backgroundColor: '#FEF3C7',
  },
  switchStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#166534',
  },
  switchStatusPillSteril: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  switchStatusTextMuted: {
    fontSize: 9.5,
    color: '#4B5563',
  },
  switchActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  switchActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  switchModalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  addNewPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0D9488',
    backgroundColor: '#FFFFFF',
  },
  addNewPetBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D9488',
  },
});

