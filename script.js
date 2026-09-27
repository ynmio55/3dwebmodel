const $ = (selector) => document.querySelector(selector);
const canvas = $('#heartCanvas');
const ctx = canvas.getContext('2d', { alpha: true });
const state = { category: 'material', material: 0, color: 0, frame: 0, sparkle: 0, rotX: -0.13, rotY: 0.24 };
const choices = {
  material: [{ name: 'PORCELAIN', value: '#f8e9e4' }, { name: 'ROSE MARBLE', value: '#d595ad' }, { name: 'VELVET', value: '#aa254d' }, { name: 'GOLD LEAF', value: '#d4a951' }],
  color: [{ name: 'BLUSH', value: '#e8a5aa' }, { name: 'ROSE', value: '#cb315e' }, { name: 'WINE', value: '#81233e' }, { name: 'LILAC', value: '#c6aacd' }, { name: 'SEA GLASS', value: '#8cbeba' }, { name: 'PEARL', value: '#f5e9d9' }, { name: 'MIDNIGHT', value: '#42405e' }, { name: 'GOLD', value: '#d3aa69' }],
  frame: [{ name: 'PURE', icon: '♡' }, { name: 'GOLD THREAD', icon: '♧' }, { name: 'PEARL TRIM', icon: '❀' }, { name: 'GILDED', icon: '✧' }],
  sparkle: [{ name: 'SOFT GLOW', icon: '✧' }, { name: 'STARDUST', icon: '✳' }, { name: 'DIAMOND', icon: '◇' }, { name: 'NO SPARKLE', icon: '○' }]
};
const labels = { material: 'CHOOSE A MATERIAL', color: 'FIND YOUR COLOR', frame: 'ADD A FRAME', sparkle: 'THE FINISHING TOUCH' };
const N = 72;
const rings = [0.001, 0.24, 0.47, 0.68, 0.85, 0.96, 1];
const vertices = [];
const faces = [];
function outline(t) { return [(16 * Math.sin(t) ** 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 17]; }
for (let side = 0; side < 2; side++) {
  for (const r of rings) for (let i = 0; i < N; i++) {
    const [x,y] = outline(i * Math.PI * 2 / N);
    vertices.push([x*r, y*r, (side === 0 ? 1 : -1) * (0.10 + 0.46 * Math.sqrt(Math.max(0, 1-r*r)))]);
  }
  const offset = side * rings.length * N;
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < N; i++) {
    const a = offset + j*N+i, b = offset+j*N+(i+1)%N, c = offset+(j+1)*N+i, d = offset+(j+1)*N+(i+1)%N;
    faces.push([a,c,b], [b,c,d]);
  }
}
const frontEnd = (rings.length-1)*N, backEnd = (rings.length*2-1)*N;
for (let i=0;i<N;i++) { const k=(i+1)%N; faces.push([frontEnd+i,backEnd+i,frontEnd+k],[frontEnd+k,backEnd+i,backEnd+k]); }
function rotate(v) {
  const [x,y,z] = v, cy=Math.cos(state.rotY),sy=Math.sin(state.rotY),cx=Math.cos(state.rotX),sx=Math.sin(state.rotX);
  const xx=x*cy+z*sy, zz=z*cy-x*sy;
  return [xx,y*cx-zz*sx,y*sx+zz*cx];
}
function mix(a,b,t){return a+(b-a)*t;}
function hexRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function shade(hex,light,alpha=1){const c=hexRGB(hex);return `rgba(${c.map(v=>Math.round(Math.max(0,Math.min(255,mix(v,255,Math.max(0,light))*(1+Math.min(0,light)))))).join(',')},${alpha})`;}
let width=0,height=0,dpr=1,frameScheduled=false;
function resize(){const box=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);width=box.width;height=box.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();}
function project(v){const depth=3.9-v[2],s=Math.min(width*.38,height*.39);return [width/2+v[0]*s*3.9/depth,height*.48-v[1]*s*3.9/depth];}
function schedule(){if(!frameScheduled){frameScheduled=true;requestAnimationFrame(()=>{frameScheduled=false;render();});}}
function drawLine(points, color, size, close=false){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));if(close)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineJoin='round';ctx.stroke();}
function render(){
  if(!width)return;
  ctx.clearRect(0,0,width,height);
  const pts=vertices.map(rotate), screen=pts.map(project);
  const shadow=ctx.createRadialGradient(width/2,height*.85,0,width/2,height*.85,width*.33);shadow.addColorStop(0,'#81677447');shadow.addColorStop(1,'#81677400');ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(width/2,height*.85,width*.33,height*.055,0,0,Math.PI*2);ctx.fill();
  const base=state.material===3?'#d8ab5d':state.color===0&&state.material===0?'#f3dada':choices.color[state.color].value;
  const sorted=faces.map(face=>({face,z:(pts[face[0]][2]+pts[face[1]][2]+pts[face[2]][2])/3})).sort((a,b)=>a.z-b.z);
  for(const {face} of sorted){
    const [a,b,c]=face.map(i=>pts[i]), u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0],len=Math.hypot(nx,ny,nz)||1;
    const lit=Math.abs((nx*.42+ny*.63+nz*.78)/len), pos=(a[0]+b[0]+c[0])/3;
    let intensity=(lit-.51)*.75+(pos<-.1?-.07:.03);
    if(state.material===1) intensity+=Math.sin((a[0]*8+a[1]*6+a[2]*4))*Math.sin(a[1]*13+a[0]*4)*.12;
    if(state.material===2) intensity*=.62;
    if(state.material===3) intensity+=Math.sin(pos*9+a[1]*8)*.06;
    const [p,q,r]=face.map(i=>screen[i]);
    ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.lineTo(...r);ctx.closePath();ctx.fillStyle=shade(base,intensity);ctx.fill();
  }
  const contour=Array.from({length:N},(_,i)=>project(rotate(vertices[frontEnd+i])));
  if(state.frame===1||state.frame===3){drawLine(contour,state.frame===1?'#bd995c':'#e8c484',state.frame===1?2.8:5,true);if(state.frame===3)drawLine(contour,'#fff5cfb0',1,true);}
  if(state.frame===2){for(let i=0;i<N;i+=3){const p=contour[i];ctx.beginPath();ctx.arc(p[0],p[1],Math.max(2,width*.005),0,Math.PI*2);ctx.fillStyle='#fff9ef';ctx.fill();ctx.strokeStyle='#c8b6a8';ctx.lineWidth=.7;ctx.stroke();}}
  if(state.sparkle!==3){const count=[4,22,10][state.sparkle];for(let i=0;i<count;i++){const x=Math.sin(i*79.3)*.68,y=Math.cos(i*41.7)*.62,z=.57;const p=project(rotate([x,y,z]));const r=state.sparkle===2?3+i%3:1+i%4;ctx.fillStyle=state.sparkle===2?'#fff8dbb9':'#fff8eda6';ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.fill();if(state.sparkle===2&&i%2===0){drawLine([[p[0]-8,p[1]],[p[0]+8,p[1]]],'#fff8dba1',1);drawLine([[p[0],p[1]-8],[p[0],p[1]+8]],'#fff8dba1',1);}}}
}
function renderOptions(){
  $('#optionsLabel').textContent=labels[state.category];
  $('#selectionName').textContent=choices[state.category][state[state.category]].name;
  const grid=$('#optionGrid');grid.replaceChildren();
  choices[state.category].forEach((item,index)=>{
    const button=document.createElement('button');button.className='option'+(index===state[state.category]?' active':'');button.type='button';button.setAttribute('aria-label',item.name);button.setAttribute('aria-pressed',String(index===state[state.category]));button.title=item.name;
    const preview=document.createElement('span');preview.className=item.icon?'option-icon':'option-preview';if(item.icon)preview.textContent=item.icon;else preview.style.background=`radial-gradient(circle at 30% 23%,#ffffffb0,transparent 45%),${item.value}`;
    button.append(preview);button.addEventListener('click',()=>{state[state.category]=index;renderOptions();schedule();});grid.append(button);
  });
}
document.querySelectorAll('.category').forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.category;document.querySelectorAll('.category').forEach(b=>b.classList.toggle('active',b===button));renderOptions();}));
for(const id of ['begin','storyBegin'])$('#'+id).addEventListener('click',()=>$('#create').scrollIntoView({behavior:'smooth'}));
let dragging=false,lastX=0,lastY=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;state.rotY+=(e.clientX-lastX)*.009;state.rotX=Math.max(-1.1,Math.min(1.1,state.rotX+(e.clientY-lastY)*.007));lastX=e.clientX;lastY=e.clientY;schedule();});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
const dialog=$('#savedDialog');$('#save').addEventListener('click',()=>{dialog.showModal();$('#dialogStatus').textContent='';});$('#closeDialog').addEventListener('click',()=>dialog.close());
function designURL(){const url=new URL(location.href);url.hash='create';url.searchParams.set('design',[state.material,state.color,state.frame,state.sparkle].join('-'));return url.toString();}
$('#share').addEventListener('click',async()=>{const url=designURL();try{if(navigator.share)await navigator.share({title:'My Amore heart',url});else {await navigator.clipboard.writeText(url);$('#dialogStatus').textContent='Design link copied to clipboard.';}}catch(e){if(e.name!=='AbortError')$('#dialogStatus').textContent='Could not share. Try copying the page address.';}});
$('#download').addEventListener('click',()=>{const output=document.createElement('canvas');output.width=1200;output.height=1200;const c=output.getContext('2d');c.fillStyle='#f5f2ef';c.fillRect(0,0,1200,1200);c.drawImage(canvas,0,0,1200,1100);c.fillStyle='#382b3b';c.textAlign='center';c.font='46px Georgia,serif';c.fillText('amore ✳',600,1080);c.font='17px Arial,sans-serif';c.fillText('A LITTLE PIECE OF FOREVER',600,1120);const a=document.createElement('a');a.download='my-amore-heart.png';a.href=output.toDataURL('image/png');a.click();$('#dialogStatus').textContent='Your image is ready.';});
const selected=new URLSearchParams(location.search).get('design');if(selected&&/^\d+-\d+-\d+-\d+$/.test(selected)){selected.split('-').forEach((value,i)=>{const key=['material','color','frame','sparkle'][i];if(+value<choices[key].length)state[key]=+value;});}
const petals=$('.petals');for(let i=0;i<31;i++){const p=document.createElement('span');p.className='petal';p.style.left=((i*73.7)%100)+'%';p.style.top=((i*19)%75)+'%';p.style.setProperty('--duration',(11+i%9)+'s');p.style.setProperty('--delay',(-i*.63)+'s');p.style.setProperty('--sway',(i%2?75:-85)+'px');p.style.scale=String(.55+i%4*.26);petals.append(p);}
renderOptions();window.addEventListener('resize',resize);resize();
