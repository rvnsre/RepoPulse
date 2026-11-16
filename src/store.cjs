'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {defaults, validWeights,normalizeRepo} = require('./engine.cjs');
class Store {
  constructor(file) { this.file=file; this.state=defaults(); this.load(); }
  load() {
    if (!fs.existsSync(this.file)) return;
    try {
      const data=JSON.parse(fs.readFileSync(this.file,'utf8'));
      if(data.version!==1) throw new Error('Unsupported state version');
      this.state={...defaults(),...data,profile:{...data.profile,weights:validWeights(data.profile?.weights)},settings:{...defaults().settings,...data.settings}};
      for(const key of ['saved','cache']) this.state[key]=Array.isArray(data[key])?data[key].map(normalizeRepo).filter(Boolean):[];
      for(const key of ['seen','hidden']) this.state[key]=Array.isArray(data[key])?data[key].filter(Number.isSafeInteger):[];
      if(this.state.daily) this.state.daily={day:String(data.daily.day),repos:Array.isArray(data.daily.repos)?data.daily.repos.map(r=>{const normalized=normalizeRepo(r);return normalized?{...normalized,reason:String(r.reason||'Selected for your daily discovery.').slice(0,200)}:null;}).filter(Boolean):[]};
    } catch (error) {
      // Preserve the original before replacing unreadable data.
      fs.copyFileSync(this.file,`${this.file}.recovery-${Date.now()}`);
      this.state=defaults(); this.state.recoveryNotice='Settings could not be read. A recovery copy was preserved on this device.';
    }
  }
  save() { fs.mkdirSync(path.dirname(this.file),{recursive:true}); const temp=`${this.file}.tmp`; fs.writeFileSync(temp,JSON.stringify(this.state,null,2),{mode:0o600}); fs.renameSync(temp,this.file); }
  update(fn) { fn(this.state);this.save();return this.state; }
}
module.exports={Store};
