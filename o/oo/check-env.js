const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Check if .env file exists
const envPath = path.resolve(process.cwd(), '.env');
console.log('Checking for .env file at:', envPath);

if (!fs.existsSync(envPath)) {
  console.error('.env file not found!');
  console.log('Please create a .env file with the following content:');
  console.log(`
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-app-password

# IMAP Configuration
IMAP_USER=your.email@gmail.com
IMAP_PASS=your-app-password
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
  `);
  process.exit(1);
}

// Load and check environment variables
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

const requiredVars = ['SMTP_USER', 'SMTP_PASS', 'IMAP_USER', 'IMAP_PASS'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  console.log('\nCurrent environment variables:');
  requiredVars.forEach(varName => {
    console.log(`${varName}: ${process.env[varName] ? 'set' : 'not set'}`);
  });
  process.exit(1);
}

console.log('All required environment variables are set!');
console.log('\nEnvironment variables found:');
requiredVars.forEach(varName => {
  console.log(`${varName}: ${process.env[varName] ? 'set' : 'not set'}`);
}); 