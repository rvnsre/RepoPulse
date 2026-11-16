'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('pulse',Object.freeze({
  exportRss:()=>ipcRenderer.invoke('feed:export'),state:()=>ipcRenderer.invoke('state:get'),refresh:force=>ipcRenderer.invoke('catalog:refresh',force),expand:open=>ipcRenderer.invoke('window:expand',open),hide:()=>ipcRenderer.invoke('window:hide'),quit:()=>ipcRenderer.invoke('app:quit'),open:id=>ipcRenderer.invoke('repo:open',id),react:(id,action)=>ipcRenderer.invoke('repo:react',id,action),profile:weights=>ipcRenderer.invoke('profile:set',weights),importProfile:()=>ipcRenderer.invoke('profile:import'),settings:input=>ipcRenderer.invoke('settings:set',input),clear:()=>ipcRenderer.invoke('data:clear'),onState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('state:changed',listener);return()=>ipcRenderer.removeListener('state:changed',listener);}
}));

