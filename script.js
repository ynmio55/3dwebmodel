import * as THREE from 'three';
import { chapterProgress, stageViewport, usesBottomDock } from './layout.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = s => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaults = { material:0, color:'#e9ddd2', frame:0, sticker:0 };
const state = {...defaults};
const choices = {
 material:[['PORCELAIN','#e9ddd2'],['BLUE QUARTZ','#a5b4d0'],['JADE','#8fc0af'],['ROSE MARBLE','#d97b9f'],['AMETHYST','#b69cb6'],['MOONSTONE','#d3d8c3'],['SILVER','#b6bec8'],['RUBY','#bf1745']],
 color:[['RUBY','#bf1745'],['ROSE','#e29ab2'],['GOLD','#c5a063'],['PEARL','#ede4d6'],['LILAC','#b3a1cc'],['JADE','#74a89b'],['SAPPHIRE','#607fad'],['MIDNIGHT','#29263d']],
 frame:[['NO FRAME','♡'],['GOLD LATTICE','◇'],['PEARLS','◌'],['GOLD BORDER','♥'],['HALF LATTICE','◈'],['SILVER LATTICE','♧'],['DOUBLE BORDER','❧'],['CROWN','♕']],
 sticker:[['NONE','○'],['STAR','✦'],['FLOWER','❀'],['DIAMOND','◇'],['BUTTERFLY','⋈'],['MOON','☾'],['SPARKLES','✳'],['LOVE','♡']]
};
let category='material', renderer, scene, camera, heart, heartMesh, frameGroup, stickerGroup;
let targetRotation=0.12, targetTilt=-.08, scrollProgress=0, smoothProgress=0, dragging=false, dragX=0,dragY=0;
let width=innerWidth,height=innerHeight, pendingCapture=false, audioContext, soundOn=false;
let renderFrame=0, disposed=false, sunlight;
let stageLayout={centerX:innerWidth/2,centerY:innerHeight/2,distance:10.4};
const clock = new THREE.Clock();
const modelGroups=[], petals=[], mirrorShards=[];
const marble = new THREE.MeshStandardMaterial({color:0xf0eae2,roughness:.52,metalness:.05});
const gold = new THREE.MeshStandardMaterial({color:0xcfb37a,metalness:.8,roughness:.27});
const silver = new THREE.MeshStandardMaterial({color:0xe5e5e8,metalness:.9,roughness:.2});
const pearl = new THREE.MeshPhysicalMaterial({color:0xfff6e3,roughness:.23,metalness:.15,clearcoat:1});
let heartGeometry, facetGeometry, mirrorGroup, introHeart, cage, letter;
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,x,y,z,sx,sy,sz,material=marble){const m=mesh(new THREE.SphereGeometry(1,16,12),material,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function tube(points,radius,parent,material=gold,closed=false){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),Math.max(16,points.length*4),radius,6,closed),material,parent);}
function heartPoint(t,r=1,z=0){return new THREE.Vector3(16*Math.sin(t)**3/17*r,(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17*r+.13,z);}
function makeHeartGeometry(n=64,rings=22){
 const pos=[],uv=[],indices=[];
 for(let j=0;j<=rings;j++){
  const a=j/rings*Math.PI,r=Math.sin(a),z=.57*Math.cos(a);
  for(let i=0;i<=n;i++){const t=i/n*Math.PI*2,p=heartPoint(t,r,z);pos.push(p.x,p.y,p.z);uv.push(i/n,j/rings);}
 }
 for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function makeMarbleTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#eee3e7';ctx.fillRect(0,0,512,512);
 for(let k=0;k<40;k++){ctx.beginPath();for(let x=0;x<=512;x+=3){const y=k*18+Math.sin(x*.013+k)*42+Math.sin(x*.057+k*3)*7;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=`rgba(101,39,65,${.09+(k%5)*.035})`;ctx.lineWidth=.3+(k%4)*.45;ctx.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
const marbleMap=makeMarbleTexture();
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
function makeMirror(parent){
 const g=new THREE.Group();g.position.set(0,2.7,0);parent.add(g);
 for(const [rx,ry,r] of [[1.12,1.62,.065],[1.22,1.74,.045],[1.01,1.52,.022]]){const p=[];for(let i=0;i<100;i++){const t=i/100*Math.PI*2;p.push(new THREE.Vector3(Math.cos(t)*rx,Math.sin(t)*ry,0));}tube(p,r,g,gold,true);}
 const mirrorMat=new THREE.MeshPhysicalMaterial({color:0xd8c9e0,metalness:.4,roughness:.1,iridescence:1,iridescenceIOR:1.5,side:THREE.DoubleSide});
 const oval=mesh(new THREE.CircleGeometry(1,64),mirrorMat,g,0,0,-.06);oval.scale.set(1.08,1.60,1);
 for(let side of [-1,1])for(let j=0;j<9;j++){const a=-.9+j*.23;leaf(g,side*(.72+Math.sin(a)*.37),1.42+Math.cos(a)*.30,.07,side*(a-.6),.18);leaf(g,side*(.65+Math.sin(a)*.35),-1.52-Math.cos(a)*.18,.07,side*(a+2),.16);}
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;leaf(g,Math.cos(a)*.20,1.93+Math.sin(a)*.20,.05,-a+Math.PI/2,.19);}sphere(g,0,1.93,.1,.11,.11,.08,gold);
 const ornament=mesh(new THREE.TorusKnotGeometry(.21,.026,64,8,2,3),gold,g,0,-1.96,.08);ornament.scale.set(1,.65,.25);
 introHeart=mesh(heartGeometry,new THREE.MeshPhysicalMaterial({color:0xd8bd93,metalness:.65,roughness:.27,clearcoat:1}),g,0,0,.25);introHeart.scale.setScalar(.61);
 return g;
}
function makeSculpture(parent){
 const group=new THREE.Group();group.position.y=.17;parent.add(group);
 // Two intertwined abstract marble figures, with curved feathered wings.
 for(const s of [-1,1]){const figure=new THREE.Group();figure.rotation.z=s*.30;figure.position.set(s*.27,.65,0);group.add(figure);
 sphere(figure,0,.9,0,.23,.58,.22);sphere(figure,0,1.57,0,.19,.24,.19);sphere(figure,.02,.08,0,.15,.63,.16);
 tube([new THREE.Vector3(0,1.25,0),new THREE.Vector3(-s*.5,1.55,.05),new THREE.Vector3(-s*.43,1.88,.02)],.07,figure,marble);
 for(let i=0;i<11;i++){const feather=sphere(figure,s*(.28+i*.055),1.28+i*.14,-.18,.065,.55+i*.026,.045);feather.rotation.z=-s*(.16+i*.025);}
 }
 return group;
}
function makeCage(parent){
 const group=new THREE.Group();parent.add(group);
 mesh(new THREE.CylinderGeometry(.84,.92,.2,48),marble,group,0,.22,0);
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2,x=Math.sin(a)*.77,z=Math.cos(a)*.77;
 mesh(new THREE.CylinderGeometry(.013,.013,1.7,5),gold,group,x,1.15,z);
 const pts=[];for(let j=0;j<=16;j++){const t=j/16*Math.PI/2;pts.push(new THREE.Vector3(Math.sin(a)*.77*Math.cos(t),2+.6*Math.sin(t),Math.cos(a)*.77*Math.cos(t)));}tube(pts,.012,group,gold);
 }
 for(const y of [.36,.61,1.9,2.0]){const ring=mesh(new THREE.TorusGeometry(.79,.025,6,64),gold,group,0,y,0);ring.rotation.x=Math.PI/2;}
 const top=mesh(new THREE.TorusGeometry(.09,.015,8,24),gold,group,0,2.73,0);
 const little=mesh(heartGeometry,new THREE.MeshStandardMaterial({color:0xc24a67,roughness:.4}),group,0,1.2,0);little.scale.setScalar(.27);
 return group;
}
function populateWorld(){
 heartGeometry=makeHeartGeometry();facetGeometry=makeHeartGeometry(22,10).toNonIndexed();facetGeometry.computeVertexNormals();
 for(let i=0;i<5;i++){const group=new THREE.Group();group.position.x=i*22;scene.add(group);modelGroups.push(group);
 column(group,-4.1,-1.7,i===4?4.8:5.3);column(group,4.0,-1.0,i===4?2.7:4.7,true);column(group,-2.8,-6,3.2,true);column(group,3.1,-8,5.0);island(group,i===4?1.8:2.3);
 }
 mirrorGroup=makeMirror(modelGroups[0]);makeSculpture(modelGroups[1]);cage=makeCage(modelGroups[2]);
 letter=new THREE.Group();letter.position.set(0,2.1,0);modelGroups[3].add(letter);
 const paper=new THREE.MeshStandardMaterial({color:0xfff5e5,roughness:.8,side:THREE.DoubleSide});mesh(new THREE.BoxGeometry(1.3,.85,.04),paper,letter);const flap=mesh(new THREE.ConeGeometry(.73,.55,3),paper,letter,0,.13,.07);flap.rotation.set(Math.PI/2,0,Math.PI);const seal=mesh(heartGeometry,new THREE.MeshStandardMaterial({color:0xac2048,roughness:.45}),letter,0,-.04,.14);seal.scale.setScalar(.13);
 heart=new THREE.Group();heart.position.set(0,2.65,0);modelGroups[4].add(heart);
 heartMesh=mesh(heartGeometry,new THREE.MeshPhysicalMaterial({color:state.color,metalness:.05,roughness:.35,clearcoat:.65}),heart);heartMesh.scale.setScalar(1.2);
 frameGroup=new THREE.Group();stickerGroup=new THREE.Group();heart.add(frameGroup,stickerGroup);
 const petalShape=new THREE.Shape();petalShape.moveTo(0,-.09);petalShape.bezierCurveTo(-.14,0,-.09,.15,.02,.12);petalShape.bezierCurveTo(.15,.06,.05,-.06,0,-.09);
 const petalGeo=new THREE.ShapeGeometry(petalShape);const pmat=new THREE.MeshStandardMaterial({color:0xc31042,roughness:.43,metalness:.1,side:THREE.DoubleSide});
 for(let i=0;i<170;i++){const p=mesh(petalGeo,pmat,scene);const baseX=(i*17.73)%108-10,baseZ=-8+(i*7.3)%15;petals.push({mesh:p,x:baseX,y:(i*2.83)%7,z:baseZ,phase:i*2.73,speed:.11+(i%5)*.045});p.scale.setScalar(.5+(i%7)*.12);}
 const shardGeo=new THREE.TetrahedronGeometry(.17,0);for(let i=0;i<65;i++){const shard=mesh(shardGeo,i%3===0?gold:paper,modelGroups[0]);shard.visible=false;mirrorShards.push({mesh:shard,x:Math.sin(i*3.1)*1.1,y:2.7+Math.cos(i*2.3)*1.5,z:Math.sin(i*2)*.4,phase:i});}
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
 const mat=heartMesh.material;mat.color.set(state.color);mat.map=[3,4].includes(state.material)?marbleMap:null;
 mat.metalness=state.material===6?.92:state.material===1?.28:.04;
 mat.roughness=state.material===0?.48:state.material===6?.2:.19;
 mat.clearcoat=state.material===0?.3:1;mat.transmission=state.material===4?.22:0;mat.thickness=.7;
 mat.bumpMap=[3,4].includes(state.material)?marbleMap:null;mat.bumpScale=.035;
 mat.flatShading=state.material===0||state.material===7;heartMesh.geometry=mat.flatShading?facetGeometry:heartGeometry;mat.needsUpdate=true;
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
  const label=document.createElement('span');label.className='choice-label';label.textContent=name.toLowerCase();b.append(span,label);
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
 updateStageLayout();
}
function updateStageLayout(){
 const panel=$('.design-panel').getBoundingClientRect();
 stageLayout=stageViewport({width,height,panel,headingBottom:$('.studio-heading').getBoundingClientRect().bottom,headerBottom:$('header').getBoundingClientRect().bottom,portrait:usesBottomDock(width,height)});
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
 const tabs=[...document.querySelectorAll('[data-category]')];
 tabs.forEach((b,index)=>{
  b.addEventListener('click',()=>{category=b.dataset.category;tabs.forEach(x=>{x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1;});buildChoices();});
  b.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=(index+1)%tabs.length;else if(e.key==='ArrowLeft')target=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=tabs.length-1;else return;e.preventDefault();tabs[target].click();tabs[target].focus();});
 });
 $('#colorPicker').addEventListener('input',e=>{state.color=e.target.value;applyMaterial();$('#selection').textContent='CUSTOM COLOR';$('#choices').querySelectorAll('.choice').forEach(b=>b.setAttribute('aria-pressed','false'));});
 $('#reset').addEventListener('click',()=>{Object.assign(state,defaults);targetRotation=.12;targetTilt=-.08;applyMaterial();updateFrame();updateSticker();buildChoices();});
 $('#frontView').addEventListener('click',()=>{targetRotation=.12;targetTilt=-.08;});
 const canvas=$('#world');let activePointer=null;
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
 $('#nativeShare').addEventListener('click',async()=>{try{await navigator.share({title:'A heart made for you',url:designURL()});}catch(error){if(error.name!=='AbortError')$('#status').textContent='Sharing is unavailable. Copy the link below instead.';}});
 $('#copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(designURL());$('#status').textContent='Your design link is copied.';}catch{const input=$('#linkFallback');input.value=designURL();input.hidden=false;input.focus();input.select();$('#status').textContent='Select and copy this link to share your heart.';}});
 $('#download').addEventListener('click',()=>{pendingCapture=true;$('#download').disabled=true;$('#status').textContent='Preparing your image…';});
 $('#sound').addEventListener('click',async()=>{try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();const gain=audioContext.createGain();gain.gain.value=.009;gain.connect(audioContext.destination);for(const f of [174.61,220,261.63]){const oscillator=audioContext.createOscillator();oscillator.frequency.value=f;oscillator.connect(gain);oscillator.start();}}soundOn=!soundOn;await audioContext[soundOn?'resume':'suspend']();$('#sound').innerHTML=`SOUND ${soundOn?'ON':'OFF'} <span>⌁</span>`;$('#sound').setAttribute('aria-pressed',String(soundOn));}catch{$('#sound').textContent='SOUND UNAVAILABLE';}});
 addEventListener('resize',resize);addEventListener('scroll',readScroll,{passive:true});
 document.fonts?.ready.then(()=>{readScroll();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#errorText').textContent='The 3D connection was interrupted. Reload to continue.';$('#error').hidden=false;cancelAnimationFrame(renderFrame);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(renderFrame);else{clock.getDelta();animate();}});
}
function resize(){width=innerWidth;height=innerHeight;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,width<700?1.4:1.7));renderer.setSize(width,height);readScroll();}
function saveImage(){renderer.render(scene,camera);const source=renderer.domElement;const out=document.createElement('canvas');out.width=source.width;out.height=source.height;const ctx=out.getContext('2d');ctx.drawImage(source,0,0);ctx.fillStyle='#322334';ctx.font=`${Math.round(out.width*.022)}px Georgia`;ctx.textAlign='center';ctx.fillText('A little piece of your heart.',out.width/2,out.height*.92);out.toBlob(blob=>{$('#download').disabled=false;if(!blob){$('#status').textContent='Could not save the image. Please try again.';return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='my-heart-story.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);$('#status').textContent='Your heart image is ready.';},'image/png');}
function animate(){
 if(disposed)return;renderFrame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
 smoothProgress=THREE.MathUtils.damp(smoothProgress,scrollProgress,reduced?30:6,dt);
 const x=smoothProgress*22, studioBlend=clamp((smoothProgress-3.25)/.75,0,1);
 const distance=THREE.MathUtils.lerp(width<700?13.5:10.4,stageLayout.distance,studioBlend);
 camera.position.set(x,3.05,distance);camera.lookAt(x,2.65,0);
 scene.fog.near=distance+1;scene.fog.far=distance+23;
 camera.setViewOffset(width,height,(width/2-stageLayout.centerX)*studioBlend,(height/2-stageLayout.centerY)*studioBlend,width,height);
 sunlight.position.x=x-4;sunlight.target.position.set(x,0,0);
 heart.rotation.y=THREE.MathUtils.damp(heart.rotation.y,targetRotation,9,dt);heart.rotation.x=THREE.MathUtils.damp(heart.rotation.x,targetTilt,9,dt);heart.position.y=2.65+(reduced?0:Math.sin(time*.85)*.065);
 introHeart.rotation.y=reduced?.2:time*.25;letter.rotation.set(.1,Math.sin(time*.5)*.12,-.15);cage.rotation.y=Math.sin(time*.15)*.04;
 const burst=clamp((smoothProgress-.08)/.45,0,1);mirrorGroup.visible=burst<.65;mirrorGroup.scale.setScalar(1-burst*.2);
 for(const s of mirrorShards){s.mesh.visible=burst>.03&&burst<.99;s.mesh.position.set(s.x+Math.sin(s.phase)*burst*3,s.y+Math.cos(s.phase)*burst*2,s.z+burst*4);s.mesh.rotation.set(burst*s.phase,burst*s.phase*.6,burst);}
 for(const p of petals){p.mesh.position.set(p.x+(reduced?0:Math.sin(time*.3+p.phase)*.5),reduced?p.y:((p.y-time*p.speed)%7+7)%7,p.z);p.mesh.rotation.set(p.phase+time*.6,p.phase+time*.4,p.phase+time*.3);}
 for(let i=0;i<modelGroups.length;i++)modelGroups[i].visible=Math.abs(smoothProgress-i)<1.15;
 renderer.render(scene,camera);if(pendingCapture){pendingCapture=false;saveImage();}
}
async function start(){
 try{
 renderer=new THREE.WebGLRenderer({canvas:$('#world'),antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setClearColor(0xf2f0ee);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();scene.background=new THREE.Color(0xf1efed);scene.fog=new THREE.Fog(0xf1efed,12,32);camera=new THREE.PerspectiveCamera(39,width/height,.1,70);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.06).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.8;
 scene.add(new THREE.HemisphereLight(0xffffff,0xd0bfbc,2));const sun=new THREE.DirectionalLight(0xfff4e8,3.2);sunlight=sun;sun.position.set(-4,9,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.bias=-.0004;scene.add(sun);scene.add(sun.target);
 const floor=new Reflector(new THREE.PlaneGeometry(200,90),{color:0xdedbd7,textureWidth:width<700?256:512,textureHeight:width<700?256:512,clipBias:.003});floor.rotation.x=-Math.PI/2;floor.position.set(44,-.07,0);scene.add(floor);
 const haze=mesh(new THREE.PlaneGeometry(200,90),new THREE.MeshStandardMaterial({color:0xf3efeb,transparent:true,opacity:.55,roughness:.2,depthWrite:false}),scene,44,-.055,0);haze.rotation.x=-Math.PI/2;
 populateWorld();restoreDesign();applyMaterial();updateFrame();updateSticker();buildChoices();bindUI();resize();smoothProgress=scrollProgress;animate();$('#loading').classList.add('ready');document.body.dataset.ready='true';
 }catch(error){console.error(error);$('#loading').classList.add('ready');$('#errorText').textContent='3D could not start. Use a current browser with hardware acceleration enabled.';$('#error').hidden=false;}
}
start();
