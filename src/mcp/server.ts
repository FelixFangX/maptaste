#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { buildPreviewUrl, type PreviewArgs } from '../preview-url.js';
import { check } from '../engine.js';
import { object } from '../rules/utils.js';
import { isTaste, tasteCatalog, tasteNames } from '../tastes.js';
import type { TasteName } from '../types.js';
export function validateStyle(style: unknown): {ok: boolean; errors: string[]} {
 const errors: string[]=[];
 if(!style||typeof style!=='object'||Array.isArray(style)) errors.push('Style must be an object');
 else { const s=object(style); if(typeof s.version!=='number'&&typeof s.version!=='string') errors.push('version must be a number or string'); if(!Array.isArray(s.layers)) errors.push('layers must be an array'); }
 return {ok:errors.length===0,errors};
}
const server=new Server({name:'maptaste',version:'0.0.1'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[
 {name:'list_tastes',description:'List named maptaste schools: tokens, composition caps, and the plate (roads, type, extrusion, camera). Pick one before checking.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'check_taste',description:'Check a MapLibre style document against one named taste. Reads the style only: not features, not a legend, and not a rendered image. Defaults to ink-paper. Unresolved expressions are reported instead of treated as a pass. --pack global aliases ink-paper; --pack cn aliases cn-metro.',inputSchema:{type:'object',properties:{style:{type:'object'},styleJson:{type:'string'},taste:{type:'string',enum:[...tasteNames]},pack:{type:'string',enum:['global','cn']}},anyOf:[{required:['style']},{required:['styleJson']}],additionalProperties:false}},
 {name:'validate_style',description:'Basic style structure validation (not the full MapLibre schema)',inputSchema:{type:'object',properties:{style:{}},required:['style'],additionalProperties:false}},
 {name:'preview_place',description:'Open a hosted place preview; place may be English, Chinese, or other local names (proper nouns). Optional lang (e.g. zh, en, ja) shapes caption language. Optional taste selects a named school.',inputSchema:{type:'object',properties:{place:{type:'string',minLength:1,maxLength:120},ll:{type:'string',description:'lng,lat'},zoom:{type:'number',minimum:0,maximum:24},mode:{enum:['before','after']},theme:{enum:['light','dark']},taste:{type:'string',enum:[...tasteNames]},lang:{type:'string',minLength:2,maxLength:16,description:'BCP 47 language tag for caption language'}},anyOf:[{required:['place']},{required:['ll']}],additionalProperties:false}},
 {name:'preview_info',description:'Locate the local MapLibre showcase',inputSchema:{type:'object',properties:{},additionalProperties:false}}
]}));
server.setRequestHandler(CallToolRequestSchema,async(request)=>{
 try {
 const args=request.params.arguments??{}; let result: unknown;
 switch(request.params.name) {
 case 'list_tastes': result=tasteCatalog(); break;
 case 'check_taste': {
 const taste = typeof args.taste === 'string' && isTaste(args.taste) ? args.taste : undefined;
 const pack = args.pack === 'global' || args.pack === 'cn' ? args.pack : undefined;
 if (args.taste !== undefined && !taste) throw new Error('Unknown taste');
 if (args.pack !== undefined && !pack) throw new Error('Unknown pack');
 result=check((args.style??JSON.parse(String(args.styleJson))) as Record<string,unknown>, { ...(taste ? { taste: taste as TasteName } : {}), ...(pack ? { pack } : {}) });
 break;
 }
 case 'validate_style': result=validateStyle(args.style); break;
 case 'preview_place': result=buildPreviewUrl(args as PreviewArgs); break;
 case 'preview_info': result={showcasePath:'showcase/',how:'cd showcase && pnpm install && pnpm dev',note:'Open local Vite MapLibre showcase'}; break;
 default: throw new Error(`Unknown tool: ${request.params.name}`);
 }
 return {content:[{type:'text',text:JSON.stringify(result)}]};
 } catch(e) { return {isError:true,content:[{type:'text',text:e instanceof Error?e.message:String(e)}]}; }
});
await server.connect(new StdioServerTransport());
