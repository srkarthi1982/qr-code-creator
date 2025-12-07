/**
 * QR Code Creator - generate QR codes instantly.
 *
 * Design goals:
 * - Keep QR codes with labels and content types (URL, text, Wi-Fi, etc.).
 * - Store styling/settings for regeneration.
 * - Ready for optional scan tracking in future.
 */

import { defineTable, column, NOW } from "astro:db";

export const QrCodes = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    label: column.text({ optional: true }),                // "Portfolio link", "Wi-Fi at home"
    contentType: column.text({ optional: true }),          // "url", "text", "wifi", "vcard", etc.
    contentValue: column.text(),                           // encoded data (URL, text, etc.)

    // design settings
    size: column.number({ optional: true }),               // pixel size
    errorCorrectionLevel: column.text({ optional: true }), // "L", "M", "Q", "H"
    foregroundColor: column.text({ optional: true }),      // "#000000"
    backgroundColor: column.text({ optional: true }),      // "#FFFFFF"
    logoUrl: column.text({ optional: true }),              // optional center logo
    styleJson: column.text({ optional: true }),            // extra design config

    // storage
    imageUrl: column.text({ optional: true }),             // generated QR image
    isFavorite: column.boolean({ default: false }),
    isArchived: column.boolean({ default: false }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const QrScanEvents = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    qrCodeId: column.text({
      references: () => QrCodes.columns.id,
    }),
    scannedAt: column.date({ default: NOW }),
    userAgent: column.text({ optional: true }),            // browser/OS
    ipHash: column.text({ optional: true }),               // hashed IP for rough stats, privacy-safe
    locationHint: column.text({ optional: true }),         // optional city/country if ever added
  },
});

export const tables = {
  QrCodes,
  QrScanEvents,
} as const;
