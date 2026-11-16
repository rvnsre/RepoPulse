'use strict';
const {normalizeRepo}=require('../src/engine.cjs');
module.exports=[
{id:1,full_name:'ollama/ollama',description:'Get up and running with open language models. Build a private AI workspace on your own machine.',stargazers_count:120000,language:'Go',topics:['llm','ai']},
{id:2,full_name:'microsoft/vscode',description:'Code editing. Redefined. An extensible editor for your next idea, from a quick script to a full application.',stargazers_count:170000,language:'TypeScript',topics:['developer-tools','typescript']},
{id:3,full_name:'rust-lang/rust',description:'Empowering everyone to build reliable and efficient software. A language focused on performance and safety.',stargazers_count:100000,language:'Rust',topics:['rust','linux']}
,...Array.from({length:9},(_,i)=>({id:i+10,full_name:'sample-owner'+i+'/sample-project'+i,description:'Sample developer tools for native UI verification only.',stargazers_count:65000+i*100,language:'TypeScript',topics:['developer-tools']}))].map(normalizeRepo);
