import {build} from 'esbuild';
import React from 'react';
import assert from 'node:assert/strict';
import {create,act} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
await build({entryPoints:['src/App.jsx'],bundle:true,platform:'node',format:'esm',packages:'external',define:{'import.meta.env.VITE_API_MODE':'"demo"'},outfile:'node_modules/.cache/disabled-app.mjs'});
const {default:App}=await import('../node_modules/.cache/disabled-app.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),clear:()=>map.clear()}};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.window={scrollTo(){}};
let requests=0;globalThis.fetch=()=>{requests++;throw Error('No provider request expected')};
for(const route of ['/contact','/oublie','/profil','/parametres','/accueil']) {
 sessionStorage.clear();
 if(route==='/profil'||route==='/parametres')sessionStorage.setItem('chaibo-session',JSON.stringify(route==='/profil'?'client':'admin'));
 let view;await act(()=>{view=create(React.createElement(MemoryRouter,{initialEntries:[route]},React.createElement(App)))});
 assert.equal(view.root.findAllByType('input').filter(x=>x.props.type==='file').length,0);
 assert.equal(view.root.findAllByType('a').filter(x=>/^(mailto:|https:\/\/wa.me\/)/.test(x.props.href??'')).length,0);
 if(route==='/contact'||route==='/oublie')assert.equal(view.root.findAllByType('form').length,0);
 assert.match(JSON.stringify(view.toJSON()),/indisponible/);
 await act(()=>view.unmount());
}
assert.equal(requests,0);
console.log('PASS disabled features: no photo picker, email/WhatsApp links or messaging forms; no network requests.');
