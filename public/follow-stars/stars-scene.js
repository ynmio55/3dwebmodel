import * as T from 'three';

const $=s=>document.querySelector(s), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas=$('#sky'), gate=$('#gate'), button=$('#open');
let renderer,frame=0,opened=false,target=0,progress=0,last=0;
const sections=[...document.querySelectorAll('.chapter')], dots=[...document.querySelectorAll('.progress a')];
const scene=new T.Scene();scene.background=new T.Color('#080d21');scene.fog=new T.FogExp2('#080d21',.019);
const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);
const gold=new T.MeshStandardMaterial({color:'#dbb879',metalness:.82,roughness:.28});
const dark=new T.MeshStandardMaterial({color:'#152137',metalness:.65,roughness:.33});
const glow=new T.MeshBasicMaterial({color:'#ffe6aa'});
function mesh(g,m,parent=scene){const o=new T.Mesh(g,m);parent.add(o);return o;}
function ring(r,t,parent=scene){return mesh(new T.TorusGeometry(r,t,8,100),gold,parent);}
function line(points,parent=scene,color='#d8bb81'){const l=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:.45}));parent.add(l);return l;}
function lightTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.1,'#fff8');g.addColorStop(.4,'#fff2');g.addColorStop(1,'#fff0');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);}
const tex=lightTexture();
function halo(parent,color,size){const s=new T.Sprite(new T.SpriteMaterial({map:tex,color,blending:T.AdditiveBlending,depthWrite:false}));s.scale.setScalar(size);parent.add(s);return s;}
const portal=new T.Group();scene.add(portal);portal.position.z=-9;
for(let i=0;i<4;i++){const r=ring(3.3+i*.16,.035,portal);r.rotation.z=i*.12;}
for(let i=0;i<64;i++){const a=i/64*Math.PI*2;const shard=mesh(new T.OctahedronGeometry(i%8===0?.14:.045),glow,portal);shard.position.set(Math.sin(a)*3.8,Math.cos(a)*3.8,0);}
const doors=[];for(const side of [-1,1]){const pivot=new T.Group();pivot.position.x=side*3.1;portal.add(pivot);const door=mesh(new T.BoxGeometry(3.1,5.8,.14),dark,pivot);door.position.x=-side*1.55;
for(let i=0;i<5;i++){const trim=mesh(new T.BoxGeometry(.022,5.5,.03),gold,pivot);trim.position.set(-side*(.3+i*.6),0,.1);}doors.push({pivot,side});}
// Repeated architectural portals create perspective through a single world.
for(let z=-26;z>=-88;z-=16){const arch=new T.Group();arch.position.set(0,0,z);scene.add(arch);const r=ring(5,.055,arch);r.scale.y=1.25;for(const side of [-1,1]){const col=mesh(new T.CylinderGeometry(.14,.24,7,12),gold,arch);col.position.set(side*5,-3,0);}}
let seed=113;function rand(){seed=seed*16807%2147483647;return(seed-1)/2147483646;}
const positions=[],colors=[];
for(let i=0;i<2300;i++){positions.push((rand()-.5)*90,(rand()-.5)*60,-rand()*140);const c=new T.Color().setHSL(.1+rand()*.55,.25,.65+rand()*.3);colors.push(c.r,c.g,c.b);}
const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));starGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
scene.add(new T.Points(starGeo,new T.PointsMaterial({size:.18,map:tex,transparent:true,vertexColors:true,depthWrite:false,blending:T.AdditiveBlending})));
// A ribbon of dust draws the eye down the forward route.
const ribbon=[];for(let i=0;i<900;i++){const z=-i*.11;const a=i*.021;ribbon.push(Math.sin(a)*2+(rand()-.5)*.6,-2.6+Math.cos(a*.4)*.6+(rand()-.5)*.4,z);}
const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(ribbon,3));scene.add(new T.Points(rg,new T.PointsMaterial({color:'#efc98b',size:.13,map:tex,transparent:true,blending:T.AdditiveBlending,depthWrite:false})));
const pair=new T.Group();pair.position.set(0,0,-34);scene.add(pair);
const suns=[];for(const color of ['#f9cd83','#b7d5ff']){const s=new T.Group();pair.add(s);mesh(new T.IcosahedronGeometry(.38,2),new T.MeshBasicMaterial({color}),s);halo(s,color,3.5);suns.push(s);}
for(let i=0;i<3;i++){const orbit=ring(2.3+i*.18,.018,pair);orbit.rotation.set(.5+i*.65,.4+i*.5,0);}
const constellation=new T.Group();constellation.position.set(0,0,-58);scene.add(constellation);
const cp=[];for(let i=0;i<18;i++){const a=i/18*Math.PI*2;cp.push(new T.Vector3(Math.pow(Math.sin(a),3)*2.5,(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*.16,Math.sin(a*3)*.35));}
line([...cp,cp[0]],constellation);cp.forEach((p,i)=>{const s=mesh(new T.OctahedronGeometry(i%3===0?.1:.06),glow,constellation);s.position.copy(p);const h=halo(constellation,'#e4c393',.75);h.position.copy(p);});
const finale=new T.Group();finale.position.set(0,0,-84);scene.add(finale);
for(let i=0;i<7;i++){const r=ring(3.5+i*.3,.018,finale);r.rotation.set(i*.12,i*.12,i*.24);}
halo(finale,'#8e8fe8',17);halo(finale,'#eac686',9);
const guide=new T.Group();scene.add(guide);mesh(new T.OctahedronGeometry(.13),glow,guide);halo(guide,'#ffd693',1.6);
scene.add(new T.HemisphereLight('#bfd4ff','#13101f',2));const key=new T.PointLight('#ffe0a8',95,50);key.position.set(2,5,0);scene.add(key);const blue=new T.PointLight('#7799ff',100,65);blue.position.set(-4,3,-38);scene.add(blue);
function measure(){let p=0;for(let i=0;i<sections.length-1;i++)if(scrollY>=sections[i].offsetTop)p=i+Math.min(1,(scrollY-sections[i].offsetTop)/(sections[i+1].offsetTop-sections[i].offsetTop));target=p;dots.forEach((a,i)=>a.setAttribute('aria-current',String(i===Math.min(3,Math.round(p)))));}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer?.setSize(innerWidth,innerHeight);measure();}
function draw(now){frame=0;if(document.hidden)return;const dt=Math.min((now-last)/1000||.016,.05);last=now;progress=reduced?target:T.MathUtils.damp(progress,target,5,dt);const t=reduced?0:now*.001;
const travel=progress*25;camera.position.set(Math.sin(progress*Math.PI)*.4,.5,6-travel);camera.lookAt(0,0,-12-travel);
doors.forEach(({pivot,side})=>pivot.rotation.y=side*Math.min(1,progress*3+.12)*1.35);
portal.rotation.z=reduced?0:Math.sin(t*.2)*.025;
suns.forEach((s,i)=>{const a=t*.3+i*Math.PI;s.position.set(Math.cos(a)*1.7,Math.sin(a)*.9,Math.sin(a)*.6);});
pair.rotation.z=.2;constellation.rotation.y=reduced?0:Math.sin(t*.25)*.2;finale.rotation.z=t*.035;
guide.position.set(Math.sin(progress*2.5)*1.6,-1.2, camera.position.z-6);guide.rotation.y=t;key.position.z=camera.position.z-1;
// Keep copy beside the scene on desktop and above it on mobile.
renderer.render(scene,camera);frame=requestAnimationFrame(draw);}
function start(){try{renderer=new T.WebGLRenderer({canvas,antialias:innerWidth>700,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.5:2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;resize();draw(0);}catch(e){console.error(e);document.body.classList.add('no-webgl');}}
let bgmAudio, soundOn = false;
function playBgm(){
 try{
  if(!bgmAudio){
   const sources=['./christmas-music.mp3','../christmas-music.mp3','/christmas-music.mp3','christmas-music.mp3'];
   let idx=0;
   bgmAudio=new Audio(sources[0]);
   bgmAudio.loop=true;
   bgmAudio.volume=0.5;
   bgmAudio.addEventListener('error',()=>{
    idx++;
    if(idx<sources.length){
     bgmAudio.src=sources[idx];
     if(soundOn)bgmAudio.play().catch(()=>{});
    }
   });
  }
  soundOn=true;
  bgmAudio.play().catch(()=>{});
  const btn=$('#sound');
  if(btn){btn.innerHTML=`SOUND ON <span>⌁</span>`;btn.setAttribute('aria-pressed','true');}
 }catch(e){console.error(e);}
}
function toggleBgm(){
 if(!bgmAudio){playBgm();return;}
 if(soundOn){
  bgmAudio.pause();soundOn=false;
  const btn=$('#sound');
  if(btn){btn.innerHTML=`SOUND OFF <span>⌁</span>`;btn.setAttribute('aria-pressed','false');}
 }else{
  playBgm();
 }
}
button.addEventListener('click',()=>{
 opened=true;document.body.classList.remove('closed');$('#journey').inert=false;gate.classList.add('open');scrollTo(0,0);$('.brand').focus();
 playBgm();
});
$('#sound')?.addEventListener('click',toggleBgm);
$('#rsvp').addEventListener('click',()=>$('#dialog').showModal());
addEventListener('resize',resize);addEventListener('scroll',measure,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(renderer&&!frame)frame=requestAnimationFrame(draw);});
start();
