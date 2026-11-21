'use strict';

const {normalizeRepo}=require('./engine.cjs');
const {xml}=require('./feed.cjs');
const MAX_WATCHLIST=100;

function list(input,catalog=[]){
 const valid=new Map((Array.isArray(input)?input:[]).map(normalizeRepo).filter(Boolean).map(repo=>[repo.id,repo]));
 for(const entry of catalog)if(valid.has(entry.id)){
  const repo=normalizeRepo(entry);
  if(repo)valid.set(repo.id,repo);
 }
 return [...valid.values()].slice(0,MAX_WATCHLIST);
}

function toggle(previous,repo){
 const target=normalizeRepo(repo);
 if(!target)throw new Error('Repository unavailable.');
 const repos=list(previous);
 if(repos.some(item=>item.id===target.id))return repos.filter(item=>item.id!==target.id);
 if(repos.length>=MAX_WATCHLIST)throw new Error('The watchlist holds up to 100 repositories.');
 return [...repos,target];
}

function exportWatchlist(repos,kind,activity={}){
 const entries=list(repos);
 if(kind==='rss'){
  return '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><head><title>RepoPulse RSS+ watchlist</title></head><body>'+
   entries.map(repo=>'<outline type="rss" text="'+xml(repo.full_name)+'" xmlUrl="https://github.com/'+xml(repo.full_name)+'/releases.atom" htmlUrl="'+xml(repo.html_url)+'"/>').join('')+'</body></opml>\n';
 }
 if(kind==='digest'){
  return '# RepoPulse RSS+ watchlist\n\n'+entries.map(repo=>{
   const metadata=activity[repo.id],release=metadata?.fullName===repo.full_name&&metadata.tag;
   return '- ['+repo.full_name+']('+repo.html_url+') · '+repo.stargazers_count.toLocaleString('en-US')+' stars'+
    (release?' · '+String(release).replace(/[\r\n]/g,' '):'');
  }).join('\n')+'\n';
 }
 throw new Error('Unsupported watchlist export.');
}

module.exports={list,toggle,exportWatchlist};
