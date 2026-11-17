import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadows, typography } from '@theme';
import { haptic } from '@lib/haptics';
import { formatDateWithYear } from '@lib/format';
import type {
  OutreachDetails,
  OutreachServiceType,
} from '@services/outreach/outreachService';

interface OutreachPostActionProps {
  outreachInfo: OutreachDetails;
  onScanPress: () => void;
}

type StatusTone = 'live' | 'upcoming' | 'expired';

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

const SERVICE_META: Record<
  OutreachServiceType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  vaccination: { label: 'Anti-Rabies', icon: 'shield-checkmark' },
  consultation: { label: 'Consultation', icon: 'medical' },
  'spay-neuter': { label: 'Spay / Neuter', icon: 'cut' },
};

const STATUS_COPY: Record<StatusTone, string> = {
  live: 'ON-SITE TODAY',
  upcoming: 'UPCOMING VISIT',
  expired: 'VISIT CONCLUDED',
};

const TONES: Record<
  StatusTone,
  {
    accent: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
    border: string;
    softBg: string;
  }
> = {
  live: {
    accent: colors.primary,
    badgeBg: colors.primaryLight,
    badgeText: colors.primaryStrong,
    dot: colors.success,
    border: '#BFE5DD',
    softBg: colors.primaryLighter,
  },
  upcoming: {
    accent: colors.accentDark,
    badgeBg: colors.accentLight,
    badgeText: colors.accentDark,
    dot: colors.warning,
    border: '#FDE68A',
    softBg: '#FFFBF2',
  },
  expired: {
    accent: colors.textMuted,
    badgeBg: '#F1F5F9',
    badgeText: '#475569',
    dot: '#94A3B8',
    border: '#E2E8F0',
    softBg: '#F8FAFC',
  },
};

function getDateParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const monthIndex = Number(month) - 1;

  return {
    month: MONTHS[monthIndex] ?? '—',
    day: day > 0 ? String(day) : '--',
    year: year > 0 ? String(year) : '----',
  };
}

