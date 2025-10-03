(()=>{var e={};e.id=130,e.ids=[130],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},83636:e=>{"use strict";e.exports=import("puppeteer")},92870:(e,t,a)=>{"use strict";a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{patchFetch:()=>p,routeModule:()=>c,serverHooks:()=>m,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>g});var n=a(42706),i=a(28203),s=a(45994),o=a(32852),l=e([o]);o=(l.then?(await l)():l)[0];let c=new n.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/agreements/pdf/route",pathname:"/api/agreements/pdf",filename:"route",bundlePath:"app/api/agreements/pdf/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\pdf\\route.ts",nextConfigOutput:"",userland:o}),{workAsyncStorage:d,workUnitAsyncStorage:g,serverHooks:m}=c;function p(){return(0,s.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:g})}r()}catch(e){r(e)}})},96487:()=>{},78335:()=>{},32852:(e,t,a)=>{"use strict";a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{POST:()=>c});var n=a(39187),i=a(71618),s=a(83636),o=a(27727),l=a(65665),p=e([s]);s=(p.then?(await p)():p)[0];let d=async(e,t,a,r)=>{let n=`
AGREEMENT - ${t}
Email: ${a}
Agreement ID: ${r}
Generated: ${new Date().toLocaleDateString()}

${e.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim()}

This is a text version of the agreement. For a properly formatted PDF, please contact support.
  `;return Buffer.from(n,"utf-8")},g=o.Ik({token:o.Yj().min(1,"Token is required")});async function c(e){try{var t,a,r;let o;let l=await e.json(),p=g.parse(l),c=await i.z.agreement.findFirst({where:{uniqueToken:p.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!c)return n.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});let m=(t=c.template.htmlContent,a=c.client,r=c.id,t.replace(/\{\{client\.firstName\}\}/g,a.firstName||"").replace(/\{\{client\.lastName\}\}/g,a.lastName||"").replace(/\{\{client\.email\}\}/g,a.email||"").replace(/\{\{client\.phone\}\}/g,a.phone||"").replace(/\{\{client\.eventDate\}\}/g,a.eventDate?new Date(a.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,a.notes||"").replace(/\{\{event\.type\}\}/g,a.eventType||"").replace(/\{\{event\.location\}\}/g,a.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,a.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,a.eventDuration||"").replace(/\{\{event\.package\}\}/g,a.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,r||"")),u=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Agreement - ${c.client.firstName} ${c.client.lastName}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              line-height: 1.6;
              margin: 0;
              padding: 40px;
              color: #333;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              color: #333;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 16px;
              color: #666;
            }
            .agreement-content {
              font-size: 14px;
              line-height: 1.8;
            }
            .signature-section {
              margin-top: 60px;
              border-top: 1px solid #ccc;
              padding-top: 30px;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              width: 300px;
              margin: 20px 0 5px 0;
            }
            .signature-label {
              font-size: 12px;
              color: #666;
            }
            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Service Agreement</p>
          </div>
          
          <div class="agreement-content">
            ${m}
          </div>
          
          <div class="signature-section">
            <p><strong>Digital Signature:</strong></p>
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <p style="margin-top: 20px;">
              <strong>Name:</strong> ${c.client.firstName} ${c.client.lastName}<br>
              <strong>Email:</strong> ${c.client.email}<br>
              <strong>Date Signed:</strong> ${c.signedAt?new Date(c.signedAt).toLocaleDateString():"N/A"}
            </p>
          </div>
          
          <div class="footer">
            <p>This document was digitally signed and is legally binding.</p>
            <p>Agreement ID: ${c.id} | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;try{let e=await s.default.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-accelerated-2d-canvas","--no-first-run","--no-zygote","--single-process","--disable-gpu"],executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||void 0}),t=await e.newPage();await t.setContent(u,{waitUntil:"networkidle0"});let a=await t.pdf({format:"A4",margin:{top:"20mm",right:"20mm",bottom:"20mm",left:"20mm"},printBackground:!0});o=Buffer.from(a),await e.close()}catch(e){console.warn("Puppeteer failed, using fallback PDF generation:",e),o=await d(m,`${c.client.firstName} ${c.client.lastName}`,c.client.email,c.id)}return new n.NextResponse(o,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="agreement-${c.client.firstName}-${c.client.lastName}-${c.id}.pdf"`,"Content-Length":o.length.toString()}})}catch(e){if(console.error("Error generating PDF:",e),e instanceof l.G)return n.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return n.NextResponse.json({error:"Failed to generate PDF"},{status:500})}}r()}catch(e){r(e)}})},71618:(e,t,a)=>{"use strict";a.d(t,{z:()=>n});let r=require("@prisma/client"),n=global.prisma||new r.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[638,452,727],()=>a(92870));module.exports=r})();