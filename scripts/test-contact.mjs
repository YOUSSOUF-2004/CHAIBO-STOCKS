import {build} from 'esbuild';import React from 'react';import assert from 'node:assert/strict';import{create,act}from'react-test-renderer';import{MemoryRouter}from'react-router-dom';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.FormData=class{constructor(values){this.values=values;}get(k){return this.values[k]??''}};
let requests=[],fail=true;globalThis.fetch=async(url,options={})=>{if(url==='/api/csrf/')return{ok:true,json:async()=>({csrfToken:'csrf-test'})};requests.push(JSON.parse(options.body));if(fail)throw Error('Network lost');return{ok:true,status:201,json:async()=>({id:'receipt-example',detail:'Votre message a été enregistré.'})};};
await build({entryPoints:['src/pages/Contact.jsx'],bundle:true,platform:'node',format:'esm',packages:'external',define:{'import.meta.env.VITE_PHOTOS_ENABLED':'"1"','import.meta.env.VITE_MESSAGING_ENABLED':'"1"','import.meta.env.VITE_API_MODE':'"api"'},outfile:'node_modules/.cache/contact-test.mjs'});
const{default:Contact}=await import('../node_modules/.cache/contact-test.mjs');let view;await act(()=>{view=create(React.createElement(MemoryRouter,null,React.createElement(Contact)))});
const values={name:'Client',email:'client@example.test',subject:'Une question',message:'Bonjour, je souhaite contacter votre service.',website:''};let reset=0;
async function submit(){await act(async()=>view.root.findByType('form').props.onSubmit({preventDefault(){},currentTarget:{...values,reset(){reset++}}}));}
await submit();assert.equal(view.root.findAllByProps({role:'alert'}).length,1);fail=false;await submit();assert.equal(requests[0].request_id,requests[1].request_id);assert.equal(reset,1);assert.equal(view.root.findAllByType('form').length,0);assert.ok(JSON.stringify(view.toJSON()).includes('receipt-example'));
const whatsapp=view.root.findAllByType('a').find(a=>a.props.href?.startsWith('https://wa.me/'));assert.ok(whatsapp.props.href.startsWith('https://wa.me/23566009695'));assert.equal(whatsapp.props.rel,'noopener noreferrer');await act(()=>view.unmount());
console.log('PASS contact: erreur réseau, nouvelle tentative avec même identifiant, confirmation, formulaire vidé et lien WhatsApp.');
