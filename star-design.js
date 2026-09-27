import * as THREE from 'three';
export function facetedStar(){
 const positions=[],uv=[],colors=[];
 const ring=(scale,depth)=>Array.from({length:20},(_,i)=>{const k=Math.floor(i/2),f=i%2*.5;const point=j=>{const a=j*Math.PI/5,r=j%2?.64:1;return new THREE.Vector3(Math.sin(a)*r,Math.cos(a)*r,0);};const p=point(k).lerp(point((k+1)%10),f);return p.multiplyScalar(scale).setZ(depth);});
 const edge=ring(1,0);
 let faceIndex=0;
 const tri=(a,b,c)=>{const tint=.88+.12*(Math.sin(++faceIndex*17.31)*.5+.5);for(const p of [a,b,c]){positions.push(p.x,p.y,p.z);uv.push(p.x/2+.5,p.y/2+.5);colors.push(tint,tint,tint);}};
 for(const side of [1,-1]){const bevel=ring(.96,.12*side),inner=ring(.62,.37*side),core=ring(.26,.45*side),center=new THREE.Vector3(0,0,.48*side);const face=(a,b,c)=>side===1?tri(c,b,a):tri(a,b,c);for(let i=0;i<20;i++){const j=(i+1)%20;face(center,core[i],core[j]);for(const [a,b] of [[core,inner],[inner,bevel],[bevel,edge]]){face(a[i],b[i],b[j]);face(a[i],b[j],a[j]);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function crystalTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);};
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){let n=0,amp=.52,f=.013;for(let o=0;o<6;o++){n+=noise(x*f+o*13,y*f+o*7)*amp;f*=2; amp*=.5;}const v=160+n*95,k=(y*512+x)*4;data.data[k]=v;data.data[k+1]=v;data.data[k+2]=v;data.data[k+3]=255;}ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function stoneTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const wave=Math.sin(x*.018+y*.024+Math.sin(y*.023)*3+Math.sin(x*.049+y*.011));const veins=Math.pow(1-Math.abs(wave),18),cloud=Math.sin(x*.039+y*.017)*Math.sin(y*.051-x*.014);const v=229+cloud*20-veins*100;const k=(y*512+x)*4;data.data[k]=v;data.data[k+1]=v;data.data[k+2]=v;data.data[k+3]=255;}ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function previewStars(renderer,geometry,material,colors){
 const s=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,.1,20);cam.position.z=3.6;s.environment=material.environment;s.add(new THREE.HemisphereLight(0xffffff,0x687482,3));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,4,5);s.add(key);const fill=new THREE.DirectionalLight(0xcbdfff,2);fill.position.set(3,0,2);s.add(fill);const m=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({map:material.map,roughness:.25,metalness:.28,clearcoat:1,vertexColors:true}));m.rotation.set(-.08,.15,0);s.add(m);const size=renderer.getSize(new THREE.Vector2()),alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new THREE.Color());renderer.setSize(160,160,false);renderer.setClearColor(0x000000,0);const images=colors.map(c=>{m.material.color.set(c);renderer.render(s,cam);return renderer.domElement.toDataURL('image/png');});renderer.setSize(size.x,size.y,false);renderer.setClearColor(color,alpha);m.material.dispose();return images;
}
