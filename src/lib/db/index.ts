import {neon, neonConfig} from '@neondatabase/serverless'
import {drizzle} from 'drizzle-orm/neon-http';

neonConfig.fetchConnectionCache = true;

// check if the database url is present in the .env folder
if (!process.env.DATABASE_URL) {
    throw new Error('database url is not found');
}

const sql = neon(process.env.DATABASE_URL);

// to later use the basic sql functions
export const db = drizzle(sql);