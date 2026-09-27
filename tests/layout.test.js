import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterProgress, stageViewport } from '../layout.js';

test('chapter tracking uses real offsets when sections have different heights',()=>{
 const offsets=[0,560,1120,1740,2360];
 assert.equal(chapterProgress(0,offsets),0);
 assert.equal(chapterProgress(1430,offsets),2.5);
 assert.equal(chapterProgress(2360,offsets),4);
 assert.equal(chapterProgress(3100,offsets),4);
 assert.equal(chapterProgress(-30,offsets),0);
});
for(const [width,height,panelTop,panelLeft,portrait] of [
 [320,740,430,8,true],[390,844,510,12,true],[430,932,590,12,true],
 [768,1024,270,495,false],[1024,768,150,743,false],
 [1920,1080,250,1485,false],[844,390,70,587,false]
]){
 test(`heart fits the unobstructed stage at ${width}x${height}`,()=>{
  const view=stageViewport({width,height,panel:{top:panelTop,left:panelLeft},headingBottom:190,headerBottom:70,portrait});
  const diameter=2.4*height/(2*Math.tan(39*Math.PI/360)*view.distance);
  assert(view.distance>=8&&Number.isFinite(view.distance));
  assert(view.centerX-diameter/2>=0);
  assert(view.centerX+diameter/2<=width);
  if(portrait)assert(view.centerY+diameter/2<panelTop,'heart must stay above the dock');
  else assert(view.centerX+diameter/2<panelLeft,'heart must stay left of the panel');
 });
}
