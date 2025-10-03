(()=>{var e={};e.id=130,e.ids=[130],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},83636:e=>{"use strict";e.exports=import("puppeteer")},92870:(e,t,n)=>{"use strict";n.a(e,async(e,i)=>{try{n.r(t),n.d(t,{patchFetch:()=>p,routeModule:()=>d,serverHooks:()=>m,workAsyncStorage:()=>c,workUnitAsyncStorage:()=>g});var a=n(42706),r=n(28203),s=n(45994),o=n(32852),l=e([o]);o=(l.then?(await l)():l)[0];let d=new a.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/agreements/pdf/route",pathname:"/api/agreements/pdf",filename:"route",bundlePath:"app/api/agreements/pdf/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\pdf\\route.ts",nextConfigOutput:"",userland:o}),{workAsyncStorage:c,workUnitAsyncStorage:g,serverHooks:m}=d;function p(){return(0,s.patchFetch)({workAsyncStorage:c,workUnitAsyncStorage:g})}i()}catch(e){i(e)}})},96487:()=>{},78335:()=>{},32852:(e,t,n)=>{"use strict";n.a(e,async(e,i)=>{try{n.r(t),n.d(t,{POST:()=>d});var a=n(39187),r=n(71618),s=n(83636),o=n(27727),l=n(65665),p=e([s]);s=(p.then?(await p)():p)[0];let c=async(e,t,n,i)=>{let a=`
AGREEMENT - ${t}
Email: ${n}
Agreement ID: ${i}
Generated: ${new Date().toLocaleDateString()}

${e.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim()}

This is a text version of the agreement. For a properly formatted PDF, please contact support.
  `;return Buffer.from(a,"utf-8")},g=o.Ik({token:o.Yj().min(1,"Token is required")});async function d(e){try{let o,l;let p=await e.json(),d=g.parse(p),m=await r.z.agreement.findFirst({where:{uniqueToken:d.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!m)return a.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});if("SIGNED"===m.status&&m.mergedHtml)o=m.mergedHtml;else{var t,n,i;t=m.template.htmlContent,n=m.client,i=m.id,o=t.replace(/\{\{client\.firstName\}\}/g,n.firstName||"").replace(/\{\{client\.lastName\}\}/g,n.lastName||"").replace(/\{\{client\.email\}\}/g,n.email||"").replace(/\{\{client\.phone\}\}/g,n.phone||"").replace(/\{\{client\.eventDate\}\}/g,n.eventDate?new Date(n.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,n.notes||"").replace(/\{\{event\.type\}\}/g,n.eventType||"").replace(/\{\{event\.location\}\}/g,n.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,n.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,n.eventDuration||"").replace(/\{\{event\.package\}\}/g,n.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,i||"")}let f=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Agreement - ${m.client.firstName} ${m.client.lastName}</title>
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
              font-size: 11px;
              line-height: 1.6;
              margin-bottom: 20px;
              text-align: justify;
            }
            .agreement-content p {
              margin: 8px 0;
            }
            .agreement-content h1, .agreement-content h2, .agreement-content h3 {
              margin: 15px 0 8px 0;
              font-weight: bold;
            }
            .agreement-content ul, .agreement-content ol {
              margin: 8px 0;
              padding-left: 20px;
            }
            .agreement-content li {
              margin: 4px 0;
            }
            .signature-section {
              margin-top: 30px;
              border-top: 2px solid #333;
              padding: 20px;
              page-break-inside: avoid;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
            .signature-section h3 {
              margin: 0 0 15px 0;
              font-size: 14px;
              color: #333;
              text-decoration: underline;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              width: 300px;
              margin: 15px 0 5px 0;
            }
            .signature-label {
              font-size: 11px;
              color: #555;
              font-weight: bold;
            }
            .signature-details {
              margin-top: 15px;
              font-size: 11px;
              line-height: 1.4;
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
                <span class="info-label">Name:</span> ${m.client.firstName} ${m.client.lastName}
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span> ${m.client.email}
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span> ${m.client.phone||"Not provided"}
              </div>
              <div class="info-item">
                <span class="info-label">Event Date:</span> ${m.client.eventDate?new Date(m.client.eventDate).toLocaleDateString():"Not specified"}
              </div>
            </div>
          </div>
          
          <div class="event-info">
            <h3>Event Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Type:</span> ${m.client.eventType||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Location:</span> ${m.client.eventLocation||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Start Time:</span> ${m.client.eventStartTime||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Duration:</span> ${m.client.eventDuration||"Not specified"}
              </div>
              <div class="info-item">
                <span class="info-label">Package:</span> ${m.client.eventPackage||"Not specified"}
              </div>
            </div>
          </div>
          
          <div class="agreement-content">
            ${o}
          </div>
          
          <div class="signature-section">
            <h3>Digital Signature Details</h3>
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <div class="signature-details">
              <p><strong>Name:</strong> ${m.client.firstName} ${m.client.lastName}</p>
              <p><strong>Email:</strong> ${m.client.email}</p>
              <p><strong>Date & Time Signed:</strong> ${m.signedAt?new Date(m.signedAt).toLocaleString("en-CA",{timeZone:"America/Toronto"}):"N/A"}</p>
              <p><strong>IP Address:</strong> ${m.signedFromIP||"N/A"}</p>
              <p><strong>Agreement ID:</strong> ${m.id}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>This document was digitally signed and is legally binding.</p>
            <p>Agreement ID: ${m.id} | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;try{let e=await s.default.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-accelerated-2d-canvas","--no-first-run","--no-zygote","--single-process","--disable-gpu"],executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||void 0}),t=await e.newPage();await t.setContent(f,{waitUntil:"networkidle0"});let n=await t.pdf({format:"Letter",margin:{top:"0.5in",right:"0.5in",bottom:"0.5in",left:"0.5in"},printBackground:!0,preferCSSPageSize:!1,displayHeaderFooter:!1});l=Buffer.from(n),await e.close()}catch(e){console.warn("Puppeteer failed, using fallback PDF generation:",e),l=await c(o,`${m.client.firstName} ${m.client.lastName}`,m.client.email,m.id)}return new a.NextResponse(l,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="agreement-${m.client.firstName}-${m.client.lastName}-${m.id}.pdf"`,"Content-Length":l.length.toString()}})}catch(e){if(console.error("Error generating PDF:",e),e instanceof l.G)return a.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return a.NextResponse.json({error:"Failed to generate PDF"},{status:500})}}i()}catch(e){i(e)}})},71618:(e,t,n)=>{"use strict";n.d(t,{z:()=>a});let i=require("@prisma/client"),a=global.prisma||new i.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),i=t.X(0,[638,452,727],()=>n(92870));module.exports=i})();