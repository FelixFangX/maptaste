import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
const cells = [
 [-122.51,37.70,0],[-122.46,37.70,1],[-122.41,37.70,2],
 [-122.51,37.75,1],[-122.46,37.75,3],[-122.41,37.75,4]
];
function style(dark: boolean, harsh: boolean): StyleSpecification {
 return {version:8,metadata:{'maptaste:themes':['light','dark']},sources:{districts:{type:'geojson',data:{type:'FeatureCollection',features:cells.map(([x,y,value])=>({type:'Feature',properties:{value},geometry:{type:'Polygon',coordinates:[[[x,y],[x+0.047,y],[x+0.047,y+0.047],[x,y+0.047],[x,y]]]}}))}}},layers:[
 {id:'paper',type:'background',paint:{'background-color':dark?'#0b0b0b':'#ddd9d1'}},
 {id:'districts',type:'fill-extrusion',source:'districts',paint:{'fill-extrusion-color':harsh?['match',['get','value'],0,'#ff2020',1,'#ffff00',2,'#00ee30',3,'#0055ff','#ee00ee']:['interpolate',['linear'],['get','value'],0,dark?'#1a2a4a':'#dce6f2',4,dark?'#9eb6d4':'#1a2a4a'],'fill-extrusion-height':['+',['*',['get','value'],120],80],'fill-extrusion-base':0,'fill-extrusion-opacity':0.92}}
 ]};
}
const map=new maplibregl.Map({container:'map',style:style(false,false),center:[-122.437,37.75],zoom:11.2,pitch:55,bearing:-34,dragRotate:true,touchPitch:true,attributionControl:false});
map.addControl(new maplibregl.NavigationControl({showCompass:true}),'top-right');
let dark=false;
let harsh=false;
function updateStyle() {
 const pitch=map.getPitch();
 const bearing=map.getBearing();
 const zoom=map.getZoom();
 const center=map.getCenter();
 map.once('style.load',()=>{map.jumpTo({center,zoom,pitch,bearing});});
 map.setStyle(style(dark,harsh));
}
const button=document.querySelector<HTMLButtonElement>('#theme')!;
button.addEventListener('click',()=>{dark=!dark;document.documentElement.dataset.theme=dark?'dark':'light';button.textContent=dark?'Light':'Dark';button.setAttribute('aria-label',dark?'Light theme':'Dark theme');button.setAttribute('aria-pressed',String(dark));updateStyle();});
map.on('error',()=>{document.querySelector('.map-caption span')!.textContent='Map unavailable — WebGL required';});

const paletteButton=document.querySelector<HTMLButtonElement>('#palette')!;
paletteButton.addEventListener('click',()=>{harsh=!harsh;paletteButton.textContent=harsh?'Harsh':'Taste';paletteButton.setAttribute('aria-pressed',String(harsh));document.querySelector('#palette-caption')!.textContent=harsh?'MT001':'01 — 06';updateStyle();});
