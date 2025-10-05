(()=>{var e={};e.id=6893,e.ids=[6893],e.modules={96330:e=>{"use strict";e.exports=require("@prisma/client")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},7876:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>w,routeModule:()=>d,serverHooks:()=>x,workAsyncStorage:()=>g,workUnitAsyncStorage:()=>m});var s={};r.r(s),r.d(s,{POST:()=>u});var i=r(42706),n=r(28203),o=r(45994),a=r(39187),p=r(11587),l=r(98721);async function c(e,t,r){try{console.log("\uD83D\uDCE7 Creating email transporter...");let s=l.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:!1,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});console.log("\uD83D\uDCE7 SMTP Config:",{host:process.env.SMTP_HOST,port:process.env.SMTP_PORT,user:process.env.SMTP_USER,from:process.env.SMTP_FROM,adminEmail:process.env.ADMIN_EMAIL});let i=`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📄 Agreement Viewed</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Someone has viewed an agreement</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Agreement Details</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>Agreement ID:</strong> ${e.id}</p>
            <p><strong>Client:</strong> ${e.client.firstName} ${e.client.lastName}</p>
            <p><strong>Client Email:</strong> ${e.client.email}</p>
            <p><strong>Template:</strong> ${e.template.title}</p>
            <p><strong>Status:</strong> ${e.status}</p>
            <p><strong>View Count:</strong> ${e.viewCount}</p>
            <p><strong>First Viewed:</strong> ${e.firstViewedAt?new Date(e.firstViewedAt).toLocaleString("en-CA",{timeZone:"America/Toronto"}):"Just now"}</p>
            <p><strong>Last Viewed:</strong> ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-top: 0;">View Details</h3>
            <p><strong>IP Address:</strong> ${t}</p>
            <p><strong>User Agent:</strong> ${r}</p>
            <p><strong>Viewed At:</strong> ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/admin/agreements" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View in Admin Panel
            </a>
          </div>
        </div>
      </div>
    `;console.log("\uD83D\uDCE7 Sending email to:",process.env.ADMIN_EMAIL||"agreements@photoboothguys.ca"),console.log("\uD83D\uDCE7 Email subject:",`📄 Agreement Viewed - ${e.client.firstName} ${e.client.lastName}`);let n=await s.sendMail({from:process.env.SMTP_FROM||"noreply@photoboothguys.ca",to:process.env.ADMIN_EMAIL||"agreements@photoboothguys.ca",subject:`📄 Agreement Viewed - ${e.client.firstName} ${e.client.lastName}`,html:i});console.log("\uD83D\uDCE7 Email sent successfully:",n.messageId)}catch(e){console.error("❌ Error sending view alert email:",e)}}async function u(e){try{let{token:t}=await e.json();if(console.log("\uD83D\uDD0D Track view API called with token:",t),!t)return a.NextResponse.json({error:"Token is required"},{status:400});let r=function(e){let t=e.headers.get("x-forwarded-for"),r=e.headers.get("x-real-ip"),s=e.headers.get("cf-connecting-ip");return t?t.split(",")[0].trim():r||s||"Unknown"}(e),s=e.headers.get("user-agent")||"Unknown",i=await p.z.agreement.findFirst({where:{uniqueToken:t,OR:[{expiresAt:null},{expiresAt:{gte:new Date}}]},include:{client:!0,template:!0}});if(!i)return a.NextResponse.json({error:"Agreement not found or expired"},{status:404});let n=!i.firstViewedAt;return console.log("\uD83D\uDCCA Agreement found:",{id:i.id,client:`${i.client.firstName} ${i.client.lastName}`,isFirstView:n,currentViewCount:i.viewCount}),await p.z.agreement.update({where:{id:i.id},data:{firstViewedAt:i.firstViewedAt||new Date,lastViewedAt:new Date,viewCount:i.viewCount+1}}),n?(console.log("\uD83D\uDCE7 Sending view alert email for first view..."),await c(i,r,s),console.log("✅ View alert email sent successfully")):console.log("\uD83D\uDCE7 Skipping email alert - not first view"),a.NextResponse.json({success:!0,viewCount:i.viewCount+1,isFirstView:n})}catch(e){return console.error("Error tracking agreement view:",e),a.NextResponse.json({error:"Failed to track view"},{status:500})}}let d=new i.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/agreements/track-view/route",pathname:"/api/agreements/track-view",filename:"route",bundlePath:"app/api/agreements/track-view/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\track-view\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:g,workUnitAsyncStorage:m,serverHooks:x}=d;function w(){return(0,o.patchFetch)({workAsyncStorage:g,workUnitAsyncStorage:m})}},96487:()=>{},78335:()=>{},11587:(e,t,r)=>{"use strict";r.d(t,{z:()=>i});var s=r(96330);let i=global.prisma||new s.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[638,5452,8721],()=>r(7876));module.exports=s})();