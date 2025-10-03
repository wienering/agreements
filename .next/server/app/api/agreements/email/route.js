(()=>{var e={};e.id=712,e.ids=[712],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},88681:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>v,routeModule:()=>m,serverHooks:()=>f,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>h});var s={};r.r(s),r.d(s,{POST:()=>g});var n=r(42706),a=r(28203),i=r(45994),o=r(39187),l=r(71618),p=r(98721),c=r(27727),u=r(65665);let d=c.Ik({token:c.Yj().min(1,"Token is required"),recipientEmail:c.Yj().email("Valid email is required")});async function g(e){try{var t,r,s;let n=await e.json(),a=d.parse(n),i=await l.z.agreement.findFirst({where:{uniqueToken:a.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!i)return o.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});let c=(t=i.template.htmlContent,r=i.client,s=i.id,t.replace(/\{\{client\.firstName\}\}/g,r.firstName||"").replace(/\{\{client\.lastName\}\}/g,r.lastName||"").replace(/\{\{client\.email\}\}/g,r.email||"").replace(/\{\{client\.phone\}\}/g,r.phone||"").replace(/\{\{client\.eventDate\}\}/g,r.eventDate?new Date(r.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,r.notes||"").replace(/\{\{event\.type\}\}/g,r.eventType||"").replace(/\{\{event\.location\}\}/g,r.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,r.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,r.eventDuration||"").replace(/\{\{event\.package\}\}/g,r.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,s||"")),u=e.headers.get("x-forwarded-proto")||"https",g=e.headers.get("host")||"localhost:3000",m=process.env.NEXT_PUBLIC_BASE_URL||`${u}://${g}`;if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS)return o.NextResponse.json({error:"Email service is not configured. Please contact support to set up email functionality."},{status:503});let x=p.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),h=`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Signed Agreement - ${i.client.firstName} ${i.client.lastName}</title>
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
              background: #1d4ed8;
              color: white;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 8px;
              margin: 10px 5px;
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              border: 2px solid #1d4ed8;
              transition: all 0.2s ease;
              min-width: 200px;
            }
            .button:hover {
              background: #1e40af;
              border-color: #1e40af;
              box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
              transform: translateY(-1px);
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
              <h2>Hello ${i.client.firstName},</h2>
              <p>Thank you for signing your service agreement! Please find a copy of your signed agreement below.</p>
              
              <div class="signature-info">
                <h3>Agreement Details</h3>
                <p><strong>Client:</strong> ${i.client.firstName} ${i.client.lastName}</p>
                <p><strong>Email:</strong> ${i.client.email}</p>
                <p><strong>Date Signed:</strong> ${i.signedAt?new Date(i.signedAt).toLocaleDateString():"N/A"}</p>
                <p><strong>Agreement ID:</strong> ${i.id}</p>
              </div>
              
              <div class="agreement-content">
                ${c}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${m}/agreement/${a.token}" class="button">View Online</a>
                <a href="${m}/api/agreements/pdf" class="button">Download PDF</a>
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
    `,f={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:a.recipientEmail,subject:`Signed Agreement - ${i.client.firstName} ${i.client.lastName}`,html:h};try{await x.verify();let e=await Promise.race([x.sendMail(f),new Promise((e,t)=>setTimeout(()=>t(Error("Email send timeout")),15e3))]);return console.log("Email sent successfully:",e),o.NextResponse.json({message:"Agreement sent successfully",recipientEmail:a.recipientEmail})}catch(e){if(console.error("Email sending failed:",e),e.message&&e.message.includes("timeout"))return o.NextResponse.json({error:"Email service is currently unavailable. Please try again later or contact support."},{status:503});if(e.message&&e.message.includes("authentication"))return o.NextResponse.json({error:"Email authentication failed. Please contact support to fix email configuration."},{status:503});return o.NextResponse.json({error:"Failed to send email. Please try again later or contact support."},{status:500})}}catch(e){if(console.error("Error sending email:",e),e instanceof u.G)return o.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return o.NextResponse.json({error:"Failed to send email"},{status:500})}}let m=new n.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/agreements/email/route",pathname:"/api/agreements/email",filename:"route",bundlePath:"app/api/agreements/email/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\email\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:x,workUnitAsyncStorage:h,serverHooks:f}=m;function v(){return(0,i.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:h})}},96487:()=>{},78335:()=>{},71618:(e,t,r)=>{"use strict";r.d(t,{z:()=>n});let s=require("@prisma/client"),n=global.prisma||new s.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[638,452,727,721],()=>r(88681));module.exports=s})();