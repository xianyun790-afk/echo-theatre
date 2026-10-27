export const STORAGE_KEY='echo-theatre-demo-v1';
export type Saved={stage:number;role:number;found:string[];notes:string;room:string;started:boolean;events:string[]};
export const initial:Saved={stage:0,role:0,found:[],notes:'',room:'',started:false,events:[]};
export function readSave():Saved{try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!v||!Number.isInteger(v.stage)||v.stage<0||v.stage>2||!Number.isInteger(v.role)||v.role<0||v.role>5||!Array.isArray(v.found)||!v.found.every((x:unknown)=>typeof x==='string')||typeof v.notes!=='string'||typeof v.room!=='string'||typeof v.started!=='boolean'||!Array.isArray(v.events)||!v.events.every((x:unknown)=>typeof x==='string'))return {...initial};return v;}catch{return {...initial};}}
