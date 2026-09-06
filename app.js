const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
const pdf=await pdfjsLib.getDocument('Commission_Work_Professional_Aligned.pdf').promise;
const canvas=document.getElementById('pdfCanvas'),ctx=canvas.getContext('2d');
const loader=document.getElementById('loader'),counter=document.getElementById('counter'),bar=document.getElementById('progressBar');
let pageNo=1,rendering=false,pending=null;
async function render(n){if(rendering){pending=n;return}rendering=true;loader.style.display='block';const page=await pdf.getPage(n);const base=page.getViewport({scale:1});const stage=document.querySelector('.stage');const scale=Math.min((stage.clientWidth-4)/base.width,(stage.clientHeight-4)/base.height);const viewport=page.getViewport({scale:Math.max(scale,0.5)});canvas.width=Math.floor(viewport.width*devicePixelRatio);canvas.height=Math.floor(viewport.height*devicePixelRatio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';await page.render({canvasContext:ctx,viewport,transform:devicePixelRatio!==1?[devicePixelRatio,0,0,devicePixelRatio,0,0]:null}).promise;counter.textContent=`${n} / ${pdf.numPages}`;bar.style.width=`${n/pdf.numPages*100}%`;loader.style.display='none';rendering=false;if(pending){const p=pending;pending=null;render(p)}}
function go(n){pageNo=Math.max(1,Math.min(pdf.numPages,n));render(pageNo)}
document.getElementById('prev').onclick=()=>go(pageNo-1);document.getElementById('next').onclick=()=>go(pageNo+1);
document.getElementById('fullscreen').onclick=()=>document.documentElement.requestFullscreen?.();
document.addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();go(pageNo+1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(pageNo-1)}if(e.key.toLowerCase()==='f')document.documentElement.requestFullscreen?.()});
let sx=0;document.getElementById('viewer').addEventListener('touchstart',e=>sx=e.changedTouches[0].clientX,{passive:true});document.getElementById('viewer').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>45)go(pageNo+(dx<0?1:-1))},{passive:true});
window.addEventListener('resize',()=>render(pageNo));render(1);
