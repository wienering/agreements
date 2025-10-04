(()=>{var e={};e.id=522,e.ids=[522],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},87288:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>y,routeModule:()=>h,serverHooks:()=>v,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>f});var n={};r.r(n),r.d(n,{POST:()=>m});var s=r(42706),a=r(28203),o=r(45994),i=r(39187),c=r(71618),l=r(27727),p=r(65665),d=r(98721);let u=l.Ik({agreementId:l.Yj().min(1,"Agreement ID is required"),cancellationReason:l.Yj().min(1,"Cancellation reason is required"),adminName:l.Yj().min(1,"Admin name is required")});async function m(e){try{let t=await e.json(),r=u.parse(t),n=await c.z.agreement.findUnique({where:{id:r.agreementId},include:{client:!0,template:!0}});if(!n)return i.NextResponse.json({error:"Agreement not found"},{status:404});if("SIGNED"!==n.status)return i.NextResponse.json({error:"Only signed agreements can be cancelled"},{status:400});let s=await c.z.agreement.update({where:{id:n.id},data:{status:"CANCELLED",cancelledAt:new Date,cancelledBy:r.adminName,cancellationReason:r.cancellationReason,archived:!0,archivedAt:new Date},include:{client:!0,template:!0}});try{await g(s,r.cancellationReason,r.adminName,e)}catch(e){console.error("Failed to send cancellation email:",e)}return i.NextResponse.json({message:"Agreement cancelled and archived successfully",agreement:s})}catch(e){if(e instanceof p.G)return i.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return console.error("Error cancelling agreement:",e),i.NextResponse.json({error:"Failed to cancel agreement"},{status:500})}}async function g(e,t,r,n){if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS){console.log("SMTP not configured, skipping cancellation email");return}n.headers.get("x-forwarded-proto"),n.headers.get("host"),process.env.NEXT_PUBLIC_BASE_URL,e.uniqueToken;let s=d.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),a=`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #dc2626; margin: 0; }
        .content { margin-bottom: 30px; }
        .cancellation-notice { 
          border: 2px solid #dc2626; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          background-color: #fef2f2;
        }
        .agreement-details { 
          border: 1px solid #eee; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          background-color: #f9f9f9;
        }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
        .important { background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Photobooth Guys</h1>
          <p>Agreement Cancellation Notice</p>
        </div>
        
        <div class="content">
          <div class="cancellation-notice">
            <h2 style="color: #dc2626; margin-top: 0;">⚠️ AGREEMENT CANCELLED</h2>
            <p><strong>Your service agreement has been cancelled by Photobooth Guys.</strong></p>
          </div>
          
          <p>Dear ${e.client.firstName} ${e.client.lastName},</p>
          
          <p>We are writing to inform you that your service agreement has been cancelled. This action was taken by our administration team and is effective immediately.</p>
          
          <div class="agreement-details">
            <h3>Agreement Details:</h3>
            <p><strong>Client:</strong> ${e.client.firstName} ${e.client.lastName}</p>
            <p><strong>Email:</strong> ${e.client.email}</p>
            <p><strong>Template:</strong> ${e.template.title}</p>
            <p><strong>Agreement ID:</strong> ${e.id}</p>
            <p><strong>Originally Signed:</strong> ${e.signedAt?new Date(e.signedAt).toLocaleString("en-CA",{timeZone:"America/Toronto"}):"N/A"}</p>
            <p><strong>Cancelled On:</strong> ${e.cancelledAt?new Date(e.cancelledAt).toLocaleString("en-CA",{timeZone:"America/Toronto"}):"N/A"}</p>
            <p><strong>Cancelled By:</strong> ${r}</p>
            <p><strong>Reason:</strong> ${t}</p>
          </div>
          
          <div class="important">
            <h3>Important Information:</h3>
            <ul>
              <li>This agreement is now null and void</li>
              <li>All terms and conditions are no longer in effect</li>
              <li>Any services scheduled under this agreement are cancelled</li>
              <li>If you have any questions, please contact us immediately</li>
            </ul>
          </div>
          
          <p>If you believe this cancellation was made in error, or if you have any questions about this matter, please contact us immediately at <strong>info@photoboothguys.ca</strong>.</p>
          
          <p>We apologize for any inconvenience this may cause.</p>
          
          <p>Best regards,<br>
          <strong>Photobooth Guys Administration</strong></p>
        </div>
        
        <div class="footer">
          <p>Photobooth Guys Agreement Management System</p>
          <p>Generated: ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
        </div>
      </div>
    </body>
    </html>
  `,o={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:e.client.email,subject:`Agreement Cancelled - ${e.client.firstName} ${e.client.lastName} - ${e.template.title}`,html:a};try{await s.verify(),await s.sendMail(o),console.log("Cancellation email sent successfully")}catch(e){throw console.error("Failed to send cancellation email:",e),e}}let h=new s.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/agreements/cancel/route",pathname:"/api/agreements/cancel",filename:"route",bundlePath:"app/api/agreements/cancel/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\cancel\\route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:x,workUnitAsyncStorage:f,serverHooks:v}=h;function y(){return(0,o.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:f})}},96487:()=>{},78335:()=>{},71618:(e,t,r)=>{"use strict";r.d(t,{z:()=>s});let n=require("@prisma/client"),s=global.prisma||new n.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[638,452,727,721],()=>r(87288));module.exports=n})();