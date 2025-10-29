(()=>{var e={};e.id=8939,e.ids=[8939],e.modules={96330:e=>{"use strict";e.exports=require("@prisma/client")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},64022:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>w,routeModule:()=>x,serverHooks:()=>v,workAsyncStorage:()=>f,workUnitAsyncStorage:()=>h});var i={};r.r(i),r.d(i,{POST:()=>m});var s=r(42706),o=r(28203),n=r(45994),a=r(39187),c=r(11587),p=r(27727),d=r(98721);p.Ik({email:p.Yj().email("Valid email is required")});let l=new Map,u=new Map;async function m(e){try{let t=function(e){let t=e.headers.get("x-forwarded-for"),r=e.headers.get("x-real-ip");return e.headers.get("cf-connecting-ip")||r||(t?t.split(",")[0].trim():"unknown")}(e),r=function(e){let t=Date.now(),r=`rate_limit_${e}`,i=u.get(r);if(!i||t>i.resetTime){let e=t+9e5;return u.set(r,{count:1,resetTime:e}),{allowed:!0,remaining:4,resetTime:e}}return i.count>=5?{allowed:!1,remaining:0,resetTime:i.resetTime}:(i.count++,u.set(r,i),{allowed:!0,remaining:5-i.count,resetTime:i.resetTime})}(t);if(!r.allowed)return a.NextResponse.json({error:"Too many verification requests. Please try again later.",rateLimit:{remaining:r.remaining,resetTime:new Date(r.resetTime).toISOString()}},{status:429,headers:{"X-RateLimit-Limit":"5","X-RateLimit-Remaining":r.remaining.toString(),"X-RateLimit-Reset":new Date(r.resetTime).toISOString(),"Retry-After":Math.ceil((r.resetTime-Date.now())/1e3).toString()}});let{email:i}=await e.json();if(!i||!i.includes("@"))return a.NextResponse.json({error:"Valid email address is required",code:"INVALID_EMAIL"},{status:400});let s=i.toLowerCase(),o=await c.z.client.findFirst({where:{email:s}});if(!o)return a.NextResponse.json({success:!0,message:"If this email is associated with an agreement, you will receive a verification code.",rateLimit:{remaining:r.remaining,resetTime:new Date(r.resetTime).toISOString()}});let n=Math.floor(1e5+9e5*Math.random()).toString(),p=new Date(Date.now()+9e5);if(l.set(s,{code:n,expiresAt:p}),!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS)return console.log("SMTP not configured, verification code:",n),a.NextResponse.json({success:!0,message:"Email service is not configured. Please contact support.",debugCode:n,rateLimit:{remaining:r.remaining,resetTime:new Date(r.resetTime).toISOString()}});let m=await g(o,n),x=d.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});return await x.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:s,subject:"Your Client Portal Access Code - Photobooth Guys",html:m}),a.NextResponse.json({success:!0,message:"Verification code sent to your email address.",rateLimit:{remaining:r.remaining,resetTime:new Date(r.resetTime).toISOString()}})}catch(e){return console.error("Error requesting portal access:",e),a.NextResponse.json({error:"Failed to send verification code. Please try again.",code:"SERVER_ERROR"},{status:500})}}async function g(e,t){return"minimal"===(process.env.VERIFICATION_EMAIL_TEMPLATE||"default")?`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your verification code</h2>
        <p>Hello ${e.firstName},</p>
        <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 2px;">${t}</strong></p>
        <p>This code expires in 15 minutes.</p>
      </div>
    `:`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Client Portal Access Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
          .content { padding: 40px 30px; }
          .code-container { background: #f1f5f9; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; border: 2px dashed #cbd5e1; }
          .code { font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 6px; margin: 15px 0; font-family: 'Courier New', monospace; }
          .expiry { color: #64748b; font-size: 14px; margin-top: 10px; }
          .security-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
          .footer a { color: #2563eb; text-decoration: none; }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
            .header, .content, .footer { padding: 20px; }
            .code { font-size: 28px; letter-spacing: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Client Portal Access</p>
          </div>
          
          <div class="content">
            <h2 style="color: #1e293b; margin-top: 0;">Hello ${e.firstName}!</h2>
            <p style="color: #475569; line-height: 1.6;">You requested access to your client portal. Use the verification code below to log in:</p>
            
            <div class="code-container">
              <p style="margin: 0 0 10px 0; color: #64748b; font-weight: 600;">Your verification code:</p>
              <div class="code">${t}</div>
              <div class="expiry">⏰ Expires in 15 minutes</div>
            </div>
            
            <div class="security-note">
              <p style="margin: 0; color: #92400e;"><strong>Security Notice:</strong> If you didn't request this code, please ignore this email. Never share this code with anyone.</p>
            </div>
            
            <p style="color: #64748b;">Once logged in, you'll be able to view all your agreements and add any missing information.</p>
          </div>
          
          <div class="footer">
            <p>This verification code is valid for 15 minutes only.</p>
            <p>Questions? Contact us at <a href="mailto:info@photoboothguys.ca">info@photoboothguys.ca</a></p>
            <p>\xa9 ${new Date().getFullYear()} Photobooth Guys. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `}let x=new s.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/agreements/portal/request-access/route",pathname:"/api/agreements/portal/request-access",filename:"route",bundlePath:"app/api/agreements/portal/request-access/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\portal\\request-access\\route.ts",nextConfigOutput:"",userland:i}),{workAsyncStorage:f,workUnitAsyncStorage:h,serverHooks:v}=x;function w(){return(0,n.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:h})}},96487:()=>{},78335:()=>{},11587:(e,t,r)=>{"use strict";r.d(t,{z:()=>s});var i=r(96330);let s=global.prisma||new i.PrismaClient({log:["error","warn"]})}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[638,5452,7727,8721],()=>r(64022));module.exports=i})();