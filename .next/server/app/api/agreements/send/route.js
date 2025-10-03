(()=>{var e={};e.id=898,e.ids=[898],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},8624:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>f,routeModule:()=>m,serverHooks:()=>x,workAsyncStorage:()=>h,workUnitAsyncStorage:()=>v});var s={};r.r(s),r.d(s,{POST:()=>g});var n=r(42706),i=r(28203),a=r(45994),o=r(39187),c=r(71618),l=r(98721),p=r(27727),u=r(65665);let d=p.Ik({agreementId:p.Yj().min(1,"Agreement ID is required")});async function g(e){try{var t,r,s;let n=await e.json(),i=d.parse(n),a=await c.z.agreement.findUnique({where:{id:i.agreementId},include:{client:!0,template:!0}});if(!a)return o.NextResponse.json({error:"Agreement not found"},{status:404});if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS)return o.NextResponse.json({error:"Email service is not configured. Please contact support to set up email functionality.",fallback:{clientLink:`${process.env.NEXT_PUBLIC_BASE_URL||"http://localhost:3000"}/agreement/${a.uniqueToken}`,message:"You can copy and share this link with your client instead."}},{status:503});let p=(t=a.template.htmlContent,r=a.client,s=a.id,t.replace(/\{\{client\.firstName\}\}/g,r.firstName||"").replace(/\{\{client\.lastName\}\}/g,r.lastName||"").replace(/\{\{client\.email\}\}/g,r.email||"").replace(/\{\{client\.phone\}\}/g,r.phone||"").replace(/\{\{client\.eventDate\}\}/g,r.eventDate?new Date(r.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,r.notes||"").replace(/\{\{event\.type\}\}/g,r.eventType||"").replace(/\{\{event\.location\}\}/g,r.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,r.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,r.eventDuration||"").replace(/\{\{event\.package\}\}/g,r.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,s||"")),u=`${process.env.NEXT_PUBLIC_BASE_URL||"http://localhost:3000"}/agreement/${a.uniqueToken}`,g=l.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),m=`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #3b82f6; margin: 0; }
          .content { margin-bottom: 30px; }
          .agreement-preview { 
            border: 1px solid #eee; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            background-color: #f9f9f9;
          }
          .button { 
            display: inline-block; 
            background-color: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 10px 5px;
            font-weight: 500;
          }
          .button:hover { background-color: #2563eb; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
          .urgent { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Service Agreement Ready for Review</p>
          </div>
          
          <div class="content">
            <p>Dear ${a.client.firstName} ${a.client.lastName},</p>
            
            <p>Your service agreement is ready for review and digital signature. Please click the button below to access your agreement.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${u}" class="button">Review & Sign Agreement</a>
            </div>
            
            <div class="urgent">
              <strong>⏰ Important:</strong> This agreement expires on ${a.expiresAt?new Date(a.expiresAt).toLocaleDateString("en-CA",{timeZone:"America/Toronto"}):"the specified date"}. Please review and sign before the expiration date.
            </div>
            
            <h3>Agreement Preview:</h3>
            <div class="agreement-preview">
              ${p.substring(0,500)}${p.length>500?"...":""}
            </div>
            
            <p>To view the complete agreement and sign it digitally, please click the button above.</p>
            
            <h3>What happens next?</h3>
            <ul>
              <li>Review the complete agreement terms and conditions</li>
              <li>Verify all information is correct</li>
              <li>Sign the agreement digitally using your email confirmation</li>
              <li>Download a copy of your signed agreement</li>
            </ul>
            
            <p>If you have any questions about this agreement, please contact us at info@photoboothguys.ca</p>
          </div>
          
          <div class="footer">
            <p>This email was sent by Photobooth Guys Agreement Management System</p>
            <p>Agreement ID: ${a.id} | Generated: ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
          </div>
        </div>
      </body>
      </html>
    `,h={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:a.client.email,subject:`Service Agreement Ready for Review - ${a.template.title}`,html:m};try{await g.verify();let e=await Promise.race([g.sendMail(h),new Promise((e,t)=>setTimeout(()=>t(Error("Email send timeout")),15e3))]);return console.log("Agreement email sent successfully:",e),"DRAFT"===a.status&&await c.z.agreement.update({where:{id:a.id},data:{status:"LIVE"}}),o.NextResponse.json({message:"Agreement sent successfully",recipientEmail:a.client.email,agreementId:a.id,status:"LIVE"})}catch(e){return console.error("Email sending failed:",e),o.NextResponse.json({error:"Failed to send email. Please try again later or use the copy link feature.",fallback:{clientLink:u,message:"You can copy and share this link with your client instead."}},{status:500})}}catch(e){if(console.error("Error sending agreement:",e),e instanceof u.G)return o.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return o.NextResponse.json({error:"Failed to send agreement"},{status:500})}}let m=new n.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/agreements/send/route",pathname:"/api/agreements/send",filename:"route",bundlePath:"app/api/agreements/send/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\send\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:h,workUnitAsyncStorage:v,serverHooks:x}=m;function f(){return(0,a.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:v})}},96487:()=>{},78335:()=>{},71618:(e,t,r)=>{"use strict";r.d(t,{z:()=>n});let s=require("@prisma/client"),n=global.prisma||new s.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[638,452,727,721],()=>r(8624));module.exports=s})();