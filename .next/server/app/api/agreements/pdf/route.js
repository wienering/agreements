(()=>{var e={};e.id=130,e.ids=[130],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},83636:e=>{"use strict";e.exports=import("puppeteer")},92870:(e,t,i)=>{"use strict";i.a(e,async(e,a)=>{try{i.r(t),i.d(t,{patchFetch:()=>p,routeModule:()=>d,serverHooks:()=>m,workAsyncStorage:()=>c,workUnitAsyncStorage:()=>g});var n=i(42706),r=i(28203),s=i(45994),o=i(32852),l=e([o]);o=(l.then?(await l)():l)[0];let d=new n.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/agreements/pdf/route",pathname:"/api/agreements/pdf",filename:"route",bundlePath:"app/api/agreements/pdf/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\pdf\\route.ts",nextConfigOutput:"",userland:o}),{workAsyncStorage:c,workUnitAsyncStorage:g,serverHooks:m}=d;function p(){return(0,s.patchFetch)({workAsyncStorage:c,workUnitAsyncStorage:g})}a()}catch(e){a(e)}})},96487:()=>{},78335:()=>{},32852:(e,t,i)=>{"use strict";i.a(e,async(e,a)=>{try{i.r(t),i.d(t,{POST:()=>d});var n=i(39187),r=i(71618),s=i(83636),o=i(27727),l=i(65665),p=e([s]);s=(p.then?(await p)():p)[0];let c=async(e,t,i,a)=>{let n=`
AGREEMENT - ${t}
Email: ${i}
Agreement ID: ${a}
Generated: ${new Date().toLocaleDateString()}

${e.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim()}

This is a text version of the agreement. For a properly formatted PDF, please contact support.
  `;return Buffer.from(n,"utf-8")},g=o.Ik({token:o.Yj().min(1,"Token is required")});async function d(e){try{var t,i,a;let o;let l=await e.json(),p=g.parse(l),d=await r.z.agreement.findFirst({where:{uniqueToken:p.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!d)return n.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});let m=(t=d.template.htmlContent,i=d.client,a=d.id,t.replace(/\{\{client\.firstName\}\}/g,i.firstName||"").replace(/\{\{client\.lastName\}\}/g,i.lastName||"").replace(/\{\{client\.email\}\}/g,i.email||"").replace(/\{\{client\.phone\}\}/g,i.phone||"").replace(/\{\{client\.eventDate\}\}/g,i.eventDate?new Date(i.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,i.notes||"").replace(/\{\{event\.type\}\}/g,i.eventType||"").replace(/\{\{event\.location\}\}/g,i.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,i.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,i.eventDuration||"").replace(/\{\{event\.package\}\}/g,i.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,a||"")),f=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Agreement - ${d.client.firstName} ${d.client.lastName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.4;
              margin: 0;
              padding: 0.5in;
              color: #333;
              background: white;
              font-size: 12px;
              max-width: 7.5in;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #333;
              padding-bottom: 15px;
              page-break-inside: avoid;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              color: #333;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 14px;
              color: #666;
            }
            .client-info, .event-info {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .client-info h3, .event-info h3 {
              font-size: 14px;
              margin: 0 0 8px 0;
              color: #3b82f6;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              font-size: 11px;
            }
            .info-item {
              margin-bottom: 3px;
            }
            .info-label {
              font-weight: bold;
              display: inline-block;
              width: 80px;
            }
            .agreement-content {
              font-size: 12px;
              line-height: 1.4;
              margin-bottom: 20px;
            }
            .signature-section {
              margin-top: 30px;
              border-top: 1px solid #ccc;
              padding-top: 15px;
              page-break-inside: avoid;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              width: 250px;
              margin: 15px 0 5px 0;
            }
            .signature-label {
              font-size: 10px;
              color: #666;
            }
            .footer {
              margin-top: 20px;
              font-size: 10px;
              color: #666;
              text-align: center;
              page-break-inside: avoid;
            }
            @media print {
              body { margin: 0; padding: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Service Agreement</p>
          </div>
          
          <div class="client-info">
            <h3>Client Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name:</span> ${d.client.firstName} ${d.client.lastName}
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span> ${d.client.email}
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span> ${d.client.phone||"Not provided"}
              </div>
              <div class="info-item">
                <span class="info-label">Event Date:</span> ${d.client.eventDate?new Date(d.client.eventDate).toLocaleDateString():"Not specified"}
              </div>
            </div>
          </div>
          
          <div class="event-info">
            <h3>Event Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Type:</span> ${d.client.eventType||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Location:</span> ${d.client.eventLocation||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Start Time:</span> ${d.client.eventStartTime||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Duration:</span> ${d.client.eventDuration||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Package:</span> ${d.client.eventPackage||"Not specified"}
              </div>
            </div>
          </div>
          
          <div class="agreement-content">
            ${m}
          </div>
          
          <div class="signature-section">
            <p><strong>Digital Signature:</strong></p>
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <p style="margin-top: 20px;">
              <strong>Name:</strong> ${d.client.firstName} ${d.client.lastName}<br>
              <strong>Email:</strong> ${d.client.email}<br>
              <strong>Date & Time Signed:</strong> ${d.signedAt?new Date(d.signedAt).toLocaleString("en-CA",{timeZone:"America/Toronto"}):"N/A"}<br>
              <strong>Agreement ID:</strong> ${d.id}
            </p>
          </div>
          
          <div class="footer">
            <p>This document was digitally signed and is legally binding.</p>
            <p>Agreement ID: ${d.id} | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;try{let e=await s.default.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-accelerated-2d-canvas","--no-first-run","--no-zygote","--single-process","--disable-gpu"],executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||void 0}),t=await e.newPage();await t.setContent(f,{waitUntil:"networkidle0"});let i=await t.pdf({format:"Letter",margin:{top:"0.5in",right:"0.5in",bottom:"0.5in",left:"0.5in"},printBackground:!0,preferCSSPageSize:!1,displayHeaderFooter:!1});o=Buffer.from(i),await e.close()}catch(e){console.warn("Puppeteer failed, using fallback PDF generation:",e),o=await c(m,`${d.client.firstName} ${d.client.lastName}`,d.client.email,d.id)}return new n.NextResponse(o,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="agreement-${d.client.firstName}-${d.client.lastName}-${d.id}.pdf"`,"Content-Length":o.length.toString()}})}catch(e){if(console.error("Error generating PDF:",e),e instanceof l.G)return n.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return n.NextResponse.json({error:"Failed to generate PDF"},{status:500})}}a()}catch(e){a(e)}})},71618:(e,t,i)=>{"use strict";i.d(t,{z:()=>n});let a=require("@prisma/client"),n=global.prisma||new a.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),a=t.X(0,[638,452,727],()=>i(92870));module.exports=a})();