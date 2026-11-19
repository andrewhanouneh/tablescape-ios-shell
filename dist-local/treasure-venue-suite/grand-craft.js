/* GrandCraft: reference-led architectural finishes for the local Three.js venue atlas.
   Exterior follows the supplied brick inspiration, not a surveyed exterior elevation. */
window.GrandCraft = (() => {
  'use strict';
  const T=window.THREE;
  const material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.55,envMapIntensity:.35,...extra});m.color.convertSRGBToLinear();return m;};
  function mesh(g,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
  const box=(g,m,x,y,z,w,h,d)=>mesh(g,new T.BoxGeometry(w,h,d),m,x,y,z);
  const cyl=(g,m,x,y,z,r,h,r2=r,n=20)=>mesh(g,new T.CylinderGeometry(r,r2,h,n),m,x,y,z);
  const ball=(g,m,x,y,z,r,n=10)=>mesh(g,new T.SphereGeometry(r,n,7),m,x,y,z);
  function tube(g,m,points,r=.04){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,r,5,false),m);}
  function ring(g,m,x,y,z,w,d,t=.1,h=.1){box(g,m,x,y,z-d/2,w,h,t);box(g,m,x,y,z+d/2,w,h,t);box(g,m,x-w/2,y,z,t,h,d);box(g,m,x+w/2,y,z,t,h,d);}
  function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return((n^n>>>14)>>>0)/4294967296;};}
  function canvasTexture(w,h,draw,color=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tx=new T.CanvasTexture(c);if(color)tx.encoding=T.sRGBEncoding;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=8;return tx;}
  function environment(renderer){const tx=canvasTexture(1024,512,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#83aed8');g.addColorStop(.44,'#d9e4ea');g.addColorStop(.5,'#fff0cd');g.addColorStop(.64,'#b5946b');g.addColorStop(1,'#383f39');c.fillStyle=g;c.fillRect(0,0,w,h);const sun=c.createRadialGradient(740,190,2,740,190,115);sun.addColorStop(0,'#fffce9');sun.addColorStop(.15,'#fff1c9');sun.addColorStop(1,'rgba(255,232,196,0)');c.fillStyle=sun;c.fillRect(0,0,w,h);for(const x of [100,430,850]){c.fillStyle='rgba(255,255,255,.45)';c.fillRect(x,140,70,140);}});tx.mapping=T.EquirectangularReflectionMapping;const pm=new T.PMREMGenerator(renderer),target=pm.fromEquirectangular(tx);pm.dispose();tx.dispose();return target.texture;}
  /* Brick follows the reference: muted brown-reds with light mortar, at real scale (8 x 2 2/3 in units: one texture tile = 7 ft x 2.7 ft). */
  function brick(w,h){const rand=random(317),palette=['#7a4a3a','#6e4234','#835241','#643a2e','#8a5a47','#76483a','#91624e','#6c4538'];const map=canvasTexture(1024,512,c=>{c.fillStyle='#ab9a82';c.fillRect(0,0,1024,512);for(let row=0;row<12;row++)for(let col=-1;col<11;col++){const x=col*103+(row%2)*51.5,y=row*42.7;c.fillStyle=palette[Math.floor(rand()*palette.length)];c.fillRect(x+3,y+3,97,37);for(let j=0;j<28;j++){c.fillStyle=rand()>.5?'rgba(45,20,8,.13)':'rgba(255,227,188,.16)';c.fillRect(x+4+rand()*94,y+5+rand()*31,2+rand()*10,1+rand()*2);}c.fillStyle='rgba(54,31,17,.35)';c.fillRect(x+3,y+37,97,3);c.fillStyle='rgba(235,171,114,.30)';c.fillRect(x+3,y+3,97,2);}});const bump=canvasTexture(1024,512,c=>{c.fillStyle='#555';c.fillRect(0,0,1024,512);for(let row=0;row<12;row++)for(let col=-1;col<11;col++){c.fillStyle='#ddd';c.fillRect(col*103+(row%2)*51.5+3,row*42.7+3,97,37);}},false);map.repeat.set(w/7,h/2.7);bump.repeat.copy(map.repeat);return material('#ffffff',{map,bumpMap:bump,bumpScale:.012,roughness:.88});}
  /* the lit rooms seen through the storefront glass, painted to match the rooms today: warm white walls with gold trim and
     gold-lined panels, small crystal chandeliers, gold round-back chairs with white seats, white linen with ivory flowers on gold
     stands, and a light marble-look porcelain floor with faint gray veins */
  function storefront(){const tx=canvasTexture(512,640,(c,w,h)=>{const r=random(55),G='#b8892f';const wall=c.createLinearGradient(0,0,0,h);wall.addColorStop(0,'#d6cab4');wall.addColorStop(.1,'#ebe2d2');wall.addColorStop(.5,'#f5eddf');wall.addColorStop(.85,'#e9e0d0');wall.addColorStop(1,'#dcd2c1');c.fillStyle=wall;c.fillRect(0,0,w,h);
    c.fillStyle='#fbf6ec';c.fillRect(0,0,w,24);c.fillStyle=G;c.fillRect(0,24,w,3);c.fillRect(0,386,w,2);
    for(const x of [60,300]){c.strokeStyle='#c9a24f';c.lineWidth=3;c.strokeRect(x,168,120,172);c.lineWidth=1.4;c.strokeRect(x+10,178,100,152);}
    for(const x of [128,256,384]){const g=c.createRadialGradient(x,150,2,x,150,95);g.addColorStop(0,'rgba(255,240,202,.95)');g.addColorStop(.3,'rgba(255,222,165,.42)');g.addColorStop(1,'rgba(255,205,130,0)');c.fillStyle=g;c.fillRect(x-95,55,190,190);
      c.strokeStyle='#b38a3c';c.lineWidth=2;c.beginPath();c.moveTo(x,27);c.lineTo(x,122);c.stroke();c.strokeStyle=G;c.lineWidth=2.5;c.beginPath();c.ellipse(x,140,27,7,0,0,Math.PI*2);c.stroke();
      for(const dx of [-22,-8,8,22]){c.fillStyle='#fff6dc';c.fillRect(x+dx-1.5,124,3,11);c.fillStyle='#ffe9ad';c.beginPath();c.arc(x+dx,121,2.6,0,7);c.fill();}
      for(let k=0;k<26;k++){const t=r(),a=r()*Math.PI*2,yy=142+t*44,rr=(1-t)*24+2;c.fillStyle=k%3?'#ffffff':'#fff1c8';c.beginPath();c.arc(x+Math.cos(a)*rr,yy+Math.sin(a)*3,1.5+r()*1.3,0,7);c.fill();}}
    const fl=c.createLinearGradient(0,548,0,h);fl.addColorStop(0,'#e4ded5');fl.addColorStop(1,'#f1ece4');c.fillStyle=fl;c.fillRect(0,548,w,h-548);
    c.strokeStyle='rgba(118,122,128,.32)';c.lineWidth=1;for(let k=0;k<9;k++){let x=r()*w,y=552+r()*84;c.beginPath();c.moveTo(x,y);for(let s=0;s<6;s++){x+=10+r()*22;y=Math.max(550,Math.min(638,y+(r()-.5)*9));c.lineTo(x,y);}c.stroke();}
    c.strokeStyle='rgba(165,160,150,.55)';c.beginPath();for(const y of [548.5,572,604]){c.moveTo(0,y);c.lineTo(w,y);}for(let x=-64;x<w+64;x+=96){c.moveTo(w/2+(x-w/2)*.8,548);c.lineTo(w/2+(x-w/2)*1.25,h);}c.stroke();
    for(const x of [38,474]){c.fillStyle='#b8913f';c.fillRect(x-15,528,30,58);c.fillStyle='rgba(255,240,200,.35)';c.fillRect(x-15,528,4,58);for(let j=0;j<30;j++){const a=r()*Math.PI*2,rr=18+r()*58;c.fillStyle=j%3?'#56703f':'#728b52';c.beginPath();c.ellipse(x+Math.cos(a)*rr*.65,428+Math.sin(a)*rr,25,9,a,0,Math.PI*2);c.fill();}}
    for(const x of [150,362]){for(const dx of [-58,58]){const cx=x+dx;c.strokeStyle=G;c.lineWidth=3.5;c.beginPath();c.moveTo(cx-14,446);c.lineTo(cx-16,556);c.moveTo(cx+14,446);c.lineTo(cx+16,556);c.stroke();
        c.lineWidth=5;c.beginPath();c.ellipse(cx,424,15,19,0,0,Math.PI*2);c.stroke();c.lineWidth=2;c.beginPath();c.moveTo(cx,407);c.lineTo(cx,441);c.moveTo(cx-10,415);c.quadraticCurveTo(cx,433,cx+10,415);c.moveTo(cx-10,433);c.quadraticCurveTo(cx,419,cx+10,433);c.stroke();
        c.fillStyle='#fbf8f1';c.fillRect(cx-18,445,36,10);c.fillStyle=G;c.fillRect(cx-18,455,36,3);}
      c.fillStyle='#fbf7ee';c.beginPath();c.ellipse(x,497,72,14,0,0,Math.PI*2);c.fill();c.fillRect(x-68,497,136,80);c.fillStyle='rgba(120,100,70,.13)';c.fillRect(x+34,499,34,78);c.fillRect(x-68,499,14,78);c.fillStyle='rgba(150,130,100,.16)';c.fillRect(x-68,547,136,30);
      c.fillStyle=G;c.fillRect(x-2,446,4,50);c.fillRect(x-11,492,22,4);for(let k=0;k<16;k++){const a=r()*Math.PI*2,rr=r()*13;c.fillStyle=k%5?'#f4eee2':'#6f8a5a';c.beginPath();c.arc(x+Math.cos(a)*rr,438+Math.sin(a)*rr*.7,k%5?4.5:3,0,7);c.fill();}}
    const sheen=c.createLinearGradient(0,548,0,h);sheen.addColorStop(0,'rgba(255,255,255,0)');sheen.addColorStop(.5,'rgba(255,250,236,.18)');sheen.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=sheen;c.fillRect(0,548,w,h-548);
    const glare=c.createLinearGradient(0,0,w,h);glare.addColorStop(0,'rgba(255,255,255,.10)');glare.addColorStop(.46,'rgba(255,255,255,0)');glare.addColorStop(.56,'rgba(255,255,255,.07)');glare.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glare;c.fillRect(0,0,w,h);});
    return material('#ffffff',{map:tx,emissiveMap:tx,emissive:'#ffffff',emissiveIntensity:.34,roughness:.37,envMapIntensity:.12});}
  /* a door or window opening: bronze perimeter, optional mullions, transom bar and crossed glazing bars, all as thin bars so the glass and lit interior show */
  function frame(g,M,x,y0,z,w,h,{mullions=[],transom=null,cross=false,rail=.55}={}){const t=.22,d=.24;box(g,M.bronze,x-w/2+t/2,y0+h/2,z,t,h,d);box(g,M.bronze,x+w/2-t/2,y0+h/2,z,t,h,d);box(g,M.bronze,x,y0+h-t/2,z,w,t,d);box(g,M.bronze,x,y0+rail/2,z,w,rail,d);for(const mx of mullions)box(g,M.bronze,x+mx,y0+h/2,z,.14,h,.2);if(transom!=null)box(g,M.bronze,x,y0+transom,z,w,.16,.2);if(cross){const top=(transom!=null?y0+transom:y0+h)-.3,bot=y0+rail+.3;for(const sg of [-1,1])tube(g,M.gold,[[x-sg*(w/2-.35),bot,z+.06],[x+sg*(w/2-.35),top,z+.06]],.04);}}
  function limestone(){const rand=random(22),map=canvasTexture(256,256,c=>{c.fillStyle='#d9c9ae';c.fillRect(0,0,256,256);for(let i=0;i<14000;i++){c.fillStyle=rand()>.5?'rgba(119,96,70,.08)':'rgba(255,253,235,.12)';c.fillRect(rand()*256,rand()*256,1,2);}});map.repeat.set(2,2);return material('#ffffff',{map,roughness:.74});}
  function palette(cloth='#fffff3',floral='#eadcc8'){return {ivory:material('#f1e9da'),trim:material('#fff5e1'),gold:material('#c29a46',{metalness:.72,roughness:.23,envMapIntensity:1.15}),bronze:material('#67502e',{metalness:.72,roughness:.25}),mirror:material('#ced9d6',{metalness:.96,roughness:.08}),crystal:material('#eff8fa',{metalness:.24,roughness:.1,envMapIntensity:1.25}),linen:material(cloth,{roughness:.92}),flower:material(floral),leaf:material('#4c6840'),bulb:material('#fff2c8',{emissive:'#ffca76',emissiveIntensity:1.5}),runner:material('#152a58',{roughness:.72}),champagne:material('#bd9856',{metalness:.3,roughness:.65}),walnut:material('#392b24'),black:material('#292926')};}
  /* ceiling pass 2 */
  function finish(M){if(!M.cry){M.cry=material('#d4dde3',{metalness:.45,roughness:0,envMapIntensity:3.2,flatShading:true,transparent:true,opacity:.9,emissive:'#fff1d6',emissiveIntensity:.2});M.chrome=material('#dfe2e4',{metalness:.95,roughness:.1,envMapIntensity:1.5});M.mold=material('#fbf6ec',{roughness:.48,side:T.DoubleSide});M.vent=material('#b9b2a4',{roughness:.8});}return M;}
  /* a molding profile [[inward, vertical]] swept around a w x d rectangle with mitered corners */
  function sweep(profile,W,D){const pos=[],idx=[];const corner=u=>{const a=W/2-u,b=D/2-u;return [[-a,-b],[a,-b],[a,b],[-a,b]];};for(let s=0;s<4;s++){const base=pos.length/3;for(const [u,v] of profile){const c=corner(u),A=c[s],B=c[(s+1)%4];pos.push(A[0],v,A[1],B[0],v,B[1]);}for(let i=0;i<profile.length-1;i++){const a=base+i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
  const bez=(p0,p1,p2,n)=>Array.from({length:n},(_,i)=>{const t=(i+1)/n,m=1-t;return [m*m*p0[0]+2*m*t*p1[0]+t*t*p2[0],m*m*p0[1]+2*m*t*p1[1]+t*t*p2[1]];});
  const bez3=(p0,p1,p2,p3,n)=>Array.from({length:n},(_,i)=>{const t=(i+1)/n,m=1-t;return [0,1].map(k=>m*m*m*p0[k]+3*m*m*t*p1[k]+3*m*t*t*p2[k]+t*t*t*p3[k]);});
  /* classic crown: ceiling fillet, deep cove, fillet, ogee, fillet, bead, down to the wall (1 x 1 units, scaled) */
  const CROWN=[[1.02,0],[1.02,-.05],[.97,-.05],[.97,-.07],...bez([.97,-.07],[.64,-.1],[.6,-.42],9),[.56,-.42],[.56,-.46],...bez3([.56,-.46],[.56,-.66],[.16,-.6],[.16,-.8],10),[.13,-.8],[.13,-.83],...bez([.13,-.83],[.2,-.88],[.1,-.93],5),[.05,-.93],[.05,-.98],[0,-.98]];
  function lathe(g,m,pts,n=28){return mesh(g,new T.LatheGeometry(pts.map(([r,y])=>new T.Vector2(r,y)),n),m);}
  function dentils(g,m,x,y,z,W,D,s){const out=.06*s,deep=.08*s,bw=.07*s,bh=.11*s,gap=.15*s,list=[];for(let k=0;k<4;k++){const along=k%2===0,L=(along?W:D)-2*(out+deep),n=Math.floor(L/gap);for(let i=0;i<n;i++){const t=-L/2+(i+.5)*L/n,c=k<2?-1:1;if(along)list.push([bw,bh,deep,x+t,y,z+c*(D/2-out-deep/2)]);else list.push([deep,bh,bw,x+(k===1?1:-1)*(W/2-out-deep/2),y,z+t]);}}const pos=[],nor=[],idx=[];for(const [w,h,d,px,py,pz] of list){const b=new T.BoxGeometry(w,h,d),p=b.attributes.position,nn=b.attributes.normal,o=pos.length/3;for(let i=0;i<p.count;i++){pos.push(p.getX(i)+px,p.getY(i)+py,p.getZ(i)+pz);nor.push(nn.getX(i),nn.getY(i),nn.getZ(i));}for(const i of b.index.array)idx.push(i+o);b.dispose();}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(nor,3));geo.setIndex(idx);return mesh(g,geo,m);}
  /* crown(g,M,x,bottomY,z,outerW,outerD,scale): top of the molding sits at bottomY + .85*scale */
  function crown(g,M,x,y,z,w,d,scale=1,dent=false){finish(M);const H=.85*scale;mesh(g,sweep(CROWN.map(([u,v])=>[u*H,H+v*H]),w,d),M.mold,x,y,z);if(dent){const s=scale;mesh(g,sweep([[0,0],[.07*s,0],[.07*s,-.24*s],[0,-.24*s]],w,d),M.mold,x,y,z);dentils(g,M.mold,x,y-.12*s,z,w,d,s);mesh(g,sweep([[0,-.24*s],[.05*s,-.24*s],...bez([.05*s,-.24*s],[.08*s,-.28*s],[0,-.32*s],4)],w,d),M.mold,x,y,z);}}
  /* a flat panel molding on a ceiling or wall plane */
  function panelMold(g,M,x,y,z,w,d,s=1){finish(M);mesh(g,sweep([[0,0],[0,-.03*s],...bez([0,-.03*s],[.03*s,-.09*s],[.08*s,-.07*s],4),[.12*s,-.04*s],[.14*s,0]],w,d),M.mold,x,y,z);}
  function medallion(g,M,x,y,z,r=1.1){finish(M);const o=lathe(g,M.mold,[[0,-.14],[.2,-.14],[.24,-.1],[.36,-.1],[.42,-.13],[.5,-.08],[.66,-.07],[.72,-.1],[.8,-.05],[.95,-.04],[1,0]].map(([a,b])=>[a*r,b*r*.9]),40);o.position.set(x,y,z);}
  const GEO={oct:new T.OctahedronGeometry(1,0),ico:new T.IcosahedronGeometry(1,0)};
  function gem(g,m,x,y,z,r,stretch=1.6,geo=GEO.oct){const o=mesh(g,geo,m,x,y,z);o.scale.set(r,r*stretch,r);o.castShadow=false;return o;}
  /* a hanging chain of crystal beads between two points, sagging in the middle */
  function swag(g,m,A,B,sag,n,r){for(let k=1;k<n;k++){const t=k/n;gem(g,m,A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t-sag*4*t*(1-t),A[2]+(B[2]-A[2])*t,r,1,GEO.ico);}}
  function candle(a,M,cup,x,y,z,r){cyl(a,cup,x,y,z,r,.05,r*.55,12);cyl(a,M.trim,x,y+.2,z,.045,.34,.045,10);const f=ball(a,M.bulb,x,y+.44,z,.065,8);f.scale.y=1.8;f.castShadow=false;}
  /* crystal candle-arm chandelier with gold arms (Maria Theresa style, as in the photos), hangs from y */
  function chandelierCrystal(g,M,x,y,z,s){const a=new T.Group();a.position.set(x,y,z);a.scale.setScalar(s);g.add(a);const C=M.cry,Mt=M.gold;
    lathe(a,Mt,[[0,-.26],[.06,-.25],[.14,-.2],[.32,-.12],[.42,-.04],[.44,0]]);for(let i=0;i<4;i++)gem(a,C,0,-.36-i*.15,0,.065,1.25,GEO.ico);
    mesh(a,new T.TorusGeometry(.62,.022,6,40),Mt,0,-.98,0).rotation.x=Math.PI/2;for(let i=0;i<14;i++){const b=i/14*Math.PI*2;gem(a,C,Math.cos(b)*.62,-.78,Math.sin(b)*.62,i%2?.045:.06,i%2?2.2:3.4);}
    lathe(a,C,[[0,-3.95],[.12,-3.85],[.22,-3.62],[.1,-3.4],[.18,-3.15],[.3,-2.95],[.2,-2.7],[.1,-2.42],[.14,-2.1],[.24,-1.86],[.12,-1.6],[.09,-1.35],[.16,-1.15],[.1,-.98],[0,-.95]].reverse().map(p=>p).sort((p,q)=>p[1]-q[1]),20);
    const tiers=[{n:6,r:.95,y:-2.05,cup:.13},{n:10,r:1.65,y:-2.85,cup:.16}];
    for(const T0 of tiers){const tips=[];for(let i=0;i<T0.n;i++){const b=(i+(T0.n===6?.5:0))/T0.n*Math.PI*2,ux=Math.cos(b),uz=Math.sin(b),r=T0.r,yy=T0.y;
      tube(a,Mt,[[ux*.14,yy-.12,uz*.14],[ux*r*.45,yy-.5,uz*r*.45],[ux*r*.88,yy-.42,uz*r*.88],[ux*r,yy-.06,uz*r]],.032);
      candle(a,M,C,ux*r,yy,uz*r,T0.cup);for(let j=0;j<7;j++){const c=j/7*Math.PI*2;gem(a,C,ux*r+Math.cos(c)*T0.cup,yy-.1,uz*r+Math.sin(c)*T0.cup,.03,2.4);}
      gem(a,C,ux*r,yy-.18,uz*r,.035,1,GEO.ico);gem(a,C,ux*r,yy-.28,uz*r,.035,1,GEO.ico);gem(a,C,ux*r,yy-.5,uz*r,.075,2.6);tips.push([ux*(r-.02),yy-.06,uz*(r-.02)]);}
      for(let i=0;i<tips.length;i++){const A=tips[i],B=tips[(i+1)%tips.length];swag(a,C,A,B,.32,9,.03);swag(a,C,A,B,.62,12,.028);}
      if(T0.n===6)for(const A of tips)swag(a,C,[A[0]*.6,-1.0,A[2]*.6],A,.12,10,.028);}
    /* rings of hanging crystal strands between the arms and a teardrop cluster under the lower tier, so the frame reads packed
       with crystal the way the chandeliers in the photos do */
    for(const [rr,yy,n,len] of [[.78,-2.2,12,4],[1.3,-2.62,18,5],[1.58,-3.02,22,4]])for(let i=0;i<n;i++){const b=(i+.5)/n*Math.PI*2,px=Math.cos(b)*rr,pz=Math.sin(b)*rr;for(let k=0;k<len;k++)gem(a,C,px,yy-k*.12,pz,.028,1,GEO.ico);gem(a,C,px,yy-len*.12-.07,pz,.05,2.6);}
    for(let k=0;k<5;k++){const rr=.62*(1-k/5)+.12,yy=-3.3-k*.17,n=Math.max(5,Math.round(14*(1-k/5)));for(let i=0;i<n;i++){const b=(i+k*.5)/n*Math.PI*2;gem(a,C,Math.cos(b)*rr,yy,Math.sin(b)*rr,.045,2.2);}}
    gem(a,C,0,-4.08,0,.13,1,GEO.ico);gem(a,C,0,-4.38,0,.09,2.6);}
  /* the foyer chandelier (foyer.webp): a tall gold frame with four tiers of scrolled candle arms that narrow toward the top,
     dozens of candle bulbs, crystal drops under every arm, crystal swags between the arm tips and a crystal finial */
  function chandelierTiered(g,M,x,y,z,s){const a=new T.Group();a.position.set(x,y,z);a.scale.setScalar(s);g.add(a);const C=M.cry,Gd=M.gold;
    lathe(a,Gd,[[0,-.22],[.08,-.2],[.2,-.14],[.36,-.05],[.4,0]]);cyl(a,Gd,0,-.52,0,.03,.6);
    lathe(a,Gd,[[0,-4.32],[.12,-4.22],[.2,-4.02],[.09,-3.82],[.15,-3.52],[.07,-3.2],[.11,-2.62],[.06,-2.2],[.09,-1.72],[.05,-1.22],[.07,-.86],[0,-.8]],16);
    for(const t of [{n:12,r:1.72,y:-3.55},{n:9,r:1.25,y:-2.78},{n:7,r:.82,y:-2.02},{n:5,r:.46,y:-1.36}]){const tips=[];for(let i=0;i<t.n;i++){const b=(i+(t.n%2?.5:0))/t.n*Math.PI*2,ux=Math.cos(b),uz=Math.sin(b),r=t.r,yy=t.y;
        tube(a,Gd,[[ux*.1,yy-.24,uz*.1],[ux*r*.5,yy-.46,uz*r*.5],[ux*r*.9,yy-.3,uz*r*.9],[ux*r,yy-.05,uz*r]],.03);candle(a,M,Gd,ux*r,yy,uz*r,.1);
        for(let k=1;k<4;k++)gem(a,C,ux*r*.68,yy-.44-k*.1,uz*r*.68,.026,1,GEO.ico);gem(a,C,ux*r*.68,yy-.88,uz*r*.68,.05,2.6);
        gem(a,C,ux*r,yy-.2,uz*r,.034,1,GEO.ico);gem(a,C,ux*r,yy-.38,uz*r,.052,2.4);tips.push([ux*r,yy-.08,uz*r]);}
      for(let i=0;i<tips.length;i++)swag(a,C,tips[i],tips[(i+1)%tips.length],.24,8,.026);
      for(let i=0;i<t.n*2;i++){const b=(i+.25)/(t.n*2)*Math.PI*2,px=Math.cos(b)*t.r*.84,pz=Math.sin(b)*t.r*.84;for(let k=0;k<4;k++)gem(a,C,px,t.y-.5-k*.11,pz,.026,1,GEO.ico);gem(a,C,px,t.y-1.0,pz,.045,2.4);}}
    gem(a,C,0,-4.45,0,.1,1,GEO.ico);gem(a,C,0,-4.75,0,.08,2.6);}
  function chandelier(g,M,x,y,z,scale=1,style='crystal'){finish(M);(style==='tiered'?chandelierTiered:chandelierCrystal)(g,M,x,y,z,scale);}
  /* ===== Interior finishes, matched to Andrew's photos of The Grand (photos/the-grand/current, 2026-10-23) =====
     Porcelain tile floors, white walls with gold trim, stepped coffered ceilings with gold edges and cove light,
     crystal and gold chandeliers, white columns with gold scrollwork, gold round-back chairs with white seats.
     Every texture below is drawn in code; no photo or third-party image is used. */
  const texCache={};
  /* generated textures are reused across rooms; grand.js leaves textures marked keep alone when it clears a room */
  function cached(key,make){if(!texCache[key]){texCache[key]=make();texCache[key].userData={keep:true};}return texCache[key];}
  function noise2(seed){const r=random(seed),perm=new Uint8Array(512),val=new Float32Array(256);for(let i=0;i<256;i++){perm[i]=i;val[i]=r();}for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1)),t=perm[i];perm[i]=perm[j];perm[j]=t;}for(let i=0;i<256;i++)perm[i+256]=perm[i];const sm=t=>t*t*(3-2*t);
    return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),X=xi&255,Y=yi&255,u=sm(x-xi),v=sm(y-yi),a=val[perm[X+perm[Y]]],b=val[perm[X+1+perm[Y]]],c=val[perm[X+perm[Y+1]]],d=val[perm[X+1+perm[Y+1]]];return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};}
  function fbm(n,x,y,oct=4){let s=0,a=.5,f=1,t=0;for(let i=0;i<oct;i++){s+=a*n(x*f,y*f);t+=a;a*=.5;f*=2.03;}return s/t;}

  /* Porcelain tile, 24 x 48 in, polished. One 2048 px atlas holds eight different tile faces (4 x 2, 256 px per foot).
     The floor gives every tile a face and a flip, so the veining varies tile to tile the way a real porcelain run does.
     white: the event rooms (white with soft gray veining). warm: the foyer (cream with beige and brown veining).
     The alpha channel is lower in the grout, so the glaze reflection stops at the joints. */
  const PORCELAIN={
    /* event rooms: white with long gray veins that branch and cross (the calacatta look in the ballroom photos), faint wisps between them */
    white:{seed:2417,base:[241,240,237],dark:[205,206,209],light:[252,252,251],cloud:.2,vein:[124,120,116],soft:'#9a948d',grout:'#c9c6c0',angle:.4,spread:1.2,fields:[{f:1/70,stretch:3,warp:1.2,oct:3,px:true,levels:[[.5,2.2,.25]],floor:0}],jag:.06,band:[.38,.6],mains:[3,5],mainW:[10,18],branches:[2,4],halo:.5,core:1,brk:.008,patch:0,speck:.04},
    /* foyer: cream with broad taupe and brown vein bands, long diagonal patches with broken edges, dark fine lines and specks (foyer.webp) */
    warm:{seed:4107,mains:[2,3],mainW:[16,30],branches:[1,3],base:[238,231,221],dark:[205,176,136],light:[255,251,244],cloud:.3,vein:[104,78,52],soft:'#9c8164',patchColor:[164,132,98],grout:'#bba98f',angle:-.45,spread:1.2,fields:[{f:1/210,stretch:3,warp:1.4,oct:4,levels:[[.5,.026,1],[.4,.012,.55]],floor:.1}],band:[.38,.62],halo:.75,core:.8,patch:.9,patchW:.16,brk:.03,speck:.2}
  };
  /* the atlas is drawn by a generator that yields every few dozen rows (each slice takes a few ms), so it can run in idle time
     without blocking input; run(more) keeps going while more() says there is time left */
  const atlasJobs={};
  function atlasJob(style){if(atlasJobs[style])return atlasJobs[style];const S=PORCELAIN[style],FW=512,FH=1024,HW=256,HH=512,QW=128,QH=256,rand=random(S.seed),noise=noise2(S.seed);
    const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
    const bil=(A,W,H,x,y)=>{x=Math.min(W-1.001,Math.max(0,x));y=Math.min(H-1.001,Math.max(0,y));const i=x|0,j=y|0,u=x-i,v=y-j,k=j*W+i;return (A[k]*(1-u)+A[k+1]*u)*(1-v)+(A[k+W]*(1-u)+A[k+W+1]*u)*v;};
    const WX=new Float32Array(QW*QH),WY=new Float32Array(QW*QH),MK=new Float32Array(QW*QH),CL=new Float32Array(QW*QH),FR=new Float32Array(QW*QH),NF=S.fields.map(()=>new Float32Array(HW*HH)),B=new Float32Array(HW*HH),V=new Float32Array(HW*HH),P=new Float32Array(HW*HH);
    const vc=document.createElement('canvas');vc.width=HW;vc.height=HH;const vx=vc.getContext('2d'),vimg=vx.createImageData(HW,HH);
    /* long flowing veins: a meandering stroke with slow and fast wander, small kinks, and a width that swells and pinches */
    function vein(x,y,a0,len,w0){const pts=[],p1=rand()*6.3,p2=rand()*6.3,p3=rand()*6.3,l1=160+rand()*340,l2=36+rand()*50,lw=60+rand()*140;let drift=0;for(let s=0;s<len;s+=3){drift=drift*.985+(rand()-.5)*.06+(rand()<.03?(rand()-.5)*.9:0);const a=a0+.38*Math.sin(s/l1+p1)+.15*Math.sin(s/l2+p2)+drift;pts.push([x,y,w0*(.22+.78*Math.pow(.5+.5*Math.sin(s/lw+p3),1.4))]);x+=Math.cos(a)*3;y+=Math.sin(a)*3;if(x<-60||y<-60||x>FW+60||y>FH+60)break;}return pts;}
    function strokeAll(c,list,wm,wa){c.lineCap='round';c.lineJoin='round';for(const P2 of list){let q=-1;for(let k=1;k<P2.length;k++){const lw=P2[k][2]*wm+wa,qq=Math.round(lw*4);if(qq!==q){if(q>=0)c.stroke();c.beginPath();c.moveTo(P2[k-1][0],P2[k-1][1]);c.lineWidth=lw;q=qq;}c.lineTo(P2[k][0],P2[k][1]);}if(q>=0)c.stroke();}}
    const lc=document.createElement('canvas');lc.width=FW;lc.height=FH;const lx=lc.getContext('2d');
    /* hairline cracks on top of the noise veins */
    function trace(x,y,a0,len,w0){const pts=[],p1=rand()*6.3,l1=30+rand()*40;let drift=0;for(let s=0;s<len;s+=3){drift=drift*.98+(rand()-.5)*.12;const a=a0+.3*Math.sin(s/l1+p1)+drift;pts.push([x,y,w0*(1-s/len)]);x+=Math.cos(a)*3;y+=Math.sin(a)*3;}return pts;}
    /* branches leave a vein at a shallow angle, meander and taper to nothing; a few grow twigs of their own. Together with the
       long main veins they make the connected, branching net of gray veins seen on the tile in the photos */
    function twig(x,y,a0,len,w0){const pts=[],p1=rand()*6.3,l1=50+rand()*120;let drift=0;for(let s=0;s<len;s+=3){drift=drift*.97+(rand()-.5)*.08+(rand()<.04?(rand()-.5)*.8:0);const a=a0+.28*Math.sin(s/l1+p1)+drift;pts.push([x,y,w0*Math.pow(1-s/len,.6)]);x+=Math.cos(a)*3;y+=Math.sin(a)*3;if(x<-60||y<-60||x>FW+60||y>FH+60)break;}return pts;}
    function grow(list,P,n,wf,lenR,depth){for(let b=0;b<n&&P.length>4;b++){const k=2+Math.floor(rand()*(P.length-3)),[x,y,w]=P[k],[x0,y0]=P[k-2],dir=Math.atan2(y-y0,x-x0)+(rand()<.5?-1:1)*(.45+rand()*.7),B=twig(x,y,dir,lenR[0]+rand()*(lenR[1]-lenR[0]),Math.max(.9,w*wf*(.6+rand()*.5)));if(B.length>3){list.push(B);if(depth>0)grow(list,B,1+Math.floor(rand()*2),.75,[40,170],depth-1);}}}
    const canvas=document.createElement('canvas');canvas.width=FW*4;canvas.height=FH*2;const ax=canvas.getContext('2d');ax.imageSmoothingEnabled=true;ax.imageSmoothingQuality='high';
    function* faces(){for(let f=0;f<8;f++){const ox=(f%4)*FW,oy=(f>>2)*FH,rot=S.angle+(rand()-.5)*S.spread,ca=Math.cos(rot),sa=Math.sin(rot),o=rand()*500;
        // quarter resolution: domain warp, vein bands, clouds and patch breakup (all low frequency)
        for(let j=0;j<QH;j++){for(let i=0;i<QW;i++){const x=i*4+2,y=j*4+2,u=x*ca+y*sa,v=-x*sa+y*ca,k=j*QW+i;WX[k]=fbm(noise,u*.0045+o,v*.008+o*.3,3)-.5;WY[k]=fbm(noise,u*.0045+o*.7+31,v*.008+17,3)-.5;MK[k]=fbm(noise,u*.0022+o*.2+71,v*.0045+5,2);CL[k]=fbm(noise,x*.011+o+3,y*.011+9,4)-.5;FR[k]=fbm(noise,x*S.brk+o+41,y*S.brk+13,3);}if((j&31)===31)yield;}
        // half resolution: vein strength from iso-lines of warped noise fields, stronger inside the bands. Fields marked px measure the
        // distance to the iso-line in pixels (value over gradient), so those veins stay fine and jagged instead of pooling where the noise is flat.
        for(let j=0;j<HH;j++){for(let i=0;i<HW;i++){const x=i*2+1,y=j*2+1,u=x*ca+y*sa,v=-x*sa+y*ca,qx=i/2,qy=j/2,k=j*HW+i,wx=bil(WX,QW,QH,qx,qy),wy=bil(WY,QW,QH,qx,qy),jag=S.jag?(noise(x*.07+o*3,y*.07+o)-.5)*S.jag:0;B[k]=sm(S.band[0],S.band[1],bil(MK,QW,QH,qx,qy));
          S.fields.forEach((F,q)=>{NF[q][k]=fbm(noise,u*F.f+wx*F.warp+jag+o*.5+q*37,v*F.f*F.stretch+wy*F.warp+o*.9+q*19,F.oct);});}if((j&15)===15)yield;}
        for(let j=0;j<HH;j++){for(let i=0;i<HW;i++){const k=j*HW+i,band=B[k],qx=i/2,qy=j/2;let s=0;
          S.fields.forEach((F,q)=>{const A=NF[q],n=A[k],gx=(A[j*HW+Math.min(HW-1,i+1)]-A[j*HW+Math.max(0,i-1)])/2,gy=(A[Math.min(HH-1,j+1)*HW+i]-A[Math.max(0,j-1)*HW+i])/2,g=Math.sqrt(gx*gx+gy*gy)+1e-6,m=(F.floor+(1-F.floor)*band)*(F.px?.3+.7*sm(.34,.6,bil(FR,QW,QH,qx,qy)):1);for(const [lvl,w,amp] of F.levels){const d=F.px?Math.abs(n-lvl)/g:Math.abs(n-lvl);if(d<w)s=Math.max(s,amp*m*(1-d/w));}});
          V[k]=s;if(S.patch)P[k]=band*(1-sm(0,S.patchW,Math.abs(NF[0][k]-.5)))*sm(.42,.6,bil(FR,QW,QH,qx,qy));
          const p=k*4;vimg.data[p]=S.vein[0];vimg.data[p+1]=S.vein[1];vimg.data[p+2]=S.vein[2];vimg.data[p+3]=Math.min(255,V[k]*255);}if((j&31)===31)yield;}
        // full resolution: base, clouds, patches and sharpened veins in one pass
        const img=ax.createImageData(FW,FH),d=img.data;for(let y=0;y<FH;y++){for(let x=0;x<FW;x++){const qx=x/4-.5,qy=y/4-.5,hx=x/2-.5,hy=y/2-.5,c=bil(CL,QW,QH,qx,qy)*S.cloud,ref=c<0?S.dark:S.light,t=Math.min(1,Math.abs(c)*2);let r=S.base[0]+(ref[0]-S.base[0])*t,g=S.base[1]+(ref[1]-S.base[1])*t,b=S.base[2]+(ref[2]-S.base[2])*t;
          if(S.patch){const a=bil(P,HW,HH,hx,hy)*S.patch;r+=(S.patchColor[0]-r)*a;g+=(S.patchColor[1]-g)*a;b+=(S.patchColor[2]-b)*a;}
          const a=sm(.18,.8,bil(V,HW,HH,hx,hy))*S.core;r+=(S.vein[0]-r)*a;g+=(S.vein[1]-g)*a;b+=(S.vein[2]-b)*a;const p=(y*FW+x)*4;d[p]=r;d[p+1]=g;d[p+2]=b;d[p+3]=255;}if((y&63)===63)yield;}
        ax.putImageData(img,ox,oy);yield;ax.save();ax.beginPath();ax.rect(ox,oy,FW,FH);ax.clip();
        // a soft halo around the veins (a blurred shadow of the vein image), hairline cracks and specks
        vx.putImageData(vimg,0,0);ax.save();ax.globalAlpha=S.halo;ax.shadowColor=S.soft;ax.shadowBlur=16;ax.shadowOffsetX=8192;ax.drawImage(vc,ox-8192,oy,FW,FH);ax.restore();yield;
        const mains=[];for(let i=0,m=S.mains[0]+Math.floor(rand()*(S.mains[1]-S.mains[0]+1));i<m;i++){const cx=rand()*FW,cy=rand()*FH,a=rot+(rand()-.5)*.6,w0=S.mainW[0]+rand()*(S.mainW[1]-S.mainW[0]);mains.push(vein(cx,cy,a+Math.PI,2000,w0).reverse().concat(vein(cx,cy,a,2000,w0)));}if(S.branches)for(const P of mains.slice())grow(mains,P,S.branches[0]+Math.floor(rand()*(S.branches[1]-S.branches[0]+1)),.6,[140,560],1);
        if(mains.length){lx.clearRect(0,0,FW,FH);lx.strokeStyle='#000';strokeAll(lx,mains,1.8,8);ax.save();ax.globalAlpha=S.halo;ax.shadowColor=S.soft;ax.shadowBlur=22;ax.shadowOffsetX=8192;ax.drawImage(lc,ox-8192,oy);ax.restore();lx.clearRect(0,0,FW,FH);lx.strokeStyle=`rgb(${S.vein.join(',')})`;strokeAll(lx,mains,.55,.3);ax.globalAlpha=S.core*.85;ax.drawImage(lc,ox,oy);ax.globalAlpha=1;yield;}
        ax.strokeStyle=`rgba(${S.vein.join(',')},.45)`;ax.lineCap='round';for(let i=0,m=3+rand()*5;i<m;i++){const P2=trace(ox+rand()*FW,oy+rand()*FH,rot+(rand()-.5)*2,40+rand()*160,.6+rand()*.6);for(let k=1;k<P2.length;k++){ax.lineWidth=Math.max(.3,P2[k][2]);ax.beginPath();ax.moveTo(P2[k-1][0],P2[k-1][1]);ax.lineTo(P2[k][0],P2[k][1]);ax.stroke();}}
        for(let i=0;i<2600*S.speck;i++){ax.fillStyle=`rgba(${rand()<.5?'120,90,60':'95,95,95'},${(.12+rand()*.25).toFixed(2)})`;ax.fillRect(ox+rand()*FW,oy+rand()*FH,.8+rand()*1.2,.8+rand()*1.2);}
        // rectified edge and thin grout (about 3/16 in between two tiles); lower alpha in the grout stops the glaze reflection there
        ax.strokeStyle='rgba(60,50,40,.08)';ax.lineWidth=2;ax.strokeRect(ox+3,oy+3,FW-6,FH-6);ax.strokeStyle=S.grout;ax.lineWidth=4;ax.strokeRect(ox,oy,FW,FH);
        ax.globalCompositeOperation='destination-out';ax.globalAlpha=.24;ax.strokeRect(ox,oy,FW,FH);ax.globalCompositeOperation='source-over';ax.globalAlpha=1;ax.restore();yield;}}
    const it=faces();let done=false;
    return atlasJobs[style]={canvas,run(more){while(!done){done=!!it.next().done;if(done||!more())break;}return done;}};}
  /* A finished atlas becomes a texture. A floor built before its atlas is ready shows plain tile (same face layout, grout and glaze
     alpha) and switches to the veined atlas as soon as the idle work finishes it, so opening a room never waits for the atlas. */
  const atlasQueue=[],atlasWaiters={},later=[];let atlasPumping=false;
  const idle=fn=>window.requestIdleCallback?requestIdleCallback(fn,{timeout:1200}):setTimeout(()=>fn(null),40);
  function atlasTexture(style){return cached('tile-'+style,()=>{const tx=new T.CanvasTexture(atlasJob(style).canvas);tx.encoding=T.sRGBEncoding;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=16;return tx;});}
  function plainTile(style){return cached('plain-'+style,()=>{const S=PORCELAIN[style];return canvasTexture(1024,1024,(c,w,h)=>{c.fillStyle=`rgb(${S.base.join(',')})`;c.fillRect(0,0,w,h);c.strokeStyle=S.grout;c.lineWidth=2;const grout=()=>{for(let f=0;f<8;f++)c.strokeRect((f%4)*256,(f>>2)*512,256,512);};grout();c.globalCompositeOperation='destination-out';c.globalAlpha=.24;grout();});});}
  /* one idle callback runs atlas slices while the browser reports spare time (or about 10 ms when it does not), then yields;
     while a room on screen is waiting for its tile it takes about 12 ms per callback, which still leaves room for the 30 fps render */
  function pumpAtlas(){if(atlasPumping)return;atlasPumping=true;const tick=dl=>{const t0=performance.now(),urgent=(atlasWaiters[atlasQueue[0]]||[]).length>0,more=()=>urgent?performance.now()-t0<12:dl&&!dl.didTimeout?dl.timeRemaining()>4:performance.now()-t0<10;
      while(atlasQueue.length){const s=atlasQueue[0];if(!atlasJob(s).run(more))break;atlasQueue.shift();const tx=atlasTexture(s);(atlasWaiters[s]||[]).splice(0).forEach(fn=>fn(tx));if(!more())break;}
      if(atlasQueue.length)idle(tick);else if(later.length){later.shift()();idle(tick);}else atlasPumping=false;};idle(tick);}
  function needAtlas(style,first){const i=atlasQueue.indexOf(style);if(i>=0)atlasQueue.splice(i,1);if(texCache['tile-'+style])return;if(first)atlasQueue.unshift(style);else atlasQueue.push(style);pumpAtlas();}
  /* draws the tile atlases and gilding textures in idle time after the page loads, so the first room usually opens with them ready */
  function prewarm(){later.push(ornamentTexture,chairBackTexture,friezeTexture,contactShadowTexture);needAtlas('white');needAtlas('warm');}

  /* Planar reflection for the polished tile: each frame the room is drawn once more from a camera mirrored under the floor,
     into a full-size target (at most 2400 px wide), so laser-cut chair backs and chandelier arms reflect as clean shapes.
     The floor blends it in by a Fresnel term (weak underfoot, strong toward the far walls),
     softened by mip blur and four taps, broken slightly per tile and stopped at the grout. */
  function planarMirror(material,strength){const rt=new T.WebGLRenderTarget(64,64,{minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat});rt.texture.generateMipmaps=true;rt.texture.encoding=T.sRGBEncoding;
    const cam=new T.PerspectiveCamera(),texMatrix=new T.Matrix4(),pos=new T.Vector3(),dir=new T.Vector3(),up=new T.Vector3(),size=new T.Vector2();let busy=false,checked=false;
    const uniforms={mirrorMap:{value:rt.texture},mirrorMatrix:{value:texMatrix},mirrorStrength:{value:strength},mirrorTexel:{value:new T.Vector2(1/64,1/64)}};
    material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,uniforms);
      sh.vertexShader='attribute vec2 tilt;\nuniform mat4 mirrorMatrix;\nvarying vec4 vMirror;\nvarying vec2 vTilt;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n\tvMirror = mirrorMatrix * modelMatrix * vec4( transformed, 1.0 );\n\tvTilt = tilt;');
      sh.fragmentShader='uniform sampler2D mirrorMap;\nuniform float mirrorStrength;\nuniform vec2 mirrorTexel;\nvarying vec4 vMirror;\nvarying vec2 vTilt;\n'+sh.fragmentShader.replace('#include <encodings_fragment>',['#include <encodings_fragment>','{',
        '\tfloat glaze = smoothstep( 0.8, 0.97, texelColor.a );',
        '\tfloat facing = clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 );',
        '\tfloat fresnel = 0.04 + 0.96 * pow( 1.0 - facing, 5.0 );',
        '\tvec4 mc = vMirror; mc.xy += vTilt * 0.006 * mc.w;',
        '\tvec2 o = mirrorTexel * 1.6 * mc.w;',
        '\tvec3 refl = texture2DProj( mirrorMap, mc, 0.6 ).rgb * 0.36',
        '\t\t+ texture2DProj( mirrorMap, mc + vec4( o.x, o.y, 0.0, 0.0 ), 0.6 ).rgb * 0.16 + texture2DProj( mirrorMap, mc + vec4( -o.x, o.y, 0.0, 0.0 ), 0.6 ).rgb * 0.16',
        '\t\t+ texture2DProj( mirrorMap, mc + vec4( o.x, -o.y, 0.0, 0.0 ), 0.6 ).rgb * 0.16 + texture2DProj( mirrorMap, mc + vec4( -o.x, -o.y, 0.0, 0.0 ), 0.6 ).rgb * 0.16;',
        '\tgl_FragColor.rgb = mix( gl_FragColor.rgb, refl, clamp( fresnel * mirrorStrength * glaze, 0.0, 0.42 ) );','}'].join('\n'));};
    material.customProgramCacheKey=()=>'grand-porcelain-mirror';material.addEventListener('dispose',()=>rt.dispose());
    return obj=>(renderer,scene,camera)=>{if(busy)return;busy=true;
      if(!checked){checked=true;if(!renderer.capabilities.isWebGL2){rt.texture.generateMipmaps=false;rt.texture.minFilter=T.LinearFilter;}}
      renderer.getDrawingBufferSize(size);const q=Math.min(1,2400/size.x),W=Math.max(64,Math.round(size.x*q)),H=Math.max(64,Math.round(size.y*q));if(rt.width!==W||rt.height!==H){rt.setSize(W,H);uniforms.mirrorTexel.value.set(1/W,1/H);}
      const y0=obj.matrixWorld.elements[13];camera.getWorldPosition(pos);camera.getWorldDirection(dir);up.set(0,1,0).applyQuaternion(camera.quaternion);
      cam.position.set(pos.x,2*y0-pos.y,pos.z);dir.add(pos);dir.y=2*y0-dir.y;up.y=-up.y;cam.up.copy(up);cam.lookAt(dir);cam.projectionMatrix.copy(camera.projectionMatrix);cam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);cam.updateMatrixWorld();cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      texMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      const target=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate;obj.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(rt);renderer.state.buffers.depth.setMask(true);if(!renderer.autoClear)renderer.clear();renderer.render(scene,cam);renderer.setRenderTarget(target);renderer.shadowMap.autoUpdate=shadows;obj.visible=true;busy=false;};}

  /* the floor: one quad per 24 x 48 in tile, laid from the room center so cut tiles are even at opposite walls.
     Polished porcelain is very smooth (roughness .08), so the lights reflect as small bright spots, as in the photos, instead of a
     broad haze; the slightly gray albedo keeps the floor a step darker than the walls, as it photographs. */
  function tileFloor(w,d,style,seed){const TW=2,TL=4,rand=random(seed),pos=[],uv=[],col=[],tilt=[],idx=[];
    for(let kz=Math.floor(-d/2/TL);kz<Math.ceil(d/2/TL);kz++)for(let kx=Math.floor(-w/2/TW);kx<Math.ceil(w/2/TW);kx++){const X0=kx*TW,Z0=kz*TL,x0=Math.max(X0,-w/2),x1=Math.min(X0+TW,w/2),z0=Math.max(Z0,-d/2),z1=Math.min(Z0+TL,d/2);if(x1-x0<.01||z1-z0<.01)continue;
      const f=Math.floor(rand()*8),fu=rand()<.5,fv=rand()<.5,tint=1+(rand()-.5)*.03,tx=rand()-.5,tz=rand()-.5,base=pos.length/3;
      for(const [x,z] of [[x0,z0],[x0,z1],[x1,z0],[x1,z1]]){let s=(x-X0)/TW,t=(z-Z0)/TL;if(fu)s=1-s;if(fv)t=1-t;pos.push(x,0,z);uv.push(((f%4)+s)/4,1-((f>>2)+t)/2);col.push(tint,tint,tint);tilt.push(tx,tz);}
      idx.push(base,base+1,base+2,base+2,base+1,base+3);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setAttribute('tilt',new T.Float32BufferAttribute(tilt,2));geo.setIndex(idx);geo.computeVertexNormals();
    const ready=texCache['tile-'+style],m=new T.MeshStandardMaterial({map:ready||plainTile(style),color:style==='warm'?'#e2ded8':'#d4d2ce',vertexColors:true,roughness:.08,metalness:0,envMapIntensity:.15}),floor=new T.Mesh(geo,m);if(!ready){(atlasWaiters[style]||(atlasWaiters[style]=[])).push(tx=>{m.map=tx;});needAtlas(style,true);}floor.receiveShadow=true;floor.name='porcelain-floor';floor.onBeforeRender=planarMirror(m,style==='warm'?1.15:1)(floor);return floor;}

  /* an interior environment for reflections in gold, crystal and glaze: white room, recessed lights, warm chandelier glow */
  function interiorEnvironment(renderer){const tx=canvasTexture(1024,512,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#f6f1e8');g.addColorStop(.34,'#ebe4d8');g.addColorStop(.4,'#d9cfbf');g.addColorStop(.47,'#efe9de');g.addColorStop(.53,'#c9bfb0');g.addColorStop(.7,'#b7ad9e');g.addColorStop(1,'#8f877b');c.fillStyle=g;c.fillRect(0,0,w,h);
      const glow=(x,y,r,a,col)=>{const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${col},${a})`);gr.addColorStop(1,`rgba(${col},0)`);c.fillStyle=gr;c.fillRect(x-r,y-r,2*r,2*r);};
      for(let row=0;row<5;row++)for(let i=0;i<24;i++)glow((i+row*.5)/24*w,22+row*34,9,1,'255,255,250');for(let i=0;i<6;i++)glow((i+.3)/6*w,168+(i%2)*18,36,1,'255,228,176');
      c.fillStyle='rgba(196,152,72,.6)';c.fillRect(0,204,w,3);c.fillRect(0,282,w,2);for(let i=0;i<16;i++)c.fillRect(i/16*w,208,3,74);});
    tx.mapping=T.EquirectangularReflectionMapping;const pm=new T.PMREMGenerator(renderer),target=pm.fromEquirectangular(tx);pm.dispose();tx.dispose();return target.texture;}

  /* gilding drawn on canvas: a dark offset for depth, a gold gradient body, a pale highlight */
  function relief(c,paint,lw,h){const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#f6dc93');gr.addColorStop(.35,'#d3a650');gr.addColorStop(.7,'#b98a3c');gr.addColorStop(1,'#e2bd6c');
    for(const [dx,dy,style,k] of [[1.6,2.2,'rgba(78,50,16,.55)',lw+2.5],[0,0,gr,lw],[-.8,-1.1,'rgba(255,247,214,.9)',lw*.3]]){c.save();c.translate(dx,dy);c.strokeStyle=style;c.lineWidth=k;c.lineCap='round';c.lineJoin='round';paint();c.restore();}}
  function reliefDots(c,dots,h){const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#f6dc93');gr.addColorStop(.5,'#c99a45');gr.addColorStop(1,'#e2bd6c');for(const [x,y,r] of dots){c.fillStyle='rgba(78,50,16,.55)';c.beginPath();c.arc(x+1.6,y+2.2,r+1,0,7);c.fill();c.fillStyle=gr;c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle='rgba(255,247,214,.85)';c.beginPath();c.arc(x-r*.3,y-r*.35,r*.35,0,7);c.fill();}}
  const mirrorPaint=(c,w,half)=>()=>{c.beginPath();half(v=>w/2+v);half(v=>w/2-v);c.stroke();};
  /* the scrollwork on each column face and at the top of each pilaster */
  function ornamentTexture(){return cached('ornament',()=>canvasTexture(256,640,(c,w,h)=>{const half=X=>{
      c.moveTo(X(0),42);c.quadraticCurveTo(X(26),16,X(46),38);c.quadraticCurveTo(X(32),48,X(10),60);
      c.moveTo(X(4),72);c.bezierCurveTo(X(70),58,X(116),110,X(96),168);c.bezierCurveTo(X(84),204,X(40),200,X(44),170);c.bezierCurveTo(X(47),148,X(76),150,X(74),172);
      c.moveTo(X(6),110);c.bezierCurveTo(X(40),120,X(54),150,X(30),178);
      c.moveTo(X(4),216);c.bezierCurveTo(X(60),214,X(92),258,X(70),300);c.bezierCurveTo(X(56),326,X(26),316,X(32),294);c.bezierCurveTo(X(37),278,X(58),284,X(54),300);
      c.moveTo(X(4),332);c.bezierCurveTo(X(48),342,X(62),384,X(40),414);c.moveTo(X(4),422);c.bezierCurveTo(X(38),432,X(46),466,X(28),490);c.moveTo(X(4),500);c.bezierCurveTo(X(26),510,X(30),536,X(18),556);
      c.moveTo(X(2),566);c.bezierCurveTo(X(30),572,X(40),600,X(22),612);c.bezierCurveTo(X(10),620,X(4),606,X(14),600);};
    const paint=mirrorPaint(c,w,half);relief(c,()=>{paint();c.beginPath();c.moveTo(w/2,58);c.lineTo(w/2,604);c.stroke();},10,h);reliefDots(c,[[w/2,66,9],[w/2,207,12],[w/2,324,9],[w/2,560,8],[w/2,626,7]],h);}));}
  /* the laser-cut scroll pattern in the gold round chair backs */
  function chairBackTexture(){return cached('chair-back',()=>canvasTexture(256,320,(c,w,h)=>{const half=X=>{
      c.moveTo(X(0),66);c.bezierCurveTo(X(40),16,X(104),50,X(88),108);c.bezierCurveTo(X(78),140,X(38),140,X(40),114);c.bezierCurveTo(X(42),96,X(66),96,X(66),114);
      c.moveTo(X(0),160);c.bezierCurveTo(X(56),138,X(106),170,X(96),210);c.bezierCurveTo(X(88),242,X(54),240,X(57),214);c.bezierCurveTo(X(59),200,X(77),203,X(75),216);
      c.moveTo(X(0),222);c.bezierCurveTo(X(30),252,X(72),262,X(62),302);c.moveTo(X(88),108);c.bezierCurveTo(X(102),126,X(110),142,X(112),156);};
    const paint=mirrorPaint(c,w,half);relief(c,()=>{c.beginPath();c.ellipse(w/2,h/2,112,148,0,0,7);c.stroke();paint();c.beginPath();c.moveTo(w/2,18);c.lineTo(w/2,302);c.stroke();},13,h);reliefDots(c,[[w/2,160,13]],h);}));}
  /* the gold frieze under the crown molding: a running scroll that repeats every 2 ft */
  function friezeTexture(){return cached('frieze',()=>canvasTexture(512,64,(c,w,h)=>{relief(c,()=>{c.beginPath();for(let k=-1;k<=4;k++){const x=k*128;c.moveTo(x,44);c.bezierCurveTo(x+30,44,x+40,14,x+66,16);c.bezierCurveTo(x+92,18,x+96,40,x+80,42);c.bezierCurveTo(x+68,44,x+66,30,x+76,30);c.moveTo(x+18,44);c.quadraticCurveTo(x+30,58,x+48,52);}c.moveTo(0,6);c.lineTo(w,6);c.moveTo(0,58);c.lineTo(w,58);c.stroke();},5,h);}));}
  function contactShadowTexture(){return cached('contact',()=>canvasTexture(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(.55,'rgba(0,0,0,.28)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,w,h);}));}
  const goldDecal=map=>new T.MeshStandardMaterial({map,alphaTest:.45,metalness:.85,roughness:.24,envMapIntensity:1.35,side:T.DoubleSide});
  function interiorPalette(cloth,floral){const M=finish(palette(cloth,floral));return Object.assign(M,{
    wall:material('#f8f6f1',{roughness:.36,envMapIntensity:.45}),trim:material('#fcfbf7',{roughness:.4,envMapIntensity:.35}),ivory:material('#f6f3ec',{roughness:.45}),mold:material('#fcfbf7',{roughness:.4,side:T.DoubleSide,envMapIntensity:.35}),
    gold:material('#c99a3e',{metalness:.92,roughness:.24,envMapIntensity:1.4}),seat:material('#fbfaf6',{roughness:.3,envMapIntensity:.55}),door:material('#f7f5f0',{roughness:.3,envMapIntensity:.5}),
    orn:goldDecal(ornamentTexture()),frieze:goldDecal(friezeTexture()),back:goldDecal(chairBackTexture()),
    shadow:new T.MeshBasicMaterial({map:contactShadowTexture(),color:'#3f3628',transparent:true,depthWrite:false,opacity:.55}),
    spandex:material('#141414',{roughness:.5,envMapIntensity:.35}),vase:material('#e6f0ee',{metalness:.1,roughness:.05,transparent:true,opacity:.4,envMapIntensity:1.2})});}
  function goldRect(g,M,x,y,z,w,h,t=.035){box(g,M.gold,x,y-h/2,z,w+t,t,.02);box(g,M.gold,x,y+h/2,z,w+t,t,.02);box(g,M.gold,x-w/2,y,z,t,h,.02);box(g,M.gold,x+w/2,y,z,t,h,.02);}
  function decal(g,m,x,y,z,w,h,ry=0){const o=mesh(g,new T.PlaneGeometry(w,h),m,x,y,z);o.rotation.y=ry;o.castShadow=false;return o;}
  /* the LED cove light in the ceiling trays: a band of light rising from each step (vertical), and a soft wash on the tray ceiling (flat) */
  function coveGlow(vertical){const tx=canvasTexture(vertical?16:256,vertical?128:256,(c,w,h)=>{c.fillStyle='#000';c.fillRect(0,0,w,h);if(vertical){const gr=c.createLinearGradient(0,h,0,0);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(.3,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.fillRect(0,0,w,h);return;}c.globalCompositeOperation='lighter';for(const [x0,y0,x1,y1] of [[0,0,0,1],[0,1,0,0],[0,0,1,0],[1,0,0,0]]){const gr=c.createLinearGradient(x0*w,y0*h,(x0+(x1-x0)*.3)*w,(y0+(y1-y0)*.3)*h);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.fillRect(0,0,w,h);}},false);tx.wrapS=tx.wrapT=T.ClampToEdgeWrapping;
    const m=new T.MeshStandardMaterial({color:'#000000',emissive:'#ffd8a0',emissiveMap:tx,alphaMap:tx,transparent:true,depthWrite:false,blending:vertical?T.NormalBlending:T.AdditiveBlending,side:T.DoubleSide});m.userData.cove=vertical?1.3:.45;return m;}
  /* gold round-back chair with a laser-cut scroll back and a white leather seat (the default chair in the photos) */
  function chair(g,M,x,z,a){const c=new T.Group();c.position.set(x,0,z);c.rotation.y=a;g.add(c);
    for(const sx of [-1,1]){tube(c,M.gold,[[sx*.5,.02,.52],[sx*.45,.62,.44],[sx*.43,1.3,.42]],.045);tube(c,M.gold,[[sx*.53,.02,-.66],[sx*.46,.7,-.47],[sx*.43,1.3,-.42]],.045);tube(c,M.gold,[[sx*.43,1.32,-.44],[sx*.4,1.85,-.53],[sx*.24,1.95,-.56]],.04);}
    box(c,M.gold,0,1.33,0,.98,.1,.96);box(c,M.seat,0,1.5,0,.94,.24,.92);box(c,M.seat,0,1.63,0,.86,.04,.84);
    const rim=mesh(c,new T.TorusGeometry(.6,.055,8,44),M.gold,0,2.5,-.56);rim.scale.y=1.18;const disc=mesh(c,new T.CircleGeometry(.6,44),M.back,0,2.5,-.56);disc.scale.y=1.18;disc.castShadow=false;ball(c,M.gold,0,3.24,-.56,.07,8);}
  /* tall gold candelabra centerpiece with a ball of flowers, as on the tables in the photos */
  function flowers(g,M,x,y,z,r=.6){const top=y+.15;cyl(g,M.gold,x,(2.82+top-r*.6)/2,z,.05,top-r*.6-2.82,.08,10);cyl(g,M.gold,x,2.86,z,.32,.08,.36,18);for(const sg of [-1,1]){tube(g,M.gold,[[x,top-r-.45,z],[x+sg*.55,top-r-.2,z],[x+sg*.62,top-r+.1,z]],.03);cyl(g,M.trim,x+sg*.62,top-r+.25,z,.05,.3,.05,8);}
    const n=46;for(let i=0;i<n;i++){const yy=1-2*(i+.5)/n,rr=Math.sqrt(1-yy*yy),a=i*2.399,px=x+Math.cos(a)*rr*r,pz=z+Math.sin(a)*rr*r,py=top+yy*r*.8;if(yy<-.75)continue;if(i%3===0){const l=ball(g,M.leaf,px,py-.06,pz,.11,6);l.scale.set(1.3,.4,1.3);l.castShadow=false;}for(let k=0;k<4;k++){const p=ball(g,M.flower,px+Math.cos(k*1.57+a)*.07,py+.03,pz+Math.sin(k*1.57+a)*.07,.12,6);p.castShadow=false;}}}
  function table(g,M,x,z,r=2.5,seats=8){const geo=new T.CylinderGeometry(r,r,2.7,64,8,true),p=geo.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),f=(1.35-p.getY(i))/2.7,rr=r+Math.sin(a*26)*.07*f;p.setX(i,Math.cos(a)*rr);p.setZ(i,Math.sin(a)*rr);}geo.computeVertexNormals();mesh(g,geo,M.linen,x,1.36,z);cyl(g,M.linen,x,2.73,z,r,.08,r,32);const overlay=new T.CircleGeometry(r*.70,64),op=overlay.attributes.position;for(let j=1;j<op.count;j++){const a=Math.atan2(op.getY(j),op.getX(j)),rr=r*.70*(1+.07*Math.sin(a*11));op.setX(j,Math.cos(a)*rr);op.setY(j,Math.sin(a)*rr);op.setZ(j,Math.sin(a*9)*.045);}overlay.computeVertexNormals();const cover=mesh(g,overlay,M.runner,x,2.81,z);cover.rotation.x=-Math.PI/2;flowers(g,M,x,5.3,z,.62);
    if(M.shadow){const sh=mesh(g,new T.PlaneGeometry(2*r+3.6,2*r+3.6),M.shadow,x,.03,z);sh.rotation.x=-Math.PI/2;sh.castShadow=sh.receiveShadow=false;}
    for(let i=0;i<seats;i++){const a=i/seats*Math.PI*2,s=Math.sin(a),c=Math.cos(a);chair(g,M,x+s*(r+1),z+c*(r+1),a+Math.PI);const px=x+s*(r-.6),pz=z+c*(r-.6);cyl(g,M.gold,px,2.81,pz,.38,.035,.38,14);cyl(g,M.trim,px,2.84,pz,.32,.03,.32,14);box(g,M.linen,px,2.89,pz,.22,.04,.45);cyl(g,M.crystal,px+.4,2.97,pz,.025,.21,.025,7);ball(g,M.crystal,px+.4,3.16,pz,.12);}}
  /* cocktail table in a black spandex cover with a small white arrangement, as in the foyer photo */
  function cocktail(g,M,x,z){lathe(g,M.spandex,[[0,0],[1.05,0],[1.0,.12],[.62,1.1],[.5,2.0],[.62,2.9],[1.15,3.45],[1.32,3.55],[0,3.58]],28).position.set(x,0,z);cyl(g,M.vase,x,3.78,z,.16,.4,.16,12);for(let i=0;i<9;i++){const a=i*2.4,rr=i?.18:0;ball(g,M.flower,x+Math.cos(a)*rr,4.08+(i?0:.06),z+Math.sin(a)*rr,.14,7);}if(M.shadow){const sh=mesh(g,new T.PlaneGeometry(3.4,3.4),M.shadow,x,.03,z);sh.rotation.x=-Math.PI/2;sh.castShadow=sh.receiveShadow=false;}}
  function batch(group){group.updateMatrixWorld(true);const bins=new Map(),original=[],inv=new T.Matrix4().copy(group.matrixWorld).invert();group.traverse(o=>{if(!o.isMesh)return;original.push(o);let b=bins.get(o.material);if(!b){b={chunks:[],v:0,i:0};bins.set(o.material,b);}const g=o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;b.chunks.push({p:p.array,n:n?.array,u:u?.array,i:g.index?.array,count:p.count,offset:b.v});b.v+=p.count;b.i+=g.index?.count||p.count;g.dispose();});for(const o of original){o.parent.remove(o);o.geometry.dispose();}for(const[m,b]of bins){const p=new Float32Array(b.v*3),n=new Float32Array(b.v*3),u=new Float32Array(b.v*2),ix=new Uint32Array(b.i);let at=0;for(const c of b.chunks){p.set(c.p,c.offset*3);if(c.n)n.set(c.n,c.offset*3);if(c.u)u.set(c.u,c.offset*2);if(c.i)for(const i of c.i)ix[at++]=i+c.offset;else for(let i=0;i<c.count;i++)ix[at++]=i+c.offset;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(n,3));g.setAttribute('uv',new T.BufferAttribute(u,2));g.setIndex(new T.BufferAttribute(ix,1));g.computeBoundingSphere();mesh(group,g,m);}}
  function diamond(g,M,x,y,z,s=1){const a=box(g,M.bronze,x,y,z,s,.9*s,.15);a.rotation.z=Math.PI/4;const b=box(g,M.gold,x,y,z+.11,s*.78,s*.7,.1);b.rotation.z=Math.PI/4;const c=box(g,M.bronze,x,y,z+.19,s*.55,s*.5,.1);c.rotation.z=Math.PI/4;const d=mesh(g,new T.ConeGeometry(s*.28,.35,4),M.gold,x,y,z+.35);d.rotation.x=Math.PI/2;d.rotation.z=Math.PI/4;}
  function canopy(g,m,y,w=33,depth=7,thick=1.1){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,-2.2);s.quadraticCurveTo(0,-2*depth+2.2,-w/2,-2.2);s.closePath();const o=mesh(g,new T.ExtrudeGeometry(s,{depth:thick,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.1,bevelThickness:.08,curveSegments:36}),m,0,y,64.5);o.rotation.x=-Math.PI/2;}
  function tree(g,M,x,z,s=1){tube(g,M.walnut,[[x,0,z],[x+.3,7*s,z],[x-.4,13*s,z]],.23*s);const rand=random(Math.round(x*9+z));for(let i=0;i<8;i++){const a=i*.79,dx=Math.cos(a)*4*s,dz=Math.sin(a)*4*s; tube(g,M.walnut,[[x,6*s,z],[x+dx*.5,11*s,z+dz*.5],[x+dx,14*s,z+dz]],.10*s);for(let k=0;k<7;k++){const r=.9*s+rand()*1.5*s,leaf=mesh(g,new T.IcosahedronGeometry(r,1),i%2?M.leaf:material('#647044'),x+dx+(rand()-.5)*3*s,(13+rand()*4)*s,z+dz+(rand()-.5)*3*s);leaf.scale.y=.65;}}}
  function buildExterior(g){const M=palette(),stone=limestone(),bronze=M.bronze,night=[];const front=64.3;const roadMap=canvasTexture(512,512,c=>{const r=random(121);c.fillStyle='#7a776f';c.fillRect(0,0,512,512);for(let i=0;i<24000;i++){c.fillStyle=r()>.5?'rgba(15,20,21,.16)':'rgba(185,181,164,.17)';c.fillRect(r()*512,r()*512,1+r(),1);}});roadMap.repeat.set(45,35);const asphalt=material('#ffffff',{map:roadMap,roughness:1}),pavement=material('#b4aa96',{roughness:.86});box(g,pavement,0,-.55,3,170,1,150);box(g,asphalt,0,-.8,250,650,.2,380);box(g,pavement,0,-.25,72,175,.45,17);for(let x=-88;x<90;x+=8)box(g,material('#847d6f'),x,.0,72,.03,.015,17);for(let z=66;z<81;z+=4)box(g,material('#847d6f'),0,.0,z,175,.015,.03);for(let x=-85;x<90;x+=17)box(g,material('#d8d1bc'),x,-.67,95,8,.015,.20);/* exterior pass 3 */const stucco=material('#e8decb',{roughness:.93}),reveal=material('#cbbfa9',{roughness:.9});box(g,stucco,0,11,0,137,22,127);box(g,material('#635e51'),0,22.12,0,135,.2,125);
    // Upper brick spandrels, limestone belt course and parapet cornices.
    box(g,stucco,0,17.8,front,137,8.6,.45);for(const y of [16.4,19.6])box(g,reveal,0,y,front+.25,137,.09,.05);for(const y of [.35,13.5])box(g,stone,0,y,front+.22,139,y===13.5?1.2:.42,1.0);for(const y of [22.0,22.45])for(const sg of [-1,1])box(g,stone,sg*42.75,y,front+.22,53.5,.42,1.0);
    for(const x of [-68,-18,18,68]){const ph=Math.abs(x)===18?28:23.5;box(g,stone,x,ph/2,front+.5,3.1,ph,1.4);for(const dx of [-1.15,1.15])box(g,M.gold,x+dx,ph/2+.3,front+1.24,.075,ph-2,.075);box(g,stone,x,ph+.3,front+.6,4.0,.6,1.65);box(g,bronze,x,ph-3,front+1.26,2.25,2.8,.15);diamond(g,M,x,ph-3,front+1.38,1.28);}
    // Main central limestone crown: the reference's stepped silhouette.
    box(g,stone,0,18,front-6,32,36,13);box(g,stone,0,35.7,front+.25,33,.7,1.7);box(g,stone,0,36.9,front-.2,26,1.7,1.5);box(g,stone,0,38.4,front-.4,19,1.3,1.3);box(g,stone,0,39.5,front-.6,12,.9,1.1);for(let x=-14;x<=14.1;x+=1.4)box(g,bronze,x,34.6,front+.62,.34,.55,.12);for(const x of [-14.6,14.6])box(g,M.gold,x,24.5,front+.55,.07,19,.06);box(g,M.gold,0,33.6,front+.55,29.3,.07,.06);const nameTx=canvasTexture(2048,256,c=>{c.clearRect(0,0,2048,256);c.font='500 170px "Cormorant Garamond","Cormorant",Georgia,serif';c.textAlign='center';c.textBaseline='middle';const t='THE  GRAND'.split('').join('\u2009\u2009');const gr=c.createLinearGradient(0,40,0,220);gr.addColorStop(0,'#e9cf8f');gr.addColorStop(.5,'#b88a3e');gr.addColorStop(1,'#7c5a26');c.fillStyle='rgba(40,28,14,.35)';c.fillText(t,1028,138);c.fillStyle=gr;c.fillText(t,1024,132);});nameTx.repeat.set(1,1);const nameMat=material('#ffffff',{map:nameTx,transparent:true,alphaTest:.25,metalness:.55,roughness:.35,emissive:'#6b4b1c',emissiveMap:nameTx,emissiveIntensity:.25});mesh(g,new T.PlaneGeometry(23,2.9),nameMat,0,30.5,front+.56);for(const x of [-56,-43,-30,30,43,56])diamond(g,M,x,18,front+.58,1.45);
    // Recessed, illuminated storefront bays with real interior depth.
    const warm=storefront();night.push(warm,M.bulb);const glass=material('#c2d3cb',{transparent:true,opacity:.07,metalness:.12,roughness:.12,depthWrite:false,envMapIntensity:.25});
    for(const sign of [-1,1])for(let j=0;j<4;j++){const x=sign*(24+j*11.5),door=j===3,w=door?6.5:9.2,hh=door?11.9:11.2,base=door?.35:1.3;box(g,brick(w,12),x,6.6,front+.06,w+1,12,.3);box(g,warm,x,base+hh/2,front+.99,w-.3,hh,.04);box(g,glass,x,base+hh/2,front+1.3,w-.3,hh,.035);
      if(door){frame(g,M,x,base,front+1.36,w-.2,hh,{transom:hh-2.4,cross:true,rail:.5});cyl(g,M.gold,x+sign*-(w/2-.9),base+4.4,front+1.55,.05,1.8);box(g,stone,x,base+hh+.45,front+1.0,w+1.2,.9,.8);}
      else{frame(g,M,x,base,front+1.36,w-.2,hh,{mullions:[-w/6,w/6],transom:hh-2.2});box(g,stone,x,.65,front+1.0,w+1,1.3,.7);}
    }
    // Entry doors and gridded transom.
    box(g,bronze,0,21.2,front+.3,24,12.4,.55);box(g,glass,0,21.2,front+.65,23.5,11.9,.08);for(let x=-11.5;x<=11.6;x+=.85)box(g,M.gold,x,21.2,front+.8,.045,12,.04);for(let y=15.4;y<=27.1;y+=.85)box(g,M.gold,0,y,front+.8,23.5,.045,.04);
    box(g,warm,0,6.2,front+.7,27,12.3,.2);box(g,glass,0,6.2,front+1.1,26.6,12,.05);for(let x=-10.5;x<=10.5;x+=7){for(const leaf of [-1,1])frame(g,M,x+leaf*1.7,.1,front+1.2,3.4,11.9,{cross:true,rail:.5});cyl(g,M.gold,x-.35,5.4,front+1.45,.055,2.2);cyl(g,M.gold,x+.35,5.4,front+1.45,.055,2.2);}for(const sx of [-13.2,13.2])frame(g,M,sx,.1,front+1.2,1.2,11.9,{rail:.5});
    canopy(g,bronze,12.15,33,7,1.75);canopy(g,M.gold,13.95,33.3,7.15,.16);for(let x=-13.5;x<=13.6;x+=2.7){const dz=2.2+(7-2.2)*(1-Math.pow(2*x/33,2));cyl(g,M.bulb,x,12.1,64.5+dz*.62,.14,.05,.14,12);}
    /* the name sits in bronze letters on the tower, above the transom */
    for(const x of [-72,72]){cyl(g,bronze,x,5,75,.19,10,.29);cyl(g,bronze,x,.2,75,.72,.4,.8);cyl(g,bronze,x,10.3,75,.7,.2);const globe=ball(g,M.bulb,x,11.2,75,.72,14);globe.scale.y=1.4;cyl(g,bronze,x,12.15,75,.82,.22,.5);ball(g,bronze,x,12.5,75,.15);}
    for(const x of [-62,-20,20,62]){cyl(g,bronze,x,.8,67,1.0,1.6,.75);for(let k=0;k<11;k++){const a=k*.57;tube(g,M.leaf,[[x,1.1,67],[x+Math.cos(a)*.65,2.9,67+Math.sin(a)*.65],[x+Math.cos(a)*1.2,2.1,67+Math.sin(a)*1.2]],.06);}}
    tree(g,M,-83,61,1.55);tree(g,M,84,53,1.45);batch(g);return {bulbs:night};
  }
  /* one wall, in a group whose local x runs along the wall and local +z points into the room (wall face at z = 0):
     baseboard and chair rail with gold lines, pilasters with gold-lined panels and scrollwork, a gold frieze under the crown.
     The foyer (plain) keeps the plain white walls of its photo. */
  function wallRun(g,M,len,top,{plain=false,doors=[]}={}){const gaps=doors.map(o=>[o.x-o.w/2-.55,o.x+o.w/2+.55]),solid=[];let at=-len/2;for(const [a,b] of gaps.sort((p,q)=>p[0]-q[0])){if(a>at)solid.push([at,a]);at=Math.max(at,b);}if(at<len/2)solid.push([at,len/2]);
    for(const [a,b] of solid){const L=b-a,cx=(a+b)/2;box(g,M.trim,cx,.29,.05,L,.58,.1);if(!plain){box(g,M.gold,cx,.6,.1,L,.035,.03);box(g,M.trim,cx,3.0,.045,L,.17,.09);box(g,M.gold,cx,2.91,.09,L,.025,.02);}}
    for(const o of doors){const hh=o.h;box(g,M.door,o.x-o.w/4,hh/2,.04,o.w/2-.04,hh,.06);box(g,M.door,o.x+o.w/4,hh/2,.04,o.w/2-.04,hh,.06);for(const sg of [-1,1]){goldRect(g,M,o.x+sg*o.w/4,hh*.68,.08,o.w/2-.7,hh*.42,.025);goldRect(g,M,o.x+sg*o.w/4,hh*.22,.08,o.w/2-.7,hh*.24,.025);cyl(g,M.gold,o.x+sg*.22,hh*.47,.14,.035,.5,.035,8);}
      for(const sg of [-1,1])box(g,M.trim,o.x+sg*(o.w/2+.27),(hh+.45)/2,.09,.5,hh+.45,.18);box(g,M.trim,o.x,hh+.42,.1,o.w+1.1,.5,.2);if(o.pediment){box(g,M.trim,o.x,hh+.82,.16,o.w+1.7,.3,.34);box(g,M.trim,o.x,hh+1.05,.19,o.w+2,.16,.4);}if(!plain||o.pediment)box(g,M.gold,o.x,hh+.62,.205,o.w+1.1,.03,.02);}
    if(plain)return;
    const frieze=new T.PlaneGeometry(len,.46),fu=frieze.attributes.uv;for(let i=0;i<fu.count;i++)fu.setX(i,fu.getX(i)*len/2);const fz=mesh(g,frieze,M.frieze,0,top-.36,.03);fz.castShadow=false;
    const n=Math.max(1,Math.round(len/16)),step=len/n;for(let i=0;i<=n;i++){const x=Math.max(-len/2+1.3,Math.min(len/2-1.3,-len/2+i*step));if(gaps.some(([a,b])=>x>a-1.2&&x<b+1.2))continue;pilaster(g,M,x,top);}}
  function pilaster(g,M,x,top){const W=1.9,D=.3;box(g,M.trim,x,top/2,D/2,W,top,D);box(g,M.trim,x,1.6,D/2+.04,W+.24,3.2,D+.08);box(g,M.trim,x,3.27,D/2+.06,W+.36,.14,D+.12);box(g,M.trim,x,top-.3,D/2+.05,W+.3,.36,D+.1);
    goldRect(g,M,x,1.68,D+.085,W-.42,2.3);goldRect(g,M,x,(3.62+top-.75)/2,D+.005,W-.5,top-.75-3.62);box(g,M.gold,x,top-.5,D+.105,W+.3,.03,.02);decal(g,M.orn,x,top-2.05,D+.012,.92,2.3);}
  /* square white column with gold lines, two scroll ornaments on every face, a paneled pedestal and a molded capital */
  function column(g,M,x,z,top){const W=2.3;box(g,M.trim,x,top/2,z,W,top,W);box(g,M.trim,x,1.75,z,W+.36,3.5,W+.36);box(g,M.trim,x,.18,z,W+.56,.36,W+.56);box(g,M.trim,x,3.57,z,W+.5,.14,W+.5);box(g,M.trim,x,top-.55,z,W+.36,.3,W+.36);box(g,M.trim,x,top-.2,z,W+.7,.4,W+.7);
    for(let k=0;k<4;k++){const a=k*Math.PI/2,f=new T.Group();f.position.set(x+Math.sin(a)*W/2,0,z+Math.cos(a)*W/2);f.rotation.y=a;g.add(f);
      goldRect(f,M,0,1.85,.185,W-.15,2.5);goldRect(f,M,0,(3.75+top-.82)/2,.006,W-.4,top-.82-3.75);box(f,M.gold,0,top-.72,.19,W+.38,.03,.02);box(f,M.gold,0,3.66,.256,W+.52,.03,.02);
      decal(f,M.orn,0,top-2.45,.012,1.18,2.9);decal(f,M.orn,0,Math.min(6.4,top*.46),.012,.95,2.35);}}
  /* coffered ceiling: soffit grid with recessed lights, and in each bay a stepped tray with gold-edged steps,
     small crown moldings, LED cove light on each step, a gold-lined center panel, a medallion and a chandelier.
     The foyer has a flat ceiling with one square tray above each chandelier. */
  function ceiling(g,M,{w,d,h,lobby,coves}){const inW=w-.5,inD=d-.5,hs=h-(lobby?1.05:1.7),nx=lobby?1:Math.max(1,Math.round(inW/20)),nz=Math.max(1,Math.round(inD/24)),cw=inW/nx,cd=inD/nz,m=1.4,L=lobby?.6:.7,steps=lobby?[.45]:[.5,1.0],vGlow=coveGlow(true),hGlow=coveGlow(false);coves.push(vGlow,hGlow);
    const can=(x,z,y=hs)=>{cyl(g,M.trim,x,y-.015,z,.2,.03,.2,16);const b=cyl(g,M.bulb,x,y-.035,z,.13,.012,.13,14);b.castShadow=false;};
    const glowBand=(x,z,ow,od,y0,y1)=>{const H=y1-y0,y=(y0+y1)/2;for(const [px,pz,len,ry] of [[x,z-od/2+.03,ow,0],[x,z+od/2-.03,ow,Math.PI],[x-ow/2+.03,z,od,Math.PI/2],[x+ow/2-.03,z,od,-Math.PI/2]]){const o=mesh(g,new T.PlaneGeometry(len,H),vGlow,px,y,pz);o.rotation.y=ry;o.castShadow=o.receiveShadow=false;}};
    for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){const x=-inW/2+(ix+.5)*cw,z=-inD/2+(iz+.5)*cd,ow=lobby?Math.min(9,cw-4):cw-2*m,od=lobby?Math.min(9,cd-4):cd-2*m,sx=(cw-ow)/2,sz=(cd-od)/2;
      // the soffit around this tray, from hs up to the ceiling
      box(g,M.trim,x,(hs+h)/2,z-cd/2+sz/2,cw,h-hs,sz);box(g,M.trim,x,(hs+h)/2,z+cd/2-sz/2,cw,h-hs,sz);box(g,M.trim,x-cw/2+sx/2,(hs+h)/2,z,sx,h-hs,od);box(g,M.trim,x+cw/2-sx/2,(hs+h)/2,z,sx,h-hs,od);
      // stepped tray: each ring hangs from the ceiling down to its step
      let W0=ow,D0=od;ring(g,M.gold,x,hs+.07,z,W0-.03,D0-.03,.03,.03);
      steps.forEach((s,i)=>{const yb=hs+s,W1=W0-2*L,D1=D0-2*L,yt=i+1<steps.length?hs+steps[i+1]:h;for(const [px,pz,bw,bd] of [[x,z-D0/2+L/2,W0,L],[x,z+D0/2-L/2,W0,L],[x-W0/2+L/2,z,L,D1],[x+W0/2-L/2,z,L,D1]])box(g,M.trim,px,(yb+h)/2,pz,bw,h-yb,bd);
        crown(g,M,x,yb-.85*.3,z,W0,D0,.3);ring(g,M.gold,x,yb+.07,z,W1-.03,D1-.03,.03,.03);glowBand(x,z,W1,D1,yb,yt);W0=W1;D0=D1;});
      crown(g,M,x,h-.85*.34,z,W0,D0,.34);const gl=mesh(g,new T.PlaneGeometry(W0,D0),hGlow,x,h-.03,z);gl.rotation.x=Math.PI/2;gl.castShadow=gl.receiveShadow=false;
      if(Math.min(W0,D0)>5){panelMold(g,M,x,h-.02,z,W0-1.8,D0-1.8,.8);ring(g,M.gold,x,h-.035,z,W0-2.25,D0-2.25,.035,.02);}
      medallion(g,M,x,h-.02,z,lobby?.8:1.05);const s=Math.min(lobby?.95:1.3,Math.min(W0,D0)/(lobby?3.2:4.0),(h-8.4)/4.5);chandelier(g,M,x,h-.12,z,s,lobby?'tiered':'crystal');
      if(!lobby&&Math.min(W0,D0)>7){box(g,M.trim,x+W0*.3,h-.04,z+D0*.3,2.3,.03,.55);for(let sl=0;sl<9;sl++)box(g,M.vent,x+W0*.3-1+sl*.25,h-.06,z+D0*.3,.1,.02,.42);}}
    // recessed lights along the soffit bands
    if(lobby){for(const sx of [-1,1])for(let zz=-inD/2+3;zz<inD/2-2;zz+=6.5)can(sx*inW*.3,zz);}
    else{for(let i=0;i<=nx;i++)for(let k=0;k<nz*3;k++)can(Math.max(-inW/2+1.17,Math.min(inW/2-1.17,-inW/2+i*cw)),-inD/2+(k+.5)*cd/3);for(let j=0;j<=nz;j++)for(let k=0;k<nx*3;k++)can(-inW/2+(k+.5)*cw/3,Math.max(-inD/2+1.17,Math.min(inD/2-1.17,-inD/2+j*cd)));}
    return hs;}
  function buildInterior(g,{w,d,h,id,cloth,floral,saved,tableTypes={},looks=[],rgb}){const M=interiorPalette(cloth,floral),coves=[],lights=[],lobby=id==='concourse';
    box(g,M.wall,0,h/2,-d/2,w,h,.5);box(g,M.wall,0,h/2,d/2,w,h,.5);box(g,M.wall,-w/2,h/2,0,.5,h,d);box(g,M.wall,w/2,h/2,0,.5,h,d);box(g,M.trim,0,h+.1,0,w,.25,d);
    const hs=ceiling(g,M,{w,d,h,lobby,coves}),top=hs-(lobby?.68:.92);
    // crown molding at the walls: dentils and a gold edge in the event rooms, a plain white crown in the foyer
    if(lobby)crown(g,M,0,hs-.68,0,w-.5,d-.5,.8);else{crown(g,M,0,hs-.92,0,w-.5,d-.5,1.08,true);ring(g,M.gold,0,hs-.935,0,w-.53,d-.53,.035,.035);}
    [[0,-d/2+.25,0,w-.5],[0,d/2-.25,Math.PI,w-.5],[-w/2+.25,0,Math.PI/2,d-.5],[w/2-.25,0,-Math.PI/2,d-.5]].forEach(([x,z,ry,len],k)=>{const run=new T.Group();run.position.set(x,0,z);run.rotation.y=ry;g.add(run);
      const doors=lobby?(k===2?[{x:-len*.14,w:5.6,h:8.6,pediment:true},{x:len*.2,w:3,h:8}]:[]):(k===1?[{x:len*.3,w:6,h:8.6}]:[]);wallRun(run,M,len,top,{plain:lobby,doors});});
    if(id==='diamond')for(const x of [-w/6,w/6])for(const z of [-d/6,d/6])column(g,M,x,z,hs);
    // Restore the requested individual table colors in saved event layouts.
    const renderItem=item=>{const group=new T.Group();group.position.set(item.x-w/2,0,item.y-d/2);group.rotation.y=-(item.rot||0)*Math.PI/180;g.add(group);const look=looks.find(l=>l.id===item.lookId)||{},L={...M,linen:material(look.cloth||cloth,{roughness:.9}),flower:material(look.flower1||floral),runner:material(look.runnerColor||'#152a58',{roughness:.7})};if(item.kind==='table'){const def=tableTypes[item.type]||{};if(item.type==='cocktail')cocktail(group,M,0,0);else if(def.shape==='round'||/^r\d/.test(item.type))table(group,L,0,0,(item.d||def.d||5)/2,Math.min(16,item.seats??def.seats??8));else{const tw=item.w||def.w||6,td=item.h||def.h||3;box(group,L.linen,0,1.36,0,tw,2.72,td);box(group,L.champagne,0,2.75,0,tw,.025,.7);flowers(group,L,0,5.2,0,.5);const n=Math.min(20,item.seats??def.seats??8);for(let i=0;i<n;i++)chair(group,L,-tw/2+(Math.floor(i/2)+.5)*tw/Math.ceil(n/2),(i%2?1:-1)*(td/2+1),i%2?Math.PI:0);}}
      // a dance floor is marked on the tile with a thin gold line; the porcelain stays visible (no wood or vinyl panel)
      else if(item.kind==='fixture'){if(item.type==='dance')ring(group,M.gold,0,.05,0,item.w||12,item.h||12,.06,.02);else box(group,L.linen,0,1.4,0,item.w||4,2.8,item.h||3);}else if(item.kind==='chair')chair(group,M,0,0,0);};
    if(saved) saved.items.filter(i=>!i.space||i.space==='reception').slice(0,180).forEach(renderItem);
    else if(lobby){for(const [x,z] of [[-.22,-.36],[.2,-.24],[-.2,-.06],[.22,.08],[-.22,.26],[.2,.38]])cocktail(g,M,x*w,z*d);}
    else{for(const x of [-w*.30,w*.30])for(const z of [-d*.3,-d*.08,d*.16,d*.34])table(g,M,x,z,2.65,8);for(const x of [-w*.1,w*.1])table(g,M,x,-d*.29,2.65,8);
      // A draped focal wall and sweetheart table add depth and a recognizable celebration setting.
      const stageW=Math.min(w*.5,25);box(g,M.trim,0,.25,-d/2+4,stageW,.5,6);for(let i=0;i<50;i++){const x=-stageW/2+(i+.5)*stageW/50;cyl(g,M.linen,x,h*.38,-d/2+.8,.20,h*.70,.20,9);}box(g,M.gold,0,h*.73,-d/2+.8,stageW,.13,.2);box(g,M.linen,0,1.8,-d/2+4,8,2.6,2.7);box(g,M.champagne,0,3.12,-d/2+4,8,.04,2.75);for(const x of [-6,6])flowers(g,M,x,5.6,-d/2+4,.8);}
    batch(g);g.add(tileFloor(w,d,lobby?'warm':'white',lobby?71:Math.round(w*7+d*3)));
    // six warm fill lights in every room (a constant count avoids shader recompiles when switching rooms)
    const gx=w>d?3:2,gz=w>d?2:3;for(let i=0;i<gx;i++)for(let j=0;j<gz;j++){const l=new T.PointLight('#ffe3ab',.42,Math.max(w,d)*.9,1.6);l.position.set((i-(gx-1)/2)*w/gx,h-2.2,(j-(gz-1)/2)*d/gz);g.add(l);lights.push(l);}
    return{coves,lights,bulbs:[M.bulb]};
  }
  return {environment,interiorEnvironment,buildExterior,buildInterior,prewarm};
})();
