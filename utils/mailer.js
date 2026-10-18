function configured() { return !!(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL && process.env.APP_ORIGIN); }
async function sendResetEmail(email, url) {
  if (!configured()) throw new Error("Email is not configured");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY },
    body: JSON.stringify({ sender: { name: "TravelMate", email: process.env.MAIL_FROM_EMAIL }, to: [{ email }], subject: "Đặt lại mật khẩu TravelMate",
      htmlContent: `<html><body><h2>Đặt lại mật khẩu TravelMate</h2><p>Bạn đã yêu cầu đặt lại mật khẩu. Liên kết dùng một lần và hết hạn sau 15 phút.</p><p><a href="${url.replaceAll("&", "&amp;")}">Đặt lại mật khẩu</a></p><p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p></body></html>` }) });
  if (!response.ok) throw new Error("Email provider rejected the request");
}
module.exports = { configured, sendResetEmail };
