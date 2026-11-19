/* Treasure Venue Suite — feet, Y up. Plan-informed concept, not a surveyed BIM model. */
(() => {
'use strict';
const $ = id => document.getElementById(id), T = window.THREE;
const D = { width:59, depth:76.5, concourse:19.667, height:14.5, corridorHeight:13.5 };
const state = { version:1, venue:'treasure-317-euclid', view:'ballroom', ballroom:'reception', concourse:'combined', mood:'day', rgb:'#ad4dff', brightness:75, cycle:false, chandeliers:false, ceiling:false };
let eventContext=null, workspacePaused=false, furnitureKey="";
const canvas=$('scene'), viewport=$('viewport');
let renderer;
try { renderer = new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true}); }
catch(e){ $('fallback').hidden=false; $('status').textContent='WebGL is unavailable.'; return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
renderer.outputEncoding=T.sRGBEncoding; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(); scene.background=new T.Color('#e9e3d7');
const camera=new T.PerspectiveCamera(48,1,.12,600);
const model=new T.Group();model.name='Treasure — Diamond Room and main concourse';scene.add(model);
const architecture=new T.Group(), roof=new T.Group(), southWalls=new T.Group(), westWalls=new T.Group(), chandeliers=new T.Group(), furniture=new T.Group(), corridorFurniture=new T.Group(), cove=new T.Group();
for(const [name,g] of Object.entries({architecture,roof,southWalls,westWalls,chandeliers,furniture,corridorFurniture,cove})){g.name=name;model.add(g);}
const standard=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.55,...extra});
const M={ivory:standard('#f7f5ed'),trim:standard('#fffdf5',{roughness:.3}),gold:standard('#b99846',{metalness:.78,roughness:.24}),mirror:standard('#c5d4d8',{metalness:.93,roughness:.13}),crystal:standard('#eff7fa',{metalness:.2,roughness:.08}),linen:standard('#fffff3',{roughness:.9}),navy:standard('#182e51'),black:standard('#161719',{roughness:.82}),leaf:standard('#647852'),flower:standard('#f4efdc'),base:standard('#a9a99c'),glass:standard('#82999c',{metalness:.65,roughness:.12}),bulb:standard('#fff3d0',{emissive:'#ffdb9b',emissiveIntensity:2}),rgb:standard('#ffffff',{emissive:state.rgb,emissiveIntensity:0}),screen:standard('#101725',{emissive:'#568dc0',emissiveIntensity:.2}),ramp:standard('#dad7cf')};
function mesh(geo,mat,parent,x=0,y=0,z=0){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,mat,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z);}
function cyl(parent,mat,x,y,z,r,h,r2=r,segments=20){return mesh(new T.CylinderGeometry(r,r2,h,segments),mat,parent,x,y,z);}
function ball(parent,mat,x,y,z,r,s=8){return mesh(new T.SphereGeometry(r,s,6),mat,parent,x,y,z);}
function tube(parent,mat,points,r=.045){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),14,r,5,false),mat,parent);}
function ring(parent,mat,x,y,z,w,d,th=.1,h=.1){box(parent,mat,x,y,z-d/2,w,h,th);box(parent,mat,x,y,z+d/2,w,h,th);box(parent,mat,x-w/2,y,z,th,h,d);box(parent,mat,x+w/2,y,z,th,h,d);}
function trimRing(parent,x,y,z,w,d,scale=1){const layers=[[0,.22,.12],[.17,.19,.19],[.34,.12,.22],[.44,.09,.25],[.59,.08,.16],[.68,.06,.12]];layers.forEach(([off,h,th],i)=>ring(parent,i===3?M.gold:M.trim,x,y+off*scale,z,w-off*2*scale,d-off*2*scale,th*scale,h*scale));}
// Merge each material into one draw call per independently switchable group.
function batch(group){
  group.updateMatrixWorld(true);const bins=new Map(), originals=[], inv=new T.Matrix4().copy(group.matrixWorld).invert();
  group.traverse(o=>{if(!o.isMesh)return;originals.push(o);let b=bins.get(o.material);if(!b){b={chunks:[],vertices:0,indices:0};bins.set(o.material,b);}
    const g=o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));
    const pos=g.getAttribute('position'),norm=g.getAttribute('normal'),uv=g.getAttribute('uv');
    b.chunks.push({p:pos.array,n:norm?.array,u:uv?.array,i:g.index?.array,count:pos.count,offset:b.vertices});b.vertices+=pos.count;b.indices+=g.index?g.index.count:pos.count;g.dispose();
  });
  for(const o of originals)o.geometry.dispose();group.clear();
  for(const [mat,b]of bins){const p=new Float32Array(b.vertices*3),n=new Float32Array(b.vertices*3),u=new Float32Array(b.vertices*2),ix=new Uint32Array(b.indices);let at=0;
    for(const c of b.chunks){p.set(c.p,c.offset*3);if(c.n)n.set(c.n,c.offset*3);if(c.u)u.set(c.u,c.offset*2);if(c.i){for(let j=0;j<c.i.length;j++)ix[at++]=c.i[j]+c.offset;}else{for(let j=0;j<c.count;j++)ix[at++]=j+c.offset;}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(n,3));g.setAttribute('uv',new T.BufferAttribute(u,2));g.setIndex(new T.BufferAttribute(ix,1));g.computeBoundingSphere();const o=mesh(g,mat,group);o.name=group.name+' detail';
  }
}
function clearGroup(group){for(const m of group.userData.ownedMaterials||[])m.dispose();group.userData.ownedMaterials=[];group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});group.clear();}
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return((n^n>>>14)>>>0)/4294967296;};}

// Shared textiles and soft contact shadows give each arrangement the same material language.
const weave=document.createElement('canvas');weave.width=weave.height=128;
const wctx=weave.getContext('2d');wctx.fillStyle='#c5ac70';wctx.fillRect(0,0,128,128);
for(let y=0;y<128;y+=3)for(let x=0;x<128;x+=3){wctx.fillStyle=(x+y)%2?'#dcc692':'#ad9152';wctx.fillRect(x,y,1,1);}
const weaveMap=new T.CanvasTexture(weave);weaveMap.wrapS=weaveMap.wrapT=T.RepeatWrapping;weaveMap.repeat.set(3,8);weaveMap.encoding=T.sRGBEncoding;
M.runner=standard('#dfc991',{map:weaveMap,roughness:.57,metalness:.24});
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const sg=sc.createRadialGradient(64,64,6,64,64,63);sg.addColorStop(0,'rgba(35,28,20,.30)');sg.addColorStop(.5,'rgba(35,28,20,.17)');sg.addColorStop(1,'rgba(35,28,20,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);
M.softShadow=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
function contactShadow(parent,x,z,w,d){const o=mesh(new T.PlaneGeometry(w*2,d*2),M.softShadow,parent,x,.052,z);o.rotation.x=-Math.PI/2;o.castShadow=false;}
function drapedCloth(parent,x,z,r,h){const geo=new T.CylinderGeometry(r,r*.97,h,96,14,true);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),f=Math.max(0,Math.min(1,(h/2-p.getY(i))/h));const rr=r+(Math.sin(a*32)*.075+Math.cos(a*19)*.032)*Math.pow(f,.65);p.setX(i,Math.cos(a)*rr);p.setZ(i,Math.sin(a)*rr);p.setY(i,p.getY(i)+Math.cos(a*16)*.032*f);}geo.computeVertexNormals();mesh(geo,M.linen,parent,x,h/2+.035,z);}
function sweetheart(parent){
box(parent,M.ivory,29.5,.35,4.4,20,.7,6.5);box(parent,M.gold,29.5,.72,7.55,20,.05,.08);
for(let i=0;i<66;i++){const x=20.6+i*.27;cyl(parent,M.linen,x,5.9,1.15+Math.sin(i*.5)*.1,.19,10.5,.19,10);}
for(const x of [20.1,38.9]){cyl(parent,M.gold,x,6,1.3,.08,11);box(parent,M.runner,x,6.4,1.6,.8,10.8,.15);}
tube(parent,M.runner,[[20.1,11.4,1.5],[24,9.8,1.7],[29.5,11,1.6],[35,9.8,1.7],[38.9,11.4,1.5]],.16);
box(parent,M.linen,29.5,1.98,5,9,2.5,2.8);box(parent,M.runner,29.5,3.25,5,9.08,.04,2.85);
for(const x of [23,36]){cyl(parent,M.gold,x,2.15,5,.06,2.9,.08);flowers(parent,x,4.8,5,.75);}
for(const x of [26.5,28,31,32.5]){cyl(parent,M.crystal,x,3.6,5,.13,.66,.13,12);cyl(parent,M.linen,x,3.66,5,.07,.56,.07,10);ball(parent,M.bulb,x,3.98,5,.042,8);}
for(const dx of [-1.5,1.5])chair(parent,29.5+dx,3.2,0);
}

