#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { check } from '../engine.js';
import { object } from '../rules/utils.js';
export function validateStyle(style: unknown): {ok: boolean; errors: string[]} {
 const errors: string[]=[];
 if(!style||typeof style!=='object'||Array.isArray(style)) errors.push('Style must be an object');
 else { const s=object(style); if(typeof s.version!=='number'&&typeof s.version!=='string') errors.push('version must be a number or string'); if(!Array.isArray(s.layers)) errors.push('layers must be an array'); }
 return {ok:errors.length===0,errors};
}
const server=new Server({name:'maptaste',version:'0.0.1'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[
 {name:'check_taste',description:'Check MapLibre style taste heuristics',inputSchema:{type:'object',properties:{style:{type:'object'},styleJson:{type:'string'}},anyOf:[{required:['style']},{required:['styleJson']}],additionalProperties:false}},
 {name:'validate_style',description:'Basic style structure validation (not the full MapLibre schema)',inputSchema:{type:'object',properties:{style:{}},required:['style'],additionalProperties:false}},
 {name:'preview_info',description:'Locate the local MapLibre showcase',inputSchema:{type:'object',properties:{},additionalProperties:false}}
]}));
server.setRequestHandler(CallToolRequestSchema,async(request)=>{
 try {
 const args=request.params.arguments??{}; let result: unknown;
 switch(request.params.name) {
 case 'check_taste': result=check((args.style??JSON.parse(String(args.styleJson)) ) as Record<string,unknown>); break;
 case 'validate_style': result=validateStyle(args.style); break;
 case 'preview_info': result={showcasePath:'showcase/',how:'cd showcase && pnpm install && pnpm dev',note:'Open local Vite MapLibre showcase'}; break;
 default: throw new Error(`Unknown tool: ${request.params.name}`);
 }
 return {content:[{type:'text',text:JSON.stringify(result)}]};
 } catch(e) { return {isError:true,content:[{type:'text',text:e instanceof Error?e.message:String(e)}]}; }
});
await server.connect(new StdioServerTransport());
