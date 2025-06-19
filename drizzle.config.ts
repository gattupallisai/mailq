import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './migrations', // Folder where migration files will be generated
  schema: './src/db/schemas/**/*.ts', // Path to your schema files
  dbCredentials: {                                                  
    url: 'postgres://postgres:admin@localhost:5432/crudsi', // PostgreSQL connection URL
  },
  
});
