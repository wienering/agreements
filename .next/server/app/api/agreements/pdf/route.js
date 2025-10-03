(()=>{var e={};e.id=130,e.ids=[130],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},83636:e=>{"use strict";e.exports=import("puppeteer")},92870:(e,t,r)=>{"use strict";r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{patchFetch:()=>p,routeModule:()=>d,serverHooks:()=>m,workAsyncStorage:()=>c,workUnitAsyncStorage:()=>g});var n=r(42706),i=r(28203),s=r(45994),o=r(32852),l=e([o]);o=(l.then?(await l)():l)[0];let d=new n.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/agreements/pdf/route",pathname:"/api/agreements/pdf",filename:"route",bundlePath:"app/api/agreements/pdf/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\pdf\\route.ts",nextConfigOutput:"",userland:o}),{workAsyncStorage:c,workUnitAsyncStorage:g,serverHooks:m}=d;function p(){return(0,s.patchFetch)({workAsyncStorage:c,workUnitAsyncStorage:g})}a()}catch(e){a(e)}})},96487:()=>{},78335:()=>{},32852:(e,t,r)=>{"use strict";r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{POST:()=>d});var n=r(39187),i=r(71618),s=r(83636),o=r(27727),l=r(65665),p=e([s]);s=(p.then?(await p)():p)[0];let c=o.Ik({token:o.Yj().min(1,"Token is required")});async function d(e){try{var t,r,a;let o=await e.json(),l=c.parse(o),p=await i.z.agreement.findFirst({where:{uniqueToken:l.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!p)return n.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});let d=(t=p.template.htmlContent,r=p.client,a=p.id,t.replace(/\{\{client\.firstName\}\}/g,r.firstName||"").replace(/\{\{client\.lastName\}\}/g,r.lastName||"").replace(/\{\{client\.email\}\}/g,r.email||"").replace(/\{\{client\.phone\}\}/g,r.phone||"").replace(/\{\{client\.eventDate\}\}/g,r.eventDate?new Date(r.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,r.notes||"").replace(/\{\{event\.type\}\}/g,r.eventType||"").replace(/\{\{event\.location\}\}/g,r.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,r.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,r.eventDuration||"").replace(/\{\{event\.package\}\}/g,r.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,a||"")),g=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Agreement - ${p.client.firstName} ${p.client.lastName}</title>
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
            ${d}
          </div>
          
          <div class="signature-section">
            <p><strong>Digital Signature:</strong></p>
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <p style="margin-top: 20px;">
              <strong>Name:</strong> ${p.client.firstName} ${p.client.lastName}<br>
              <strong>Email:</strong> ${p.client.email}<br>
              <strong>Date Signed:</strong> ${p.signedAt?new Date(p.signedAt).toLocaleDateString():"N/A"}
            </p>
          </div>
          
          <div class="footer">
            <p>This document was digitally signed and is legally binding.</p>
            <p>Agreement ID: ${p.id} | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `,m=await s.default.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox"]}),u=await m.newPage();await u.setContent(g,{waitUntil:"networkidle0"});let x=await u.pdf({format:"A4",margin:{top:"20mm",right:"20mm",bottom:"20mm",left:"20mm"},printBackground:!0});return await m.close(),new n.NextResponse(x,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="agreement-${p.client.firstName}-${p.client.lastName}-${p.id}.pdf"`,"Content-Length":x.length.toString()}})}catch(e){if(console.error("Error generating PDF:",e),e instanceof l.G)return n.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return n.NextResponse.json({error:"Failed to generate PDF"},{status:500})}}a()}catch(e){a(e)}})},71618:(e,t,r)=>{"use strict";r.d(t,{z:()=>n});let a=require("@prisma/client"),n=global.prisma||new a.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[638,452,727],()=>r(92870));module.exports=a})();