import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

const prismaMock = vi.hoisted(() => ({
  agreement: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  backdropLink: {
    findUnique: vi.fn(),
  },
  $queryRaw: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { agreementListSlimSelect, templateListSlimSelect } from '@/lib/agreements/listSelect';
import { agreementPatchSchema, buildAgreementPatchData, patchAgreement } from '@/lib/agreements/patch';

const AGREEMENT_ID = 'agr_1';
const NOW = new Date('2026-10-01T16:00:00.000Z');

function listItem(overrides: Record<string, unknown> = {}) {
  return {
    id: AGREEMENT_ID,
    status: 'LIVE',
    mergedHtml: '<p>merged</p>',
    customHtmlContent: '<p>custom</p>',
    client: { id: 'client_1', firstName: 'Ada', lastName: 'Lovelace', eventDate: null },
    template: { id: 'tpl_1', title: 'Standard', htmlContent: '<p>template</p>' },
    event: { id: 'evt_1', eventDate: new Date('2026-11-01T16:00:00.000Z') },
    backdropLink: { id: 'bd_1', name: 'Jordan' },
    ...overrides,
  };
}

function primeAgreement(status = 'LIVE', item = listItem({ status })) {
  prismaMock.agreement.findUnique.mockImplementation(async (args: { select?: unknown }) => {
    if (args?.select) {
      return { id: AGREEMENT_ID, status };
    }
    return item;
  });
  prismaMock.$queryRaw.mockResolvedValue([{ unreadNotesCount: 2 }]);
  prismaMock.agreement.update.mockResolvedValue(item);
}

describe('agreementPatchSchema', () => {
  it('accepts an empty object', () => {
    expect(agreementPatchSchema.parse({})).toEqual({});
  });

  it('rejects unknown fields', () => {
    const result = agreementPatchSchema.safeParse({ agreementId: AGREEMENT_ID, nextAction: 'Call' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
    }
  });

  it('rejects unknown fields nested in gallery links', () => {
    const result = agreementPatchSchema.safeParse({
      galleryLinks: [{ title: 'Ceremony', url: 'https://photos.example.com/a', extra: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects statuses outside the existing enum', () => {
    const result = agreementPatchSchema.safeParse({ status: 'CANCELLED' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Status must be DRAFT, LIVE, SIGNED, or COMPLETED',
      );
    }
  });

  it('rejects an empty expiration and an oversized next action', () => {
    expect(agreementPatchSchema.safeParse({ expiresAt: '' }).success).toBe(false);
    const nextAction = agreementPatchSchema.safeParse({ nextAction: 'x'.repeat(501) });
    expect(nextAction.success).toBe(false);
    if (!nextAction.success) {
      expect(nextAction.error.issues[0]?.message).toBe('Next action must be 500 characters or less');
    }
  });

  it('allows payment and gallery fields to be blank strings', () => {
    expect(
      agreementPatchSchema.parse({
        galleryLink: '',
        stripePaymentLink: '',
        stripeReceiptLink: '',
        paymentStatus: '',
      }),
    ).toEqual({
      galleryLink: '',
      stripePaymentLink: '',
      stripeReceiptLink: '',
      paymentStatus: '',
    });
  });
});

describe('buildAgreementPatchData', () => {
  it('normalizes gallery links the same way as the gallery route', () => {
    expect(
      buildAgreementPatchData(
        agreementPatchSchema.parse({
          galleryLink: 'https://photos.example.com/day',
        }),
        NOW,
      ),
    ).toEqual({
      galleryLinks: [{ title: 'Photo Gallery', url: 'https://photos.example.com/day' }],
      galleryLink: 'https://photos.example.com/day',
    });

    expect(
      buildAgreementPatchData(
        agreementPatchSchema.parse({
          galleryLinks: [
            { title: '  ', url: 'https://photos.example.com/a' },
            { title: 'Reception', url: 'https://photos.example.com/b' },
          ],
          galleryLink: 'https://photos.example.com/ignored',
        }),
        NOW,
      ),
    ).toEqual({
      galleryLinks: [
        { title: 'Photo Gallery', url: 'https://photos.example.com/a' },
        { title: 'Reception', url: 'https://photos.example.com/b' },
      ],
      galleryLink: 'https://photos.example.com/a',
    });
  });

  it('clears galleries, next action, and payment fields when they are sent blank', () => {
    expect(
      buildAgreementPatchData(
        agreementPatchSchema.parse({
          galleryLinks: [],
          nextAction: '',
          paymentStatus: '',
          stripePaymentLink: '',
          stripeReceiptLink: '',
        }),
        NOW,
      ),
    ).toEqual({
      galleryLinks: [],
      galleryLink: null,
      nextAction: null,
      paymentStatus: null,
      stripePaymentLink: null,
      stripeReceiptLink: null,
    });
  });

  it('leaves omitted fields out of the update', () => {
    expect(buildAgreementPatchData(agreementPatchSchema.parse({ chaserPaused: true }), NOW)).toEqual({
      chaserPaused: true,
    });
  });

  it('sets notesLastViewedAt only when markNotesViewed is true', () => {
    expect(buildAgreementPatchData(agreementPatchSchema.parse({ markNotesViewed: true }), NOW)).toEqual({
      notesLastViewedAt: NOW,
    });
    expect(buildAgreementPatchData(agreementPatchSchema.parse({ markNotesViewed: false }), NOW)).toEqual({});
  });
});

describe('agreement list slim select', () => {
  it('drops the three HTML bodies and keeps the rest of the template', () => {
    expect(agreementListSlimSelect).not.toHaveProperty('mergedHtml');
    expect(agreementListSlimSelect).not.toHaveProperty('customHtmlContent');
    expect(templateListSlimSelect).not.toHaveProperty('htmlContent');
    expect(agreementListSlimSelect.template.select.title).toBe(true);
    expect(agreementListSlimSelect.client).toBe(true);
    expect(agreementListSlimSelect.backdropLink.select).toEqual({
      id: true,
      name: true,
      attendantId: true,
      attendant: { select: { id: true, name: true, active: true } },
    });
  });
});

describe('patchAgreement', () => {
  beforeEach(() => {
    prismaMock.agreement.findUnique.mockReset();
    prismaMock.agreement.update.mockReset();
    prismaMock.backdropLink.findUnique.mockReset();
    prismaMock.$queryRaw.mockReset();
  });

  it('returns the updated agreement in the list-item shape', async () => {
    const item = listItem();
    primeAgreement('LIVE', item);

    const result = await patchAgreement(
      AGREEMENT_ID,
      {
        expiresAt: '2026-12-01T17:00:00.000Z',
        showPhoneNumberAlways: true,
        forceVirtualGreenScreen: false,
        status: 'LIVE',
      },
      { now: () => NOW },
    );

    expect(prismaMock.agreement.update).toHaveBeenCalledWith({
      where: { id: AGREEMENT_ID },
      data: {
        expiresAt: new Date('2026-12-01T17:00:00.000Z'),
        showPhoneNumberAlways: true,
        forceVirtualGreenScreen: false,
        status: 'LIVE',
      },
    });
    expect(result).toEqual({ ...item, unreadNotesCount: 2 });
    expect(result.mergedHtml).toBe('<p>merged</p>');
    expect(result.customHtmlContent).toBe('<p>custom</p>');
    expect(result.template.htmlContent).toBe('<p>template</p>');
  });

  it('does not write when the body has no fields to apply', async () => {
    primeAgreement();
    const result = await patchAgreement(AGREEMENT_ID, {});
    expect(prismaMock.agreement.update).not.toHaveBeenCalled();
    expect(result.unreadNotesCount).toBe(2);
  });

  it('returns 404 when the agreement does not exist', async () => {
    prismaMock.agreement.findUnique.mockResolvedValueOnce(null);

    await expect(patchAgreement(AGREEMENT_ID, { nextAction: 'Call client' })).rejects.toMatchObject({
      name: 'AgreementPatchError',
      status: 404,
      message: 'Agreement not found',
    });
    expect(prismaMock.agreement.update).not.toHaveBeenCalled();
  });

  it('blocks status changes away from a signed agreement', async () => {
    primeAgreement('SIGNED');

    await expect(patchAgreement(AGREEMENT_ID, { status: 'DRAFT' })).rejects.toMatchObject({
      name: 'AgreementPatchError',
      status: 403,
      message:
        'Cannot change status of signed agreements except to COMPLETED or CANCELLED. Once an agreement is signed, it becomes legally binding.',
    });
    expect(prismaMock.agreement.update).not.toHaveBeenCalled();
  });

  it('allows a signed agreement to move to COMPLETED and still updates other fields', async () => {
    primeAgreement('SIGNED', listItem({ status: 'COMPLETED' }));

    await patchAgreement(AGREEMENT_ID, { status: 'COMPLETED', nextAction: 'Send gallery' });

    expect(prismaMock.agreement.update).toHaveBeenCalledWith({
      where: { id: AGREEMENT_ID },
      data: { status: 'COMPLETED', nextAction: 'Send gallery' },
    });
  });

  it('updates non-status fields on a signed agreement', async () => {
    primeAgreement('SIGNED');

    await patchAgreement(AGREEMENT_ID, { chaserPaused: true });

    expect(prismaMock.agreement.update).toHaveBeenCalledWith({
      where: { id: AGREEMENT_ID },
      data: { chaserPaused: true },
    });
  });

  it('rejects a missing backdrop link', async () => {
    primeAgreement();
    prismaMock.backdropLink.findUnique.mockResolvedValue(null);

    await expect(patchAgreement(AGREEMENT_ID, { backdropLinkId: 'missing' })).rejects.toMatchObject({
      status: 404,
      message: 'Backdrop link not found',
    });
    expect(prismaMock.agreement.update).not.toHaveBeenCalled();
  });

  it('clears the backdrop link without looking one up when the id is null', async () => {
    primeAgreement();

    await patchAgreement(AGREEMENT_ID, { backdropLinkId: null });

    expect(prismaMock.backdropLink.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.agreement.update).toHaveBeenCalledWith({
      where: { id: AGREEMENT_ID },
      data: { backdropLinkId: null },
    });
  });

  it('maps a status constraint failure to the existing 400', async () => {
    prismaMock.agreement.findUnique.mockResolvedValueOnce({ id: AGREEMENT_ID, status: 'DRAFT' });
    prismaMock.agreement.update.mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed' });

    await expect(patchAgreement(AGREEMENT_ID, { status: 'SIGNED' })).rejects.toMatchObject({
      status: 400,
      message: 'Database constraint error - status may not be valid',
    });
  });

  it('does not rewrite unrelated constraint errors as a status failure', async () => {
    prismaMock.agreement.findUnique.mockResolvedValueOnce({ id: AGREEMENT_ID, status: 'LIVE' });
    prismaMock.agreement.update.mockRejectedValueOnce(new Error('some constraint failed'));

    await expect(patchAgreement(AGREEMENT_ID, { nextAction: 'Call' })).rejects.toThrow('some constraint failed');
  });

  it('rejects unknown fields before reading the agreement', async () => {
    await expect(patchAgreement(AGREEMENT_ID, { foo: true })).rejects.toBeInstanceOf(ZodError);
    expect(prismaMock.agreement.findUnique).not.toHaveBeenCalled();
  });
});
