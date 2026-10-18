function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

module.exports = function passwordResetEmail(url) {
  const resetUrl = escapeHtml(url);
  const supportUrl = escapeHtml(new URL("/support", url).href);
  return {
    subject: "Khôi phục mật khẩu TravelMate",
    textContent: `TRAVELMATE
Mỗi hành trình, một câu chuyện mới.

Chào bạn,

TravelMate đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mở liên kết bên dưới để tạo mật khẩu mới và tiếp tục những hành trình đang chờ:

${url}

Liên kết có hiệu lực trong 15 phút kể từ khi bạn gửi yêu cầu và chỉ dùng được một lần. Vui lòng không chia sẻ liên kết này với người khác.

Nếu bạn không gửi yêu cầu này, hãy bỏ qua email. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.

Hẹn gặp lại bạn trên TravelMate!
Đội ngũ TravelMate

Cần hỗ trợ? ${new URL("/support", url).href}
Đây là email tự động về tài khoản TravelMate của bạn.`,
    htmlContent: `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Khôi phục mật khẩu TravelMate</title>
  <style>
    @media only screen and (max-width: 480px) {
      .email-content { padding: 28px 24px !important; }
      .email-title { font-size: 26px !important; line-height: 34px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f7f7; color: #153b43; font-family: Arial, Helvetica, sans-serif; -webkit-text-size-adjust: 100%;">
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">Tạo mật khẩu mới để tiếp tục hành trình của bạn. Liên kết có hiệu lực 15 phút.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f7f7" style="width: 100%; background-color: #f3f7f7;">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 560px;">
          <tr>
            <td align="center" style="padding: 0 12px 24px;">
              <p style="margin: 0; color: #153b43; font-size: 27px; font-weight: 700; letter-spacing: -1px; line-height: 36px;">Travel<span style="color: #087e8b;">Mate</span></p>
              <p style="margin: 4px 0 0; color: #637b80; font-size: 12px; line-height: 20px;">Mỗi hành trình, một câu chuyện mới.</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #dfe9e9; border-top: 4px solid #087e8b; border-radius: 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <td class="email-content" style="padding: 36px 36px 32px;">
                    <p style="margin: 0 0 12px; color: #087e8b; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; line-height: 18px;">BẢO MẬT TÀI KHOẢN</p>
                    <h1 class="email-title" style="margin: 0 0 24px; color: #153b43; font-size: 30px; font-weight: 700; letter-spacing: -0.5px; line-height: 39px;">Một bước để trở lại<br>hành trình của bạn.</h1>
                    <p style="margin: 0 0 12px; color: #153b43; font-size: 15px; line-height: 25px;">Chào bạn,</p>
                    <p style="margin: 0 0 24px; color: #49636a; font-size: 15px; line-height: 25px;">TravelMate đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới.</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                      <tr>
                        <td align="center" bgcolor="#087e8b" style="background-color: #087e8b; border-radius: 9px; mso-padding-alt: 16px 20px;">
                          <a href="${resetUrl}" target="_blank" style="display: block; padding: 16px 20px; border: 1px solid #087e8b; border-radius: 9px; color: #ffffff; font-size: 15px; font-weight: 700; line-height: 22px; text-align: center; text-decoration: none;">Đặt lại mật khẩu</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 12px 0 24px; color: #637b80; font-size: 12px; line-height: 20px; text-align: center;">Có hiệu lực trong <strong style="color: #153b43;">15 phút</strong> kể từ khi gửi yêu cầu · Chỉ dùng một lần</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#edf7f5" style="width: 100%; background-color: #edf7f5; border-radius: 9px;">
                      <tr>
                        <td style="padding: 16px 18px;">
                          <p style="margin: 0 0 5px; color: #153b43; font-size: 13px; font-weight: 700; line-height: 21px;">Bạn không gửi yêu cầu này?</p>
                          <p style="margin: 0; color: #49636a; font-size: 13px; line-height: 21px;">Hãy bỏ qua email. Mật khẩu hiện tại của bạn vẫn được giữ nguyên. Để bảo vệ tài khoản, không chia sẻ liên kết này với người khác.</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 24px 0 0; color: #49636a; font-size: 14px; line-height: 24px;">Hẹn gặp lại bạn trên TravelMate!<br><strong style="color: #153b43;">Đội ngũ TravelMate</strong></p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-top: 24px; table-layout: fixed;">
                      <tr>
                        <td style="padding-top: 20px; border-top: 1px solid #e5eded;">
                          <p style="margin: 0 0 8px; color: #637b80; font-size: 12px; line-height: 20px;">Nếu nút không hoạt động, sao chép và dán liên kết sau vào trình duyệt:</p>
                          <p style="margin: 0; word-break: break-all; overflow-wrap: anywhere;"><a href="${resetUrl}" target="_blank" style="color: #087e8b; font-size: 12px; line-height: 20px; text-decoration: underline; word-break: break-all; overflow-wrap: anywhere;">${resetUrl}</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 16px 0;">
              <p style="margin: 0 0 6px; color: #637b80; font-size: 12px; line-height: 20px;">Cần giúp đỡ? <a href="${supportUrl}" style="color: #087e8b; text-decoration: underline;">Liên hệ TravelMate</a></p>
              <p style="margin: 0; color: #637b80; font-size: 11px; line-height: 18px;">Đây là email tự động về tài khoản TravelMate của bạn.</p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`
  };
};