function marbleTexture(bold){const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d'),rand=rng(bold?13218:8991);ctx.fillStyle=bold?'#eeeae0':'#f3f2ed';ctx.fillRect(0,0,1024,1024);
 // Each tile has independently varied mineral veins; the grout stays thin and pale.
 const nx=4,nz=4,s=256;
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){ctx.save();ctx.beginPath();ctx.rect(ix*s,iz*s,s,s);ctx.clip();ctx.translate(ix*s,iz*s);ctx.fillStyle=`rgba(255,255,255,${.03+rand()*.12})`;ctx.fillRect(0,0,s,s);
  for(let j=0;j<(bold?7:5);j++){let x=-180+rand()*400,y=-80;const points=[[x,y]];while(y<340){y+=18+rand()*36;x+=8+rand()*40;points.push([x,y]);}const path=()=>{ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));};path();ctx.strokeStyle=bold?'rgba(152,127,96,.16)':'rgba(151,157,156,.10)';ctx.lineWidth=bold?10+rand()*15:4+rand()*8;ctx.stroke();path();ctx.strokeStyle=bold?(j%3===0?'rgba(95,93,85,.55)':'rgba(158,139,109,.53)'):'rgba(143,147,145,.19)';ctx.lineWidth=bold?1.5+rand()*3.7:.5+rand()*1.4;ctx.stroke();if(bold){path();ctx.strokeStyle='rgba(244,241,225,.8)';ctx.lineWidth=.8;ctx.stroke();}
  }ctx.restore();ctx.strokeStyle=bold?'rgba(102,101,91,.42)':'rgba(146,149,141,.25)';ctx.lineWidth=1;ctx.strokeRect(ix*s,iz*s,s,s);}
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return tex;}
const hallMap=marbleTexture(false),corridorMap=marbleTexture(true);
hallMap.repeat.set(D.width/12,D.depth/12);corridorMap.repeat.set(D.concourse/12,D.depth/12);
const hallFloor=standard('#ffffff',{map:hallMap,metalness:.18,roughness:.22});const concourseFloor=standard('#ffffff',{map:corridorMap,metalness:.13,roughness:.23});
const floors=new T.Group();floors.name='Distinct marble floors';model.add(floors);
function floor(mat,x,z,w,d){const o=mesh(new T.PlaneGeometry(w,d),mat,floors,x,.025,z);o.rotation.x=-Math.PI/2;return o;}
floor(hallFloor,D.width/2,D.depth/2,D.width,D.depth);floor(concourseFloor,-D.concourse/2,D.depth/2,D.concourse,D.depth);
box(architecture,M.base,19.5,-.5,38.25,79,1,77.2);
// Perimeter and the two door openings between the two spaces, based on A1.5.
box(architecture,M.ivory,19.67,7.25,-.3,79.6,14.5,.6);
box(architecture,M.ivory,59.3,7.25,38.25,.6,14.5,76.5);
box(southWalls,M.ivory,29.5,7.25,76.8,59,14.5,.6);
box(westWalls,M.ivory,-19.97,6.75,38.25,.6,13.5,76.5);
const openings=[[38.5,6],[70,6]];let from=0;
for(const [z,w] of openings){const to=z-w/2;box(architecture,M.ivory,0,7.25,(from+to)/2,.65,14.5,to-from);box(architecture,M.ivory,0,12,(z),.65,5,w);from=z+w/2;}
box(architecture,M.ivory,0,7.25,(from+76.5)/2,.65,14.5,76.5-from);
// Layered door casings and pediments, shown on both sides of the partition.
for(const [z,w] of openings)for(const x of [-.43,.43]){for(const side of [-1,1]){box(architecture,M.trim,x,4.7,z+side*(w/2+.18),.22,9.4,.28);box(architecture,M.trim,x,4.7,z+side*(w/2+.36),.14,9.4,.14);}for(let k=0;k<4;k++)box(architecture,k===1?M.gold:M.trim,x,9.5+k*.15,z,.35+k*.07,.12,w+.9+k*.15);}
// Baseboards and cornices remain visible in cutaway views.
ring(architecture,M.trim,29.5,.38,38.25,58.4,75.9,.12,.65);
trimRing(roof,29.5,13.45,38.25,58.5,76,1);
trimRing(roof,-9.83,12.5,38.25,19,76,.9);
// Nine coffered bays, deep beams, stepped crown profiles and thin gold pinstripes.
for(let ix=0;ix<3;ix++)for(let iz=0;iz<3;iz++){const x=(ix+.5)*59/3,z=(iz+.5)*25.5;
box(roof,M.ivory,x,14.9,z,59/3, .8,25.5);trimRing(roof,x,13.45,z,18.0,23.8,1);ring(roof,M.trim,x,14.43,z,13.6,19.4,.17,.12);ring(roof,M.gold,x,14.49,z,13.15,18.95,.045,.035);
ring(cove,M.rgb,x,14.03,z,16.50,22.30,.10,.06);
for(const dx of [-6.7,6.7])for(const dz of [-9.4,9.4])cyl(roof,M.bulb,x+dx,14.31,z+dz,.16,.04,.16,10);
}
for(const x of [19.667,39.333])box(roof,M.trim,x,13.85,38.25,1.4,1.5,76.5);
for(const z of [25.5,51])box(roof,M.trim,29.5,13.85,z,59,1.5,1.35);
// Concourse ceiling recesses, crown lighting and chandeliers.
box(roof,M.ivory,-9.83,13.95,38.25,19.67,.9,76.5);
for(const z of [13,38.5,64]){trimRing(roof,-9.83,12.7,z,8,9,.8);ring(cove,M.rgb,-9.83,13.25,z,7.35,8.35,.09,.05);}
ring(cove,M.rgb,-9.83,13.05,38.25,18.2,74.6,.10,.05);
// Four structural columns: mirrored panels with capitals, plinths and gilded edges.
for(const x of [19.667,39.333])for(const z of [25.5,51]){
box(architecture,M.ivory,x,6.75,z,1.75,13.5,1.75);
for(const y of [.16,.4,.7,12.95,13.2,13.43]){const w=y<1?2.3-(y*.5):2.2+(y-13)*.5;box(architecture,M.trim,x,y,z,w,.18,w);}
for(const dir of [-1,1]){box(architecture,M.mirror,x,6.8,z+dir*.889,1.1,11.7,.025);box(architecture,M.mirror,x+dir*.889,6.8,z,.025,11.7,1.1);for(const e of [-.64,.64]){box(architecture,M.gold,x+e,6.8,z+dir*.91,.045,11.9,.035);box(architecture,M.gold,x+dir*.91,6.8,z+e,.035,11.9,.045);}}
}
// Stair 3 enclosure occupies the southeast corner; it is not an event surface.
box(architecture,M.ivory,56.35,5.5,63.75,5.3,11,25.5);box(architecture,M.trim,53.65,5.5,63.75,.16,11,25.5);
// Reserved north ramp strip on the concourse side of the partition.
const ramp=box(architecture,M.ramp,-2.65,.34,15,4.2,.22,25);ramp.rotation.x=-.023;
for(const x of [-4.8,-.6]){tube(architecture,M.gold,[[x,3,2.5],[x,3.55,27.5]],.04);for(const z of [3,11,19,27])cyl(architecture,M.gold,x,1.65,z,.045,3.3);}
function crystal(parent,x,y,z,s=.12){const o=mesh(new T.OctahedronGeometry(s,0),M.crystal,parent,x,y,z);o.scale.y=1.7;}
function chandelier(x,z,h,scale=1){const g=new T.Group();g.position.set(x,h,z);g.scale.setScalar(scale);chandeliers.add(g);
cyl(g,M.gold,0,-.28,0,.038,.56);cyl(g,M.gold,0,-.58,0,.24,.12);cyl(g,M.gold,0,-1.5,0,.09,1.9);ball(g,M.crystal,0,-1.25,0,.24);ball(g,M.gold,0,-2.38,0,.22);
for(const [n,r,y] of [[10,1.8,-2.15],[7,1.14,-1.25]])for(let i=0;i<n;i++){const a=i/n*Math.PI*2,ux=Math.cos(a),uz=Math.sin(a);tube(g,M.gold,[[0,y-.35,0],[ux*r*.45,y-.67,uz*r*.45],[ux*r*.94,y-.44,uz*r*.94],[ux*r,y+.17,uz*r]],.045);cyl(g,M.gold,ux*r,y+.13,uz*r,.22,.06);cyl(g,M.linen,ux*r,y+.32,uz*r,.062,.36,.06,8);ball(g,M.bulb,ux*r,y+.56,uz*r,.092);for(let k=0;k<5;k++){const b=a+(k/4)*(Math.PI*2/n),sag=Math.sin(k/4*Math.PI)*.32;crystal(g,Math.cos(b)*r,y-.2-sag,Math.sin(b)*r,.095);}crystal(g,ux*r,y-.52,uz*r,.14);}
for(let i=0;i<9;i++){const a=i/9*Math.PI*2;for(let k=0;k<7;k++){const f=k/6;crystal(g,Math.cos(a)*(.3+.65*Math.sin(f*Math.PI)), -.7-f*2.3,Math.sin(a)*(.3+.65*Math.sin(f*Math.PI)),.075);}}
for(let n=0;n<18;n++){const a=n/18*Math.PI*2;for(let k=0;k<9;k++){const f=k/8,r=1.6*(1-f)*.65+.13;crystal(g,Math.cos(a)*r,-2.05-f*.9,Math.sin(a)*r,.055);}}crystal(g,0,-3.1,0,.25);cyl(g,M.trim,0,.035,0,.5,.07,.5,24);
}
for(let ix=0;ix<3;ix++)for(let iz=0;iz<3;iz++)chandelier((ix+.5)*59/3,(iz+.5)*25.5,14.3,1.18);
for(const z of [13,38.5,64])chandelier(-9.83,z,13.6,.87);
function chair(parent,x,z,a){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=a+Math.PI;parent.add(g);
for(const dx of [-.47,.47])for(const dz of [-.42,.42])tube(g,M.gold,[[dx*1.05,.04,dz*1.07],[dx*.9,.55,dz],[dx,1.42,dz]],.043);
const seat=cyl(g,M.linen,0,1.48,0,.68,.17,.69,28);seat.scale.z=1.03;
const edge=mesh(new T.TorusGeometry(.68,.028,6,32),M.gold,g,0,1.37,0);edge.rotation.x=Math.PI/2;
const back=mesh(new T.TorusGeometry(.52,.036,8,40),M.gold,g,0,2.54,-.56);back.scale.y=1.23;
for(const side of [-1,1]){tube(g,M.gold,[[side*.47,1.4,-.43],[side*.44,1.9,-.58],[side*.31,2.2,-.56]],.035);tube(g,M.gold,[[0,2.03,-.56],[side*.24,2.25,-.56],[side*.29,2.54,-.56],[side*.10,2.69,-.56],[0,2.56,-.56]],.021);tube(g,M.gold,[[0,3.11,-.56],[side*.25,2.89,-.56],[side*.24,2.72,-.56],[0,2.66,-.56]],.018);}
const crest=mesh(new T.TorusGeometry(.10,.024,5,16),M.gold,g,0,2.55,-.56);crest.scale.y=1.35;
}
function flowers(parent,x,y,z,r=.7){
cyl(parent,M.gold,x,y-.57,z,.045,1.14,.08,10);cyl(parent,M.gold,x,y-1.13,z,.29,.08,.29,18);ball(parent,M.crystal,x,y-.43,z,.15,12);
for(let i=0;i<28;i++){const a=i*2.399,rr=Math.sqrt((i+.5)/28)*r,xx=x+Math.cos(a)*rr,zz=z+Math.sin(a)*rr,yy=y+Math.sqrt(Math.max(0,1-rr*rr/(r*r)))*r*.44;
 const leaf=ball(parent,M.leaf,xx,yy-.10,zz,.115,6);leaf.scale.set(1.4,.35,.6);
 for(let j=0;j<6;j++){const b=j*Math.PI/3,petal=ball(parent,M.flower,xx+Math.cos(b)*.067,yy,zz+Math.sin(b)*.067,.085,8);petal.scale.y=.6;}ball(parent,M.flower,xx,yy+.035,zz,.048,8);
}
for(const a of [0,Math.PI]){tube(parent,M.gold,[[x,y-.9,z],[x+Math.cos(a)*r*.7,y-.72,z],[x+Math.cos(a)*r*.7,y-.28,z]],.025);cyl(parent,M.linen,x+Math.cos(a)*r*.7,y-.15,z,.035,.28,.035,8);ball(parent,M.bulb,x+Math.cos(a)*r*.7,y+.005,z,.034,8);}
}

