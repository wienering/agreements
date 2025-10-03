(()=>{var e={};e.id=686,e.ids=[686],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},10231:(e,t,n)=>{"use strict";n.r(t),n.d(t,{patchFetch:()=>f,routeModule:()=>g,serverHooks:()=>j,workAsyncStorage:()=>u,workUnitAsyncStorage:()=>m});var r={};n.r(r),n.d(r,{POST:()=>T});var a=n(42706),i=n(28203),o=n(45994),s=n(39187),l=n(71618),d=n(27727),p=n(65665);let c=d.Ik({token:d.Yj().min(1,"Token is required")});async function T(e){try{var t,n,r;let a=await e.json(),i=c.parse(a),o=await l.z.agreement.findFirst({where:{uniqueToken:i.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!o)return s.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});let d=(t=o.template.htmlContent,n=o.client,r=o.id,t.replace(/\{\{client\.firstName\}\}/g,n.firstName||"").replace(/\{\{client\.lastName\}\}/g,n.lastName||"").replace(/\{\{client\.email\}\}/g,n.email||"").replace(/\{\{client\.phone\}\}/g,n.phone||"").replace(/\{\{client\.eventDate\}\}/g,n.eventDate?new Date(n.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,n.notes||"").replace(/\{\{event\.type\}\}/g,n.eventType||"").replace(/\{\{event\.location\}\}/g,n.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,n.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,n.eventDuration||"").replace(/\{\{event\.package\}\}/g,n.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,r||"")).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim(),p=`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 2000
>>
stream
BT
/F1 12 Tf
50 750 Td
(AGREEMENT DOCUMENT) Tj
0 -20 Td
(Photobooth Guys - Service Agreement) Tj
0 -30 Td
(Client Information:) Tj
0 -15 Td
(Name: ${o.client.firstName} ${o.client.lastName}) Tj
0 -15 Td
(Email: ${o.client.email}) Tj
0 -15 Td
(Phone: ${o.client.phone||"Not provided"}) Tj
0 -15 Td
(Event Date: ${o.client.eventDate?new Date(o.client.eventDate).toLocaleDateString():"Not specified"}) Tj
0 -30 Td
(Event Details:) Tj
0 -15 Td
(Event Type: ${o.client.eventType||"Not specified"}) Tj
0 -15 Td
(Location: ${o.client.eventLocation||"Not specified"}) Tj
0 -15 Td
(Start Time: ${o.client.eventStartTime||"Not specified"}) Tj
0 -15 Td
(Duration: ${o.client.eventDuration||"Not specified"}) Tj
0 -15 Td
(Package: ${o.client.eventPackage||"Not specified"}) Tj
0 -30 Td
(Agreement Content:) Tj
0 -15 Td
(${d.substring(0,200)}...) Tj
0 -30 Td
(Digital Signature:) Tj
0 -15 Td
(This agreement has been digitally signed by:) Tj
0 -15 Td
(Name: ${o.client.firstName} ${o.client.lastName}) Tj
0 -15 Td
(Email: ${o.client.email}) Tj
0 -15 Td
(Date Signed: ${o.signedAt?new Date(o.signedAt).toLocaleDateString():"N/A"}) Tj
0 -15 Td
(Agreement ID: ${o.id}) Tj
0 -15 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -30 Td
(This document is legally binding and represents the complete agreement between the parties.) Tj
0 -15 Td
(Photobooth Guys) Tj
0 -15 Td
(Contact: info@photoboothguys.ca) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000002340 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
2400
%%EOF`,T=Buffer.from(p,"utf-8");return new s.NextResponse(T,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="agreement-${o.client.firstName}-${o.client.lastName}-${o.id}.pdf"`,"Content-Length":T.length.toString()}})}catch(e){if(console.error("Error generating PDF:",e),e instanceof p.G)return s.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return s.NextResponse.json({error:"Failed to generate PDF"},{status:500})}}let g=new a.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/agreements/pdf-js/route",pathname:"/api/agreements/pdf-js",filename:"route",bundlePath:"app/api/agreements/pdf-js/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\pdf-js\\route.ts",nextConfigOutput:"",userland:r}),{workAsyncStorage:u,workUnitAsyncStorage:m,serverHooks:j}=g;function f(){return(0,o.patchFetch)({workAsyncStorage:u,workUnitAsyncStorage:m})}},96487:()=>{},78335:()=>{},71618:(e,t,n)=>{"use strict";n.d(t,{z:()=>a});let r=require("@prisma/client"),a=global.prisma||new r.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),r=t.X(0,[638,452,727],()=>n(10231));module.exports=r})();