export function OutreachPostAction({ outreachInfo, onScanPress }: OutreachPostActionProps) {
  const tone: StatusTone =
    outreachInfo.availability === 'expired'
      ? 'expired'
      : outreachInfo.availability === 'upcoming'
        ? 'upcoming'
        : 'live';

  const palette = TONES[tone];
  const dateParts = getDateParts(outreachInfo.date);
  const formattedDate = formatDateWithYear(outreachInfo.date);
  const isExpired = tone === 'expired';

  const handlePress = () => {
    if (!outreachInfo.canScanQr) return;
    haptic.medium();
    onScanPress();
  };

  return (
    <View style={[styles.card, { borderColor: palette.border }]}>
      <View style={[styles.accentBar, { backgroundColor: palette.accent }]} />

      <View style={styles.headerRow}>
        <View style={[styles.statusBadge, { backgroundColor: palette.badgeBg }]}>
          <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
          <Text style={[styles.statusText, { color: palette.badgeText }]}>
            {STATUS_COPY[tone]}
          </Text>
        </View>

        <View style={styles.opPill}>
          <Ionicons name="pricetag-outline" size={11} color={colors.primary} />
          <Text style={styles.opText}>{outreachInfo.opId}</Text>
        </View>
      </View>

      <View style={styles.heroRow}>
        <View style={[styles.dateTile, { backgroundColor: palette.softBg }]}>
          <Text style={[styles.dateMonth, { color: palette.accent }]}>{dateParts.month}</Text>
          <Text style={[styles.dateDay, { color: palette.accent }]}>{dateParts.day}</Text>
          <Text style={styles.dateYear}>{dateParts.year}</Text>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {outreachInfo.title || 'Barangay Outreach Visit'}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={2}>
              Brgy. {outreachInfo.barangay} · {outreachInfo.venue}
            </Text>
          </View>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.timeText} numberOfLines={1}>
              {outreachInfo.time}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.detailStrip, { backgroundColor: palette.softBg }]}>
        <View style={styles.detailItem}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="person-outline" size={14} color={colors.primary} />
          </View>
          <View style={styles.detailCopy}>
            <Text style={styles.detailLabel}>ATTENDING VET</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {outreachInfo.attendingVet}
            </Text>
          </View>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          </View>
          <View style={styles.detailCopy}>
            <Text style={styles.detailLabel}>SCHEDULE</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.servicesSection}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>SERVICES ON-SITE</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.servicesRow}>
          {outreachInfo.servicesOffered.map((service) => {
            const meta = SERVICE_META[service];
            return (
              <View key={service} style={styles.serviceChip}>
                <Ionicons name={meta.icon} size={12} color={colors.primaryStrong} />
                <Text style={styles.serviceChipText} numberOfLines={1}>
                  {meta.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {outreachInfo.canScanQr ? (
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Scan the CVO outreach station QR for Barangay ${outreachInfo.barangay}`}
        >
          <View style={styles.qrTile}>
            <View style={[styles.qrCorner, styles.qrCornerTopLeft]} />
            <View style={[styles.qrCorner, styles.qrCornerTopRight]} />
            <View style={[styles.qrCorner, styles.qrCornerBottomLeft]} />
            <View style={[styles.qrCorner, styles.qrCornerBottomRight]} />
            <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.primary} />
          </View>

          <View style={styles.scanCopy}>
            <Text style={styles.scanTitle}>Scan the station QR</Text>
            <Text style={styles.scanSubtitle} numberOfLines={1}>
              Check in and record services on-site
            </Text>
          </View>

          <View style={styles.arrowBubble}>
            <Ionicons name="arrow-forward" size={15} color={colors.white} />
          </View>
        </Pressable>
      ) : (
        <View
          style={[
            styles.closedPanel,
            { backgroundColor: palette.softBg, borderColor: palette.border },
          ]}
          accessibilityLabel={
            isExpired
              ? `Outreach concluded on ${formattedDate}`
              : `Outreach scheduled on ${formattedDate}`
          }
        >
          <View style={[styles.closedIconWrap, { backgroundColor: palette.badgeBg }]}>
            <Ionicons
              name={isExpired ? 'checkmark-done-circle-outline' : 'calendar-outline'}
              size={20}
              color={palette.accent}
            />
          </View>
          <View style={styles.closedCopy}>
            <Text style={[styles.closedTitle, { color: palette.badgeText }]}>
              {isExpired ? 'Check-in closed' : 'Check-in opens on event day'}
            </Text>
            <Text style={[styles.closedSubtitle, { color: palette.accent }]}>
              {isExpired
                ? `This outreach visit ended on ${formattedDate}.`
                : `Scan the CVO station QR on ${formattedDate}.`}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footnoteRow}>
        <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
        <Text style={styles.footnoteText} numberOfLines={1}>
          {outreachInfo.canScanQr
            ? 'Ask the outreach team for the official CVO QR code.'
            : 'No action needed until the outreach team is on-site.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 13,
    gap: 12,
    ...shadows.sm,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: typography.font.bold,
    letterSpacing: 0.6,
  },
  opPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLighter,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  opText: {
    fontSize: 10.5,
    fontFamily: typography.font.bold,
    color: colors.primaryStrong,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  dateTile: {
    width: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: typography.font.bold,
    letterSpacing: 1,
  },
  dateDay: {
    fontSize: 26,
    fontFamily: typography.font.bold,
    lineHeight: 29,
  },
  dateYear: {
    fontSize: 10,
    fontFamily: typography.font.medium,
    color: colors.textMuted,
  },
  heroCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  heroTitle: {
    fontSize: 15,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.font.medium,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  detailStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLighter,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: typography.font.bold,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 11.5,
    fontFamily: typography.font.bold,
    color: colors.textPrimary,
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderStrong,
    marginHorizontal: 10,
  },
  servicesSection: {
    gap: 7,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeadingText: {
    fontSize: 9.5,
    fontFamily: typography.font.bold,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLighter,
    borderWidth: 1,
    borderColor: '#CFE9E3',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    maxWidth: '48%',
  },
  serviceChipText: {
    fontSize: 11,
    fontFamily: typography.font.medium,
    color: colors.primaryStrong,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primaryStrong,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 11,
    ...shadows.sm,
  },
  scanButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  qrTile: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCorner: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderColor: colors.primary,
  },
  qrCornerTopLeft: {
    top: 5,
    left: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 2,
  },
  qrCornerTopRight: {
    top: 5,
    right: 5,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 2,
  },
  qrCornerBottomLeft: {
    bottom: 5,
    left: 5,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 2,
  },
  qrCornerBottomRight: {
    bottom: 5,
    right: 5,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 2,
  },
  scanCopy: {
    flex: 1,
    gap: 2,
  },
  scanTitle: {
    fontSize: 13.5,
    fontFamily: typography.font.bold,
    color: colors.white,
  },
  scanSubtitle: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  arrowBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  closedPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  closedIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedCopy: {
    flex: 1,
    gap: 2,
  },
  closedTitle: {
    fontSize: 12.5,
    fontFamily: typography.font.bold,
  },
  closedSubtitle: {
    fontSize: 11,
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footnoteText: {
    flex: 1,
    fontSize: 10.5,
    color: colors.textMuted,
  },
});
