#!/usr/bin/env node
/**
 * Dependency Vulnerability Scanner Script
 * Analyzes repository dependencies for known CVEs and security advisories.
 *
 * Usage:
 *   node scripts/security-scan.mjs [--fail-on-critical] [--severity=critical|high|moderate|low]
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const failOnCritical = args.includes('--fail-on-critical');
const severityArg = args.find((a) => a.startsWith('--severity='));
const targetSeverity = severityArg ? severityArg.split('=')[1].toLowerCase() : null;

console.log('====================================================');
console.log('🔒 Integrated Travel Platform - Security Scan');
console.log('====================================================\n');
console.log('🔍 Running automated dependency vulnerability audit...\n');

let auditData = null;
try {
  const cmd = process.platform === 'win32' ? 'npm.cmd audit --workspaces --json' : 'npm audit --workspaces --json';
  const stdout = execSync(cmd, {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  auditData = JSON.parse(stdout);
} catch (err) {
  // npm audit exits with non-zero (code 1) when vulnerabilities are found, but outputs the JSON to stdout
  const stdout = err.stdout ? err.stdout.toString() : '';
  if (stdout) {
    try {
      auditData = JSON.parse(stdout);
    } catch {
      console.error('❌ Failed to parse npm audit output:', err.message);
      process.exit(1);
    }
  } else {
    console.error('❌ Failed to execute npm audit:', err.message);
    process.exit(1);
  }
}


const metadata = auditData.metadata || {
  vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
  dependencies: { prod: 0, dev: 0, optional: 0, peer: 0, total: 0 },
};

const vulns = metadata.vulnerabilities || {};
const deps = metadata.dependencies || {};

console.log('📦 Dependency Inventory:');
console.log(`   • Production: ${deps.prod || 0}`);
console.log(`   • Development: ${deps.dev || 0}`);
console.log(`   • Optional:    ${deps.optional || 0}`);
console.log(`   • Total:       ${deps.total || 0}\n`);

console.log('🛡️  Vulnerability Summary:');
console.log(`   • Critical:  ${vulns.critical || 0}`);
console.log(`   • High:      ${vulns.high || 0}`);
console.log(`   • Moderate:  ${vulns.moderate || 0}`);
console.log(`   • Low:       ${vulns.low || 0}`);
console.log(`   • Info:      ${vulns.info || 0}`);
console.log(`   • TOTAL:     ${vulns.total || 0}\n`);

if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
  console.log('----------------------------------------------------');
  console.log('📋 Vulnerability Details:');
  console.log('----------------------------------------------------');

  for (const [pkgName, pkgInfo] of Object.entries(auditData.vulnerabilities)) {
    const sev = (pkgInfo.severity || 'unknown').toUpperCase();
    console.log(`\n• Package: ${pkgName}`);
    console.log(`  Severity: [${sev}]`);
    console.log(`  Direct:   ${pkgInfo.isDirect ? 'Yes' : 'Transitive'}`);
    console.log(`  Range:    ${pkgInfo.range || 'N/A'}`);
    if (pkgInfo.via && Array.isArray(pkgInfo.via)) {
      pkgInfo.via.forEach((v) => {
        if (typeof v === 'object' && v.title) {
          console.log(`  Advisory: ${v.title}`);
          if (v.url) console.log(`  Link:     ${v.url}`);
        }
      });
    }
    if (pkgInfo.fixAvailable) {
      if (typeof pkgInfo.fixAvailable === 'object') {
        console.log(`  Fix:      Update ${pkgInfo.fixAvailable.name} to v${pkgInfo.fixAvailable.version}`);
      } else {
        console.log(`  Fix:      Available via npm audit fix`);
      }
    }
  }
} else {
  console.log('✅ No known vulnerabilities identified in current dependencies.');
}

console.log('\n====================================================');
console.log('🔒 Security Audit Completed');
console.log('====================================================\n');

// Exit policy logic
if (failOnCritical && (vulns.critical || 0) > 0) {
  console.error(`🚨 Scan failed: ${vulns.critical} critical vulnerability(ies) found.`);
  process.exit(1);
}

if (targetSeverity) {
  const levels = ['info', 'low', 'moderate', 'high', 'critical'];
  const minIdx = levels.indexOf(targetSeverity);
  if (minIdx !== -1) {
    let triggered = false;
    for (let i = minIdx; i < levels.length; i++) {
      if ((vulns[levels[i]] || 0) > 0) {
        triggered = true;
        break;
      }
    }
    if (triggered) {
      console.error(`🚨 Scan failed: Vulnerabilities at or above '${targetSeverity}' level found.`);
      process.exit(1);
    }
  }
}

console.log('✨ Dependency vulnerability scan passed.');
process.exit(0);
