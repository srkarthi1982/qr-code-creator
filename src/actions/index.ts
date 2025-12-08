import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { QrCodes, QrScanEvents, and, db, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedQrCode(qrCodeId: string, userId: string) {
  const [code] = await db
    .select()
    .from(QrCodes)
    .where(and(eq(QrCodes.id, qrCodeId), eq(QrCodes.userId, userId)));

  if (!code) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "QR code not found.",
    });
  }

  return code;
}

export const server = {
  createQrCode: defineAction({
    input: z.object({
      label: z.string().optional(),
      contentType: z.string().optional(),
      contentValue: z.string().min(1),
      size: z.number().optional(),
      errorCorrectionLevel: z.string().optional(),
      foregroundColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      logoUrl: z.string().optional(),
      styleJson: z.string().optional(),
      imageUrl: z.string().optional(),
      isFavorite: z.boolean().optional(),
      isArchived: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [qrCode] = await db
        .insert(QrCodes)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          label: input.label,
          contentType: input.contentType,
          contentValue: input.contentValue,
          size: input.size,
          errorCorrectionLevel: input.errorCorrectionLevel,
          foregroundColor: input.foregroundColor,
          backgroundColor: input.backgroundColor,
          logoUrl: input.logoUrl,
          styleJson: input.styleJson,
          imageUrl: input.imageUrl,
          isFavorite: input.isFavorite ?? false,
          isArchived: input.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { qrCode } };
    },
  }),

  updateQrCode: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        label: z.string().optional(),
        contentType: z.string().optional(),
        contentValue: z.string().optional(),
        size: z.number().optional(),
        errorCorrectionLevel: z.string().optional(),
        foregroundColor: z.string().optional(),
        backgroundColor: z.string().optional(),
        logoUrl: z.string().optional(),
        styleJson: z.string().optional(),
        imageUrl: z.string().optional(),
        isFavorite: z.boolean().optional(),
        isArchived: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.label !== undefined ||
          input.contentType !== undefined ||
          input.contentValue !== undefined ||
          input.size !== undefined ||
          input.errorCorrectionLevel !== undefined ||
          input.foregroundColor !== undefined ||
          input.backgroundColor !== undefined ||
          input.logoUrl !== undefined ||
          input.styleJson !== undefined ||
          input.imageUrl !== undefined ||
          input.isFavorite !== undefined ||
          input.isArchived !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedQrCode(input.id, user.id);

      const [qrCode] = await db
        .update(QrCodes)
        .set({
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
          ...(input.contentValue !== undefined ? { contentValue: input.contentValue } : {}),
          ...(input.size !== undefined ? { size: input.size } : {}),
          ...(input.errorCorrectionLevel !== undefined
            ? { errorCorrectionLevel: input.errorCorrectionLevel }
            : {}),
          ...(input.foregroundColor !== undefined ? { foregroundColor: input.foregroundColor } : {}),
          ...(input.backgroundColor !== undefined ? { backgroundColor: input.backgroundColor } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
          ...(input.styleJson !== undefined ? { styleJson: input.styleJson } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
          ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
          updatedAt: new Date(),
        })
        .where(eq(QrCodes.id, input.id))
        .returning();

      return { success: true, data: { qrCode } };
    },
  }),

  listQrCodes: defineAction({
    input: z.object({
      includeArchived: z.boolean().default(false),
      favoritesOnly: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const filters = [eq(QrCodes.userId, user.id)];
      if (!input.includeArchived) {
        filters.push(eq(QrCodes.isArchived, false));
      }
      if (input.favoritesOnly) {
        filters.push(eq(QrCodes.isFavorite, true));
      }

      const codes = await db.select().from(QrCodes).where(and(...filters));

      return { success: true, data: { items: codes, total: codes.length } };
    },
  }),

  addScanEvent: defineAction({
    input: z.object({
      qrCodeId: z.string().min(1),
      scannedAt: z.date().optional(),
      userAgent: z.string().optional(),
      ipHash: z.string().optional(),
      locationHint: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedQrCode(input.qrCodeId, user.id);

      const [event] = await db
        .insert(QrScanEvents)
        .values({
          id: crypto.randomUUID(),
          qrCodeId: input.qrCodeId,
          scannedAt: input.scannedAt ?? new Date(),
          userAgent: input.userAgent,
          ipHash: input.ipHash,
          locationHint: input.locationHint,
        })
        .returning();

      return { success: true, data: { event } };
    },
  }),

  listScanEvents: defineAction({
    input: z.object({
      qrCodeId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedQrCode(input.qrCodeId, user.id);

      const events = await db
        .select()
        .from(QrScanEvents)
        .where(eq(QrScanEvents.qrCodeId, input.qrCodeId));

      return { success: true, data: { items: events, total: events.length } };
    },
  }),
};
