'use strict';
const {eligible}=require('./engine.cjs');
const xml=value=>String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
function rss(daily,now=new Date()){
 const items=(daily?.repos||[]).filter(r=>eligible(r)&&/^[\w.-]+\/[\w.-]+$/.test(r.full_name)).slice(0,3);
 return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>RepoPulse · Daily discoveries</title><link>https://github.com/rvnsre/RepoPulse</link><description>Three personalized open-source discoveries. 70,000+ GitHub stars.</description><lastBuildDate>${xml(now.toUTCString())}</lastBuildDate>${items.map(r=>`<item><title>${xml(r.full_name)}</title><link>https://github.com/${xml(r.full_name)}</link><guid isPermaLink="true">https://github.com/${xml(r.full_name)}</guid><description>${xml(`${r.description}\n\n${r.reason||''}\n\n${r.stargazers_count.toLocaleString('en')} stars · ${r.language||'Open source'}`)}</description></item>`).join('')}</channel></rss>\n`;
}
module.exports={rss,xml};
