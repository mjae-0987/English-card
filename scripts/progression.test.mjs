import test from 'node:test';
import assert from 'node:assert/strict';
import { getStepStatus, initialRecord, getDayProgress, stepKey } from '../src/state/progression.ts';
test('DAY 01–05 unlock sequentially; own eight sets required before puzzle; DAY 06–50 locked',()=>{
 const record={...initialRecord,completedSteps:[]};
 for(let day=1;day<=5;day++){
  assert.equal(getStepStatus(record,day,'sentences'),'available');assert.equal(getStepStatus(record,day,'puzzle'),'locked');
  if(day<5)assert.equal(getStepStatus(record,day+1,'sentences'),'locked');
  record.completedSteps.push(stepKey(day,'sentences'));assert.equal(getStepStatus(record,day,'sentences'),'completed');assert.equal(getStepStatus(record,day,'puzzle'),'available');
  record.completedSteps.push(stepKey(day,'puzzle'));assert.equal(getDayProgress(record,day),2);assert.equal(getStepStatus(record,day,'puzzle'),'completed');
 }
 for(let day=6;day<=50;day++){assert.equal(getStepStatus(record,day,'sentences'),'locked');assert.equal(getStepStatus(record,day,'puzzle'),'locked');}
});
test('legacy DAY 01 completion remains completed and unlocks DAY 02',()=>{
 const record={...initialRecord,completedSteps:['1:sentences','1:puzzle']};assert.equal(getStepStatus(record,1,'puzzle'),'completed');assert.equal(getStepStatus(record,2,'sentences'),'available');assert.equal(getStepStatus(record,2,'puzzle'),'locked');
});
test('future free policy still requires content and sentence completion; inconsistent later progress cannot skip prior DAY',()=>{
 assert.equal(getStepStatus(initialRecord,5,'sentences','free'),'available');assert.equal(getStepStatus(initialRecord,5,'puzzle','free'),'locked');assert.equal(getStepStatus(initialRecord,6,'sentences','free'),'locked');assert.equal(getStepStatus({...initialRecord,completedSteps:['2:sentences']},2,'puzzle'),'locked');
});
