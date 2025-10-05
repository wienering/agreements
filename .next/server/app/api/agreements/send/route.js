(()=>{var e={};e.id=4898,e.ids=[4898],e.modules={96330:e=>{"use strict";e.exports=require("@prisma/client")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},8624:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>f,routeModule:()=>m,serverHooks:()=>v,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>h});var n={};r.r(n),r.d(n,{POST:()=>g});var i=r(42706),a=r(28203),s=r(45994),o=r(39187),l=r(11587),c=r(98721),p=r(27727),d=r(65665);let u=p.Ik({agreementId:p.Yj().min(1,"Agreement ID is required")});async function g(e){try{var t,r,n,i;let a,s,p,d;let g=await e.json(),m=u.parse(g),x=await l.z.agreement.findUnique({where:{id:m.agreementId},include:{client:!0,template:!0}});if(!x)return o.NextResponse.json({error:"Agreement not found"},{status:404});if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS)return o.NextResponse.json({error:"Email service is not configured. Please contact support to set up email functionality.",fallback:{clientLink:`http://localhost:3000/agreement/${x.uniqueToken}`,message:"You can copy and share this link with your client instead."}},{status:503});let h=(t=x.template.htmlContent,r=x.client,n=x.id,t.replace(/\{\{client\.firstName\}\}/g,r.firstName||"").replace(/\{\{client\.lastName\}\}/g,r.lastName||"").replace(/\{\{client\.email\}\}/g,r.email||"").replace(/\{\{client\.phone\}\}/g,r.phone||"").replace(/\{\{client\.eventDate\}\}/g,r.eventDate?new Date(r.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,r.notes||"").replace(/\{\{event\.type\}\}/g,r.eventType||"").replace(/\{\{event\.location\}\}/g,r.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,r.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,r.eventDuration||"").replace(/\{\{event\.package\}\}/g,r.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,n||""));e.headers.get("x-forwarded-proto"),e.headers.get("host");let v=`http://localhost:3000/agreement/${x.uniqueToken}`,f=c.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),y=x.emailSendCount||0,b=y+1,w=(i=x.expiresAt)?i.toLocaleDateString("en-CA",{timeZone:"America/Toronto",weekday:"long",year:"numeric",month:"long",day:"numeric"}):"No expiration date set";1===b?(a=`Service Agreement Ready - ${x.client.firstName}`,s="Service Agreement Ready for Review",p="Your service agreement is ready for review and digital signature. Please click the button below to access your agreement.",d=`This agreement expires on ${w}. Please review and sign before the expiration date.`):2===b?(a=`Reminder: Service Agreement Pending - ${x.client.firstName}`,s="Reminder: Your Service Agreement is Waiting",p="This is a friendly reminder that your service agreement is still waiting for your review and signature. We want to make sure everything is ready for your event.",d=`Please review and sign your agreement to secure your booking. This agreement expires on ${w}.`):(a=`Final Notice: Service Agreement - ${x.client.firstName}`,s="Final Notice: Service Agreement Signature Required",p="This is our final notice regarding your service agreement. We need your signature to proceed with your booking and ensure everything is ready for your event.",d=`Please sign your agreement immediately to avoid any delays in your service. This agreement expires on ${w}.`);let S=`
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
            background-color: #2563eb !important; 
            color: white !important; 
            padding: 18px 36px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 5px;
            font-weight: 700;
            font-size: 18px;
            font-family: Arial, sans-serif;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            border: none;
            transition: all 0.2s ease;
            min-width: 220px;
            text-shadow: none;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            letter-spacing: 0.5px;
          }
          .button:hover { 
            background-color: #1d4ed8; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            transform: translateY(-1px);
          }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
          .urgent { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .reminder { background-color: #fef3cd; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; color: #92400e; }
          .final-notice { background-color: #fef2f2; border: 2px solid #fca5a5; padding: 15px; border-radius: 6px; margin: 20px 0; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>${s}</p>
          </div>
          
          <div class="content">
            <p>Dear ${x.client.firstName} ${x.client.lastName},</p>
            
            <p>${p}</p>
            
            <div style="text-align: center; margin: 40px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
              <a href="${v}" class="button">Review & Sign Agreement</a>
              <p style="margin-top: 15px; font-size: 14px; color: #64748b;">Click the button above to access your agreement</p>
            </div>
            
            <div class="${1===b?"urgent":2===b?"reminder":"final-notice"}">
              <strong>${1===b?"⏰ Important:":2===b?"\uD83D\uDCE7 Reminder:":"\uD83D\uDEA8 Final Notice:"}</strong> 
              ${d}
              ${b>1?`<br><br><strong>Previous emails sent:</strong> ${y}`:""}
            </div>
            
            <h3>Agreement Preview:</h3>
            <div class="agreement-preview">
              ${h.substring(0,500)}${h.length>500?"...":""}
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
            <p>Agreement ID: ${x.id} | Generated: ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
          </div>
        </div>
      </body>
      </html>
    `,k={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:x.client.email,subject:a,html:S};try{await f.verify();let e=await Promise.race([f.sendMail(k),new Promise((e,t)=>setTimeout(()=>t(Error("Email send timeout")),15e3))]);return console.log("Agreement email sent successfully:",e),await l.z.agreement.update({where:{id:x.id},data:{status:"DRAFT"===x.status?"LIVE":x.status,lastEmailedAt:new Date,emailSendCount:{increment:1}}}),o.NextResponse.json({message:"Agreement sent successfully",recipientEmail:x.client.email,agreementId:x.id,status:"LIVE"})}catch(e){return console.error("Email sending failed:",e),o.NextResponse.json({error:"Failed to send email. Please try again later or use the copy link feature.",fallback:{clientLink:v,message:"You can copy and share this link with your client instead."}},{status:500})}}catch(e){if(console.error("Error sending agreement:",e),e instanceof d.G)return o.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return o.NextResponse.json({error:"Failed to send agreement"},{status:500})}}let m=new i.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/agreements/send/route",pathname:"/api/agreements/send",filename:"route",bundlePath:"app/api/agreements/send/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\send\\route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:x,workUnitAsyncStorage:h,serverHooks:v}=m;function f(){return(0,s.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:h})}},96487:()=>{},78335:()=>{},11587:(e,t,r)=>{"use strict";r.d(t,{z:()=>i});var n=r(96330);let i=global.prisma||new n.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[638,5452,7727,8721],()=>r(8624));module.exports=n})();