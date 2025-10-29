(()=>{var e={};e.id=3159,e.ids=[3159],e.modules={96330:e=>{"use strict";e.exports=require("@prisma/client")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79646:e=>{"use strict";e.exports=require("child_process")},55511:e=>{"use strict";e.exports=require("crypto")},14985:e=>{"use strict";e.exports=require("dns")},94735:e=>{"use strict";e.exports=require("events")},29021:e=>{"use strict";e.exports=require("fs")},81630:e=>{"use strict";e.exports=require("http")},55591:e=>{"use strict";e.exports=require("https")},91645:e=>{"use strict";e.exports=require("net")},21820:e=>{"use strict";e.exports=require("os")},33873:e=>{"use strict";e.exports=require("path")},27910:e=>{"use strict";e.exports=require("stream")},34631:e=>{"use strict";e.exports=require("tls")},79551:e=>{"use strict";e.exports=require("url")},28354:e=>{"use strict";e.exports=require("util")},74075:e=>{"use strict";e.exports=require("zlib")},53730:(e,t,o)=>{"use strict";o.r(t),o.d(t,{patchFetch:()=>y,routeModule:()=>x,serverHooks:()=>b,workAsyncStorage:()=>f,workUnitAsyncStorage:()=>v});var r={};o.r(r),o.d(r,{POST:()=>u});var n=o(42706),i=o(28203),a=o(45994),s=o(39187),l=o(11587),c=o(27727),p=o(65665),d=o(98721);let g=c.Ik({token:c.Yj().min(1,"Token is required"),clientName:c.Yj().min(1,"Client name is required"),clientEmail:c.Yj().email("Valid email is required")});async function u(e){try{var t,o,r;let n=await e.json(),i=g.parse(n),a=await l.z.agreement.findFirst({where:{uniqueToken:i.token,expiresAt:{gte:new Date}},include:{client:!0,template:!0}});if(!a)return s.NextResponse.json({error:"Agreement not found or has expired"},{status:404});let c=`${a.client.firstName} ${a.client.lastName}`.toLowerCase(),p=i.clientName.toLowerCase(),d=a.client.email.toLowerCase(),u=i.clientEmail.toLowerCase();if(c!==p||d!==u)return s.NextResponse.json({error:"Client information does not match. Please verify your name and email."},{status:400});if("SIGNED"===a.status)return s.NextResponse.json({error:"This agreement has already been signed"},{status:400});let x=(e=>{let t=e.headers.get("x-forwarded-for"),o=e.headers.get("x-real-ip");return e.headers.get("cf-connecting-ip")||o||(t?t.split(",")[0].trim():"Unknown")})(e),f=(t=a.template.htmlContent,o=a.client,r=a.id,t.replace(/\{\{client\.firstName\}\}/g,o.firstName||"").replace(/\{\{client\.lastName\}\}/g,o.lastName||"").replace(/\{\{client\.email\}\}/g,o.email||"").replace(/\{\{client\.phone\}\}/g,o.phone||"").replace(/\{\{client\.eventDate\}\}/g,o.eventDate?new Date(o.eventDate).toLocaleDateString("en-CA",{timeZone:"America/Toronto"}):"").replace(/\{\{client\.notes\}\}/g,o.notes||"").replace(/\{\{event\.type\}\}/g,o.eventType||"").replace(/\{\{event\.location\}\}/g,o.eventLocation||"").replace(/\{\{event\.startTime\}\}/g,o.eventStartTime||"").replace(/\{\{event\.duration\}\}/g,o.eventDuration||"").replace(/\{\{event\.package\}\}/g,o.eventPackage||"").replace(/\{\{event\.price\}\}/g,o.packagePrice?`$${Number(o.packagePrice).toFixed(2)}`:"").replace(/\{\{agreement\.date\}\}/g,new Date().toLocaleDateString("en-CA",{timeZone:"America/Toronto"})).replace(/\{\{agreement\.id\}\}/g,r||""));console.log("\uD83D\uDD0D SIGN API: Created snapshot length:",f.length),console.log("\uD83D\uDD0D SIGN API: Snapshot preview:",f.substring(0,200)+"...");let v=await l.z.agreement.update({where:{id:a.id},data:{status:"SIGNED",signedAt:new Date,signedFromIP:x,mergedHtml:f},include:{client:!0,template:!0}});try{await m(v,x,e)}catch(e){console.error("Failed to send notification email:",e)}try{await h(v,e)}catch(e){console.error("Failed to send client thank you email:",e)}return s.NextResponse.json({message:"Agreement signed successfully",agreement:v})}catch(e){if(e instanceof p.G)return s.NextResponse.json({error:"Validation failed",details:e.errors},{status:400});return console.error("Error signing agreement:",e),s.NextResponse.json({error:"Failed to sign agreement"},{status:500})}}async function m(e,t,o){if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS){console.log("SMTP not configured, skipping notification email");return}o.headers.get("x-forwarded-proto"),o.headers.get("host");let r=`http://localhost:3000/agreement/${e.uniqueToken}`,n=d.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),i=`
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
          background-color: #2563eb !important; 
          color: white !important; 
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
            <a href="${r}" class="button">View Signed Agreement</a>
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
  `,a={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:"info@photoboothguys.ca",subject:`Agreement Signed - ${e.client.firstName} ${e.client.lastName} - ${e.template.title}`,html:i};try{await n.verify(),await n.sendMail(a),console.log("Signed agreement notification sent successfully")}catch(e){throw console.error("Failed to send notification email:",e),e}}async function h(e,t){if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS){console.log("SMTP not configured, skipping client thank you email");return}t.headers.get("x-forwarded-proto"),t.headers.get("host");let o=`http://localhost:3000/agreement/${e.uniqueToken}`,r=d.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:1e4,greetingTimeout:1e4,socketTimeout:1e4}),n=`
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
          background-color: #2563eb !important; 
          color: white !important; 
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
        .thank-you { background-color: #dbeafe; border: 1px solid #93c5fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .next-steps { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .contact-info { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Photobooth Guys</h1>
          <p>Thank You for Choosing Us!</p>
        </div>
        
        <div class="content">
          <div class="thank-you">
            <h2 style="margin: 0 0 16px 0; color: #1e40af; font-size: 28px;">🎉 Thank You, ${e.client.firstName}!</h2>
            <p style="margin: 0; font-size: 18px; color: #1e40af; font-weight: 600;">
              Your agreement has been successfully signed and we're excited to work with you!
            </p>
          </div>
          
          <p>Dear ${e.client.firstName},</p>
          
          <p>Thank you for choosing <strong>Photobooth Guys</strong> for your special event! We're thrilled to be part of your celebration and look forward to creating amazing memories together.</p>
          
          <div class="agreement-details">
            <h3>Your Agreement Details:</h3>
            <p><strong>Event Type:</strong> ${e.client.eventType||"To be confirmed"}</p>
            <p><strong>Event Date:</strong> ${e.client.eventDate?new Date(e.client.eventDate).toLocaleDateString("en-CA",{timeZone:"America/Toronto"}):"To be confirmed"}</p>
            <p><strong>Package:</strong> ${e.client.eventPackage||"Standard Package"}</p>
            ${e.client.packagePrice?`<p><strong>Investment:</strong> $${Number(e.client.packagePrice).toFixed(2)}</p>`:""}
            <p><strong>Agreement ID:</strong> ${e.id}</p>
            <p><strong>Signed On:</strong> ${e.signedAt?new Date(e.signedAt).toLocaleString("en-CA",{timeZone:"America/Toronto"}):"N/A"}</p>
          </div>
          
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li><strong>Template Selection:</strong> Choose your photo booth template to match your event theme</li>
              <li><strong>Event Planning:</strong> We'll be in touch closer to your event date to finalize details</li>
              <li><strong>Questions:</strong> Don't hesitate to reach out if you have any questions</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${o}" class="button">View Your Agreement</a>
          </div>
          
          <div class="contact-info">
            <h3>Need Help or Have Questions?</h3>
            <p>Our team is here to help make your event perfect!</p>
            <p><strong>📧 Email:</strong> info@photoboothguys.ca</p>
            <p><strong>📞 Phone:</strong> 647-378-5332</p>
            <p><strong>🌐 Website:</strong> <a href="https://photoboothguys.ca" style="color: #3b82f6;">photoboothguys.ca</a></p>
          </div>
          
          <p>Once again, thank you for choosing Photobooth Guys. We can't wait to make your event unforgettable!</p>
          
          <p>Best regards,<br>
          <strong>The Photobooth Guys Team</strong></p>
        </div>
        
        <div class="footer">
          <p>Photobooth Guys</p>
          <p>Generated: ${new Date().toLocaleString("en-CA",{timeZone:"America/Toronto"})}</p>
        </div>
      </div>
    </body>
    </html>
  `,i={from:process.env.SMTP_FROM||process.env.SMTP_USER,to:e.client.email,subject:`Thank You for Choosing Photobooth Guys - ${e.template.title}`,html:n};try{await r.verify(),await r.sendMail(i),console.log("Client thank you email sent successfully to:",e.client.email)}catch(e){throw console.error("Failed to send client thank you email:",e),e}}let x=new n.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/agreements/sign/route",pathname:"/api/agreements/sign",filename:"route",bundlePath:"app/api/agreements/sign/route"},resolvedPagePath:"C:\\Users\\denni\\agreements\\app\\api\\agreements\\sign\\route.ts",nextConfigOutput:"",userland:r}),{workAsyncStorage:f,workUnitAsyncStorage:v,serverHooks:b}=x;function y(){return(0,a.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:v})}},96487:()=>{},78335:()=>{},11587:(e,t,o)=>{"use strict";o.d(t,{z:()=>n});var r=o(96330);let n=global.prisma||new r.PrismaClient({log:["error","warn"]})}};var t=require("../../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),r=t.X(0,[638,5452,7727,8721],()=>o(53730));module.exports=r})();