'use strict';
// Publication must fail closed until every master-specification gate has CI evidence.
// Packaging alone is not evidence that an installed application starts correctly.
const REQUIRED_GATES=Object.freeze([
 'verify','catalog','extension',
 'package (windows-latest)','package (macos-15)','package (macos-15-intel)','package (ubuntu-24.04)',
 'integration','accessibility','security','dependency-audit','secret-scan','sbom',
 'data-integrity','artifact-checksums','signing-notarization',
 'installed-windows','installed-macos-arm64','installed-macos-x64',
 'installed-linux-appimage','installed-linux-deb','installed-linux-rpm'
]);
function missingGates(jobs){
 if(!Array.isArray(jobs))throw Error('Expected workflow jobs.');
 return REQUIRED_GATES.filter(name=>{
  const matching=jobs.filter(job=>job.name===name);
  return matching.length!==1||matching[0].status!=='completed'||matching[0].conclusion!=='success';
 });
}
module.exports={REQUIRED_GATES,missingGates};
