// node pdf.js uscita.pdf  -> stampa biglietti.html in PDF A4 (Playwright)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+path.join(__dirname,'biglietti.html'));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
await p.pdf({path:process.argv[2]||'biglietti.pdf',format:'A4',printBackground:true,margin:{top:0,right:0,bottom:0,left:0}});await b.close();})();
