'use strict';
const crypto = require('node:crypto');
const TOPICS = {
  ai: { label: 'Artificial intelligence', terms: ['artificial intelligence','machine learning','llm','neural','pytorch','tensorflow','huggingface','openai','langchain','ollama','deep learning'], github: ['ai','machine-learning','llm','deep-learning'] },
  web: { label: 'Web development', terms: ['react','nextjs','next.js','frontend','javascript','typescript','css','html','vue','svelte','angular','webdev'], github: ['javascript','typescript','react','web','frontend','nextjs'] },
  tools: { label: 'Developer tools', terms: ['developer tools','vscode','neovim','terminal','cli','git','productivity','automation','devtools'], github: ['cli','developer-tools','productivity','automation','terminal'] },
  data: { label: 'Data & analytics', terms: ['data science','analytics','pandas','jupyter','database','sql','postgres','visualization','statistics'], github: ['data-science','database','analytics','visualization'] },
  systems: { label: 'Systems & infrastructure', terms: ['linux','rust','golang','docker','kubernetes','devops','self hosted','self-hosted','server','network'], github: ['linux','rust','go','docker','devops','self-hosted'] },
  design: { label: 'Design & creative', terms: ['figma','design','animation','three.js','blender','creative','graphics','ui','ux','video'], github: ['design','animation','graphics','ui','creative-coding'] },
  mobile: { label: 'Mobile apps', terms: ['flutter','android','swift','kotlin','ios','react native','mobile'], github: ['flutter','android','ios','mobile','react-native'] },
  security: { label: 'Security', terms: ['cybersecurity','pentest','security','ctf','cryptography','privacy','owasp'], github: ['security','privacy','hacking','cryptography'] }
};
function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function classify(text) {
  const s = String(text).toLowerCase().replace(/[^a-z0-9.+-]+/g,' ');
  const result = {};
  for (const [key,t] of Object.entries(TOPICS)) {
    const hits = t.terms.filter(term => (` ${s} `).includes(` ${term} `)).length;
    if (hits) result[key] = Math.min(hits,4);
  }
  return result;
}
function validWeights(input) {
  const result = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  for (const k of Object.keys(TOPICS)) if (Number.isFinite(input[k]) && input[k] > 0) result[k] = Math.min(100, input[k]);
  return result;
}
function validateProfile(input) {
  if (input?.schema !== 'repopulse.interests.v1') throw new Error('Choose a RepoPulse interest profile exported by the companion extension.');
  const weights = validWeights(input.weights);
  if (!Object.keys(weights).length) throw new Error('This profile contains no recognized interests. Choose interests manually instead.');
  return {weights, importedAt: new Date().toISOString(), source:'browser'};
}
function normalizeRepo(r) {
  if(!r||!Number.isSafeInteger(r.id)||r.id<=0||typeof r.full_name!=='string'||r.full_name.length>140||!/^[\w.-]+\/[\w.-]+$/.test(r.full_name)||r.full_name.split('/').some(p=>p==='.'||p==='..')||!Number.isSafeInteger(r.stargazers_count)||r.stargazers_count<0)return null;
  const license=typeof r.license==='string'?r.license:typeof r.license?.spdx_id==='string'?r.license.spdx_id:null;
  return {id:r.id,full_name:r.full_name,description:typeof r.description==='string'&&r.description.trim()?r.description.slice(0,600):'Explore this open-source project on GitHub.',stargazers_count:r.stargazers_count,language:typeof r.language==='string'?r.language.trim().slice(0,64)||null:null,topics:[...new Set((Array.isArray(r.topics)?r.topics:[]).filter(t=>typeof t==='string').map(t=>t.trim().slice(0,80)).filter(Boolean))].slice(0,30),archived:!!r.archived,fork:!!r.fork,pushed_at:typeof r.pushed_at==='string'&&Number.isFinite(Date.parse(r.pushed_at))?r.pushed_at:'',html_url:'https://github.com/'+r.full_name,license:license?license.slice(0,120):null};
}
function eligible(repo) { return !!repo && repo.stargazers_count >= 50000 && !repo.archived && !repo.fork; }
function repoTopics(r) {
  const detected = classify(`${r.full_name} ${r.description} ${r.language || ''} ${r.topics.join(' ')}`);
  for (const [key,topic] of Object.entries(TOPICS)) if (topic.github.some(t=>r.topics.includes(t))) detected[key] = (detected[key]||0)+2;
  return detected;
}
function ranked(repos, profile, day) {
  const weights = validWeights(profile), maximum = Math.max(1,...Object.values(weights));
  return repos.filter(eligible).map(repo=>{
    const tags = repoTopics(repo);
    const matches = Object.keys(tags).filter(k=>weights[k]).sort((a,b)=>weights[b]*tags[b]-weights[a]*tags[a]);
    const affinity = matches.reduce((sum,k)=>sum+(weights[k]/maximum)*Math.min(tags[k],4),0);
    const jitter = crypto.createHash('sha256').update(`${day}:${repo.id}`).digest().readUInt32BE(0)/0xffffffff;
    return {...repo, score:affinity*10+Math.log10(repo.stargazers_count)+jitter*2, reason:matches.length?`Matches your interest in ${TOPICS[matches[0]].label.toLowerCase()}.`:'A widely adopted project to broaden your open-source radar.', matchedTopics:matches};
  }).sort((a,b)=>b.score-a.score || a.id-b.id);
}
function selectDaily(repos, state, day=localDay()) {
  const hidden = new Set(state.hidden || []), seen = new Set(state.seen || []);
  const existing = state.daily?.day === day ? (state.daily.repos || []).filter(r=>eligible(r)&&!hidden.has(r.id)) : [];
  const chosen = existing.slice(0,3), used = new Set(chosen.map(r=>r.id));
  const candidates = ranked(repos,state.profile?.weights || {},day).filter(r=>!hidden.has(r.id)&&!seen.has(r.id)&&!used.has(r.id));
  // Prefer distinct owners without discarding suitable candidates if the pool is small.
  for (const distinct of [true,false]) for (const r of candidates) {
    if (chosen.length === 3) break;
    if (used.has(r.id) || (distinct && chosen.some(c=>c.full_name.split('/')[0]===r.full_name.split('/')[0]))) continue;
    chosen.push(r); used.add(r.id);
  }
  return {day,repos:chosen};
}
function defaults() { return {version:1,profile:{weights:{}},saved:[],hidden:[],seen:[],daily:null,cache:[],cacheAt:null,settings:{pinned:true,reducedMotion:false,launchAtLogin:false}}; }
module.exports={TOPICS,localDay,classify,validWeights,validateProfile,normalizeRepo,eligible,repoTopics,ranked,selectDaily,defaults};
