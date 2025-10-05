(()=>{var e={};e.id=4528,e.ids=[4528],e.modules={96330:e=>{"use strict";e.exports=require("@prisma/client")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},4351:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>A,routeModule:()=>x,serverHooks:()=>y,workAsyncStorage:()=>f,workUnitAsyncStorage:()=>v});var s={};r.r(s),r.d(s,{POST:()=>m});var i=r(42706),o=r(28203),a=r(45994),n=r(39187),c=r(11587),l=r(98721),d=r(27727),u=r(65665);let p=d.Ik({token:d.Yj().min(1,"Token is required"),email:d.Yj().email("Valid email is required")});async function m(e){try{let t=await e.json(),r=p.parse(t),s=await c.z.agreement.findUnique({where:{uniqueToken:r.token},include:{client:!0,template:!0,fields:!0}});if(!s)return n.NextResponse.json({error:"Agreement not found"},{status:404});if(s.client.email.toLowerCase()===r.email.toLowerCase())return n.NextResponse.json({success:!0,message:"Email verified successfully",agreement:{id:s.id,client:s.client,template:s.template,status:s.status,signedAt:s.signedAt,signedFromIP:s.signedFromIP,mergedHtml:s.mergedHtml,fields:s.fields}});{let t=function(e){let t=e.headers.get("x-forwarded-for"),r=e.headers.get("x-real-ip"),s=e.headers.get("cf-connecting-ip");return t?t.split(",")[0].trim():r||s||"Unknown"}(e),i=e.headers.get("user-agent")||"Unknown";return await g({agreementId:s.id,clientEmail:s.client.email,attemptedEmail:r.email,ipAddress:t,userAgent:i,timestamp:new Date}),n.NextResponse.json({error:"Email address does not match the agreement. Please check your email and try again.",success:!1},{status:403})}}catch(e){if(console.error("Error verifying email:",e),e instanceof u.G)return n.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return n.NextResponse.json({error:"Failed to verify email"},{status:500})}}async function g(e){try{await h(e),console.log("Unauthorized access attempt:",{agreementId:e.agreementId,clientEmail:e.clientEmail,attemptedEmail:e.attemptedEmail,ipAddress:e.ipAddress,userAgent:e.userAgent,timestamp:e.timestamp})}catch(e){console.error("Failed to record unauthorized access:",e)}}async function h(e){if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS){console.log("SMTP not configured - cannot send unauthorized access email");return}try{let t=l.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),r=`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .alert { background-color: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .details { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #dc2626;">🚨 Security Alert</h1>
            <h2>Unauthorized Access Attempt</h2>
          </div>
          
          <div class="alert">
            <h3 style="color: #dc2626; margin-top: 0;">⚠️ Unauthorized Access Detected</h3>
            <p>Someone attempted to access an agreement with an incorrect email address.</p>
          </div>
          
          <div class="details">
            <h3>Access Details:</h3>
            <ul>
              <li><strong>Agreement ID:</strong> ${e.agreementId}</li>
              <li><strong>Correct Email:</strong> ${e.clientEmail}</li>
              <li><strong>Attempted Email:</strong> ${e.attemptedEmail}</li>
              <li><strong>IP Address:</strong> ${e.ipAddress}</li>
              <li><strong>User Agent:</strong> ${e.userAgent}</li>
              <li><strong>Timestamp:</strong> ${e.timestamp.toLocaleString("en-CA",{timeZone:"America/Toronto"})}</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">Recommended Actions:</h4>
            <ul style="margin: 0; color: #92400e;">
              <li>Review the agreement access logs</li>
              <li>Consider contacting the client if this seems suspicious</li>
              <li>Monitor for additional unauthorized access attempts</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This alert was automatically generated by the Photobooth Guys Agreement System</p>
            <p>Generated: ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
          </div>
        </div>
      </body>
      </html>
    `,s={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:"agreements@photoboothguys.ca",subject:`🚨 Security Alert: Unauthorized Access Attempt - Agreement ${e.agreementId}`,html:r};await t.sendMail(s),console.log("Unauthorized access email sent successfully")}catch(e){console.error("Failed to send unauthorized access email:",e)}}let x=new i.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/agreements/verify-email/route",pathname:"/api/agreements/verify-email",filename:"route",bundlePath:"app/api/agreements/verify-email/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\verify-email\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:f,workUnitAsyncStorage:v,serverHooks:y}=x;function A(){return(0,a.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:v})}},96487:()=>{},78335:()=>{},11587:(e,t,r)=>{"use strict";r.d(t,{z:()=>i});var s=r(96330);let i=global.prisma||new s.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[638,5452,7727,8721],()=>r(4351));module.exports=s})();