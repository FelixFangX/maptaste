import type { Rule } from '../types.js';
import { layers, object, luminance } from './utils.js';
export const darkMode: Rule = { id:'MT003',severity:'info',packs:['global','cn'],check(style) {
 const meta=object(style.metadata);
 const declared=Object.entries(meta).some(([k,v])=>/dark|theme|styles/i.test(k)&&v!==false&&v!=null&&v!=='');
 const dark=layers(style).some(l=>l.type==='background'&&(luminance(object(l.paint)['background-color'])??1)<0.15);
 return declared||dark?[]:[{id:'MT003',severity:'info',message:'Missing dark-mode consideration; provide a dark background or declare theme variants in metadata.',path:'metadata'}];
} };
