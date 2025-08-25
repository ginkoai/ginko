#!/usr/bin/env node

/**
 * Simple manifest.json validator for Ginko Chrome Extension
 * Checks for common issues and required fields
 */

const fs = require('fs');
const path = require('path');

function validateManifest() {
    console.log('🔍 Validating Ginko Chrome Extension manifest...\n');
    
    const manifestPath = path.join(__dirname, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
        console.error('❌ manifest.json not found!');
        process.exit(1);
    }
    
    let manifest;
    try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        manifest = JSON.parse(manifestContent);
    } catch (error) {
        console.error('❌ Invalid JSON in manifest.json:', error.message);
        process.exit(1);
    }
    
    const errors = [];
    const warnings = [];
    
    // Required fields check
    const requiredFields = [
        'manifest_version',
        'name', 
        'version',
        'description',
        'permissions',
        'host_permissions',
        'action',
        'side_panel',
        'background'
    ];
    
    requiredFields.forEach(field => {
        if (!manifest[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    });
    
    // Manifest V3 check
    if (manifest.manifest_version !== 3) {
        errors.push('manifest_version must be 3 for Chrome extensions');
    }
    
    // Permissions check
    const expectedPermissions = ['storage', 'sidePanel', 'clipboardWrite', 'tabs', 'activeTab'];
    expectedPermissions.forEach(permission => {
        if (!manifest.permissions?.includes(permission)) {
            warnings.push(`Missing expected permission: ${permission}`);
        }
    });
    
    // Host permissions check
    if (!manifest.host_permissions?.includes('https://claude.ai/*')) {
        errors.push('Missing required host permission: https://claude.ai/*');
    }
    
    // Side panel configuration check
    if (!manifest.side_panel?.default_path) {
        errors.push('Side panel default_path is required');
    }
    
    // Background script check
    if (!manifest.background?.service_worker) {
        errors.push('Background service_worker is required for Manifest V3');
    }
    
    // File existence checks
    const filesToCheck = [
        manifest.side_panel?.default_path,
        manifest.background?.service_worker,
        ...(manifest.content_scripts?.[0]?.js || []),
        ...(manifest.content_scripts?.[0]?.css || [])
    ].filter(Boolean);
    
    filesToCheck.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            errors.push(`Referenced file does not exist: ${file}`);
        }
    });
    
    // Icons check
    if (manifest.icons) {
        Object.values(manifest.icons).forEach(iconPath => {
            const fullIconPath = path.join(__dirname, iconPath);
            if (!fs.existsSync(fullIconPath)) {
                warnings.push(`Icon file does not exist: ${iconPath}`);
            }
        });
    }
    
    // Content script matches check
    if (manifest.content_scripts?.[0]?.matches) {
        const matches = manifest.content_scripts[0].matches;
        if (!matches.includes('https://claude.ai/*')) {
            warnings.push('Content script should match https://claude.ai/*');
        }
    }
    
    // Results
    console.log('📋 Validation Results:');
    console.log('='.repeat(50));
    
    if (errors.length === 0) {
        console.log('✅ Manifest validation passed!');
    } else {
        console.log('❌ Validation failed with errors:');
        errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    // Extension info
    console.log('\n📦 Extension Info:');
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Description: ${manifest.description}`);
    console.log(`   Permissions: ${manifest.permissions?.join(', ') || 'None'}`);
    console.log(`   Host Permissions: ${manifest.host_permissions?.join(', ') || 'None'}`);
    
    // Installation instructions
    if (errors.length === 0) {
        console.log('\n🚀 Installation Instructions:');
        console.log('   1. Open Chrome and go to chrome://extensions/');
        console.log('   2. Enable "Developer mode" (top right)');
        console.log('   3. Click "Load unpacked"');
        console.log('   4. Select the browser-extension folder');
        console.log('   5. The Ginko extension should appear in your toolbar');
        
        if (warnings.length > 0) {
            console.log('\n💡 Recommendations:');
            console.log('   - Generate icon files using generate-icons.html');
            console.log('   - Test all functionality after loading');
            console.log('   - Check browser console for runtime errors');
        }
    }
    
    console.log('');
    process.exit(errors.length > 0 ? 1 : 0);
}

// Run validation
if (require.main === module) {
    validateManifest();
}

module.exports = { validateManifest };