function applyPalette(p){if(!M.napkin)M.napkin=standard('#e9dec5');M.napkin.color.set(p.napkin||'#e9dec5');M.linen.color.set(p.cloth||'#fffff3');M.runner.color.set(p.runnerColor||'#ffffff');M.flower.color.set(p.flower1||'#f4efdc');}
function buildEventFurniture(){
  const p=eventContext, dx=(D.width-p.room.w)/2, dz=(D.depth-p.room.h)/2;
  for(const item of p.items.slice(0,180)){
    if(!Number.isFinite(item.x)||!Number.isFinite(item.y))continue;
    const g=new T.Group();g.position.set(item.x+dx,0,item.y+dz);g.rotation.y=-(item.rot||0)*Math.PI/180;furniture.add(g);
    if(item.kind==='table'){
      const def=p.tableTypes[item.type];if(!def)continue;
      const look=p.looks.find(l=>l.id===item.lookId)||p.looks[0]||{};
      // Clone per table so independent event looks keep their palette after batching.
      const originals={linen:M.linen,runner:M.runner,flower:M.flower,napkin:M.napkin};
      M.linen=M.linen.clone();M.runner=M.runner.clone();M.flower=M.flower.clone();M.napkin=M.napkin.clone();applyPalette(look);
      if(item.type==='cocktail')cocktail(g,0,0);
      else if(def.shape==='round'){const size=item.d||def.d||6;roundTable(g,0,0,Math.min(16,Math.max(0,item.seats??def.seats)));g.scale.set(size/6,1,size/6);}
      else{const w=item.w||def.w,h=item.h||def.h;box(g,M.linen,0,1.4,0,w,2.8,h);box(g,M.runner,0,2.82,0,w*.9,.025,.8);flowers(g,0,3.5,0,.5);const n=Math.min(20,Math.max(0,item.seats??def.seats)), one=def.oneSide;for(let i=0;i<n;i++){const row=one?0:i%2,j=one?i:Math.floor(i/2), count=one?n:Math.ceil(n/2);chair(g,-w/2+(j+.5)*w/count,(row?1:-1)*(h/2+1),row?0:Math.PI);}}
      furniture.userData.ownedMaterials??=[];furniture.userData.ownedMaterials.push(M.linen,M.runner,M.flower,M.napkin);Object.assign(M,originals);
    }else if(item.kind==='fixture'){
      const w=item.w||6,h=item.h||3;
      if(item.type==='dance'){box(g,M.trim,0,.08,0,w,.12,h);ring(g,M.gold,0,.15,0,w,h,.08,.02);}
      else if(item.type==='stage')box(g,M.linen,0,.5,0,w,1,h);
      else if(item.type==='photo'){box(g,M.linen,0,4,-h/2,w,8,.2);ring(g,M.gold,0,.1,0,w,h,.06,.05);}
      else if(item.type==='cake')cyl(g,M.linen,0,1.4,0,w/2,2.8,w/2,24);
      else{box(g,item.type==='dj'?M.black:M.linen,0,1.5,0,w,3,h);box(g,M.gold,0,3.04,0,w,.06,h);}
    }
  }
}

