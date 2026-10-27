import type { Rule } from '../types.js';
import { layers, object } from './utils.js';
export const labelDensity: Rule = { id:'MT004',severity:'warn',packs:['global','cn'],check(style,settings) {
 const labels=layers(style).filter(l=>l.type==='symbol'&&object(l.layout)['text-field']);
 const large=labels.filter(l=>typeof object(l.layout)['text-size']==='number' && Number(object(l.layout)['text-size'])>=24);
 return labels.length>(settings.pack==='cn'?6:8)||large.length>=3?[{id:'MT004',severity:'warn',message:'Excessive label density; prioritize places by zoom and reduce large default text sizes.',path:'layers'}]:[];
} };
