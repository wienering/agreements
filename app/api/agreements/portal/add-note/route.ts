import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { escapeHtml } from '@/lib/htmlEscape';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import {
  renderCtaButton,
  renderEmailLayout,
  renderNoticeBlock,
} from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { logAgreementActivity } from '@/lib/activityLog';

const addNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(1000, 'Note content must be less than 1000 characters'),
  agreementId: z.string().optional(),
});

// Helper function to send note notification email
async function sendNoteNotificationEmail(
  client: { firstName: string; lastName: string; email: string },
  noteContent: string,
  agreement: { id: string; uniqueToken: string; template: { title: string } } | null,
  request: NextRequest
) {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    devLog('SMTP not configured, skipping note notification email');
    return;
  }

  try {
    // Get the base URL from request headers or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    
    // Escape HTML entities for safety
    const safeNoteContent = escapeHtml(noteContent);
    const safeClientFirstName = escapeHtml(client.firstName);
    const safeClientLastName = escapeHtml(client.lastName);
    const safeClientEmail = escapeHtml(client.email);
    const safeAgreementTitle = agreement ? escapeHtml(agreement.template.title) : '';
    const adminUrl = `${baseUrl}/admin/agreements`;

    const clientInfoHtml = `
      <strong>Name:</strong> ${safeClientFirstName} ${safeClientLastName}<br>
      <strong>Email:</strong> ${safeClientEmail}<br>
      <strong>Agreement:</strong> ${agreement ? safeAgreementTitle : 'General note (not tied to specific agreement)'}`;

    const notePanelHtml = safeNoteContent.replace(/\n/g, '<br>');

    const agreementLinkLine = agreement
      ? `<p style="margin:16px 0 0 0;">You can also <a href="${baseUrl}/agreement/${agreement.uniqueToken}" style="color:#1E3B31;text-decoration:underline;">view the agreement</a>.</p>`
      : '';

    const bodyHtml = `
      <p style="margin:0 0 16px 0;"><strong>A client has added a note in the client portal.</strong></p>
      ${renderNoticeBlock('Client Information', clientInfoHtml, 'default')}
      ${renderNoticeBlock('Note Content', notePanelHtml, 'default')}
      ${renderCtaButton({ label: 'View in Admin', url: adminUrl, tone: 'default' })}
      ${agreementLinkLine}
      <p style="margin:16px 0 0 0;font-size:14px;color:#5E5E58;">This notification was automatically sent when the client added a note in the client portal.</p>
      <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#5E5E58;text-align:center;">
        Photobooth Guys Agreement Management System<br>
        Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}
      </p>
    `;

    const emailHtml = renderEmailLayout({
      title: 'New Client Note',
      preheader: 'A client has added a note in the client portal.',
      bodyHtml,
      tone: 'default',
    });

    const result = await sendEmail({
      to: process.env.ADMIN_EMAIL || 'agreements@photoboothguys.ca',
      subject: `New Client Note - ${safeClientFirstName} ${safeClientLastName}${agreement ? ` - ${safeAgreementTitle}` : ''}`,
      html: emailHtml,
    });
    devLog('Note notification email sent successfully:', result.messageId);
  } catch (error) {
    // Log error but don't throw - we don't want email failures to block note creation
    console.error('Failed to send note notification email:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required' 
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token' 
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired' 
      }, { status: 401 });
    }

    // Check if session has a valid client
    if (!session.client) {
      return NextResponse.json({ 
        error: 'Invalid session - no client associated' 
      }, { status: 401 });
    }

    // Extract client to preserve TypeScript type narrowing
    const sessionClient = session.client;

    const body = await request.json();
    const validatedData = addNoteSchema.parse(body);

    // If agreementId is provided, verify it belongs to this client (by email) and fetch details
    let agreement = null;
    if (validatedData.agreementId) {
      agreement = await prisma.agreement.findFirst({
        where: {
          id: validatedData.agreementId,
          client: {
            email: sessionClient.email.toLowerCase(),
          }
        },
        include: {
          template: true
        }
      });

      if (!agreement) {
        return NextResponse.json({ 
          error: 'Agreement not found or does not belong to this client' 
        }, { status: 404 });
      }
    }

    // Create the note
    const note = await prisma.clientNote.create({
      data: {
        clientId: sessionClient.id,
        agreementId: validatedData.agreementId || null,
        content: validatedData.content,
      }
    });

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    // Send notification email quietly (don't block response if email fails)
    sendNoteNotificationEmail(
      session.client,
      validatedData.content,
      agreement,
      request
    ).catch(error => {
      console.error('Error sending note notification email:', error);
    });

    if (validatedData.agreementId) {
      await logAgreementActivity(validatedData.agreementId, 'NOTE_ADDED');
    }

    return NextResponse.json({
      success: true,
      message: 'Note added successfully',
      note: {
        id: note.id,
        content: note.content,
        agreementId: note.agreementId,
        createdAt: note.createdAt,
      }
    });

  } catch (error) {
    return handleApiError(error, 'agreements/portal/add-note');
  }
}
