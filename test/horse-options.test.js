import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../assets/js/planning.js',import.meta.url),'utf8');
const loader=code.slice(code.indexOf('let optionsLoaded=false'),code.indexOf("$('horseName').addEventListener('focus',loadHorseOptions)"));
test('liste chevaux : chargement partagé, pages complètes et nouvelle tentative après erreur',async()=>{
 const select={options:[{}],setAttribute(){},removeAttribute(){},append(fragment){this.options.push(...fragment.children);}};
 let calls=0,fail=true;
 const context=vm.createContext({Promise,$:()=>select,status(){},document:{createDocumentFragment:()=>({children:[],append(o){this.children.push(o);}}),createElement:()=>({})},api:async path=>{calls++;if(fail)throw Error('offline');return path.includes('cursor=')?{horses:[{id:2,name:'B'}],nextCursor:null}:{horses:[{id:1,name:'A'}],nextCursor:1};}});
 vm.runInContext(loader,context);
 await context.loadHorseOptions();assert.equal(select.options.length,1);
 fail=false;await Promise.all([context.loadHorseOptions(),context.loadHorseOptions()]);assert.equal(calls,3);assert.equal(select.options.length,3);
 await context.loadHorseOptions();assert.equal(calls,3);assert.equal(select.options[0].textContent,'Choisir un cheval');
});
