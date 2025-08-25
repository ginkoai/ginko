#!/usr/bin/env node

/**
 * Vercel Deployment Verification Script
 * Runs pre-deployment checks to ensure the dashboard is ready for production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 ContextMCP Dashboard Deployment Verification');
console.log('================================================');

let hasErrors = false;

// Check 1: Required files exist
console.log('\n📁 Checking required files...');
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.js',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/components/providers.tsx'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    hasErrors = true;
  }
});

// Check 2: Environment variables
console.log('\n🔐 Checking environment variables...');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} is set`);
  } else {
    console.log(`⚠️  ${envVar} not set (should be configured in Vercel)`);
  }
});

// Check 3: Dependencies
console.log('\n📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'next',
    'react',
    'react-dom',
    '@supabase/supabase-js',
    'typescript'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep} installed`);
    } else {
      console.log(`❌ ${dep} missing`);
      hasErrors = true;
    }
  });
} catch (error) {
  console.log('❌ Error reading package.json');
  hasErrors = true;
}

// Check 4: Build configuration
console.log('\n⚙️  Checking build configuration...');
try {
  const nextConfig = fs.readFileSync('next.config.js', 'utf8');
  if (nextConfig.includes('output: \'standalone\'')) {
    console.log('✅ Standalone output configured');
  } else {
    console.log('⚠️  Standalone output not configured (recommended for Vercel)');
  }
  
  if (nextConfig.includes('compress: true')) {
    console.log('✅ Compression enabled');
  } else {
    console.log('⚠️  Compression not explicitly enabled');
  }
} catch (error) {
  console.log('❌ Error reading next.config.js');
  hasErrors = true;
}

// Check 5: TypeScript compilation
console.log('\n🔧 Running TypeScript check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log(error.stdout?.toString() || error.message);
  hasErrors = true;
}

// Check 6: ESLint
console.log('\n🧹 Running ESLint check...');
try {
  execSync('npx next lint', { stdio: 'pipe' });
  console.log('✅ ESLint check passed');
} catch (error) {
  console.log('⚠️  ESLint warnings found (build will continue)');
  const output = error.stdout?.toString() || error.message;
  if (output.includes('error')) {
    hasErrors = true;
  }
}

// Check 7: Build test
console.log('\n🔨 Testing build process...');
try {
  console.log('Building Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (error) {
  console.log('❌ Build failed');
  hasErrors = true;
}

// Final report
console.log('\n📋 Deployment Verification Summary');
console.log('==================================');

if (hasErrors) {
  console.log('❌ Deployment verification failed');
  console.log('Please fix the errors above before deploying to Vercel.');
  process.exit(1);
} else {
  console.log('✅ All checks passed!');
  console.log('Dashboard is ready for Vercel deployment.');
  console.log('\nNext steps:');
  console.log('1. Set environment variables in Vercel dashboard');
  console.log('2. Run: npm run deploy (for production)');
  console.log('3. Run: npm run deploy:preview (for testing)');
  process.exit(0);
}