function roundTable(parent,x,z,seats=8){contactShadow(parent,x,z,4.7,4.7); drapedCloth(parent,x,z,3.03,2.74);cyl(parent,M.linen,x,2.78,z,3.04,.09,3.04,32);box(parent,M.runner,x,2.84,z,1.1,.025,5.8);for(const side of [-1,1])box(parent,M.runner,x,1.94,z+side*2.94,1.1,1.75,.018);flowers(parent,x,4.65,z,.85);for(let i=0;i<seats;i++){const a=i*Math.PI*2/seats;chair(parent,x+Math.sin(a)*4.05,z+Math.cos(a)*4.05,a);const px=x+Math.sin(a)*2.37,pz=z+Math.cos(a)*2.37;cyl(parent,M.gold,px,2.85,pz,.40,.035,.4,14);cyl(parent,M.linen,px,2.88,pz,.34,.035,.34,14);box(parent,M.napkin,px,2.92,pz,.23,.03,.52);cyl(parent,M.crystal,px+.45,2.98,pz,.022,.19,.025,7);ball(parent,M.crystal,px+.45,3.16,pz,.13,12);box(parent,M.gold,px-.46,2.91,pz,.035,.025,.54);box(parent,M.gold,px+.46,2.91,pz,.03,.025,.51);}}
function cocktail(parent,x,z){const g=new T.Group();g.position.set(x,0,z);parent.add(g);const points=[new T.Vector2(1,0),new T.Vector2(.56,.65),new T.Vector2(.41,1.9),new T.Vector2(.84,3.1),new T.Vector2(1.5,3.5)];mesh(new T.LatheGeometry(points,24),M.black,g);cyl(g,M.black,0,3.5,0,1.5,.06,1.5,24);flowers(g,0,4.23,0,.3);}
function buildFurniture(){clearGroup(furniture);clearGroup(corridorFurniture);
applyPalette(state.palette||{});
const eventLayout=eventContext && state.useEventLayout!==false && !timelineActive;
if(eventLayout)buildEventFurniture();
if(!eventLayout && state.ballroom!=='open'){sweetheart(furniture);for(const x of (state.ballroom==='dance'?[9.5,48.5]:[9.5,29.5,48.5]))for(const z of [18,35,53,69])roundTable(furniture,x,z);if(state.ballroom==='dance'){box(furniture,M.linen,29.5,.065,38.25,16,.08,29);ring(furniture,M.gold,29.5,.115,38.25,15.8,28.8,.08,.025);}}
if(state.concourse==='cocktail'||state.concourse==='combined'){for(const z of(state.concourse==='combined'?[12,31,69]:[12,27,45,61,70]))cocktail(corridorFurniture,-14.6,z);}
if(state.concourse==='photo'||state.concourse==='combined'){
 // A side-facing 8 ft backdrop and compact kiosk leave the longitudinal passage open.
 box(corridorFurniture,M.linen,-18.8,4.1,51,.2,8.2,8);for(const z of [47,55]){cyl(corridorFurniture,M.gold,-18.7,4.1,z,.06,8.2);flowers(corridorFurniture,-18.5,7.7,z,.62);}box(corridorFurniture,M.gold,-18.6,8.05,51,.14,.09,8.2);
 box(corridorFurniture,M.linen,-12.5,2.8,51,.7,5.6,1.15);box(corridorFurniture,M.screen,-12.87,4.25,51,.025,1.65,1.0);const flash=cyl(corridorFurniture,M.bulb,-12.88,5.5,51,.35,.05,.35,16);flash.rotation.z=Math.PI/2;
 box(corridorFurniture,M.linen,-17.4,1.0,59,3,2,5.4);box(corridorFurniture,M.linen,-18.7,1.9,59,.4,1.4,5.4);for(const z of [56.4,61.6])box(corridorFurniture,M.gold,-17.4,1.4,z,3,.2,.12);
}
batch(furniture);batch(corridorFurniture);$('status').textContent='Layout updated. Use Save design to keep this setup.';
}
batch(architecture);batch(southWalls);batch(westWalls);batch(roof);batch(chandeliers);batch(cove);buildFurniture();
const hemi=new T.HemisphereLight('#fff9e6','#939b92',1.15);scene.add(hemi);
const sun=new T.DirectionalLight('#fff8df',2.1);sun.position.set(22,70,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-68,right:68,top:68,bottom:-68,near:1,far:200});sun.shadow.bias=-.00015;sun.shadow.normalBias=.12;sun.target.position.set(17,0,38);scene.add(sun,sun.target);
const lights=[];for(const x of [9.83,29.5,49.16,-9.83])for(const z of [13,38.5,64]){const l=new T.PointLight('#ffe8bf',.25,42,1.7);l.position.set(x,x<0?11.7:12.8,z);scene.add(l);lights.push(l);}
// A local cube capture gives the polished marble, mirrors and brass a venue reflection.
const envTarget=new T.WebGLCubeRenderTarget(128,{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,encoding:T.sRGBEncoding});const cube=new T.CubeCamera(.1,220,envTarget);cube.position.set(29.5,6.5,38.25);scene.add(cube);
const oldRoof=roof.visible;roof.visible=true;floors.visible=false;cove.visible=false;cube.update(renderer,scene);roof.visible=oldRoof;floors.visible=true;cove.visible=true;
for(const mat of [M.gold,M.mirror,M.crystal,M.glass,hallFloor,concourseFloor]){mat.envMap=envTarget.texture;mat.envMapIntensity=mat===M.mirror?.7:.34;mat.needsUpdate=true;}

