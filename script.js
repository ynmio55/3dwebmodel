import {facetedStar,stoneTexture,crystalTexture,previewStars} from './star-design.js';
import { christmasAudio } from './audio-data.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { chapterProgress, stageViewport, usesBottomDock } from './layout.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = s => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaults = { material:0, color:'#e6cb88', frame:0, sticker:0 };
const state = {...defaults};
const choices = {
 material:[['GOLD','#e6cb88'],['PLATINUM','#c2cede'],['JADE','#8fc0af'],['ROSE MARBLE','#d97b9f'],['AMETHYST','#b69cb6'],['MOONSTONE','#d3d8c3'],['SILVER','#b6bec8'],['RUBY','#bf1745']],
 color:[['RUBY','#bf1745'],['ROSE','#e29ab2'],['GOLD','#c5a063'],['PEARL','#ede4d6'],['LILAC','#b3a1cc'],['JADE','#74a89b'],['SAPPHIRE','#607fad'],['MIDNIGHT','#29263d']],
 frame:[['NO FRAME','☆'],['GOLD LATTICE','◇'],['PEARLS','◌'],['GOLD BORDER','★'],['HALF LATTICE','◈'],['SILVER LATTICE','♧'],['DOUBLE BORDER','❧'],['CROWN','♕']],
 sticker:[['NONE','○'],['STAR','✦'],['FLOWER','❀'],['DIAMOND','◇'],['BUTTERFLY','⋈'],['MOON','☾'],['SPARKLES','✳'],['LOVE','♡']]
};
let category='material', renderer, scene, camera, heart, heartMesh, frameGroup, stickerGroup;
let targetRotation=0.12, targetTilt=-.08, scrollProgress=0, smoothProgress=0, dragging=false, dragX=0,dragY=0;
let width=innerWidth,height=innerHeight, pendingCapture=false, bgmAudio, soundOn=false;
let renderFrame=0, disposed=false, sunlight;
let stageLayout={centerX:innerWidth/2,centerY:innerHeight/2,distance:10.4};
const clock = new THREE.Clock();
const modelGroups=[], petals=[], mirrorShards=[];
const marble = new THREE.MeshStandardMaterial({color:0xf0eae2,roughness:.52,metalness:.05});
const gold = new THREE.MeshStandardMaterial({color:0xcfb37a,metalness:.8,roughness:.27});
const silver = new THREE.MeshStandardMaterial({color:0xe5e5e8,metalness:.9,roughness:.2});
const pearl = new THREE.MeshPhysicalMaterial({color:0xfff6e3,roughness:.23,metalness:.15,clearcoat:1});
let heartGeometry, facetGeometry, mirrorGroup, introHeart, heroIntroGlass, heroIntroTexture, cage, letter;
let heroIntroDismissed=false, heroIntroStartedAt=performance.now();
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,x,y,z,sx,sy,sz,material=marble){const m=mesh(new THREE.SphereGeometry(1,16,12),material,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function tube(points,radius,parent,material=gold,closed=false){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),Math.max(16,points.length*4),radius,6,closed),material,parent);}
function heartPoint(t,r=1,z=0){
 const u=((t/(Math.PI*2)*10)%10+10)%10,i=Math.floor(u),f=u-i;
 const p=k=>{const a=k*Math.PI/5,rad=k%2?.45:1;return new THREE.Vector3(Math.sin(a)*rad,Math.cos(a)*rad,z);};
 return p(i).lerp(p(i+1),f).multiply(new THREE.Vector3(r,r,1));
}
function makeHeartGeometry(){
 const shape=new THREE.Shape();
 for(let i=0;i<10;i++){const p=heartPoint(i*Math.PI/5);i?shape.lineTo(p.x,p.y):shape.moveTo(p.x,p.y);}shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:true,bevelThickness:.15,bevelSize:.08,bevelSegments:2,steps:1});g.center();return g;
}
function makeMarbleTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#eee3e7';ctx.fillRect(0,0,512,512);
 for(let k=0;k<40;k++){ctx.beginPath();for(let x=0;x<=512;x+=3){const y=k*18+Math.sin(x*.013+k)*42+Math.sin(x*.057+k*3)*7;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=`rgba(101,39,65,${.09+(k%5)*.035})`;ctx.lineWidth=.3+(k%4)*.45;ctx.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
const crystalMap=crystalTexture();const marbleMap=stoneTexture();marble.map=marbleMap;marble.color.set(0xe4e8ee);let starPreviews=[];
function column(parent,x,z,h=4,broken=false){
 const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
 mesh(new THREE.BoxGeometry(.97,.12,.97),marble,g,0,.06,0);
 mesh(new THREE.CylinderGeometry(.49,.52,.14,32),marble,g,0,.18,0);
 mesh(new THREE.CylinderGeometry(.39,.46,.16,32),marble,g,0,.30,0);
 const body=mesh(new THREE.CylinderGeometry(.30,.36,h,32,1),marble,g,0,h/2+.35,0);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;const flute=mesh(new THREE.CylinderGeometry(.037,.039,h,7),marble,g,Math.sin(a)*.335,h/2+.35,Math.cos(a)*.335);flute.scale.x=.8;}
 for(let j=1;j<Math.floor(h);j++)mesh(new THREE.CylinderGeometry(.357,.357,.035,32),marble,g,0,j+.35,0);
 if(!broken){mesh(new THREE.CylinderGeometry(.43,.35,.15,32),marble,g,0,h+.4,0);mesh(new THREE.BoxGeometry(.91,.17,.91),marble,g,0,h+.56,0);}else{const cap=mesh(new THREE.DodecahedronGeometry(.37,0),marble,g,0,h+.30,0);cap.scale.y=.4;cap.rotation.z=.2;}
 return body;
}
function island(parent,radius=2){mesh(new THREE.CylinderGeometry(radius,radius*1.07,.14,9),marble,parent,0,.04,0);for(let i=0;i<15;i++){const a=i*2.4,r=radius+.3+(i%3)*.2;const rock=mesh(new THREE.DodecahedronGeometry(.11+(i%4)*.05,0),marble,parent,Math.sin(a)*r,.06,Math.cos(a)*r);rock.scale.y=.55;rock.rotation.set(i,i*.7,i*.4);}}
function leaf(parent,x,y,z,angle,size=.22){const m=sphere(parent,x,y,z,size*.38,size,size*.14,gold);m.rotation.z=angle;return m;}

function makeHeroIntroTexture(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.textAlign='center';ctx.textBaseline='middle';
 const line=(text,y,font,color)=>{ctx.font=font;ctx.fillStyle=color;ctx.fillText(text,canvas.width/2,y);};

 // Keep all copy inside the oval UV area. The star sits in the middle,
 // so the intro reads above and below it like lettering printed behind glass.
 line('THA RAE CHRISTMAS STAR PARADE',470,'700 25px Arial','#9a7736');
 line('In Tha Rae,',535,'46px Georgia','#3b3040');
 line('the Christmas Star Parade',590,'39px Georgia','#3b3040');
 line('celebrates the birth of Jesus.',642,'35px Georgia','#3b3040');
 line('Inspired by the Star of Bethlehem.',1060,'600 25px Arial','#9a7736');

 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;
 return tex;
}
function makeMirror(parent){
 const g=new THREE.Group();g.position.set(0,2.7,0);parent.add(g);
 for(const [rx,ry,r] of [[1.12,1.62,.065],[1.22,1.74,.045],[1.01,1.52,.022]]){const p=[];for(let i=0;i<100;i++){const t=i/100*Math.PI*2;p.push(new THREE.Vector3(Math.cos(t)*rx,Math.sin(t)*ry,0));}tube(p,r,g,gold,true);}
 heroIntroTexture=makeHeroIntroTexture();
 const introMat=new THREE.MeshBasicMaterial({map:heroIntroTexture,transparent:true,opacity:.96,depthWrite:false,depthTest:true,side:THREE.DoubleSide,premultipliedAlpha:true});
 heroIntroGlass=mesh(new THREE.CircleGeometry(1,64),introMat,g,0,0,-.12);heroIntroGlass.scale.set(1.02,1.50,1);heroIntroGlass.castShadow=false;heroIntroGlass.receiveShadow=false;heroIntroGlass.renderOrder=0;
 const mirrorMat=new THREE.MeshPhysicalMaterial({color:0xd8c9e0,metalness:.14,roughness:.18,iridescence:.5,iridescenceIOR:1.3,transparent:true,opacity:.48,transmission:.16,thickness:.28,clearcoat:.72,clearcoatRoughness:.12,side:THREE.DoubleSide,depthWrite:false});
 const oval=mesh(new THREE.CircleGeometry(1,64),mirrorMat,g,0,0,-.06);oval.scale.set(1.08,1.60,1);oval.castShadow=false;oval.receiveShadow=false;oval.renderOrder=1;
 for(let side of [-1,1])for(let j=0;j<9;j++){const a=-.9+j*.23;leaf(g,side*(.72+Math.sin(a)*.37),1.42+Math.cos(a)*.30,.07,side*(a-.6),.18);leaf(g,side*(.65+Math.sin(a)*.35),-1.52-Math.cos(a)*.18,.07,side*(a+2),.16);}
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;leaf(g,Math.cos(a)*.20,1.93+Math.sin(a)*.20,.05,-a+Math.PI/2,.19);}sphere(g,0,1.93,.1,.11,.11,.08,gold);
 const ornament=mesh(new THREE.TorusKnotGeometry(.21,.026,64,8,2,3),gold,g,0,-1.96,.08);ornament.scale.set(1,.65,.25);
 introHeart=mesh(heartGeometry,new THREE.MeshPhysicalMaterial({color:0xe6c97f,metalness:.42,roughness:.18,clearcoat:1,clearcoatRoughness:.08}),g,0,.08,.32);
 introHeart.scale.setScalar(.68);
 introHeart.castShadow=false;
 introHeart.renderOrder=3;
 return g;
}
let sculptureReady;
const storyStars=[];
function floatingStar(parent,x,y,z,color=0xe6b350,size=.45){
 const m=mesh(heartGeometry,new THREE.MeshPhysicalMaterial({color,metalness:.58,roughness:.27,clearcoat:1,emissive:color,emissiveIntensity:.12}),parent,x,y,z);m.scale.setScalar(size);storyStars.push(m);return m;
}
function makeSculpture(parent){
 const group=new THREE.Group();parent.add(group);
 for(let i=0;i<7;i++){const x=(i-3)*.6;mesh(new THREE.CylinderGeometry(.018,.018,1.5+(i%3)*.2,6),gold,group,x,.8,-Math.abs(x)*.3);floatingStar(group,x,1.8+(i%3)*.25,-Math.abs(x)*.3,[0xe7b44c,0x358e98,0xc65373][i%3],.3);}
 return group;
}
function makeCage(parent){
 const group=new THREE.Group();parent.add(group);
 floatingStar(group,0,3.1,0,0xf0bf54,.85);
 const ring=mesh(new THREE.TorusGeometry(1.35,.025,8,70),gold,group,0,3.1,-.2);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;tube([new THREE.Vector3(Math.sin(a)*1.1,3.1+Math.cos(a)*1.1,0),new THREE.Vector3(Math.sin(a)*1.7,3.1+Math.cos(a)*1.7,0)],.012,group,gold);}
 return group;
}
async function loadUserModels(){
 const loader=new GLTFLoader();
 const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
 const storyModels=await Promise.all(['scene-two','scene-three'].map(name=>loader.loadAsync(baseUrl+'models/'+name+'.glb')));
 storyModels.forEach((gltf,i)=>{
  const root=gltf.scene;root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());root.scale.multiplyScalar(Math.min(4.5/size.x,3.5/size.y));root.updateMatrixWorld(true);box.setFromObject(root);const center=box.getCenter(new THREE.Vector3());root.position.set(-center.x,.16-box.min.y,-center.z);
  root.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0});o.castShadow=true;o.receiveShadow=true;}});
  modelGroups[i+1].add(root);floatingStar(modelGroups[i+1],i===0?1.7:0,4.25,0,0xe6cb88,.3);
 });
 const tree=await loader.loadAsync(baseUrl+'models/tree.glb');
 const root=tree.scene;root.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(root);const sz=box.getSize(new THREE.Vector3());root.scale.multiplyScalar(3/Math.max(sz.x,sz.y));root.updateMatrixWorld(true);box.setFromObject(root);const center=box.getCenter(new THREE.Vector3());root.position.set(-center.x,.15-box.min.y,-center.z);
 root.traverse(o=>{if(o.isMesh){
  const geom=o.geometry;
  if(geom?.attributes?.position){
   geom.computeBoundingBox();
   const b=geom.boundingBox;
   const size=b.getSize(new THREE.Vector3());
   const midX=(b.min.x+b.max.x)*.5, midZ=(b.min.z+b.max.z)*.5;
   const trunkRadius=Math.max(size.x,size.z)*.085;
   const trunkTop=b.min.y+size.y*.72;
   const pos=geom.attributes.position;
   const colors=new Float32Array(pos.count*3);
   const leafColor=new THREE.Color(0x4f7a67);
   const trunkColor=new THREE.Color(0x8a6848);
   for(let i=0;i<pos.count;i++){
    const dx=pos.getX(i)-midX,dz=pos.getZ(i)-midZ,y=pos.getY(i);
    const isTrunk=(dx*dx+dz*dz)<trunkRadius*trunkRadius && y<trunkTop;
    const col=isTrunk?trunkColor:leafColor;
    colors[i*3]=col.r;colors[i*3+1]=col.g;colors[i*3+2]=col.b;
   }
   geom.setAttribute('color',new THREE.BufferAttribute(colors,3));
  }
  o.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.02});
  o.castShadow=true;o.receiveShadow=true;
 }}); modelGroups[3].add(root);letter.visible=false;
 floatingStar(modelGroups[3],0,3.45,0,0xd4aa4f,.38);
 for(const star of [introHeart,...storyStars]){star.geometry=heartGeometry;Object.assign(star.material,{map:crystalMap,vertexColors:true,metalness:.32,roughness:.24,clearcoat:1,clearcoatRoughness:.12,transmission:.20,ior:1.46,thickness:.85,flatShading:true,bumpMap:crystalMap,bumpScale:.006,envMapIntensity:1.5});star.material.needsUpdate=true;}
 introHeart.material.color.set(0xe6c97f);
 introHeart.material.metalness=.42;
 introHeart.material.roughness=.18;
 introHeart.material.clearcoat=1;
 introHeart.material.clearcoatRoughness=.07;
 introHeart.material.transmission=0;
 introHeart.material.thickness=0;
 introHeart.material.transparent=false;
 introHeart.material.opacity=1;
 introHeart.material.depthWrite=true;
 introHeart.material.depthTest=true;
 introHeart.material.envMapIntensity=1.8;
 introHeart.material.emissive.set(0x5a3b08);
 introHeart.material.emissiveIntensity=.025;
 introHeart.material.needsUpdate=true;
}
function populateWorld(){
 heartGeometry=facetedStar();facetGeometry=heartGeometry;
 const sceneSpacing=30;
 const sceneOffsets=[0,-3.4,3.6,-3.5,0];
 for(let i=0;i<5;i++){
  const group=new THREE.Group();
  group.position.set(sceneOffsets[i],0,-i*sceneSpacing);
  scene.add(group);modelGroups.push(group);
  // Keep foreground sight-lines open so columns frame the scene instead of blocking it.
  column(group,-6.2,-3.2,i===4?4.8:5.3);
  column(group,6.0,-3.0,i===4?2.7:4.7,true);
  column(group,-5.4,-9.0,3.2,true);
  column(group,5.2,-10.2,5.0);
  island(group,i===4?1.8:2.3);
 }
 mirrorGroup=makeMirror(modelGroups[0]);cage=new THREE.Group();modelGroups[2].add(cage);
 letter=new THREE.Group();letter.position.set(0,2.1,0);modelGroups[3].add(letter);
 const paper=new THREE.MeshStandardMaterial({color:0xfff5e5,roughness:.8,side:THREE.DoubleSide});mesh(new THREE.BoxGeometry(1.3,.85,.04),paper,letter);const flap=mesh(new THREE.ConeGeometry(.73,.55,3),paper,letter,0,.13,.07);flap.rotation.set(Math.PI/2,0,Math.PI);const seal=mesh(heartGeometry,new THREE.MeshStandardMaterial({color:0xac2048,roughness:.45}),letter,0,-.04,.14);seal.scale.setScalar(.13);
 heart=new THREE.Group();heart.position.set(0,2.65,0);modelGroups[4].add(heart);
 heartMesh=mesh(heartGeometry,new THREE.MeshPhysicalMaterial({color:state.color,metalness:.05,roughness:.35,clearcoat:.65}),heart);heartMesh.scale.setScalar(1.2);
 frameGroup=new THREE.Group();stickerGroup=new THREE.Group();heart.add(frameGroup,stickerGroup);
 const petalShape=new THREE.Shape();petalShape.moveTo(0,-.09);petalShape.bezierCurveTo(-.14,0,-.09,.15,.02,.12);petalShape.bezierCurveTo(.15,.06,.05,-.06,0,-.09);
 const petalGeo=new THREE.ShapeGeometry(petalShape);const pmat=new THREE.MeshStandardMaterial({color:0xc79c46,roughness:.43,metalness:.1,side:THREE.DoubleSide});
 for(let i=0;i<170;i++){const p=mesh(petalGeo,pmat,scene);p.castShadow=false;const baseX=-7+(i*7.3)%14,baseZ=8-(i*17.73)%108;petals.push({mesh:p,x:baseX,y:(i*2.83)%7,z:baseZ,phase:i*2.73,speed:.11+(i%5)*.045});p.scale.setScalar(.5+(i%7)*.12);}
 const shardGeo=new THREE.TetrahedronGeometry(.17,0);for(let i=0;i<65;i++){const shard=mesh(shardGeo,i%3===0?gold:paper,modelGroups[0]);shard.visible=false;shard.castShadow=false;mirrorShards.push({mesh:shard,x:Math.sin(i*3.1)*1.1,y:2.7+Math.cos(i*2.3)*1.5,z:Math.sin(i*2)*.4,phase:i});}
}
function clearGroup(group){while(group.children.length){const obj=group.children[0];group.remove(obj);obj.traverse(child=>{if(child.geometry)child.geometry.dispose();if(child.material&&![gold,silver,pearl,marble].includes(child.material)){child.material.map?.dispose();child.material.dispose();}});}}
function batchFrame(){
 const buckets=new Map();frameGroup.updateMatrixWorld(true);
 for(const item of [...frameGroup.children]){item.updateMatrix();const geometry=item.geometry.clone().applyMatrix4(item.matrix);if(!buckets.has(item.material))buckets.set(item.material,[]);buckets.get(item.material).push(geometry);frameGroup.remove(item);item.geometry.dispose();}
 for(const [material,geometries] of buckets){const geometry=mergeGeometries(geometries);if(geometry)mesh(geometry,material,frameGroup);geometries.forEach(g=>g.dispose());}
}
function updateFrame(){
 clearGroup(frameGroup);const type=state.frame;if(!type)return;
 const material=type===5?silver:gold;
 const border=[];for(let i=0;i<120;i++)border.push(heartPoint(i/120*Math.PI*2,1.015,.04).multiplyScalar(1.2));
 if([3,6,7].includes(type))tube(border,.021,frameGroup,material,true);
 if(type===6){tube(border.map(p=>p.clone().multiplyScalar(1.055)),.014,frameGroup,gold,true);}
 if(type===2){for(let i=0;i<68;i++){const p=heartPoint(i/68*Math.PI*2,1.02,.02).multiplyScalar(1.2);sphere(frameGroup,p.x,p.y,p.z,.036,.036,.036,pearl);}}
 if([1,4,5].includes(type)){
  // Geodesic-like ribbons follow the surface on both sides of the heart.
  for(let side of [-1,1])for(let j=2;j<9;j++)for(let i=0;i<20;i++){
   const t=i/20*Math.PI*2, a=j/10*Math.PI/2,b=(j+1)/10*Math.PI/2;
   const p=heartPoint(t,Math.sin(a)*1.015,side*(.57*Math.cos(a)+.012)).multiplyScalar(1.2);
   const q=heartPoint(t+Math.PI/10,Math.sin(b)*1.015,side*(.57*Math.cos(b)+.012)).multiplyScalar(1.2);
   const r=heartPoint(t-Math.PI/10,Math.sin(b)*1.015,side*(.57*Math.cos(b)+.012)).multiplyScalar(1.2);
   if(type===4&&p.x<.1)continue;
   tube([p,q],.008,frameGroup,material);tube([p,r],.008,frameGroup,material);
  }
 }
 if(type===7){for(let i=-2;i<=2;i++){const cone=mesh(new THREE.ConeGeometry(.055,.23+Math.abs(i)*.03,5),gold,frameGroup,i*.13,.83,.1);cone.rotation.z=-i*.15;}}
 batchFrame();
}
function updateSticker(){
 clearGroup(stickerGroup);if(!state.sticker)return;
 const kind=state.sticker;
 if(kind===3){mesh(new THREE.OctahedronGeometry(.11,0),new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:.3,roughness:.06,clearcoat:1}),stickerGroup,.30,.15,.70);return;}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,256);ctx.font='150px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#fff4d7';ctx.shadowBlur=12;ctx.fillStyle='#e2c57d';ctx.fillText(choices.sticker[kind][1],128,132);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false});const sticker=mesh(new THREE.PlaneGeometry(.5,.5),mat,stickerGroup,.27,.19,.72);sticker.userData.texture=tex;
}
function applyMaterial(){
 const mat=heartMesh.material,isMetal=[0,1,6].includes(state.material),isGold=state.material===0;
 mat.color.set(state.color);mat.map=crystalMap;mat.vertexColors=true;
 mat.metalness=isMetal?.32:.12;mat.roughness=.24;mat.clearcoat=1;mat.clearcoatRoughness=.12;
 mat.transmission=isGold?.20:isMetal?.08:.28;mat.ior=1.46;mat.thickness=.85;
 mat.attenuationColor.set(isGold?0xf2d693:state.color);mat.attenuationDistance=2.2;
 mat.emissive.set(isGold?0xc69a42:state.color);mat.emissiveIntensity=isGold?.12:.035;
 mat.bumpMap=crystalMap;mat.bumpScale=.006;mat.envMapIntensity=1.5;
 mat.flatShading=true;heartMesh.geometry=facetGeometry;mat.needsUpdate=true;
}

