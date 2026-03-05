import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const galleryEntrySchema = z.object({
  title: z.string(),
  url: z.string().url('Invalid gallery link URL'),
});

const updateGalleryLinkSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  galleryLink: z.string().url('Invalid gallery link URL').or(z.literal('')).optional(),
  galleryLinks: z.array(galleryEntrySchema).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateGalleryLinkSchema.parse(body);

    // Check if agreement exists
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      select: { id: true }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    const rawLinks = validatedData.galleryLinks && validatedData.galleryLinks.length > 0
      ? validatedData.galleryLinks
      : validatedData.galleryLink
        ? [{ title: 'Photo Gallery', url: validatedData.galleryLink }]
        : [];
    const galleryLinksData = rawLinks.map((g, i) => ({
      title: (g.title || '').trim() || (i === 0 ? 'Photo Gallery' : `Gallery ${i + 1}`),
      url: g.url
    }));

    const firstUrl = galleryLinksData.length > 0 ? galleryLinksData[0].url : null;

    // Update the agreement
    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.agreementId },
      data: {
        galleryLinks: galleryLinksData,
        galleryLink: firstUrl // Keep for backward compatibility
      },
      include: {
        client: true,
        template: true
      }
    });

    console.log('Gallery link updated for agreement:', updatedAgreement.id);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement
    });

  } catch (error: any) {
    console.error('Error updating gallery link:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to update gallery link' 
    }, { status: 500 });
  }
}

