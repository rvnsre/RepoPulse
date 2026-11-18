'use strict';
const fs=require('node:fs'),path=require('node:path');

function desktopEntry(executable){
 if(!path.posix.isAbsolute(executable)||/[\r\n\0=]/.test(executable))throw new Error('Invalid autostart executable path.');
 const quoted=executable.replace(/%/g,'%%').replace(/[\\"$\x60]/g,character=>'\\'+character).replace(/\\/g,'\\\\');
 return '[Desktop Entry]\nType=Application\nName=RepoPulse\nExec="'+quoted+'"\nTerminal=false\n';
}
function configureLogin(app,enabled,{platform=process.platform,env=process.env,executable=process.execPath}={}){
 if(platform!=='linux'){app.setLoginItemSettings({openAtLogin:enabled});return;}
 const config=path.isAbsolute(env.XDG_CONFIG_HOME||'')?env.XDG_CONFIG_HOME:path.join(app.getPath('home'),'.config');
 const folder=path.join(config,'autostart'),file=path.join(folder,'repopulse.desktop');
 if(!enabled){fs.rmSync(file,{force:true});return;}
 if(!app.isPackaged)throw new Error('Launch at login requires an installed RepoPulse build.');
 const entry=desktopEntry(env.APPIMAGE||executable);
 fs.mkdirSync(folder,{recursive:true});
 const temp=file+'.tmp';
 try{fs.writeFileSync(temp,entry,{mode:0o600});fs.renameSync(temp,file);}
 finally{fs.rmSync(temp,{force:true});}
}
module.exports={configureLogin,desktopEntry};
