import { db } from './db';
import { users } from '@shared/schema';
import { hashPassword } from './auth';
import { sql } from 'drizzle-orm';

async function initializeUsers() {
  try {
    // Check if users already exist
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length > 0) {
      console.log('Users already exist in the database. Skipping initialization.');
      return;
    }

    // Create Franco as admin
    const francoPassword = await hashPassword('Ncc1701e@');
    await db.insert(users).values({
      username: 'franco',
      email: 'cortsfranco@hotmail.com',
      displayName: 'Franco Nicolás Corts Romeo',
      password: francoPassword,
      role: 'admin',
      isActive: true
    });
    console.log('Created admin user: Franco');

    // Create Joni (editor placeholder)
    const joniPassword = await hashPassword('temporalPassword123');
    await db.insert(users).values({
      username: 'joni',
      email: 'joni@opendoors.com',
      displayName: 'Joni',
      password: joniPassword,
      role: 'editor',
      isActive: true
    });
    console.log('Created editor user: Joni (temporary password: temporalPassword123)');

    // Create Hernan (editor placeholder)
    const hernanPassword = await hashPassword('temporalPassword456');
    await db.insert(users).values({
      username: 'hernan',
      email: 'hernan@opendoors.com',
      displayName: 'Hernan',
      password: hernanPassword,
      role: 'editor',
      isActive: true
    });
    console.log('Created editor user: Hernan (temporary password: temporalPassword456)');

    console.log('User initialization complete!');
    console.log('');
    console.log('Login credentials:');
    console.log('==================');
    console.log('Admin: cortsfranco@hotmail.com / Ncc1701e@');
    console.log('Editor: joni@opendoors.com / temporalPassword123');
    console.log('Editor: hernan@opendoors.com / temporalPassword456');
    
  } catch (error) {
    console.error('Error initializing users:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

initializeUsers();