function render(){renderer.render(scene,camera);}
let width=1,height=1;function resize(){width=viewport.clientWidth;height=viewport.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(viewport);resize();
const target=new T.Vector3(19.5,1,38.25),spherical=new T.Spherical();let dragging=false,last={x:0,y:0},pan=false;
function updateCamera(){camera.position.copy(new T.Vector3().setFromSpherical(spherical).add(target));camera.lookAt(target);camera.updateMatrixWorld();}
function setCamera(pos,look){target.set(...look);spherical.setFromVector3(new T.Vector3(...pos).sub(target));updateCamera();}
const views={cake:{pos:[53.1,5.8,13.8],look:[48,4.25,6.2],title:'The sweetest centerpiece.',sub:'Your custom cake · Treasure Banquets & Events'},overview:{pos:[-65,86,113],look:[19.5,0,38.25],title:'A complete celebration.',sub:'Diamond Room + concourse · architectural cutaway'},ballroom:{pos:[29.5,7.2,73],look:[29.5,6.6,14],title:'The Diamond Room.',sub:'Banquet hall · 4,156 sq ft · dinner & dancing'},concourse:{pos:[-9,5.7,74],look:[-10,6,24],title:'The celebration begins here.',sub:'Concourse · cocktails, photographs & conversation'},plan:{pos:[19.5,146,38.3],look:[19.5,0,38.25],title:'A place for every moment.',sub:'Diamond Room + main concourse · indicative floor plan'}};
function applyView(name,reset=true){state.view=name;const v=views[name];if(reset)setCamera(v.pos,v.look);$('scene-title').textContent=v.title;$('scene-subtitle').textContent=v.sub;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===name));const inside=name==='ballroom'||name==='concourse'||name==='cake';document.body.dataset.view=name;southWalls.visible=inside;westWalls.visible=inside;state.ceiling=inside;$('ceiling').checked=inside;roof.visible=inside;cove.visible=inside;$('space-labels').hidden=inside;chandeliers.visible=name!=='plan';$('floor-description').textContent=name==='cake'?'A bespoke centerpiece · made for your celebration':name==='concourse'?'Concourse: warm porcelain tile with gold, taupe and gray veining.':name==='ballroom'?'Diamond Room: white porcelain tile with soft gray veining.':'Two spaces. Two porcelain tile finishes.';}
function applyLighting(){const party=state.mood==='party',night=state.mood!=='day',strength=state.brightness/100;scene.background.set(party?'#0b0c17':night?'#24292b':'#e7e6dc');document.body.classList.toggle('night',night);hemi.intensity=party?.045:night?.30:.62;sun.intensity=party?.015:night?.18:1.2;renderer.toneMappingExposure=party?.92:night?.85:.85;
for(const l of lights){l.color.set(party?state.rgb:'#ffe4b6');l.intensity=party?strength*.65:night?.75:.23;}M.rgb.emissive.set(state.rgb);M.rgb.emissiveIntensity=party?strength*5:0;M.rgb.color.set(party?state.rgb:'#eee9d9');M.bulb.emissiveIntensity=party?(state.chandeliers?.5:0):night?2.5:1.4;M.bulb.color.set(party&&!state.chandeliers?'#4c4752':'#fff0cc');
for(const mat of [M.gold,M.mirror,M.crystal,M.glass,hallFloor,concourseFloor])mat.envMapIntensity=party?.025:night?.14:.34;
$('party-controls').hidden=!party;$('party-top').setAttribute('aria-pressed',String(party));$('mood-badge').textContent=party?'PARTY / RGB COVE':night?'EVENING':'DAYLIGHT';document.querySelectorAll('[data-mood]').forEach(b=>b.classList.toggle('selected',b.dataset.mood===state.mood));$('brightness-value').value=state.brightness+'%';}
function setMood(mood){state.mood=mood;if(mood==='party'&&(state.view==='overview'||state.view==='plan'))applyView('ballroom');if(mood==='party'){state.ceiling=true;$('ceiling').checked=true;roof.visible=cove.visible=true;}applyLighting();$('status').textContent=mood==='party'?'Party mode: general lights off. Adjust the RGB coves below.':'Lighting updated.';}
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{dragging=true;pan=e.button===2||e.shiftKey;last={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};if(pan){const right=new T.Vector3().setFromMatrixColumn(camera.matrix,0);const forward=new T.Vector3().setFromMatrixColumn(camera.matrix,1);target.addScaledVector(right,-dx*spherical.radius*.0014).addScaledVector(forward,dy*spherical.radius*.0014);}else{spherical.theta-=dx*.005;spherical.phi=Math.max(.01,Math.min(Math.PI-.04,spherical.phi+dy*.004));}updateCamera();});
function zoom(f){spherical.radius=Math.max(3,Math.min(240,spherical.radius*f));updateCamera();}canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.0008));},{passive:false});canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')spherical.theta-=.07;if(e.key==='ArrowRight')spherical.theta+=.07;if(e.key==='ArrowUp')spherical.phi=Math.max(.02,spherical.phi-.07);if(e.key==='ArrowDown')spherical.phi=Math.min(Math.PI-.04,spherical.phi+.07);if(e.key==='+'||e.key==='=')zoom(.9);if(e.key==='-')zoom(1.1);updateCamera();}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>applyView(b.dataset.view)));document.querySelectorAll('[data-mood]').forEach(b=>b.addEventListener('click',()=>setMood(b.dataset.mood)));$('party-top').onclick=()=>setMood(state.mood==='party'?'day':'party');
for(const id of ['ballroom','concourse'])$(id).onchange=()=>{state[id]=$(id).value;buildFurniture();};$('ceiling').onchange=()=>{state.ceiling=$('ceiling').checked;roof.visible=cove.visible=state.ceiling;};$('rgb').oninput=()=>{state.rgb=$('rgb').value;state.cycle=false;$('cycle').checked=false;applyLighting();};document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{state.rgb=b.dataset.color;$('rgb').value=state.rgb;state.cycle=false;$('cycle').checked=false;applyLighting();});$('brightness').oninput=()=>{state.brightness=Number($('brightness').value);applyLighting();};$('cycle').onchange=()=>{state.cycle=$('cycle').checked;};$('party-chandeliers').onchange=()=>{state.chandeliers=$('party-chandeliers').checked;applyLighting();};$('zoom-in').onclick=()=>zoom(.85);$('zoom-out').onclick=()=>zoom(1.15);$('reset-view').onclick=()=>applyView(state.view);$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await viewport.requestFullscreen();}catch{$('status').textContent='Full screen is unavailable in this browser.';}};
const cakeFlavors=['Vanilla','Chocolate','Red Velvet','Marble-Velvet (Vanilla + Red Velvet)','Marble Choc (Vanilla + Chocolate)','Carrot Cake','Lemon','Strawberry'];
const cakeFillings=['Strawberry','Mango','Vanilla','Chocolate','Pina Colada','Raspberry'];
const defaultCake=()=>({tiers:3,shape:'round',icing:'#fff7ef',flowers:'#b46e98',finish:'floral',topper:'Celebrate',pillars:false,fondue:false,layers:Array.from({length:5},()=>({flavor:'Vanilla',filling:'Strawberry'}))});
state.cake=defaultCake();
const cakeGroup=new T.Group();cakeGroup.name='Custom Treasure cake';model.add(cakeGroup);let cakeMaterials=[];
function rose(parent,mat,x,y,z,r){const g=new T.Group();g.position.set(x,y,z);parent.add(g);ball(g,mat,0,0,0,r*.35,8);for(let k=0;k<3;k++)for(let i=0;i<5+k*2;i++){const a=i/(5+k*2)*Math.PI*2+k*.6,o=ball(g,mat,Math.cos(a)*r*(.22+k*.22),Math.sin(a)*r*(.22+k*.22),-k*r*.09,r*(.27+k*.07),8);o.scale.set(1,.8,.42);o.rotation.z=a;}}
function buildCake(){clearGroup(cakeGroup);for(const mat of cakeMaterials){if(mat.map)mat.map.dispose();mat.dispose();}cakeMaterials=[];const c=state.cake,icing=standard(c.icing,{roughness:.54}),petal=standard(c.flowers,{roughness:.75}),pearl=standard('#fffae4',{roughness:.25});cakeMaterials.push(icing,petal,pearl);const g=new T.Group();g.position.set(48,0,6.2);cakeGroup.add(g);
cyl(g,M.linen,0,1.35,0,2.35,2.7,2.22,40);cyl(g,M.gold,0,2.77,0,1.3,.10,1.3,40);cyl(g,M.linen,0,2.84,0,1.18,.04,1.18,40);
let y=2.87;for(let i=0;i<c.tiers;i++){const r=1.02-i*.145,h=.58;if(i&&c.pillars){for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])cyl(g,M.gold,Math.cos(a)*r*.65,y+.20,Math.sin(a)*r*.65,.035,.40,.035,8);y+=.4;}
if(c.shape==='round')cyl(g,icing,0,y+h/2,0,r,h,r,56);else box(g,icing,0,y+h/2,0,r*1.8,h,r*1.8);
if(c.shape==='round')cyl(g,M.gold,0,y+.04,0,r+.009,.065,r+.009,56);else ring(g,M.gold,0,y+.045,0,r*1.81,r*1.81,.022,.075);
if(c.finish==='floral'){for(let j=0;j<8;j++){const a=j/8*Math.PI*2;const px=Math.cos(a)*r,pz=Math.sin(a)*r;tube(g,M.leaf,[[px,y+.1,pz],[px*.99+.035,y+.28,pz*.99],[px*.99-.02,y+.43,pz*.99]],.008);for(let k=0;k<3;k++)ball(g,petal,px+(k%2?.04:-.04),y+.18+k*.1,pz,.026,5);}const a=.45+i*.7;for(let j=0;j<3;j++)rose(g,petal,Math.cos(a)*r*.8+(j-1)*.17,y+.13+j*.075,Math.sin(a)*r*.8+.12,.15);}
if(c.finish==='pearl'){for(let j=0;j<40;j++){const a=j/40*Math.PI*2;let x=Math.cos(a)*r,z=Math.sin(a)*r;if(c.shape==='square'){const t=Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));x=x/t*.9;z=z/t*.9;}ball(g,pearl,x,y+h-.035,z,.033,6);}}
if(c.finish==='drip'){for(let j=0;j<26;j++){const a=j/26*Math.PI*2;let x=Math.cos(a)*(r+.01),z=Math.sin(a)*(r+.01);if(c.shape==='square'){const t=Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));x=x/t*.9;z=z/t*.9;}const len=.1+(Math.sin(j*8.3)+1)*.09;cyl(g,M.gold,x,y+h-len/2,z,.017,len,.02,6);}rose(g,petal,r*.55,y+.18,r*.65,.19);}
y+=h+.025;}
for(let j=0;j<3;j++)rose(g,petal,(j-1)*.18,y+.06,0,.14);
if(c.topper.trim()){const cv=document.createElement('canvas');cv.width=768;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#bb953f';ctx.font='italic 75px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.topper,384,122,740);const map=new T.CanvasTexture(cv);map.encoding=T.sRGBEncoding;const mat=new T.MeshStandardMaterial({map,transparent:true,side:T.DoubleSide,roughness:.35,metalness:.3});cakeMaterials.push(mat);mesh(new T.PlaneGeometry(1.6,.54),mat,g,0,y+.43,0);cyl(g,M.gold,-.38,y+.16,0,.012,.42,.012,6);cyl(g,M.gold,.38,y+.16,0,.012,.42,.012,6);}
batch(cakeGroup);
}
function validCake(c){return c&&Number.isInteger(c.tiers)&&c.tiers>=2&&c.tiers<=5&&['round','square'].includes(c.shape)&&['floral','pearl','drip'].includes(c.finish)&&[c.icing,c.flowers].every(v=>/^#[0-9a-f]{6}$/i.test(v))&&typeof c.topper==='string'&&c.topper.length<=24&&typeof c.pillars==='boolean'&&typeof c.fondue==='boolean'&&Array.isArray(c.layers)&&c.layers.length===5&&c.layers.every(l=>l&&typeof l.flavor==='string'&&l.flavor.length<=100&&typeof l.filling==='string'&&l.filling.length<=100);}
function populateCakeFlavors(){const wrap=$('cake-flavors');wrap.replaceChildren();for(let i=0;i<state.cake.tiers;i++){const title=document.createElement('h3');title.textContent=`Tier ${i+1}${i===0?' · bottom':i===state.cake.tiers-1?' · top':''}`;wrap.append(title);const row=document.createElement('div');row.className='cake-flavor-row';for(const [key,values]of [['flavor',cakeFlavors],['filling',cakeFillings]]){const label=document.createElement('label');label.textContent=key==='flavor'?'Bread flavor':'Filling';const select=document.createElement('select');select.setAttribute('aria-label',`Tier ${i+1} ${key}`);for(const v of [...new Set([...values,state.cake.layers[i][key]])]){const opt=document.createElement('option');opt.value=v;opt.textContent=v;select.append(opt);}select.value=state.cake.layers[i][key];select.onchange=()=>{state.cake.layers[i][key]=select.value;$('status').textContent='Cake flavor selection updated.';};label.append(select);row.append(label);}wrap.append(row);}}
function syncCake(){for(const key of ['tiers','shape','icing','flowers','finish','topper'])$('cake-'+key).value=state.cake[key];for(const key of ['pillars','fondue'])$('cake-'+key).checked=state.cake[key];populateCakeFlavors();}
for(const key of ['tiers','shape','icing','flowers','finish','topper','pillars','fondue'])$('cake-'+key).addEventListener(key==='topper'?'change':'input',()=>{state.cake[key]=['pillars','fondue'].includes(key)?$('cake-'+key).checked:key==='tiers'?Number($('cake-'+key).value):$('cake-'+key).value;buildCake();if(key==='tiers')populateCakeFlavors();$('status').textContent='Cake design updated. Save the cake brief or the complete design.';});
$('cake-view').onclick=()=>{setPlayback(false);applyView('cake');$('cake-controls').open=true;};$('cake-brief').onclick=()=>{const c=state.cake;const text=['TREASURE — CAKE DESIGN BRIEF','Concept for cake-team review; no order has been placed.','',`Tiers: ${c.tiers} (${c.shape})`,`Decoration: ${c.finish}`,`Frosting color: ${c.icing}`,`Flower color: ${c.flowers}`,`Topper: ${c.topper||'None'}`,`Cake pillars: ${c.pillars?'Requested':'No'}`,`Fondue cakes menu add-on: ${c.fondue?'Requested — clarify details with cake team':'No'}`,'',...c.layers.slice(0,c.tiers).map((l,i)=>`Tier ${i+1} (bottom to top): ${l.flavor} / ${l.filling} filling`),'','Confirm final sizes, servings, ingredients, dietary requirements, availability and price with the cake team.','Menu source: user-provided Treasure Banquets & Events cake image.'].join('\n');download('Treasure-cake-brief.txt',text,'text/plain;charset=utf-8');$('status').textContent='Cake brief exported.';};
buildCake();syncCake();
const defaultTimeline=()=>[
 {time:1020,title:'The room is ready',view:'ballroom',ballroom:'reception',concourse:'combined',mood:'day',rgb:'#ad4dff',brightness:75},
 {time:1080,title:'Cocktails & arrivals',view:'concourse',ballroom:'reception',concourse:'combined',mood:'evening',rgb:'#ff982e',brightness:60},
 {time:1140,title:'Dinner is served',view:'ballroom',ballroom:'reception',concourse:'photo',mood:'evening',rgb:'#ff982e',brightness:50},
 {time:1200,title:'Toasts & cake',view:'cake',ballroom:'reception',concourse:'photo',mood:'evening',rgb:'#ff982e',brightness:50},
 {time:1260,title:'The dance floor opens',view:'ballroom',ballroom:'dance',concourse:'combined',mood:'party',rgb:'#ad4dff',brightness:80},
 {time:1320,title:'One more song',view:'ballroom',ballroom:'dance',concourse:'photo',mood:'party',rgb:'#006eff',brightness:85},
 {time:1380,title:'A beautiful farewell',view:'concourse',ballroom:'dance',concourse:'clear',mood:'evening',rgb:'#ffebcc',brightness:40}
];
let schedule=defaultTimeline(), timelineActive=false, timelinePlaying=false, timelineBackup=null, momentIndex=-1, timelineMinute=1020, timelineFrame=0;
const clock=m=>{const h=Math.floor(m/60),mm=Math.floor(m%60);return `${h%12||12}:${String(mm).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
function syncControls(){for(const id of ['ballroom','concourse','rgb','brightness'])$(id).value=state[id];$('cycle').checked=state.cycle;$('party-chandeliers').checked=state.chandeliers;$('ceiling').checked=state.ceiling;}
function setPlayback(play){timelinePlaying=play;$('play-timeline').textContent=play?'Ⅱ':'▶';$('play-timeline').setAttribute('aria-label',play?'Pause timeline':'Play timeline');timelineFrame=0;}
function rebuildStops(){const wrap=$('timeline-stops');wrap.replaceChildren();schedule.forEach((m,i)=>{const b=document.createElement('button');b.type='button';b.textContent=clock(m.time);const s=document.createElement('span');s.textContent=['Ready','Arrivals','Dinner','Toasts','Dancing','Late night','Farewell'][i]||`Moment ${i+1}`;b.append(s);b.title=m.title;b.onclick=()=>{setPlayback(false);previewMinute(m.time);};wrap.append(b);});$('timeline-scrub').min=schedule[0].time;$('timeline-scrub').max=schedule.at(-1).time;}
function previewMinute(minute){timelineMinute=Math.max(schedule[0].time,Math.min(schedule.at(-1).time,minute));let index=0;for(let i=0;i<schedule.length;i++)if(timelineMinute>=schedule[i].time)index=i;const m=schedule[index];if(index!==momentIndex){momentIndex=index;Object.assign(state,{ballroom:m.ballroom,concourse:m.concourse,mood:m.mood,rgb:m.rgb,brightness:m.brightness,cycle:false,chandeliers:false});applyView(m.view);if(m.mood==='party'){state.ceiling=true;roof.visible=cove.visible=true;}syncControls();buildFurniture();applyLighting();}
$('timeline-scrub').value=Math.round(timelineMinute);$('timeline-time').textContent=clock(timelineMinute);$('timeline-title').textContent=m.title;$('timeline-next').textContent=index<schedule.length-1?`Next · ${clock(schedule[index+1].time)} — ${schedule[index+1].title}`:'The evening is complete. Close the timeline to return to your design.';[...$('timeline-stops').children].forEach((b,i)=>b.classList.toggle('selected',i===index));$('status').textContent='Timeline preview · example schedule and furniture changes. Edit moments to tailor your event.';
}
function openTimeline(){if(!timelineActive){timelineBackup={...state,camera:{position:camera.position.toArray(),target:target.toArray()}};timelineActive=true;momentIndex=-1;$('timeline').hidden=false;document.body.classList.add('timeline-open');rebuildStops();previewMinute(schedule[0].time);}}
function closeTimeline(){setPlayback(false);timelineActive=false;$('timeline').hidden=true;document.body.classList.remove('timeline-open');if(timelineBackup){const b=timelineBackup;for(const k of Object.keys(state))state[k]=b[k];applyView(b.view);state.ceiling=b.ceiling;roof.visible=cove.visible=b.ceiling;setCamera(b.camera.position,b.camera.target);syncControls();buildFurniture();applyLighting();timelineBackup=null;$('status').textContent='Timeline closed. Your previous design is restored.';}}
function tickTimeline(t){if(!timelinePlaying||!timelineActive){timelineFrame=t;return;}const dt=timelineFrame?Math.min((t-timelineFrame)/1000,.15):0;timelineFrame=t;previewMinute(timelineMinute+dt*60/Number($('timeline-speed').value));if(timelineMinute>=schedule.at(-1).time)setPlayback(false);}
$('start-timeline').onclick=()=>{openTimeline();setPlayback(true);};$('close-timeline').onclick=closeTimeline;$('play-timeline').onclick=()=>{if(timelineMinute>=schedule.at(-1).time){momentIndex=-1;previewMinute(schedule[0].time);}setPlayback(!timelinePlaying);};$('timeline-scrub').oninput=()=>{setPlayback(false);previewMinute(Number($('timeline-scrub').value));};
function validSchedule(rows){return Array.isArray(rows)&&rows.length===7&&rows.every((m,i)=>m&&Number.isInteger(m.time)&&m.time>=0&&m.time<=1439&&(!i||m.time>rows[i-1].time)&&typeof m.title==='string'&&m.title.trim().length>0&&m.title.length<=80&&['overview','ballroom','concourse','plan','cake'].includes(m.view)&&['reception','open','dance'].includes(m.ballroom)&&['combined','cocktail','photo','clear'].includes(m.concourse)&&['day','evening','party'].includes(m.mood)&&/^#[0-9a-f]{6}$/i.test(m.rgb)&&Number.isFinite(m.brightness)&&m.brightness>=0&&m.brightness<=100);}
const editChoices={view:[['ballroom','Diamond Room'],['concourse','Concourse'],['overview','Whole venue'],['plan','Floor plan'],['cake','Cake close-up']],ballroom:[['reception','12-table reception'],['dance','8 tables + dancing'],['open','Open room']],concourse:[['combined','Cocktails + photobooth'],['cocktail','Cocktail hour'],['photo','Photobooth lounge'],['clear','Clear concourse']],mood:[['day','Daylight'],['evening','Evening'],['party','Party RGB']]};
function fillEditor(rows){$('timeline-rows').replaceChildren();rows.forEach((m,i)=>{const row=document.createElement('div');row.className='moment-row';row.dataset.index=i;function field(key,label,type){const l=document.createElement('label');l.textContent=label;const input=document.createElement(type==='select'?'select':'input');input.name=key;input.setAttribute('aria-label',`${label}, moment ${i+1}`);if(type==='select'){for(const [value,text]of editChoices[key]){const opt=document.createElement('option');opt.value=value;opt.textContent=text;input.append(opt);}}else input.type=type;input.value=key==='time'?`${String(Math.floor(m.time/60)).padStart(2,'0')}:${String(m.time%60).padStart(2,'0')}`:m[key];if(key==='title'){input.maxLength=80;input.required=true;}if(key==='brightness'){input.min=0;input.max=100;input.step=1;}l.append(input);row.append(l);}
field('time','Start time','time');field('title','Moment','text');field('view','Featured space','select');field('mood','Lighting','select');field('ballroom','Diamond Room layout','select');field('concourse','Concourse layout','select');field('rgb','RGB color','color');field('brightness','Cove brightness (%)','number');$('timeline-rows').append(row);});$('timeline-error').textContent='';}
$('edit-timeline').onclick=()=>{setPlayback(false);fillEditor(schedule);$('timeline-editor').showModal();};$('cancel-timeline').onclick=()=>$('timeline-editor').close();$('reset-timeline').onclick=()=>fillEditor(defaultTimeline());$('timeline-form').onsubmit=e=>{e.preventDefault();const rows=[...$('timeline-rows').children].map(row=>{const m={};for(const input of row.querySelectorAll('input,select'))m[input.name]=input.value;const parts=m.time.split(':').map(Number);m.time=parts[0]*60+parts[1];m.brightness=Number(m.brightness);return m;});if(!validSchedule(rows)){$('timeline-error').textContent='Enter a name and valid settings for every moment. Start times must increase from top to bottom on the same day.';return;}schedule=rows;$('timeline-editor').close();if(timelineActive){momentIndex=-1;rebuildStops();previewMinute(timelineMinute);}$('status').textContent='Event timeline updated. Save design to keep these moments.';};
document.querySelector('aside').addEventListener('input',()=>{if(timelineActive)setPlayback(false);});
function download(name,body,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([body],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('save-image').onclick=()=>{render();canvas.toBlob(blob=>{if(!blob){$('status').textContent='The image could not be exported.';return;}download('Treasure-'+state.view+'-'+state.mood+'.png',blob,'image/png');$('status').textContent='View exported as PNG.';},'image/png');};
$('save-config').onclick=()=>{download('Treasure-venue-design.json',JSON.stringify({...state,timeline:schedule,camera:{position:camera.position.toArray(),target:target.toArray()}},null,2),'application/json');$('status').textContent='Design saved, including the timeline, layouts, RGB settings and camera.';};$('load-config').onclick=()=>$('config-file').click();
function validConfig(x){return x&&x.venue===state.venue&&x.version===1&&['overview','ballroom','concourse','plan','cake'].includes(x.view)&&['reception','open','dance'].includes(x.ballroom)&&['combined','cocktail','photo','clear'].includes(x.concourse)&&['day','evening','party'].includes(x.mood)&&/^#[0-9a-f]{6}$/i.test(x.rgb)&&Number.isFinite(x.brightness)&&x.brightness>=0&&x.brightness<=100&&['cycle','chandeliers','ceiling'].every(k=>typeof x[k]==='boolean')&&(!x.camera||['position','target'].every(k=>Array.isArray(x.camera[k])&&x.camera[k].length===3&&x.camera[k].every(n=>Number.isFinite(n)&&Math.abs(n)<=1000)));}
$('config-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>20000)throw Error();const x=JSON.parse(await f.text());if(!validConfig(x)||(x.timeline&&!validSchedule(x.timeline))||(x.cake&&!validCake(x.cake)))throw Error();if(timelineActive)closeTimeline();for(const k of Object.keys(state))state[k]=k==='cake'?(x.cake||defaultCake()):x[k];buildCake();syncCake();if(x.timeline)schedule=x.timeline;const ceiling=x.ceiling;applyView(x.view);state.ceiling=ceiling;roof.visible=cove.visible=ceiling;$('ceiling').checked=ceiling;if(x.camera)setCamera(x.camera.position,x.camera.target);syncControls();buildFurniture();applyLighting();$('status').textContent='Saved Treasure design opened.';if(eventContext)queueEventDesign();}catch{$('status').textContent='This is not a valid Treasure design file. Current design kept.';}e.target.value='';};
function labels(){if($('space-labels').hidden)return;for(const[id,p]of [['gold-label',[29.5,2,38]],['concourse-label',[-10,1,43]]]){const q=new T.Vector3(...p).project(camera);$(id).style.left=((q.x*.5+.5)*width)+'px';$(id).style.top=((-q.y*.5+.5)*height)+'px';$(id).hidden=q.z>1||q.z< -1;}}
function showPanel(name){document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);document.querySelectorAll('[data-panel-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.panelTab===name);el.setAttribute('aria-pressed',String(el.dataset.panelTab===name));});}
document.querySelectorAll('[data-panel-tab]').forEach(el=>el.onclick=()=>{showPanel(el.dataset.panelTab);if(el.dataset.panelTab==='cake'){setPlayback(false);applyView('cake');$('cake-controls').open=true;}});
$('party-top').addEventListener('click',()=>showPanel('lighting'));
/* Same-origin event workspace integration; all planning tools stay in Tablescape. */
let outboundTimer, applyingEvent=false, lastSent='', lastCake=null;
const embedded=window.parent!==window && new URLSearchParams(location.search).get('workspace')==='1';
const emit=(type,data={})=>{if(embedded&&eventContext)parent.postMessage({type,token:eventContext.token,...data},location.origin);};
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function eventDesign(){const base=timelineActive&&timelineBackup?timelineBackup:state;return {...base,camera:undefined,timeline:schedule};}
function syncEventDesign(){if(!eventContext||applyingEvent)return; const d=eventDesign(), key=JSON.stringify(d);if(key===lastSent)return;lastSent=key;const changed=JSON.stringify(d.cake)!==JSON.stringify(lastCake);emit('treasure:design',{design:d,cakeEdited:changed,previousCake:lastCake});lastCake=JSON.parse(JSON.stringify(d.cake));}
function queueEventDesign(){clearTimeout(outboundTimer);outboundTimer=setTimeout(syncEventDesign,180);}
function navigateWorkspace(view,section){syncEventDesign();emit('treasure:navigate',{view,section});}
function projectCake(c){
  const result=state.cake?JSON.parse(JSON.stringify(state.cake)):defaultCake(); if(!c?.tiers?.length)return result;
  result.tiers=Math.max(2,Math.min(5,c.tiers.length));result.shape=c.tiers[0].shape==='square'?'square':'round';result.icing=c.color||result.icing;result.flowers=c.f1||result.flowers;result.topper=c.topper==='none'?'':String(c.topperText||'').slice(0,24);result.finish=c.finish==='drip'?'drip':c.decor==='pearls'?'pearl':'floral';
  c.tiers.slice(0,5).forEach((t,i)=>result.layers[i]={flavor:t.flavor,filling:t.filling}); return result;
}
function renderEventMenu(){
  const el=$('event-menu'); if(!eventContext){el.innerHTML='<p class="field-note">Open the complete event workspace to choose dinner dishes, edit your bar, and connect meal choices to guests and the budget.</p><a class="wide-button" href="'+'../index.html'+'">Open complete workspace ↗</a>';return;}
  const {menu}=eventContext, choices=menu.choices;
  el.innerHTML=`<p class="field-note">${escapeText(menu.source)}. Selections update the same guest meal choices and budget as your event workspace.</p><label>Service style<select id="event-service">${[['plated','Plated'],['buffet','Buffet'],['family','Family style'],['stations','Food stations']].map(([v,n])=>`<option value="${v}" ${choices.service===v?'selected':''}>${n}</option>`).join('')}</select></label>${menu.courses.map(c=>`<div class="event-course"><h3>${escapeText(c.name)} <small>up to ${c.pick}</small></h3>${c.options.map(o=>`<button class="event-dish ${(choices.picks[c.id]||[]).includes(o.id)?'selected':''}" data-course="${escapeText(c.id)}" data-option="${escapeText(o.id)}" aria-pressed="${(choices.picks[c.id]||[]).includes(o.id)}"><span>${escapeText(o.name)}</span><small>${escapeText(o.diet||o.desc)} · $${Number(o.price).toFixed(2)}</small></button><details class="dish-edit"><summary>Edit dish & price</summary><form data-edit-course="${escapeText(c.id)}" data-edit-option="${escapeText(o.id)}"><label>Dish name<input name="name" required maxlength="120" value="${escapeText(o.name)}"></label><label>Description<input name="desc" maxlength="300" value="${escapeText(o.desc)}"></label><label>Price per guest<input name="price" type="number" min="0" max="10000" step="0.01" required value="${Number(o.price)}"></label><button type="submit">Apply to this event</button></form></details>`).join('')}</div>`).join('')}<button class="wide-button" id="full-menu-editor">Menu cards, bar & add-ons ↗</button>`;
  $('event-service').onchange=e=>emit('treasure:menu',{service:e.target.value});
  el.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>emit('treasure:menu',{course:b.dataset.course,option:b.dataset.option}));
  el.querySelectorAll('[data-edit-course]').forEach(form=>form.onsubmit=e=>{e.preventDefault();emit('treasure:menu-edit',{course:form.dataset.editCourse,option:form.dataset.editOption,value:{name:form.elements.name.value,desc:form.elements.desc.value,price:Number(form.elements.price.value)}});});
  $('full-menu-editor').onclick=()=>navigateWorkspace('menu','dinner');
}
function installEventTools(){
  document.querySelector('.studio-tabs').insertAdjacentHTML('beforeend','<button data-panel-tab="menu">Menu</button><button data-panel-tab="workspace">Event</button>');
  const notes=document.querySelector('aside > details');
  notes.insertAdjacentHTML('beforebegin',`<section data-panel="menu" hidden><h2>The celebration menu</h2><div id="event-menu"></div></section><section data-panel="workspace" hidden><h2>Your complete event</h2><p id="event-summary" class="field-note">The full workspace keeps your guest list, floor plan, menu and event records together.</p><div class="view-grid" id="workspace-tools"></div></section>`);
  const actions=[['floor','Floor plan'],['style','Tables & linens'],['backdrop','Backdrops'],['packages','Packages'],['guests','Guests & seating'],['invites','Invitations & website'],['menu','Menu, cake & bar'],['music','Music & lighting'],['plan','Planning'],['client','Proposal & billing'],['budget','Budget'],['order','Order sheet'],['inv','Inventory'],['events','Saved events'],['vision','Original 3D studio']];
  for(const [view,label]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=()=>embedded?navigateWorkspace(view):location.assign('../index.html');$('workspace-tools').append(b);}
  document.querySelectorAll('[data-panel-tab="menu"],[data-panel-tab="workspace"]').forEach(b=>b.onclick=()=>showPanel(b.dataset.panelTab));
  $('ballroom').closest('section').insertAdjacentHTML('beforeend',`<div id="event-layout-tools" hidden><label class="check"><input type="checkbox" id="use-event-layout"> Use this event’s floor plan</label><p id="layout-source" class="field-note"></p><button class="wide-button" id="edit-event-layout">Move tables & fixtures ↗</button><button class="wide-button" id="fit-event-layout">Fit positions to the Diamond Room</button><p class="field-note">Fit adjusts the event room and table positions. Furniture sizes stay the same; review spacing in the floor plan.</p></div><h3>Table palette</h3><div class="cake-grid">${[['cloth','Tablecloth','#fffff3'],['runnerColor','Runner','#b99846'],['napkin','Napkin','#e9dec5'],['flower1','Flowers','#f4efdc']].map(([key,label,color])=>`<label>${label}<input type="color" id="palette-${key}" value="${color}"></label>`).join('')}</div><p class="field-note" id="palette-note">Customize the reception palette.</p>`);
  $('use-event-layout').onchange=()=>{state.useEventLayout=$('use-event-layout').checked;$('ballroom').disabled=state.useEventLayout;buildFurniture();queueEventDesign();};
  $('fit-event-layout').onclick=()=>{syncEventDesign();emit('treasure:fit-room');};
  $('edit-event-layout').onclick=()=>navigateWorkspace('floor');
  for(const key of ['cloth','runnerColor','napkin','flower1'])$('palette-'+key).oninput=e=>{state.palette={...(state.palette||{}),[key]:e.target.value};if(eventContext)emit('treasure:look',{key,value:e.target.value});buildFurniture();queueEventDesign();};
  $('cake-controls').insertAdjacentHTML('beforeend','<p class="field-note" id="cake-workspace-note" hidden>Common cake options sync with the event cake. For exact tier sizes, additional shapes, finishes, servings and pricing, use the full cake editor.</p><button id="full-cake-editor" class="wide-button" hidden>Exact sizes & full cake editor ↗</button>');
  $('full-cake-editor').onclick=()=>navigateWorkspace('menu','cake');
  document.addEventListener('input',queueEventDesign);document.addEventListener('change',queueEventDesign);document.addEventListener('click',queueEventDesign);$('timeline-form').addEventListener('submit',queueEventDesign);renderEventMenu();
}
function applyEventSnapshot(p){
  if(!p||typeof p.token!=='string'||!Array.isArray(p.looks)||!p.menu)return;
  clearTimeout(outboundTimer); applyingEvent=true;const changedEvent=!eventContext||eventContext.token!==p.token;
  const before=JSON.stringify(eventDesign()); eventContext=p;
  if(changedEvent&&timelineActive)closeTimeline();
  if(p.design && validConfig(p.design)&&validCake(p.design.cake)&&validSchedule(p.design.timeline)){
    for(const key of Object.keys(state))if(key in p.design)state[key]=p.design[key];
    state.useEventLayout=p.design.useEventLayout!==false;state.palette=p.design.palette||{};schedule=p.design.timeline;
  }else if(changedEvent){Object.assign(state,{view:'ballroom',ballroom:'reception',concourse:'combined',mood:'day',rgb:'#ad4dff',brightness:75,cycle:false,chandeliers:false,ceiling:false,cake:defaultCake(),useEventLayout:true,palette:{}});schedule=defaultTimeline();}
  state.cake=projectCake(p.cake); // The existing cake editor remains authoritative for shared fields.
  if(JSON.stringify(eventDesign())!==before){buildCake();syncCake();const ceiling=state.ceiling;applyView(state.view);state.ceiling=ceiling;roof.visible=cove.visible=ceiling;syncControls();applyLighting();}
  $('event-layout-tools').hidden=false;$('use-event-layout').checked=state.useEventLayout!==false;
  $('ballroom').disabled=state.useEventLayout!==false;
  const tables=p.items.filter(i=>i.kind==='table');
  $('layout-source').textContent=`${tables.length} event tables · ${p.room.w} × ${p.room.h} ft plan, centered at its original scale in the Diamond Room. Check wall, column and aisle clearance in the floor plan.`;
  $('event-summary').textContent=`${p.event.name||'Untitled event'} · ${p.guests} attending guests. All original tools remain available for this same event.`;
  document.querySelector('.intro').textContent=p.event.name||'Your Treasure celebration';
  $('palette-note').textContent='Palette changes apply to all event table looks. Edit individual looks in Tables & linens.';
  const look=p.looks[0]||{};for(const key of ['cloth','runnerColor','napkin','flower1'])if(/^#[0-9a-f]{6}$/i.test(look[key]||''))$('palette-'+key).value=look[key];
  $('full-cake-editor').hidden=false;$('cake-workspace-note').hidden=false;
  renderEventMenu();const nextFurniture=JSON.stringify([p.room,p.items,p.looks,state.ballroom,state.concourse,state.useEventLayout,state.palette]);if(nextFurniture!==furnitureKey){furnitureKey=nextFurniture;buildFurniture();}lastSent=JSON.stringify(eventDesign());lastCake=JSON.parse(JSON.stringify(state.cake));applyingEvent=false;
}
installEventTools();
if(embedded){window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='treasure:flush'){syncEventDesign();emit('treasure:flushed');}if(e.data?.type==='treasure:active')workspacePaused=!e.data.active;if(e.data?.type==='treasure:snapshot')applyEventSnapshot(e.data.payload);if(e.data?.type==='treasure:notice')$('status').textContent=e.data.text;});parent.postMessage({type:'treasure:ready'},location.origin);}

let lastRender=0;let lastCycle=0;const cyclingColor=new T.Color();function frame(t){requestAnimationFrame(frame);if(document.hidden||workspacePaused){timelineFrame=0;return;}tickTimeline(t);if(state.mood==='party'&&state.cycle&&t-lastCycle>70){lastCycle=t;cyclingColor.setHSL((t/55000)%1,.9,.55);state.rgb='#'+cyclingColor.getHexString();$('rgb').value=state.rgb;applyLighting();}if(t-lastRender>32){lastRender=t;labels();render();}}applyView('ballroom');applyLighting();$('status').textContent='Ready. Reference-based model · review notes for assumptions.';requestAnimationFrame(frame);
})();
