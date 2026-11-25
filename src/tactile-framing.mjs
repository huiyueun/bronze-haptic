import * as THREE from 'three';

// Fit the visible geometry in its current orientation, leaving room for point markers.
export function frameTactile(root,camera,width,height){
 camera.aspect=width/height;camera.zoom=1;camera.clearViewOffset();camera.updateProjectionMatrix();camera.updateMatrixWorld(true);root.updateMatrixWorld(true);
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 const point=new THREE.Vector3();
 root.traverse(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}
 });
 if(!Number.isFinite(minX))return;
 const margin=Math.min(28,Math.min(width,height)*.12);
 const zoom=Math.min((2-4*margin/width)/Math.max(maxX-minX,.001),(2-4*margin/height)/Math.max(maxY-minY,.001));
 camera.zoom=zoom;
 camera.setViewOffset(width,height,(minX+maxX)/2*zoom*width/2,-(minY+maxY)/2*zoom*height/2,width,height);
 camera.updateProjectionMatrix();
}
