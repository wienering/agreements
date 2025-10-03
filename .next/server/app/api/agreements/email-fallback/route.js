(()=>{var e={};e.id=895,e.ids=[895],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},82836:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>k,routeModule:()=>m,serverHooks:()=>v,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>h});var a={};r.r(a),r.d(a,{POST:()=>g});var n=r(42706),i=r(28203),s=r(45994),o=r(39187),l=r(71618),c=r(27727),p=r(65665);let u=c.Ik({token:c.Yj().min(1,"Token is required"),recipientEmail:c.Yj().email("Valid email is required")});async function g(e){try{var t,r,a;let n=await e.json(),i=u.parse(n),s=await l.z.agreement.findFirst({where:{uniqueToken:i.token,status:"SIGNED"},include:{client:!0,template:!0}});if(!s)return o.NextResponse.json({error:"Signed agreement not found or has expired"},{status:404});t=s.template.htmlContent,r=s.client,a=s.id,t.replace(/\{\{client\.firstName\}\}/g,r.firstName||"").replace(/\{\{client\.lastName\}\}/g,r.lastName||"").replace(/\{\{client\.email\}\}/g,r.email||"").replace(/\{\{client\.phone\}\}/g,r.phone||"").replace(/\{\{client\.eventDate\}\}/g,r.eventDate?new Date(r.eventDate).toLocaleDateString():"").replace(/\{\{client\.notes\}\}/g,r.notes||"").replace(/\{\{event\.type\}\}/g,r.eventType||"").replace(/\{\{event\.location\}\}/g,r.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,r.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,r.eventDuration||"").replace(/\{\{event\.package\}\}/g,r.eventPackage||"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString()).replace(/\{\{agreement\.id\}\}/g,a||"");let c=process.env.NEXT_PUBLIC_BASE_URL||"http://localhost:3000",p=`${c}/agreement/${i.token}`,g=`
AGREEMENT SHARING LINK
======================

Hello ${s.client.firstName},

Your signed agreement is ready! You can access it using the link below:

Agreement Link: ${p}

Agreement Details:
- Client: ${s.client.firstName} ${s.client.lastName}
- Email: ${s.client.email}
- Date Signed: ${s.signedAt?new Date(s.signedAt).toLocaleDateString():"N/A"}
- Agreement ID: ${s.id}

You can:
1. View the agreement online
2. Download a PDF copy
3. Share this link with others

This link will remain active and can be used to access your agreement at any time.

Best regards,
Photobooth Guys
Contact: info@photoboothguys.ca
    `;return o.NextResponse.json({message:"Agreement sharing link generated successfully",recipientEmail:i.recipientEmail,shareableLink:p,shareableContent:g,note:"Email service is not configured. Use the shareable link above to access your agreement."})}catch(e){if(console.error("Error generating shareable link:",e),e instanceof p.G)return o.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return o.NextResponse.json({error:"Failed to generate shareable link"},{status:500})}}let m=new n.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/agreements/email-fallback/route",pathname:"/api/agreements/email-fallback",filename:"route",bundlePath:"app/api/agreements/email-fallback/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\email-fallback\\route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:d,workUnitAsyncStorage:h,serverHooks:v}=m;function k(){return(0,s.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:h})}},96487:()=>{},78335:()=>{},71618:(e,t,r)=>{"use strict";r.d(t,{z:()=>n});let a=require("@prisma/client"),n=global.prisma||new a.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[638,452,727],()=>r(82836));module.exports=a})();