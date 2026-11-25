'use strict';
const fs=require('node:fs'),path=require('node:path');
function sarif(report){
 if(report?.version!=='2.1.0'||!Array.isArray(report.runs)||!report.runs.length)throw Error('Missing or malformed SARIF evidence.');
 let findings=0;
 for(const run of report.runs){if(!run?.tool?.driver?.name||!Array.isArray(run.results))throw Error('Ambiguous SARIF run.');findings+=run.results.length;}
 if(findings)throw Error(findings+' security scan results require review; publication is blocked.');
 return{runs:report.runs.length,findings};
}
function directory(root){
 const files=fs.readdirSync(root).filter(name=>name.endsWith('.sarif'));if(!files.length)throw Error('No SARIF evidence produced.');
 return files.map(name=>{const file=path.join(root,name);if(!fs.lstatSync(file).isFile())throw Error('Invalid SARIF evidence file.');return sarif(JSON.parse(fs.readFileSync(file,'utf8')));});
}
function secretSummary(findings,commit){
 if(!Array.isArray(findings)||typeof commit!=='string'||!/^[0-9a-f]{40}$/.test(commit))throw Error('Missing secret scan evidence.');
 // Deliberately exclude matches, secret values, paths, authors and snippets.
 return{scanner:'gitleaks',version:'8.30.1',commit,findings:findings.length};
}
if(require.main===module){try{
 if(process.argv[2]==='secrets'){const summary=secretSummary(JSON.parse(fs.readFileSync(process.argv[3],'utf8')),process.env.GITHUB_SHA);fs.writeFileSync(process.argv[4],JSON.stringify(summary,null,2));console.log('Secret scan finding count: '+summary.findings);if(summary.findings)process.exitCode=1;}
 else console.log(JSON.stringify(directory(process.argv[2]||'dist/security/codeql')));
}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={sarif,directory,secretSummary};
