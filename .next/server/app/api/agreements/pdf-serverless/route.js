(()=>{var e={};e.id=79,e.ids=[79],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},36768:(e,t,n)=>{"use strict";n.r(t),n.d(t,{patchFetch:()=>h,routeModule:()=>u,serverHooks:()=>f,workAsyncStorage:()=>m,workUnitAsyncStorage:()=>v});var r={};n.r(r),n.d(r,{POST:()=>d});var a=n(42706),i=n(28203),s=n(45994),o=n(39187),l=n(71618),c=n(27727),p=n(65665);let g=c.Ik({token:c.Yj().min(1,"Token is required")});async function d(e){try{var t,n,r;let a=await e.json(),i=g.parse(a),s=await l.z.agreement.findFirst({where:{uniqueToken:i.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!s)return o.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});let c=(t=s.template.htmlContent,n=s.client,r=s.id,t.replace(/\{\{client\.firstName\}\}/g,n.firstName||"").replace(/\{\{client\.lastName\}\}/g,n.lastName||"").replace(/\{\{client\.email\}\}/g,n.email||"").replace(/\{\{client\.phone\}\}/g,n.phone||"").replace(/\{\{client\.eventDate\}\}/g,n.eventDate?new Date(n.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,n.notes||"").replace(/\{\{event\.type\}\}/g,n.eventType||"").replace(/\{\{event\.location\}\}/g,n.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,n.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,n.eventDuration||"").replace(/\{\{event\.package\}\}/g,n.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,r||"")).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim(),p=`
AGREEMENT DOCUMENT
==================

Photobooth Guys - Service Agreement

Client Information:
------------------
Name: ${s.client.firstName} ${s.client.lastName}
Email: ${s.client.email}
Phone: ${s.client.phone||"Not provided"}
Event Date: ${s.client.eventDate?new Date(s.client.eventDate).toLocaleDateString():"Not specified"}

Event Details:
--------------
Event Type: ${s.client.eventType||"Not specified"}
Location: ${s.client.eventLocation||"Not specified"}
Start Time: ${s.client.eventStartTime||"Not specified"}
Duration: ${s.client.eventDuration||"Not specified"}
Package: ${s.client.eventPackage||"Not specified"}

Agreement Content:
-----------------
${c}

Digital Signature:
-----------------
This agreement has been digitally signed by:
Name: ${s.client.firstName} ${s.client.lastName}
Email: ${s.client.email}
Date Signed: ${s.signedAt?new Date(s.signedAt).toLocaleDateString():"N/A"}

Agreement ID: ${s.id}
Generated: ${new Date().toLocaleDateString()}

This document is legally binding and represents the complete agreement between the parties.

---
Photobooth Guys
Contact: info@photoboothguys.ca
    `,d=Buffer.from(p,"utf-8");return new o.NextResponse(d,{status:200,headers:{"Content-Type":"text/plain","Content-Disposition":`attachment; filename="agreement-${s.client.firstName}-${s.client.lastName}-${s.id}.txt"`,"Content-Length":d.length.toString()}})}catch(e){if(console.error("Error generating PDF:",e),e instanceof p.G)return o.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return o.NextResponse.json({error:"Failed to generate PDF"},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/agreements/pdf-serverless/route",pathname:"/api/agreements/pdf-serverless",filename:"route",bundlePath:"app/api/agreements/pdf-serverless/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\pdf-serverless\\route.ts",nextConfigOutput:"",userland:r}),{workAsyncStorage:m,workUnitAsyncStorage:v,serverHooks:f}=u;function h(){return(0,s.patchFetch)({workAsyncStorage:m,workUnitAsyncStorage:v})}},96487:()=>{},78335:()=>{},71618:(e,t,n)=>{"use strict";n.d(t,{z:()=>a});let r=require("@prisma/client"),a=global.prisma||new r.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),r=t.X(0,[638,452,727],()=>n(36768));module.exports=r})();