function buildChoices(){
 const list=$('#choices');
 const previousFocus=list.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;
 list.replaceChildren();list.setAttribute('aria-label',category);
 choices[category].forEach(([name,value],i)=>{
  const b=document.createElement('button');b.type='button';b.className='choice';b.title=name;b.setAttribute('aria-label',name);
  b.setAttribute('aria-pressed',String(category==='color'?state.color===value:state[category]===i));
  const span=document.createElement('span');span.setAttribute('aria-hidden','true');span.className=['material','color'].includes(category)?'swatch':'choice-symbol';
  if(span.className==='swatch')span.style.setProperty('--swatch',value);else span.textContent=value;
  const label=document.createElement('span');label.className='choice-label';label.textContent=name.toLowerCase();if(category==='material'&&starPreviews[i]){const img=document.createElement('img');img.src=starPreviews[i];img.alt='';img.draggable=false;b.append(img,label);}else b.append(span,label);
  b.addEventListener('click',()=>{
   if(category==='material'){state.material=i;state.color=value;applyMaterial();}
   else if(category==='color'){state.color=value;applyMaterial();}
   else if(category==='frame'){state.frame=i;updateFrame();}
   else{state.sticker=i;updateSticker();}
   buildChoices();
  });
  list.append(b);
 });
 $('#selection').textContent=category==='color'?(choices.color.find(c=>c[1]===state.color)?.[0]||'CUSTOM COLOR'):choices[category][state[category]][0];
 $('#customColor').hidden=category!=='color';$('#colorPicker').value=state.color;
 $('#create').classList.toggle('color-mode',category==='color');
 $('#design-options').setAttribute('aria-labelledby','tab-'+category);
 if(previousFocus)[...list.children].find(b=>b.getAttribute('aria-label')===previousFocus)?.focus({preventScroll:true});
 document.querySelectorAll('[data-finish]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.finish)===([0,6,1].includes(state.material)?state.material:2))));
 updateStageLayout();
}
function updateStageLayout(){
 const portrait=width<=700;stageLayout={centerX:width/2,centerY:height*(portrait?.37:.46),distance:Math.max(portrait?8:7.7,2.4*height/(2*Math.tan(39*Math.PI/360)*Math.min(width*(portrait?.60:.29),height*(portrait?.32:.37))))};
}
function readScroll(){
 const sections=[...document.querySelectorAll('.chapter')];
 scrollProgress=chapterProgress(scrollY,sections.map(s=>s.offsetTop));
 $('#progress span').style.width=scrollProgress*25+'%';
 // Keep vertical page scrolling available while horizontal drags turn the heart.
 $('#world').style.touchAction='pan-y pinch-zoom';
 const active=scrollProgress>3.6?'#create':scrollProgress>.4?'#chapter1':'#home';
 document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 updateStageLayout();
}
function restoreDesign(){
 const raw=new URLSearchParams(location.search).get('design');if(!raw)return;
 const parts=raw.split('.');if(parts.length!==4)return;
 const [m,c,f,s]=parts;if(/^\d+$/.test(m)&&+m<8)state.material=+m;if(/^[0-9a-f]{6}$/i.test(c))state.color='#'+c;if(/^\d+$/.test(f)&&+f<8)state.frame=+f;if(/^\d+$/.test(s)&&+s<8)state.sticker=+s;
}
function designURL(){const url=new URL(location.href);url.searchParams.set('design',`${state.material}.${state.color.slice(1)}.${state.frame}.${state.sticker}`);url.hash='create';return url.href;}
function bindUI(){
 document.querySelectorAll('[data-finish]').forEach(b=>b.addEventListener('click',()=>{state.material=Number(b.dataset.finish);state.color=choices.material[state.material][1];category='material';applyMaterial();buildChoices();}));
 const tabs=[...document.querySelectorAll('[data-category]')];
 tabs.forEach((b,index)=>{
  b.addEventListener('click',()=>{category=b.dataset.category;tabs.forEach(x=>{x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1;});buildChoices();});
  b.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=(index+1)%tabs.length;else if(e.key==='ArrowLeft')target=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=tabs.length-1;else return;e.preventDefault();tabs[target].click();tabs[target].focus();});
 });
 $('#colorPicker').addEventListener('input',e=>{state.color=e.target.value;applyMaterial();$('#selection').textContent='CUSTOM COLOR';$('#choices').querySelectorAll('.choice').forEach(b=>b.setAttribute('aria-pressed','false'));});
 $('#reset').addEventListener('click',()=>{Object.assign(state,defaults);targetRotation=.12;targetTilt=-.08;applyMaterial();updateFrame();updateSticker();buildChoices();});
 $('#frontView').addEventListener('click',()=>{targetRotation=.12;targetTilt=-.08;});
 const canvas=$('#world');let activePointer=null;
 canvas.addEventListener('pointerup',e=>{
  if(scrollProgress<.45&&!heroIntroDismissed){heroIntroDismissed=true;}
 },{passive:true});
 let storyDown=null;canvas.addEventListener('pointerdown',e=>{storyDown={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',e=>{if(scrollProgress>=3.8||!storyDown||Math.hypot(e.clientX-storyDown.x,e.clientY-storyDown.y)>12)return;const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(e.clientX/width*2-1,-e.clientY/height*2+1),camera);const hits=ray.intersectObjects([introHeart,...storyStars].filter(m=>{let o=m;while(o){if(!o.visible)return false;o=o.parent;}return true;}));if(hits.length)document.querySelectorAll('.chapter')[Math.min(4,Math.round(scrollProgress)+1)].scrollIntoView({behavior:reduced?'instant':'smooth'});});
 canvas.addEventListener('pointerdown',e=>{if(scrollProgress<3.8||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;activePointer=e.pointerId;dragging=true;dragX=e.clientX;dragY=e.clientY;canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==activePointer)return;targetRotation+=(e.clientX-dragX)*.009;if(e.pointerType!=='touch')targetTilt=clamp(targetTilt+(e.clientY-dragY)*.006,-.7,.7);dragX=e.clientX;dragY=e.clientY;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===activePointer){dragging=false;activePointer=null;}});
 canvas.addEventListener('keydown',e=>{if(scrollProgress<3.8)return;if(e.key==='ArrowLeft')targetRotation-=.15;else if(e.key==='ArrowRight')targetRotation+=.15;else if(e.key==='ArrowUp')targetTilt=clamp(targetTilt-.1,-.7,.7);else if(e.key==='ArrowDown')targetTilt=clamp(targetTilt+.1,-.7,.7);else return;e.preventDefault();});
 $('#finish').addEventListener('click',()=>{
  renderer.render(scene,camera);
  const preview=$('#sharePreview');preview.src=renderer.domElement.toDataURL('image/jpeg',.8);preview.hidden=false;
  $('#shareDialog').showModal();$('#status').textContent='';$('#linkFallback').hidden=true;
  $('#nativeShare').hidden=!navigator.share;
 });
 $('#closeShare').addEventListener('click',()=>$('#shareDialog').close());
 $('#shareDialog').addEventListener('close',()=>$('#finish').focus({preventScroll:true}));
 $('#nativeShare').addEventListener('click',async()=>{try{await navigator.share({title:'Your Tha Rae star',url:designURL()});}catch(error){if(error.name!=='AbortError')$('#status').textContent='Sharing is unavailable. Copy the link below instead.';}});
 $('#copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(designURL());$('#status').textContent='Your design link is copied.';}catch{const input=$('#linkFallback');input.value=designURL();input.hidden=false;input.focus();input.select();$('#status').textContent='Select and copy this link to share your star.';}});
 $('#download').addEventListener('click',()=>{pendingCapture=true;$('#download').disabled=true;$('#status').textContent='Preparing your image…';});
 $('#sound').addEventListener('click',async()=>{
  try{
   if(!bgmAudio){
    const sources=[
     './christmas-music.mp3',
     './public/christmas-music.mp3',
     'christmas-music.mp3',
     'public/christmas-music.mp3',
     christmasAudio
    ];
    let srcIdx=0;
    bgmAudio=new Audio(sources[0]);
    bgmAudio.loop=true;
    bgmAudio.preload='auto';
    bgmAudio.volume=0.5;
    bgmAudio.addEventListener('error',async()=>{
     srcIdx++;
     if(srcIdx<sources.length){
      bgmAudio.src=sources[srcIdx];
      if(soundOn)try{await bgmAudio.play();}catch{}
     }
    });
   }
   if(soundOn){
    bgmAudio.pause();
    soundOn=false;
   }else{
    soundOn=true;
    try{
     await bgmAudio.play();
    }catch(playErr){
     console.warn('Playback waiting on source resolution:',playErr);
    }
   }
   $('#sound').innerHTML=`SOUND ${soundOn?'ON':'OFF'} <span>⌁</span>`;
   $('#sound').setAttribute('aria-pressed',String(soundOn));
  }catch(err){
   console.error(err);
   soundOn=false;
   $('#sound').textContent='SOUND UNAVAILABLE';
   $('#sound').setAttribute('aria-pressed','false');
  }
 });
 addEventListener('resize',resize);addEventListener('scroll',readScroll,{passive:true});
 document.fonts?.ready.then(()=>{readScroll();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#errorText').textContent='The 3D connection was interrupted. Reload to continue.';$('#error').hidden=false;cancelAnimationFrame(renderFrame);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(renderFrame);else{clock.getDelta();animate();}});
}
function resize(){width=innerWidth;height=innerHeight;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,width<700?1.4:1.7));renderer.setSize(width,height);readScroll();}
function saveImage(){renderer.render(scene,camera);const source=renderer.domElement;const out=document.createElement('canvas');out.width=source.width;out.height=source.height;const ctx=out.getContext('2d');ctx.drawImage(source,0,0);ctx.fillStyle='#322334';ctx.font=`${Math.round(out.width*.022)}px Georgia`;ctx.textAlign='center';ctx.fillText('A little piece of your star.',out.width/2,out.height*.92);out.toBlob(blob=>{$('#download').disabled=false;if(!blob){$('#status').textContent='Could not save the image. Please try again.';return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='my-tha-rae-star.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);$('#status').textContent='Your star image is ready.';},'image/png');}
function animate(){
 if(disposed)return;renderFrame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;

 smoothProgress=THREE.MathUtils.damp(smoothProgress,scrollProgress,reduced?30:4.6,dt);

 const sceneSpacing=30;
 const travel=smoothProgress*sceneSpacing;
 const studioBlend=clamp((smoothProgress-3.25)/.75,0,1);
 const storyBlend=THREE.MathUtils.smoothstep(smoothProgress,.18,.72);

 // Wide gallery layout: scenes alternate left/right while the camera uses the
 // opposite lane, so it passes diagonally beside each model instead of through it.
 const sceneX=[0,-3.4,3.6,-3.5,0];
 const cameraLane=[0,2.25,-2.35,2.25,0];

 const samplePath=(values,p)=>{
  const max=values.length-1;
  const i=Math.floor(clamp(p,0,max));
  if(i>=max)return values[max];
  const t=THREE.MathUtils.smootherstep(p-i,0,1);
  return THREE.MathUtils.lerp(values[i],values[i+1],t);
 };

 const storyCamX=samplePath(cameraLane,smoothProgress);
 const focusX=samplePath(sceneX,smoothProgress);

 // Keep HOME exactly centered, then lower the viewpoint into a human-height
 // walk-through path. Return to the original height for the design studio.
 const walkingY=width<700?2.05:1.9;
 const storyY=THREE.MathUtils.lerp(walkingY,3.05,studioBlend);
 const targetX=THREE.MathUtils.lerp(0,storyCamX,storyBlend);
 const targetY=THREE.MathUtils.lerp(3.05,storyY,storyBlend);

 const homeDistance=width<700?13.5:10.4;
 const walkDistance=width<700?12.4:10.8;
 const baseDistance=THREE.MathUtils.lerp(homeDistance,walkDistance,storyBlend);
 const finalDistance=THREE.MathUtils.lerp(baseDistance,stageLayout.distance,studioBlend);
 const targetZ=finalDistance-travel;

 camera.position.x=THREE.MathUtils.damp(camera.position.x,targetX,4.8,dt);
 camera.position.y=THREE.MathUtils.damp(camera.position.y,targetY,4.8,dt);
 camera.position.z=THREE.MathUtils.damp(camera.position.z,targetZ,6.0,dt);

 // Look across the path toward the featured scene. A small forward lead keeps
 // the movement flowing and prevents the camera from staring backwards.
 const lookX=THREE.MathUtils.lerp(0,focusX*.82,storyBlend)*(1-studioBlend);
 const lookY=THREE.MathUtils.lerp(2.65,width<700?2.25:2.3,storyBlend);
 const lookAhead=THREE.MathUtils.lerp(0,2.2,storyBlend)*(1-studioBlend);
 camera.lookAt(lookX,THREE.MathUtils.lerp(lookY,2.65,studioBlend),-travel-lookAhead);

 camera.fov=THREE.MathUtils.damp(camera.fov,39,5,dt);
 camera.updateProjectionMatrix();

 scene.fog.near=finalDistance+2;scene.fog.far=finalDistance+36;
 camera.setViewOffset(width,height,(width/2-stageLayout.centerX)*studioBlend,(height/2-stageLayout.centerY)*studioBlend,width,height);
 sunlight.position.x=-4;sunlight.position.z=6-travel;sunlight.target.position.set(focusX,0,-travel);

 heart.rotation.y=THREE.MathUtils.damp(heart.rotation.y,targetRotation,9,dt);heart.rotation.x=THREE.MathUtils.damp(heart.rotation.x,targetTilt,9,dt);heart.position.y=2.65+(reduced?0:Math.sin(time*.85)*.065);
 storyStars.forEach((m,i)=>{m.rotation.y=reduced?0:Math.sin(time*.5+i)*.25;});introHeart.rotation.y=reduced?.2:Math.sin(time*.5)*.3;letter.rotation.set(.1,Math.sin(time*.5)*.12,-.15);cage.rotation.y=Math.sin(time*.15)*.04;
 if(heroIntroGlass){
  const elapsed=(performance.now()-heroIntroStartedAt)/1000;
  const timeFade=1-THREE.MathUtils.smoothstep(elapsed,4.2,6.2);
  const scrollFade=1-THREE.MathUtils.smoothstep(smoothProgress,.05,.42);
  const targetIntro=heroIntroDismissed?0:Math.min(timeFade,scrollFade);
  heroIntroGlass.material.opacity=THREE.MathUtils.damp(heroIntroGlass.material.opacity,targetIntro*.88,5,dt);
  heroIntroGlass.visible=heroIntroGlass.material.opacity>.015;
 }
 const burst=clamp((smoothProgress-.08)/.45,0,1);mirrorGroup.visible=burst<.65;mirrorGroup.scale.setScalar(1-burst*.2);
 for(const s of mirrorShards){s.mesh.visible=burst>.03&&burst<.99;s.mesh.position.set(s.x+Math.sin(s.phase)*burst*3,s.y+Math.cos(s.phase)*burst*2,s.z+burst*4);s.mesh.rotation.set(burst*s.phase,burst*s.phase*.6,burst);}
 for(const p of petals){p.mesh.visible=studioBlend<.8;p.mesh.position.set(p.x+(reduced?0:Math.sin(time*.3+p.phase)*.5),reduced?p.y:((p.y-time*p.speed)%7+7)%7,p.z);p.mesh.rotation.set(p.phase+time*.6,p.phase+time*.4,p.phase+time*.3);}

 for(let i=0;i<modelGroups.length;i++){
  const delta=Math.abs(smoothProgress-i);
  modelGroups[i].visible=delta<1.7;
  if(modelGroups[i].visible){
   const current=modelGroups[i].scale.x||1;
   modelGroups[i].scale.setScalar(THREE.MathUtils.damp(current,1,4,dt));
  }
 }
 renderer.render(scene,camera);if(pendingCapture){pendingCapture=false;saveImage();}
}

async function start(){
 try{
 renderer=new THREE.WebGLRenderer({canvas:$('#world'),antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setClearColor(0xa5b0bd);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();scene.background=new THREE.Color(0xa5b0bd);scene.fog=new THREE.Fog(0xa5b0bd,12,32);camera=new THREE.PerspectiveCamera(39,width/height,.1,70);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.06).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.8;
 scene.add(new THREE.HemisphereLight(0xffffff,0x8899ad,2));const sun=new THREE.DirectionalLight(0xfff4e8,3.2);sunlight=sun;sun.position.set(-4,9,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.bias=0.0001;sun.shadow.normalBias=0.02;scene.add(sun);scene.add(sun.target);
 const floor=mesh(
  new THREE.PlaneGeometry(200,140),
  new THREE.MeshStandardMaterial({
   color:0xdfe4e9,
   roughness:.78,
   metalness:0,
   transparent:true,
   opacity:.96
  }),
  scene,0,-.12,-44
 );
 floor.rotation.x=-Math.PI/2;floor.castShadow=false;floor.receiveShadow=true;floor.renderOrder=-2;
 const haze=mesh(new THREE.PlaneGeometry(200,140),new THREE.MeshBasicMaterial({color:0xf6f3ef,transparent:true,opacity:.34,depthWrite:false,depthTest:true}),scene,0,-.045,-44);
 haze.rotation.x=-Math.PI/2;haze.castShadow=false;haze.receiveShadow=false;haze.renderOrder=2;
 populateWorld();await loadUserModels();starPreviews=previewStars(renderer,heartGeometry,{map:crystalMap,environment:scene.environment},choices.material.map(c=>c[1]));restoreDesign();applyMaterial();updateFrame();updateSticker();buildChoices();bindUI();resize();smoothProgress=scrollProgress;animate();$('#loading').classList.add('ready');document.body.dataset.ready='true';
 }catch(error){console.error(error);$('#loading').classList.add('ready');$('#errorText').textContent='The 3D scene could not load. Check your connection and try again. Hardware acceleration must be enabled.';$('#error').hidden=false;}
}
start();
