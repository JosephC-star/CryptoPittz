import test from 'node:test';import assert from 'node:assert/strict';
import {nftArrowDirection} from '../src/utils/modalKeyboard.mjs';
test('NFT arrows work outside editable controls',()=>{assert.equal(nftArrowDirection({key:'ArrowLeft'}),-1);assert.equal(nftArrowDirection({key:'ArrowRight'}),1);assert.equal(nftArrowDirection({key:'Enter'}),0);});
test('editing prices, token selectors and accessible inputs keeps arrow keys in the control',()=>{for(const key of ['ArrowLeft','ArrowRight'])assert.equal(nftArrowDirection({key,target:{closest:()=>({tagName:'INPUT'})}}),0);});
test('selection shortcuts and events handled by a nested popup cannot navigate NFTs',()=>{for(const modifier of ['shiftKey','ctrlKey','altKey','metaKey','defaultPrevented'])assert.equal(nftArrowDirection({key:'ArrowRight',[modifier]:true}),0);});
