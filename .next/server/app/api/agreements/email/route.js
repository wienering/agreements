(()=>{var e={};e.id=712,e.ids=[712],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},88681:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>f,routeModule:()=>m,serverHooks:()=>v,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>h});var s={};r.r(s),r.d(s,{POST:()=>g});var i=r(42706),n=r(28203),a=r(45994),o=r(39187),p=r(71618),l=r(98721),c=r(27727),d=r(65665);let u=c.Ik({token:c.Yj().min(1,"Token is required"),recipientEmail:c.Yj().email("Valid email is required")});async function g(e){try{var t,r,s;let i=await e.json(),n=u.parse(i),a=await p.z.agreement.findFirst({where:{uniqueToken:n.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!a)return o.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});let c=(t=a.template.htmlContent,r=a.client,s=a.id,t.replace(/\{\{client\.firstName\}\}/g,r.firstName||"").replace(/\{\{client\.lastName\}\}/g,r.lastName||"").replace(/\{\{client\.email\}\}/g,r.email||"").replace(/\{\{client\.phone\}\}/g,r.phone||"").replace(/\{\{client\.eventDate\}\}/g,r.eventDate?new Date(r.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,r.notes||"").replace(/\{\{event\.type\}\}/g,r.eventType||"").replace(/\{\{event\.location\}\}/g,r.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,r.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,r.eventDuration||"").replace(/\{\{event\.package\}\}/g,r.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,s||"")),d=l.createTransport({host:process.env.SMTP_HOST||"smtp.gmail.com",port:parseInt(process.env.SMTP_PORT||"587"),secure:!1,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}),g=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Signed Agreement - ${a.client.firstName} ${a.client.lastName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              color: #333;
              background: #f4f4f4;
            }
            .email-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: #2563eb;
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 10px 0 0 0;
              opacity: 0.9;
            }
            .content {
              padding: 30px;
            }
            .agreement-content {
              font-size: 14px;
              line-height: 1.8;
              margin-bottom: 30px;
            }
            .signature-info {
              background: #f8fafc;
              padding: 20px;
              border-radius: 6px;
              border-left: 4px solid #10b981;
              margin: 20px 0;
            }
            .footer {
              background: #f8fafc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 10px 5px;
              font-weight: 500;
            }
            .button:hover {
              background: #059669;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Photobooth Guys</h1>
              <p>Signed Service Agreement</p>
            </div>
            
            <div class="content">
              <h2>Hello ${a.client.firstName},</h2>
              <p>Thank you for signing your service agreement! Please find a copy of your signed agreement below.</p>
              
              <div class="signature-info">
                <h3>Agreement Details</h3>
                <p><strong>Client:</strong> ${a.client.firstName} ${a.client.lastName}</p>
                <p><strong>Email:</strong> ${a.client.email}</p>
                <p><strong>Date Signed:</strong> ${a.signedAt?new Date(a.signedAt).toLocaleDateString():"N/A"}</p>
                <p><strong>Agreement ID:</strong> ${a.id}</p>
              </div>
              
              <div class="agreement-content">
                ${c}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL||"http://localhost:3000"}/agreement/${n.token}" class="button">View Online</a>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL||"http://localhost:3000"}/api/agreements/pdf" class="button">Download PDF</a>
              </div>
            </div>
            
            <div class="footer">
              <p>This document was digitally signed and is legally binding.</p>
              <p>If you have any questions, please contact us at info@photoboothguys.ca</p>
              <p>\xa9 ${new Date().getFullYear()} Photobooth Guys. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,m={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:n.recipientEmail,subject:`Signed Agreement - ${a.client.firstName} ${a.client.lastName}`,html:g};return await d.sendMail(m),o.NextResponse.json({message:"Agreement sent successfully",recipientEmail:n.recipientEmail})}catch(e){if(console.error("Error sending email:",e),e instanceof d.G)return o.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return o.NextResponse.json({error:"Failed to send email"},{status:500})}}let m=new i.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/agreements/email/route",pathname:"/api/agreements/email",filename:"route",bundlePath:"app/api/agreements/email/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\email\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:x,workUnitAsyncStorage:h,serverHooks:v}=m;function f(){return(0,a.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:h})}},96487:()=>{},78335:()=>{},71618:(e,t,r)=>{"use strict";r.d(t,{z:()=>i});let s=require("@prisma/client"),i=global.prisma||new s.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[638,452,727,721],()=>r(88681));module.exports=s})();