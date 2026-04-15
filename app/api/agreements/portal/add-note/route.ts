import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const addNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(1000, 'Note content must be less than 1000 characters'),
  agreementId: z.string().optional(),
});

// Helper function to escape HTML entities
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

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

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #4a9e72; margin: 0; }
          .content { margin-bottom: 30px; }
          .note-content { 
            border: 1px solid #eee; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            background-color: #f9f9f9;
            white-space: pre-wrap;
          }
          .client-details { 
            border: 1px solid #eee; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            background-color: #f0f9ff;
          }
          .button { 
            display: inline-block; 
            background-color: #3d8560 !important; 
            color: white !important; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 10px 5px;
            font-weight: 600;
          }
          .button:hover { 
            background-color: #1d4ed8; 
          }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>New Client Note</p>
          </div>
          
          <div class="content">
            <p><strong>A client has added a note in the client portal.</strong></p>
            
            <div class="client-details">
              <h3 style="margin-top: 0;">Client Information:</h3>
              <p><strong>Name:</strong> ${safeClientFirstName} ${safeClientLastName}</p>
              <p><strong>Email:</strong> ${safeClientEmail}</p>
              ${agreement ? `<p><strong>Agreement:</strong> ${safeAgreementTitle}</p>` : '<p><strong>Agreement:</strong> General note (not tied to specific agreement)</p>'}
            </div>
            
            <div class="note-content">
              <h3 style="margin-top: 0;">Note Content:</h3>
              <p>${safeNoteContent.replace(/\n/g, '<br>')}</p>
            </div>
            
            ${agreement ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/agreement/${agreement.uniqueToken}" class="button">View Agreement</a>
              <a href="${baseUrl}/admin/agreements" class="button">Admin Panel</a>
            </div>
            ` : `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/admin/agreements" class="button">Admin Panel</a>
            </div>
            `}
            
            <p style="color: #666; font-size: 14px;">This notification was automatically sent when the client added a note in the client portal.</p>
          </div>
          
          <div class="footer">
            <p>Photobooth Guys Agreement Management System</p>
            <p>Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || 'agreements@photoboothguys.ca',
      subject: `📝 New Client Note - ${safeClientFirstName} ${safeClientLastName}${agreement ? ` - ${safeAgreementTitle}` : ''}`,
      html: emailHtml,
    };

    await transporter.verify();
    const result = await transporter.sendMail(mailOptions);
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

  } catch (error: any) {
    console.error('Error adding note:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to add note' 
    }, { status: 500 });
  }
}
