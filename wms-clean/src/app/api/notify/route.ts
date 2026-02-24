import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // In a real application, you would initialize Resend here
        // import { Resend } from 'resend';
        // const resend = new Resend(process.env.RESEND_API_KEY);
        // await resend.emails.send({ ... })

        console.log("-----------------------------------------");
        console.log("📧 MOCK EMAIL NOTIFICATION SENT!");
        console.log("Topic: WMS Change Log");
        console.log("Details:");
        console.log(JSON.stringify(body, null, 2));
        console.log("-----------------------------------------");

        return NextResponse.json({ success: true, message: "Email sent." });
    } catch (error) {
        console.error("Failed to process notification:", error);
        return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
    }
}
