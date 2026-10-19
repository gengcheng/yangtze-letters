import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(readFileSync(new URL('../src/album.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { renderAlbum, hasRecord } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const station = { name: '武汉', number: '07', location: '汉口江滩', source: 'https://www.wuhan.gov.cn/' };
const blank = { quiz: false, observation: '', action: false, letter: '', nickname: '小小守护者', date: '2026-10-18' };

test('album is an offline printable document; partial records never earn completed stamps', () => {
 assert.equal(hasRecord(blank), false);
 assert.equal(hasRecord({ ...blank, observation: '影像观察：江水边有草地。' }), true);
 const html = renderAlbum([{ station, record: { ...blank, observation: '影像观察：江水边有草地。' } }]);
 assert.match(html, /影像观察：江水边有草地/);assert.match(html, /任务待完成/);assert.match(html, /打印 \/ 另存为 PDF/);
 assert.doesNotMatch(html, /<script|<img|<link/);assert.match(html, /尚未添加 AI 导读/);
 const complete = renderAlbum([{ station, record: { ...blank, quiz: true, action: true, observation: '看到了岸边植物。', letter: '亲爱的长江，我想保护你。' } }]);
 assert.match(complete, /本站纪念邮戳/);assert.doesNotMatch(complete, /任务待完成/);
});

test('album escapes all family text and model output instead of executing markup', () => {
 const attack = '</p><script>alert("x")</script><img src=x onerror=alert(1)>';
 const html = renderAlbum([{ station, record: { ...blank, observation: attack, letter: attack, nickname: attack } }], { summary: attack, nextStep: attack });
 assert.doesNotMatch(html, /<script|<img/);assert.match(html, /&lt;script&gt;/);assert.match(html, /&quot;x&quot;/);
 assert.match(html, /AI 记录导读/);
});
