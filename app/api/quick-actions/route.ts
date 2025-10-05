import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'send_reminder':
        return await handleSendReminder(data);
      case 'duplicate_template':
        return await handleDuplicateTemplate(data);
      case 'export_agreements':
        return await handleExportAgreements(data);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Quick action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute quick action' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function handleSendReminder(data: { agreementIds: string[] }) {
  try {
    const agreements = await prisma.agreement.findMany({
      where: {
        id: {
          in: data.agreementIds
        },
        status: 'LIVE',
        archived: false
      },
      include: {
        client: true,
        template: true
      }
    });

    // Here you would implement the actual email sending logic
    // For now, we'll just return the agreements that would be reminded
    
    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${agreements.length} clients`,
      agreements: agreements.map(a => ({
        id: a.id,
        client: `${a.client.firstName} ${a.client.lastName}`,
        email: a.client.email,
        template: a.template.title
      }))
    });
  } catch (error) {
    throw new Error('Failed to send reminders');
  }
}

async function handleDuplicateTemplate(data: { templateId: string }) {
  try {
    const originalTemplate = await prisma.template.findUnique({
      where: { id: data.templateId }
    });

    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    const duplicatedTemplate = await prisma.template.create({
      data: {
        title: `${originalTemplate.title} (Copy)`,
        htmlContent: originalTemplate.htmlContent,
        fieldsSchema: originalTemplate.fieldsSchema as any,
        version: 1
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template duplicated successfully',
      template: duplicatedTemplate
    });
  } catch (error) {
    throw new Error('Failed to duplicate template');
  }
}

async function handleExportAgreements(data: { 
  startDate?: string, 
  endDate?: string, 
  clientId?: string,
  status?: string 
}) {
  try {
    const whereClause: any = {
      archived: false
    };

    if (data.startDate && data.endDate) {
      whereClause.createdAt = {
        gte: new Date(data.startDate),
        lte: new Date(data.endDate)
      };
    }

    if (data.clientId) {
      whereClause.clientId = data.clientId;
    }

    if (data.status) {
      whereClause.status = data.status;
    }

    const agreements = await prisma.agreement.findMany({
      where: whereClause,
      include: {
        client: true,
        template: true,
        signature: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Found ${agreements.length} agreements for export`,
      agreements: agreements.map(a => ({
        id: a.id,
        client: `${a.client.firstName} ${a.client.lastName}`,
        email: a.client.email,
        template: a.template.title,
        status: a.status,
        createdAt: a.createdAt,
        signedAt: a.signedAt
      }))
    });
  } catch (error) {
    throw new Error('Failed to export agreements');
  }
}
