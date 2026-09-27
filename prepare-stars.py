"""Create lightweight, recolorable scene meshes from supplied GLB files."""
import json, struct
from pathlib import Path
import numpy as np

for source, target in [('Stars.glb','star'),('Christmas tree .glb','tree'),('2..glb','scene-two'),('3.glb','scene-three')]:
    raw=(Path('../upload')/source).read_bytes()
    n=struct.unpack_from('<I',raw,12)[0]; doc=json.loads(raw[20:20+n]); binary=raw[28+n:]
    p=doc['meshes'][0]['primitives'][0]
    def read(i):
        a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]; k={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
        return np.frombuffer(binary,dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']],count=a['count']*k,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,k)
    pos=read(p['attributes']['POSITION']);idx=read(p['indices']).reshape(-1,3)
    # Weld nearby vertices, average positions and remove degenerate triangles.
    cell=float(np.ptp(pos,axis=0).max())/180
    keys,inv=np.unique(np.round(pos/cell).astype('i4'),axis=0,return_inverse=True)
    vertices=np.zeros((len(keys),3));np.add.at(vertices,inv,pos)
    vertices/=np.bincount(inv)[:,None]
    faces=inv[idx];faces=faces[(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2])]
    faces=np.unique(faces,axis=0).astype('<u4');vertices=vertices.astype('<f4')
    normals=np.zeros_like(vertices);fn=np.cross(vertices[faces[:,1]]-vertices[faces[:,0]],vertices[faces[:,2]]-vertices[faces[:,0]])
    for i in range(3):np.add.at(normals,faces[:,i],fn)
    normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
    parts=[vertices.tobytes(),normals.tobytes(),faces.tobytes()];views=[];offset=0
    for b in parts:views.append({'buffer':0,'byteOffset':offset,'byteLength':len(b)});offset+=len(b)
    node=next(x.copy() for x in doc['nodes'] if 'mesh' in x);node['mesh']=0
    out={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[node],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2}]}],'buffers':[{'byteLength':offset}],'bufferViews':views,'accessors':[{'bufferView':0,'componentType':5126,'count':len(vertices),'type':'VEC3','min':vertices.min(0).tolist(),'max':vertices.max(0).tolist()},{'bufferView':1,'componentType':5126,'count':len(vertices),'type':'VEC3'},{'bufferView':2,'componentType':5125,'count':faces.size,'type':'SCALAR'}]}
    js=json.dumps(out,separators=(',',':')).encode();js+=b' '*(-len(js)%4);b=b''.join(parts)
    final=struct.pack('<III',0x46546c67,2,28+len(js)+len(b))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(b),0x004e4942)+b
    path=Path('public/models')/(target+'.glb');path.write_bytes(final)
    print(source,len(raw),'->',len(final),'bytes',len(faces),'triangles')
