(()=>{var e={};e.id=159,e.ids=[159],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},53730:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>b,routeModule:()=>x,serverHooks:()=>v,workAsyncStorage:()=>h,workUnitAsyncStorage:()=>f});var n={};r.r(n),r.d(n,{POST:()=>u});var i=r(42706),s=r(28203),o=r(45994),a=r(39187),l=r(71618),c=r(27727),p=r(65665),d=r(98721);let g=c.Ik({token:c.Yj().min(1,"Token is required"),clientName:c.Yj().min(1,"Client name is required"),clientEmail:c.Yj().email("Valid email is required")});async function u(e){try{var t,r,n;let i=await e.json(),s=g.parse(i),o=await l.z.agreement.findFirst({where:{uniqueToken:s.token,expiresAt:{gte:new Date}},include:{client:!0,template:!0}});if(!o)return a.NextResponse.json({error:"Agreement not found or has expired"},{status:404});let c=`${o.client.firstName} ${o.client.lastName}`.toLowerCase(),p=s.clientName.toLowerCase(),d=o.client.email.toLowerCase(),u=s.clientEmail.toLowerCase();if(c!==p||d!==u)return a.NextResponse.json({error:"Client information does not match. Please verify your name and email."},{status:400});if("SIGNED"===o.status)return a.NextResponse.json({error:"This agreement has already been signed"},{status:400});let x=(e=>{let t=e.headers.get("x-forwarded-for"),r=e.headers.get("x-real-ip");return e.headers.get("cf-connecting-ip")||r||(t?t.split(",")[0].trim():"Unknown")})(e),h=(t=o.template.htmlContent,r=o.client,n=o.id,t.replace(/\{\{client\.firstName\}\}/g,r.firstName||"").replace(/\{\{client\.lastName\}\}/g,r.lastName||"").replace(/\{\{client\.email\}\}/g,r.email||"").replace(/\{\{client\.phone\}\}/g,r.phone||"").replace(/\{\{client\.eventDate\}\}/g,r.eventDate?new Date(r.eventDate).toLocaleDateString("en-CA",{timeZone:"America/Toronto"}):"").replace(/\{\{client\.notes\}\}/g,r.notes||"").replace(/\{\{event\.type\}\}/g,r.eventType||"").replace(/\{\{event\.location\}\}/g,r.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,r.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,r.eventDuration||"").replace(/\{\{event\.package\}\}/g,r.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString("en-CA",{timeZone:"America/Toronto"})).replace(/\{\{agreement\.id\}\}/g,n||"")),f=await l.z.agreement.update({where:{id:o.id},data:{status:"SIGNED",signedAt:new Date,signedFromIP:x,mergedHtml:h},include:{client:!0,template:!0}});try{await m(f,x,e)}catch(e){console.error("Failed to send notification email:",e)}return a.NextResponse.json({message:"Agreement signed successfully",agreement:f})}catch(e){if(e instanceof p.G)return a.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return console.error("Error signing agreement:",e),a.NextResponse.json({error:"Failed to sign agreement"},{status:500})}}async function m(e,t,r){if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS){console.log("SMTP not configured, skipping notification email");return}let n=r.headers.get("x-forwarded-proto")||"https",i=r.headers.get("host")||"localhost:3000",s=process.env.NEXT_PUBLIC_BASE_URL||`${n}://${i}`,o=`${s}/agreement/${e.uniqueToken}`,a=d.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),l=`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #3b82f6; margin: 0; }
        .content { margin-bottom: 30px; }
        .agreement-details { 
          border: 1px solid #eee; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          background-color: #f9f9f9;
        }
        .button { 
          display: inline-block; 
          background-color: #2563eb; 
          color: white; 
          padding: 18px 36px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 10px 5px;
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
        .urgent { background-color: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .signature-info { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Photobooth Guys</h1>
          <p>Agreement Signed Notification</p>
        </div>
        
        <div class="content">
          <p><strong>An agreement has been digitally signed!</strong></p>
          
          <div class="agreement-details">
            <h3>Agreement Details:</h3>
            <p><strong>Client:</strong> ${e.client.firstName} ${e.client.lastName}</p>
            <p><strong>Email:</strong> ${e.client.email}</p>
            <p><strong>Template:</strong> ${e.template.title}</p>
            <p><strong>Agreement ID:</strong> ${e.id}</p>
            <p><strong>Signed At:</strong> ${e.signedAt?new Date(e.signedAt).toLocaleString("en-CA",{timeZone:"America/Toronto"}):"N/A"}</p>
            <p><strong>IP Address:</strong> ${t}</p>
          </div>
          
          <div class="signature-info">
            <h3>Digital Signature Information:</h3>
            <p>This agreement has been legally signed by the client using their email verification. The signature includes:</p>
            <ul>
              <li>Client identity verification</li>
              <li>Timestamp of signing (Toronto timezone)</li>
              <li>IP address of signing location</li>
              <li>Unique agreement identifier</li>
            </ul>
          </div>
          
          <div class="urgent">
            <strong>📋 Next Steps:</strong>
            <ul>
              <li>Review the signed agreement details above</li>
              <li>Download a PDF copy for your records</li>
              <li>Update your internal systems with the signed status</li>
              <li>Contact the client if needed: ${e.client.email}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${o}" class="button">View Signed Agreement</a>
          </div>
          
          <p>This notification was automatically sent when the client completed the digital signing process.</p>
        </div>
        
        <div class="footer">
          <p>Photobooth Guys Agreement Management System</p>
          <p>Generated: ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
        </div>
      </div>
    </body>
    </html>
  `,c={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:"info@photoboothguys.ca",subject:`Agreement Signed - ${e.client.firstName} ${e.client.lastName} - ${e.template.title}`,html:l};try{await a.verify(),await a.sendMail(c),console.log("Signed agreement notification sent successfully")}catch(e){throw console.error("Failed to send notification email:",e),e}}let x=new i.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/agreements/sign/route",pathname:"/api/agreements/sign",filename:"route",bundlePath:"app/api/agreements/sign/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\sign\\route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:h,workUnitAsyncStorage:f,serverHooks:v}=x;function b(){return(0,o.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:f})}},96487:()=>{},78335:()=>{},71618:(e,t,r)=>{"use strict";r.d(t,{z:()=>i});let n=require("@prisma/client"),i=global.prisma||new n.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[638,452,727,721],()=>r(53730));module.exports=n})();