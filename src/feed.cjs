'use strict';
const {eligible,normalizeRepo}=require('./engine.cjs');
const xml=value=>Array.from(String(value),char=>{const n=char.codePointAt(0);return n>=0xD800&&n<=0xDFFF||n===0xFFFE||n===0xFFFF?'\uFFFD':char;}).join('').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
function rss(daily,now=new Date()){
 const items=[...new Map((Array.isArray(daily?.repos)?daily.repos:[]).filter(eligible).map(r=>({...normalizeRepo(r),reason:typeof r.reason==='string'?r.reason:''})).map(r=>[r.id,r])).values()].slice(0,4);
 return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>RepoPulse · Daily discoveries</title><link>https://github.com/rvnsre/RepoPulse</link><description>Personalized open-source discoveries from GitHub.</description><lastBuildDate>${xml(now.toUTCString())}</lastBuildDate>${items.map(r=>`<item><title>${xml(r.full_name)}</title><link>https://github.com/${xml(r.full_name)}</link><guid isPermaLink="true">https://github.com/${xml(r.full_name)}</guid><description>${xml(`${r.description}\n\n${r.reason||''}\n\n${r.stargazers_count.toLocaleString('en')} stars · ${r.language||'Open source'}`)}</description></item>`).join('')}</channel></rss>\n`;
}
module.exports={rss,xml};
