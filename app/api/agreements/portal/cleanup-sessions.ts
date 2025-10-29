import { prisma } from '@/lib/prisma';

/**
 * Clean up expired client sessions
 * This function should be called periodically (e.g., via cron job)
 * to remove expired sessions from the database
 */
export async function cleanupExpiredSessions() {
  try {
    console.log('Starting cleanup of expired client sessions...');
    
    const now = new Date();
    
    // Find expired sessions
    const expiredSessions = await prisma.clientSession.findMany({
      where: {
        expiresAt: {
          lt: now
        }
      },
      select: {
        id: true,
        clientEmail: true,
        expiresAt: true
      }
    });

    if (expiredSessions.length === 0) {
      console.log('No expired sessions found.');
      return { deletedCount: 0 };
    }

    console.log(`Found ${expiredSessions.length} expired sessions to clean up.`);

    // Delete expired sessions
    const deleteResult = await prisma.clientSession.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`Successfully deleted ${deleteResult.count} expired sessions.`);
    
    return { 
      deletedCount: deleteResult.count,
      expiredSessions: expiredSessions.map(session => ({
        id: session.id,
        clientEmail: session.clientEmail,
        expiredAt: session.expiresAt
      }))
    };

  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw error;
  }
}

// If this script is run directly (not imported), execute the cleanup
if (require.main === module) {
  cleanupExpiredSessions()
    .then(result => {
      console.log('Cleanup completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}
