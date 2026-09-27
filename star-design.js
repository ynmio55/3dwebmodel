import * as THREE from 'three';
export function facetedStar(){
 const positions=[],uv=[];
 const ring=(scale,depth)=>Array.from({length:10},(_,i)=>{const a=i*Math.PI/5,r=(i%2?.46:1)*scale;return new THREE.Vector3(Math.sin(a)*r,Math.cos(a)*r,depth);});
 const edge=ring(1,0);
 const tri=(a,b,c)=>{for(const p of [a,b,c]){positions.push(p.x,p.y,p.z);uv.push(p.x/2+.5,p.y/2+.5);}};
 for(const side of [1,-1]){const inner=ring(.55,.30*side),center=new THREE.Vector3(0,0,.43*side);for(let i=0;i<10;i++){const j=(i+1)%10;const face=(a,b,c)=>side===1?tri(c,b,a):tri(a,b,c);face(center,inner[i],inner[j]);face(inner[i],edge[i],edge[j]);face(inner[i],edge[j],inner[j]);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
export function stoneTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),data=ctx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const wave=Math.sin(x*.018+y*.024+Math.sin(y*.023)*3+Math.sin(x*.049+y*.011));const veins=Math.pow(1-Math.abs(wave),18),cloud=Math.sin(x*.039+y*.017)*Math.sin(y*.051-x*.014);const v=229+cloud*20-veins*100;const k=(y*512+x)*4;data.data[k]=v;data.data[k+1]=v;data.data[k+2]=v;data.data[k+3]=255;}ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function previewStars(renderer,geometry,material,colors){
 const s=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,.1,20);cam.position.z=3.6;s.environment=material.environment;s.add(new THREE.HemisphereLight(0xffffff,0x687482,3));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,4,5);s.add(key);const fill=new THREE.DirectionalLight(0xcbdfff,2);fill.position.set(3,0,2);s.add(fill);const m=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({map:material.map,roughness:.3,metalness:.38,clearcoat:1}));m.rotation.set(-.08,.15,0);s.add(m);const size=renderer.getSize(new THREE.Vector2()),alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new THREE.Color());renderer.setSize(160,160,false);renderer.setClearColor(0x000000,0);const images=colors.map(c=>{m.material.color.set(c);renderer.render(s,cam);return renderer.domElement.toDataURL('image/png');});renderer.setSize(size.x,size.y,false);renderer.setClearColor(color,alpha);m.material.dispose();return images;
}
