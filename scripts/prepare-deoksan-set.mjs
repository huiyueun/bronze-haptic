import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {PLYLoader} from 'three/addons/loaders/PLYLoader.js';
import {Document,NodeIO} from '@gltf-transform/core';
import {EXTMeshoptCompression} from '@gltf-transform/extensions';
import {weld,reorder,simplify} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
const raw=await fs.readFile('assets-original/deoksan-set/source.ply');
const geometry=new PLYLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));geometry.computeVertexNormals();
const {position,normal,color}=geometry.attributes,indices=geometry.index.array;
const parent=Array.from({length:position.count},(_,i)=>i);
function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
for(let j=0;j<indices.length;j+=3){parent[root(indices[j+1])]=root(indices[j]);parent[root(indices[j+2])]=root(indices[j]);}
const groups=new Map();for(let i=0;i<position.count;i++){const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i);}
const components=[...groups.values()].sort((a,b)=>b.length-a.length);
if(components.length!==7)throw new Error('Expected seven connected artifacts');
const specs=[['paljuryeong','팔주령',[0]],['ssangduryeong','쌍두령',[5,6]],['johap-ssangduryeong','조합식쌍두령',[2]],['ganduryeong','간두령',[3,4]]];
await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions([EXTMeshoptCompression]).registerDependencies({'meshopt.encoder':MeshoptEncoder});let total=0;
for(const [id,name,parts] of specs){
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene();let triangles=0;
 for(const [partIndex,component] of parts.entries()){
  const ids=components[component],remap=new Map(ids.map((v,i)=>[v,i])),p=[],n=[],c=[],ix=[];
  // Keep scanned geometry and color. Move the two widely separated finials closer for display only.
  const xs=ids.map(i=>position.getX(i)),shift=id==='ganduryeong'?(Math.min(...xs)+Math.max(...xs))/2-(partIndex===0?-48:48):0;
  for(const i of ids){p.push(position.getX(i)-shift,position.getY(i),position.getZ(i));n.push(normal.getX(i),normal.getY(i),normal.getZ(i));c.push(color.getX(i),color.getY(i),color.getZ(i));}
  for(let j=0;j<indices.length;j+=3)if(remap.has(indices[j]))ix.push(remap.get(indices[j]),remap.get(indices[j+1]),remap.get(indices[j+2]));
  if(ix.some(x=>x===undefined))throw new Error('Face crossed a component');triangles+=ix.length/3;
  const primitive=doc.createPrimitive();for(const [semantic,array] of [['POSITION',p],['NORMAL',n],['COLOR_0',c]])primitive.setAttribute(semantic,doc.createAccessor().setType('VEC3').setArray(new Float32Array(array)).setBuffer(buffer));
  primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(ix)).setBuffer(buffer));scene.addChild(doc.createNode(`${name} ${partIndex+1}`).setMesh(doc.createMesh().addPrimitive(primitive)));
 }
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.25,error:.003,lockBorder:true}),reorder({encoder:MeshoptEncoder}));
 const optimizedTriangles=doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((a,p)=>a+p.getIndices().getCount()/3,0),0);doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
 const out=`docs/assets/${id}`;await fs.mkdir(out,{recursive:true});await io.write(`${out}/model.glb`,doc);
 const report={name,objects:parts.length,originalTriangles:triangles,triangles:optimizedTriangles,sourceFilename:'국보255_전_덕산_청동방울_일괄_전체_서비스_3D모델링.ply',sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),source:'https://digital.khs.go.kr/record/recordDetail3D.do?ichDataUid=13903604992362301744&bizId=BIZ200400001214',identificationSource:'https://digital.khs.go.kr/heri/heriDetail.do?ctptNo=1111102550000&ctptUid=13903520028913000070',provider:'국가유산청',license:'공공누리 제1유형 · 출처표시',color:'원본 PLY RGB 정점 색상 보존 (sRGB → linear). 별도 이미지 텍스처 없음.',changes:'연결된 유물 단위로 분리, 오차 한도 0.003 내 목표 25% 면 경량화, 법선 계산, meshopt 압축. 간두령 한 쌍은 표시 간격만 조정. 가상 문양·텍스처 추가 없음.',bytes:(await fs.stat(`${out}/model.glb`)).size};
 await fs.writeFile(`${out}/provenance.json`,JSON.stringify(report,null,2));total+=triangles;console.log(id,triangles,report.bytes);
}
console.log('Source faces selected:',total);
